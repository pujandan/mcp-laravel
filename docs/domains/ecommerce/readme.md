# E-commerce Domain Examples

Examples for implementing e-commerce functionality using the generic Laravel patterns.

---

## Common Entities

### 1. Product

**File Structure:**
```
app/
├── Http/
│   ├── Controllers/Api/Sales/Product/
│   │   └── ProductController.php
│   ├── Requests/Api/Sales/Product/
│   │   ├── ProductRequest.php
│   │   └── ProductFormRequest.php
│   └── Resources/Api/Sales/Product/
│       ├── ProductResource.php
│       └── ProductCollection.php
├── Models/
│   └── Product.php
└── Services/
    └── Sales/
        └── Product/
            ├── ProductInterface.php
            └── ProductService.php
```

**Business Logic Examples:**

```php
// In ProductService::create()
public function create(array $data): Product
{
    $this->requireTransaction();

    // Validate SKU uniqueness
    $existing = Product::where('sku', $data['sku'])->first();
    if ($existing) {
        throw new AppException('SKU already exists', 422);
    }

    // Set default status
    $data['status'] = ProductStatus::DRAFT;

    // Handle inventory
    if (empty($data['stock_quantity'])) {
        $data['stock_quantity'] = 0;
    }

    return Product::create($data);
}

// In ProductService::update()
public function update(string $id, array $data): Product
{
    $this->requireTransaction();

    $product = $this->find($id);

    // Prevent SKU modification if product is published
    if ($product->status === ProductStatus::PUBLISHED && isset($data['sku'])) {
        unset($data['sku']);
    }

    // Validate stock quantity
    if (isset($data['stock_quantity']) && $data['stock_quantity'] < 0) {
        throw new AppException('Stock quantity cannot be negative', 422);
    }

    $product->update($data);

    return $product->fresh();
}

// In ProductService::delete()
public function delete(string $id): Product
{
    $this->requireTransaction();

    $product = $this->find($id);

    // Cannot delete published products with active orders
    if ($product->status === ProductStatus::PUBLISHED) {
        $activeOrders = Order::whereHas('items', function ($q) use ($product) {
            $q->where('product_id', $product->id);
        })->whereIn('status', [OrderStatus::PENDING, OrderStatus::PROCESSING])->count();

        if ($activeOrders > 0) {
            throw new AppException('Cannot delete product with active orders', 422);
        }
    }

    $product->delete();

    return $product;
}
```

### 2. Order

**Business Logic Examples:**

```php
// In OrderService::create()
public function create(array $data): Order
{
    $this->requireTransaction();

    // Validate customer
    $customer = Customer::findOrFail($data['customer_id']);

    // Calculate total
    $total = 0;
    foreach ($data['items'] as $item) {
        $product = Product::findOrFail($item['product_id']);

        // Check stock availability
        if ($product->stock_quantity < $item['quantity']) {
            throw new AppException(
                "Insufficient stock for {$product->name}. Available: {$product->stock_quantity}",
                422
            );
        }

        $total += $product->price * $item['quantity'];
    }

    // Create order with items
    $order = Order::create([
        'customer_id' => $customer->id,
        'total_amount' => $total,
        'status' => OrderStatus::PENDING,
        'payment_status' => PaymentStatus::PENDING,
    ]);

    // Create order items
    foreach ($data['items'] as $item) {
        $product = Product::findOrFail($item['product_id']);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'quantity' => $item['quantity'],
            'unit_price' => $product->price,
            'subtotal' => $product->price * $item['quantity'],
        ]);

        // Reduce stock
        $product->decrement('stock_quantity', $item['quantity']);
    }

    // Send confirmation emails (silent)
    AppSafe::run('Order confirmation email', fn() =>
        $this->emailService->sendOrderConfirmation($order)
    );

    // Notify warehouse team (silent)
    AppSafe::run('Warehouse notification', fn() =>
        $this->emailService->sendWarehouseNotification($order)
    );

    return $order->fresh();
}
```

---

## Domain-Specific Enums

```php
<?php

namespace App\Enums;

enum ProductStatus: string
{
    case DRAFT = 'dr';
    case PUBLISHED = 'pu';
    case ARCHIVED = 'ar';
    case OUT_OF_STOCK = 'os';

    public static function label(?string $value): ?string
    {
        return match($value) {
            self::DRAFT->value => __('label.draft'),
            self::PUBLISHED->value => __('label.published'),
            self::ARCHIVED->value => __('label.archived'),
            self::OUT_OF_STOCK->value => __('label.outOfStock'),
            default => null,
        };
    }
}

enum OrderStatus: string
{
    case PENDING = 'pe';
    case CONFIRMED = 'cf';
    case PROCESSING = 'pr';
    case SHIPPED = 'sh';
    case DELIVERED = 'de';
    case CANCELLED = 'ca';
    case REFUNDED = 're';

    public static function label(?string $value): ?string
    {
        return match($value) {
            self::PENDING->value => __('label.pending'),
            self::CONFIRMED->value => __('label.confirmed'),
            self::PROCESSING->value => __('label.processing'),
            self::SHIPPED->value => __('label.shipped'),
            self::DELIVERED->value => __('label.delivered'),
            self::CANCELLED->value => __('label.cancelled'),
            self::REFUNDED->value => __('label.refunded'),
            default => null,
        };
    }
}

enum PaymentStatus: string
{
    case PENDING = 'pe';
    case PAID = 'pa';
    case FAILED = 'fa';
    case REFUNDED = 're';

    public static function label(?string $value): ?string
    {
        return match($value) {
            self::PENDING->value => __('label.pending'),
            self::PAID->value => __('label.paid'),
            self::FAILED->value => __('label.failed'),
            self::REFUNDED->value => __('label.refunded'),
            default => null,
        };
    }
}
```

---

## Common AppSafe Patterns

### Order Confirmation Emails

```php
public function store(Request $request)
{
    $order = DB::transaction(function() use ($request) {
        return $this->orderService->create($request->validated());
    });

    // Email customer (silent)
    AppSafe::run('Order confirmation email', fn() =>
        $this->emailService->send(
            to: $order->customer->email,
            subject: "Order Confirmation #{$order->number}",
            mailable: new OrderConfirmationEmail($order)
        )
    );

    // Email warehouse team (silent)
    AppSafe::run('Warehouse notification', fn() =>
        $this->emailService->send(
            to: 'warehouse@example.com',
            subject: "New Order: #{$order->number}",
            mailable: new NewOrderEmail($order)
        )
    );

    // Low stock alert (silent)
    if ($order->hasLowStockItems()) {
        AppSafe::run('Low stock alert', fn() =>
            $this->emailService->sendLowStockAlert($order)
        );
    }

    return AppResponse::success($order, 'Order placed successfully');
}
```

### Payment Webhook

```php
public function handleWebhook(Request $request)
{
    $payment = DB::transaction(function() use ($request) {
        return $this->paymentService->handleWebhook($request->all());
    });

    // Update order status (silent - don't fail webhook if email fails)
    AppSafe::run('Payment confirmation email', fn() =>
        $this->emailService->sendPaymentConfirmation($payment)
    );

    // Notify fulfillment team (silent)
    AppSafe::run('Fulfillment notification', fn() =>
        $this->notificationService->notifyFulfillmentTeam($payment)
    );

    return response()->json(['received' => true]);
}
```

---

## Common Relationships

```php
// Product Model
class Product extends Model
{
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function inventory(): HasOne
    {
        return $this->hasOne(Inventory::class);
    }
}

// Order Model
class Order extends Model
{
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function shippingAddress(): BelongsTo
    {
        return $this->belongsTo(Address::class, 'shipping_address_id');
    }

    public function billingAddress(): BelongsTo
    {
        return $this->belongsTo(Address::class, 'billing_address_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }

    public function shipments(): HasMany
    {
        return $this->hasMany(Shipment::class);
    }
}
```

---

**Domain:** E-commerce
**Version:** 2.0
**Last Updated:** 2026-02-23