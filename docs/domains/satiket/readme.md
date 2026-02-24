# Satiket Domain Examples

Examples for implementing **All-in-One Ticketing & Booking Platform** using the generic Laravel patterns.

**Business Domain:** Multi-vertical ticketing and booking platform covering:
- **Travel** - Tour packages, flights, hotels
- **Events** - Concerts, conferences, workshops
- **Rooms** - Meeting rooms, venues, facilities
- **Entertainment** - Movies, theme parks, attractions

---

## Common Entities

### 1. Ticket/Booking (Core Entity)

**File Structure:**
```
app/
├── Http/
│   ├── Controllers/Api/Booking/
│   │   └── TicketController.php
│   ├── Requests/Api/Booking/
│   │   ├── TicketRequest.php
│   │   └── TicketFormRequest.php
│   └── Resources/Api/Booking/
│       ├── TicketResource.php
│       └── TicketCollection.php
├── Models/
│   └── Ticket.php
└── Services/
    └── Booking/
        └── Ticket/
            ├── TicketInterface.php
            └── TicketService.php
```

**Business Logic Examples:**

```php
// In TicketService::create()
public function create(array $data): Ticket
{
    $this->requireTransaction();

    // Get product (could be Tour, Event, Room, etc.)
    $product = $this->productService->find($data['product_id']);
    $productType = $product->type; // 'tour', 'event', 'room', etc.

    // Validate availability based on product type
    switch ($productType) {
        case ProductType::TOUR:
            $availableSeats = $product->max_seats - $product->booked_seats;
            if ($availableSeats < $data['quantity']) {
                throw new AppException(
                    "Only {$availableSeats} seats available. Requested: {$data['quantity']}",
                    422
                );
            }
            break;

        case ProductType::EVENT:
            // Check event capacity and time slot
            if ($product->start_time->isPast()) {
                throw new AppException('Cannot book past event', 422);
            }
            if ($product->booked_seats >= $product->capacity) {
                throw new AppException('Event is fully booked', 422);
            }
            break;

        case ProductType::ROOM:
            // Check room availability for date range
            $existingBooking = Ticket::where('product_id', $product->id)
                ->where('status', TicketStatus::CONFIRMED)
                ->where(function ($q) use ($data) {
                    $q->whereBetween('start_date', [$data['start_date'], $data['end_date']])
                      ->orWhereBetween('end_date', [$data['start_date'], $data['end_date']]);
                })
                ->exists();

            if ($existingBooking) {
                throw new AppException('Room already booked for selected dates', 422);
            }
            break;
    }

    // Calculate price based on product type and quantity
    $totalAmount = $this->calculatePrice($product, $data);

    // Generate booking reference
    $reference = $this->generateReference($productType);

    $ticket = Ticket::create([
        'product_id' => $product->id,
        'product_type' => $productType,
        'booking_reference' => $reference,
        'customer_name' => $data['customer_name'],
        'customer_email' => $data['customer_email'],
        'customer_phone' => $data['customer_phone'],
        'quantity' => $data['quantity'],
        'start_date' => $data['start_date'] ?? null,
        'end_date' => $data['end_date'] ?? null,
        'total_amount' => $totalAmount,
        'status' => TicketStatus::PENDING,
        'payment_status' => PaymentStatus::PENDING,
    ]);

    // Create attendees
    foreach ($data['attendees'] as $index => $attendee) {
        Attendee::create([
            'ticket_id' => $ticket->id,
            'sequence_number' => $index + 1,
            'name' => $attendee['name'],
            'id_number' => $attendee['id_number'],
            'phone' => $attendee['phone'] ?? null,
            'email' => $attendee['email'] ?? null,
        ]);
    }

    // Update booked seats/quantity
    $product->increment('booked_seats', $data['quantity']);

    // Send booking confirmation (silent)
    AppSafe::run('Booking confirmation email', fn() =>
        $this->emailService->sendBookingConfirmation($ticket)
    );

    // Send WhatsApp confirmation (silent)
    AppSafe::run('WhatsApp confirmation', fn() =>
        $this->whatsappService->sendBookingConfirmation($ticket)
    );

    // Notify operator (silent)
    AppSafe::run('Operator notification', fn() =>
        $this->emailService->sendNewBookingNotification($ticket)
    );

    return $ticket->fresh();
}

// In TicketService::confirm()
public function confirm(string $id): Ticket
{
    $this->requireTransaction();

    $ticket = $this->find($id);

    if ($ticket->status !== TicketStatus::PENDING) {
        throw new AppException('Only pending tickets can be confirmed', 422);
    }

    if ($ticket->payment_status !== PaymentStatus::PAID) {
        throw new AppException('Ticket must be paid before confirmation', 422);
    }

    $ticket->update([
        'status' => TicketStatus::CONFIRMED,
        'confirmed_at' => now(),
        'confirmed_by' => auth()->id(),
    ]);

    // Generate e-ticket (silent)
    AppSafe::run('Generate e-ticket', fn() =>
        $this->documentService->generateETicket($ticket)
    );

    // Send e-ticket via email (silent)
    AppSafe::run('E-ticket email', fn() =>
        $this->emailService->sendETicket($ticket)
    );

    // Send WhatsApp with e-ticket (silent)
    AppSafe::run('WhatsApp e-ticket', fn() =>
        $this->whatsappService->sendETicket($ticket)
    );

    // Sync with calendar (external, silent)
    AppSafe::run('Sync calendar', fn() =>
        $this->calendarService->syncTicket($ticket)
    );

    return $ticket->fresh();
}

// In TicketService::cancel()
public function cancel(string $id, array $data): Ticket
{
    $this->requireTransaction();

    $ticket = $this->find($id);

    if (!in_array($ticket->status, [TicketStatus::PENDING, TicketStatus::CONFIRMED])) {
        throw new AppException('Cannot cancel this ticket', 422);
    }

    $product = $ticket->product;

    // Check cancellation rules based on product type
    $canCancel = $this->checkCancellationRules($product, $ticket);

    if (!$canCancel['allowed']) {
        throw new AppException($canCancel['reason'], 422);
    }

    // Calculate refund if applicable
    $refundAmount = $this->calculateRefund($ticket, $data['reason']);

    $ticket->update([
        'status' => TicketStatus::CANCELLED,
        'cancelled_at' => now(),
        'cancelled_by' => auth()->id(),
        'cancellation_reason' => $data['reason'],
        'refund_amount' => $refundAmount,
    ]);

    // Release booked seats
    $product->decrement('booked_seats', $ticket->quantity);

    // Process refund (silent)
    if ($refundAmount > 0) {
        AppSafe::run('Process refund', fn() =>
            $this->paymentService->processRefund($ticket, $refundAmount)
        );
    }

    // Send cancellation notification (silent)
    AppSafe::run('Cancellation email', fn() =>
        $this->emailService->sendCancellationNotification($ticket)
    );

    // Notify operator (silent)
    AppSafe::run('Cancellation alert', fn() =>
        $this->emailService->sendCancellationAlert($ticket)
    );

    return $ticket->fresh();
}

// In TicketService::checkIn()
public function checkIn(string $id, array $data): Ticket
{
    $this->requireTransaction();

    $ticket = $this->find($id);

    if ($ticket->status !== TicketStatus::CONFIRMED) {
        throw new AppException('Only confirmed tickets can be checked in', 422);
    }

    // Validate attendee
    $attendee = Attendee::where('ticket_id', $ticket->id)
        ->where('id_number', $data['attendee_id'])
        ->first();

    if (!$attendee) {
        throw new AppException('Attendee not found for this ticket', 422);
    }

    // Perform check-in
    $attendee->update([
        'checked_in_at' => now(),
        'checked_in_by' => auth()->id(),
        'checkin_notes' => $data['notes'] ?? null,
    ]);

    // Update ticket status if all attendees checked in
    $totalAttendees = $ticket->attendees->count();
    $checkedInAttendees = $ticket->attendees->whereNotNull('checked_in_at')->count();

    if ($totalAttendees === $checkedInAttendees) {
        $ticket->update([
            'status' => TicketStatus::CHECKED_IN,
            'checked_in_at' => now(),
        ]);
    }

    // Generate pass/badge (silent)
    AppSafe::run('Generate pass', fn() =>
        $this->documentService->generatePass($attendee)
    );

    // Send pass via WhatsApp (silent)
    AppSafe::run('WhatsApp pass', fn() =>
        $this->whatsappService->sendPass($attendee)
    );

    return $ticket->fresh();
}
```

---

### 2. Product (Multi-Vertical)

**Business Logic Examples:**

```php
// In ProductService::create()
public function create(array $data): Product
{
    $this->requireTransaction();

    // Validate based on product type
    $productType = $data['type'];

    switch ($productType) {
        case ProductType::TOUR:
            // Tour-specific validation
            if (empty($data['duration_days'])) {
                throw new AppException('Duration is required for tour packages', 422);
            }
            if (empty($data['destination'])) {
                throw new AppException('Destination is required for tour packages', 422);
            }
            $data['capacity_type'] = CapacityType::SEATS;
            break;

        case ProductType::EVENT:
            // Event-specific validation
            if (empty($data['start_time'])) {
                throw new AppException('Start time is required for events', 422);
            }
            if (empty($data['venue'])) {
                throw new AppException('Venue is required for events', 422);
            }
            $data['capacity_type'] = CapacityType::CAPACITY;
            break;

        case ProductType::ROOM:
            // Room-specific validation
            if (empty($data['facility_id'])) {
                throw new AppException('Facility is required for rooms', 422);
            }
            $data['capacity_type'] = CapacityType::UNITS;
            break;
    }

    // Set default values
    $data['status'] = ProductStatus::DRAFT;
    $data['booked_seats'] = 0;

    $product = Product::create($data);

    // Create pricing tiers if provided
    if (!empty($data['pricing_tiers'])) {
        foreach ($data['pricing_tiers'] as $tier) {
            PricingTier::create([
                'product_id' => $product->id,
                'name' => $tier['name'],
                'price' => $tier['price'],
                'min_quantity' => $tier['min_quantity'] ?? 1,
                'max_quantity' => $tier['max_quantity'] ?? null,
                'is_active' => true,
            ]);
        }
    }

    return $product->fresh();
}

// In ProductService::update()
public function update(string $id, array $data): Product
{
    $this->requireTransaction();

    $product = $this->find($id);

    // Cannot modify certain fields if bookings exist
    $hasBookings = Ticket::where('product_id', $product->id)
        ->whereIn('status', [TicketStatus::CONFIRMED, TicketStatus::CHECKED_IN])
        ->exists();

    if ($hasBookings) {
        $protectedFields = ['type', 'capacity', 'start_time', 'end_time', 'venue'];
        foreach ($protectedFields as $field) {
            if (isset($data[$field]) && $data[$field] != $product->{$field}) {
                throw new AppException("Cannot modify {$field} for product with active bookings", 422);
            }
        }
    }

    // Handle capacity changes
    if (isset($data['capacity']) && $data['capacity'] < $product->booked_seats) {
        throw new AppException(
            "Cannot reduce capacity below booked seats ({$product->booked_seats})",
            422
        );
    }

    $product->update($data);

    return $product->fresh();
}
```

---

### 3. Payment (Multi-Payment Gateway)

**Business Logic Examples:**

```php
// In PaymentService::process()
public function process(string $ticketId, array $data): Payment
{
    $this->requireTransaction();

    $ticket = Ticket::findOrFail($ticketId);

    if ($ticket->payment_status === PaymentStatus::PAID) {
        throw new AppException('Ticket already paid', 422);
    }

    $paymentMethod = $data['payment_method']; // 'qris', 'ewallet', 'va', 'card'

    // Create payment record
    $payment = Payment::create([
        'ticket_id' => $ticket->id,
        'payment_method' => $paymentMethod,
        'amount' => $ticket->total_amount,
        'status' => PaymentStatus::PENDING,
        'external_reference' => null,
    ]);

    // Process based on payment method
    switch ($paymentMethod) {
        case PaymentMethod::QRIS:
            $result = $this->processQRIS($payment, $ticket);
            break;

        case PaymentMethod::EWALLET:
            $result = $this->processEwallet($payment, $ticket, $data['ewallet_type']);
            break;

        case PaymentMethod::VIRTUAL_ACCOUNT:
            $result = $this->processVirtualAccount($payment, $ticket, $data['bank']);
            break;

        case PaymentMethod::CREDIT_CARD:
            $result = $this->processCreditCard($payment, $ticket, $data['card_token']);
            break;
    }

    // Update payment with external reference
    $payment->update([
        'external_reference' => $result['reference'],
        'payment_details' => $result['details'],
    ]);

    // Send payment instructions (silent)
    AppSafe::run('Payment instructions', fn() =>
        $this->notificationService->sendPaymentInstructions($payment)
    );

    return $payment->fresh();
}

// In PaymentService::handleCallback()
public function handleCallback(array $data): Payment
{
    $this->requireTransaction();

    $payment = Payment::where('external_reference', $data['reference'])
        ->firstOrFail();

    if ($payment->status === PaymentStatus::PAID) {
        return $payment; // Already processed
    }

    // Validate signature
    if (!$this->validateSignature($data)) {
        throw new AppException('Invalid signature', 422);
    }

    // Update payment status
    $success = $data['status'] === 'success';

    $payment->update([
        'status' => $success ? PaymentStatus::PAID : PaymentStatus::FAILED,
        'paid_at' => $success ? now() : null,
        'callback_data' => $data,
    ]);

    if ($success) {
        // Update ticket payment status
        $payment->ticket->update([
            'payment_status' => PaymentStatus::PAID,
            'paid_at' => now(),
        ]);

        // Attempt auto-confirm ticket (silent)
        AppSafe::run('Auto-confirm ticket', fn() =>
            $this->ticketService->attemptAutoConfirm($payment->ticket)
        );

        // Send payment confirmation (silent)
        AppSafe::run('Payment confirmation', fn() =>
            $this->notificationService->sendPaymentConfirmation($payment)
        );

        // Sync with accounting (silent)
        AppSafe::run('Sync accounting', fn() =>
            $this->accountingService->recordTransaction($payment)
        );
    }

    return $payment->fresh();
}
```

---

## Domain-Specific Enums

```php
<?php

namespace App\Enums;

enum ProductType: string
{
    case TOUR = 'to';      // Tour packages
    case EVENT = 'ev';     // Events (concerts, conferences)
    case ROOM = 'ro';      // Rooms and venues
    case ATTRACTION = 'at'; // Attractions and theme parks

    public static function label(?string $value): ?string
    {
        return match($value) {
            self::TOUR->value => __('label.tour'),
            self::EVENT->value => __('label.event'),
            self::ROOM->value => __('label.room'),
            self::ATTRACTION->value => __('label.attraction'),
            default => null,
        };
    }
}

enum TicketStatus: string
{
    case PENDING = 'pe';
    case CONFIRMED = 'cf';
    case CHECKED_IN = 'ci';
    case USED = 'us';
    case CANCELLED = 'ca';
    case REFUNDED = 're';

    public static function label(?string $value): ?string
    {
        return match($value) {
            self::PENDING->value => __('label.pending'),
            self::CONFIRMED->value => __('label.confirmed'),
            self::CHECKED_IN->value => __('label.checkedIn'),
            self::USED->value => __('label.used'),
            self::CANCELLED->value => __('label.cancelled'),
            self::REFUNDED->value => __('label.refunded'),
            default => null,
        };
    }
}

enum ProductStatus: string
{
    case DRAFT = 'dr';
    case PUBLISHED = 'pu';
    case SOLD_OUT = 'so';
    case CANCELLED = 'ca';
    case COMPLETED = 'co';

    public static function label(?string $value): ?string
    {
        return match($value) {
            self::DRAFT->value => __('label.draft'),
            self::PUBLISHED->value => __('label.published'),
            self::SOLD_OUT->value => __('label.soldOut'),
            self::CANCELLED->value => __('label.cancelled'),
            self::COMPLETED->value => __('label.completed'),
            default => null,
        };
    }
}

enum PaymentMethod: string
{
    case QRIS = 'qr';
    case EWALLET = 'ew';
    case VIRTUAL_ACCOUNT = 'va';
    case CREDIT_CARD = 'cc';
    case BANK_TRANSFER = 'bt';

    public static function label(?string $value): ?string
    {
        return match($value) {
            self::QRIS->value => __('label.qris'),
            self::EWALLET->value => __('label.ewallet'),
            self::VIRTUAL_ACCOUNT->value => __('label.virtualAccount'),
            self::CREDIT_CARD->value => __('label.creditCard'),
            self::BANK_TRANSFER->value => __('label.bankTransfer'),
            default => null,
        };
    }
}

enum CapacityType: string
{
    case SEATS = 'se';     // For tours/events
    case CAPACITY = 'ca';  // For events
    case UNITS = 'un';     // For rooms

    public static function label(?string $value): ?string
    {
        return match($value) {
            self::SEATS->value => __('label.seats'),
            self::CAPACITY->value => __('label.capacity'),
            self::UNITS->value => __('label.units'),
            default => null,
        };
    }
}
```

---

## Common AppSafe Patterns

### New Booking Notification

```php
public function store(Request $request)
{
    $ticket = DB::transaction(function() use ($request) {
        return $this->ticketService->create($request->validated());
    });

    // Send booking confirmation email (silent)
    AppSafe::run('Booking confirmation email', fn() =>
        $this->emailService->send(
            to: $ticket->customer_email,
            subject: "Booking Confirmation #{$ticket->booking_reference}",
            mailable: new BookingConfirmationEmail($ticket)
        )
    );

    // Send WhatsApp confirmation (silent)
    AppSafe::run('WhatsApp confirmation', fn() =>
        $this->whatsappService->sendBookingConfirmation($ticket)
    );

    // Notify operator (silent)
    AppSafe::run('Operator notification', fn() =>
        $this->emailService->send(
            to: 'ops@satiket.com',
            subject: "New Booking: #{$ticket->booking_reference}",
            mailable: new NewBookingEmail($ticket)
        )
    );

    // Update analytics (silent)
    AppSafe::run('Update analytics', fn() =>
        $this->analyticsService->trackNewBooking($ticket)
    );

    return AppResponse::success($ticket, 'Booking created successfully');
}
```

### Payment Confirmation

```php
public function handleCallback(Request $request)
{
    $payment = DB::transaction(function() use ($request) {
        return $this->paymentService->handleCallback($request->all());
    });

    if ($payment->status === PaymentStatus::PAID) {
        // Send payment confirmation (silent)
        AppSafe::run('Payment confirmation', fn() =>
            $this->emailService->sendPaymentConfirmation($payment)
        );

        // Send WhatsApp confirmation (silent)
        AppSafe::run('WhatsApp payment confirmation', fn() =>
            $this->whatsappService->sendPaymentConfirmation($payment)
        );

        // Generate and send e-ticket (silent)
        AppSafe::run('Generate e-ticket', fn() =>
            $this->documentService->generateAndSendETicket($payment->ticket)
        );

        // Sync with accounting system (silent)
        AppSafe::run('Sync accounting', fn() =>
            $this->accountingService->recordTransaction($payment)
        );
    }

    return response()->json(['status' => 'received']);
}
```

### Check-In Process

```php
public function checkIn(Request $request, string $id)
{
    $ticket = DB::transaction(function() use ($request, $id) {
        return $this->ticketService->checkIn($id, $request->validated());
    });

    // Send pass via WhatsApp (silent)
    AppSafe::run('WhatsApp pass', fn() =>
        $this->whatsappService->sendPass($ticket)
    );

    // Update attendance system (silent)
    AppSafe::run('Update attendance', fn() =>
        $this->attendanceService->recordCheckIn($ticket)
    );

    return AppResponse::success($ticket, 'Check-in successful');
}
```

### Event Reminder

```php
public function sendReminders()
{
    // Get tickets for upcoming events (tomorrow)
    $tickets = Ticket::where('status', TicketStatus::CONFIRMED)
        ->whereDate('start_date', tomorrow())
        ->get();

    foreach ($tickets as $ticket) {
        // Send reminder email (silent)
        AppSafe::run("Reminder for ticket {$ticket->id}", fn() =>
            $this->emailService->sendEventReminder($ticket)
        );

        // Send WhatsApp reminder (silent)
        AppSafe::run("WhatsApp reminder for ticket {$ticket->id}", fn() =>
            $this->whatsappService->sendEventReminder($ticket)
        );
    }
}
```

---

## Common Relationships

```php
// Ticket Model
class Ticket extends Model
{
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }

    public function attendees(): HasMany
    {
        return $this->hasMany(Attendee::class)->orderBy('sequence_number');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(TicketDocument::class);
    }

    public function addOns(): BelongsToMany
    {
        return $this->belongsToMany(AddOn::class)->withPivot('quantity', 'price');
    }
}

// Product Model (Multi-Vertical)
class Product extends Model
{
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function pricingTiers(): HasMany
    {
        return $this->hasMany(PricingTier::class)->orderBy('min_quantity');
    }

    public function addOns(): BelongsToMany
    {
        return $this->belongsToMany(AddOn::class)->withPivot('price');
    }

    public function facilities(): BelongsToMany
    {
        return $this->belongsToMany(Facility::class);
    }

    public function gallery(): HasMany
    {
        return $this->hasMany(ProductGallery::class);
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(ProductSchedule::class);
    }
}

// Attendee Model
class Attendee extends Model
{
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }
}
```

---

## Multi-Vertical Specific Patterns

### Tour Package

```php
// Tour-specific business logic
if ($product->type === ProductType::TOUR) {
    // Validate tour duration
    if ($ticket->start_date->copy()->addDays($product->duration_days)
        ->notEqualTo($ticket->end_date)) {
        throw new AppException('Invalid date range for tour duration', 422);
    }

    // Generate itinerary for each day
    for ($day = 1; $day <= $product->duration_days; $day++) {
        TicketItinerary::create([
            'ticket_id' => $ticket->id,
            'day_number' => $day,
            'title' => $product->schedules->where('day_number', $day)->first()?->title ?? "Day {$day}",
        ]);
    }
}
```

### Event Ticket

```php
// Event-specific business logic
if ($product->type === ProductType::EVENT) {
    // Validate event hasn't started
    if ($product->start_time->isPast()) {
        throw new AppException('Cannot book past event', 422);
    }

    // Generate seat allocation
    $seatAllocation = $this->allocateSeats($product, $ticket->quantity);
    $ticket->update(['seat_allocation' => $seatAllocation]);
}
```

### Room Booking

```php
// Room-specific business logic
if ($product->type === ProductType::ROOM) {
    // Validate no overlapping bookings
    $overlapping = Ticket::where('product_id', $product->id)
        ->where('status', TicketStatus::CONFIRMED)
        ->where(function ($q) use ($ticket) {
            $q->whereBetween('start_date', [$ticket->start_date, $ticket->end_date])
              ->orWhereBetween('end_date', [$ticket->start_date, $ticket->end_date]);
        })
        ->exists();

    if ($overlapping) {
        throw new AppException('Room already booked for selected dates', 422);
    }

    // Calculate total price based on duration
    $days = $ticket->start_date->diffInDays($ticket->end_date) + 1;
    $ticket->update([
        'total_amount' => $product->price * $ticket->quantity * $days
    ]);
}
```

---

## Key Differences from Other Domains

| Aspect | Satiket vs E-commerce | Satiket vs Tourism |
|--------|---------------------|-------------------|
| **Product** | Multi-vertical (tour, event, room) | Single vertical (tour only) |
| **Inventory** | Time-based + capacity | Seat-based only |
| **Pricing** | Dynamic pricing tiers | Fixed pricing |
| **Fulfillment** | E-ticket/Pass | Travel documents |
| **Cancellation** | Time-based rules | Business rules |
| **Check-in** | Multi-attendee check-in | N/A |

---

**Domain:** Satiket (All-in-One Ticketing & Booking)
**Business:** Multi-vertical ticketing platform
**Verticals:** Travel, Events, Rooms, Attractions
**Version:** 1.0
**Last Updated:** 2026-02-23