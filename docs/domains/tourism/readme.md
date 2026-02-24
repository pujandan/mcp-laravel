# Tourism/Travel Domain Examples

Examples for implementing tourism and travel management functionality using the generic Laravel patterns.

---

## Common Entities

### 1. Tour Package

**File Structure:**
```
app/
├── Http/
│   ├── Controllers/Api/Tours/Package/
│   │   └── PackageController.php
│   ├── Requests/Api/Tours/Package/
│   │   ├── PackageRequest.php
│   │   └── PackageFormRequest.php
│   └── Resources/Api/Tours/Package/
│       ├── PackageResource.php
│       └── PackageCollection.php
├── Models/
│   └── Package.php
└── Services/
    └── Tours/
        └── Package/
            ├── PackageInterface.php
            └── PackageService.php
```

**Business Logic Examples:**

```php
// In PackageService::create()
public function create(array $data): Package
{
    $this->requireTransaction();

    // Validate seat capacity
    if ($data['max_seats'] < 1) {
        throw new AppException('Maximum seats must be at least 1', 422);
    }

    // Set default status
    $data['status'] = PackageStatus::DRAFT;
    $data['remaining_seats'] = $data['max_seats'];

    $package = Package::create($data);

    // Create default schedule days based on duration
    if (!empty($data['duration_days'])) {
        for ($day = 1; $day <= $data['duration_days']; $day++) {
            ScheduleDay::create([
                'package_id' => $package->id,
                'day_number' => $day,
                'title' => "Day {$day}",
                'description' => null,
            ]);
        }
    }

    return $package->fresh();
}

// In PackageService::update()
public function update(string $id, array $data): Package
{
    $this->requireTransaction();

    $package = $this->find($id);

    // Cannot reduce max_seats below booked seats
    if (isset($data['max_seats'])) {
        $bookedSeats = $package->max_seats - $package->remaining_seats;

        if ($data['max_seats'] < $bookedSeats) {
            throw new AppException(
                "Cannot reduce maximum seats below booked seats ({$bookedSeats})",
                422
            );
        }

        // Update remaining seats
        $data['remaining_seats'] = $data['max_seats'] - $bookedSeats;
    }

    // Cannot modify dates if bookings exist
    if (isset($data['start_date']) || isset($data['end_date'])) {
        $hasBookings = Booking::where('package_id', $package->id)
            ->whereIn('status', [BookingStatus::CONFIRMED, BookingStatus::PENDING])
            ->exists();

        if ($hasBookings) {
            throw new AppException('Cannot modify dates for package with active bookings', 422);
        }
    }

    $package->update($data);

    return $package->fresh();
}

// In PackageService::delete()
public function delete(string $id): Package
{
    $this->requireTransaction();

    $package = $this->find($id);

    // Cannot delete published packages with bookings
    if ($package->status === PackageStatus::PUBLISHED) {
        $hasBookings = Booking::where('package_id', $package->id)
            ->whereIn('status', [BookingStatus::CONFIRMED, BookingStatus::PENDING])
            ->exists();

        if ($hasBookings) {
            throw new AppException('Cannot delete package with active bookings', 422);
        }
    }

    $package->delete();

    return $package;
}
```

### 2. Booking

**Business Logic Examples:**

```php
// In BookingService::create()
public function create(array $data): Booking
{
    $this->requireTransaction();

    $package = Package::findOrFail($data['package_id']);

    // Validate package availability
    if ($package->status !== PackageStatus::PUBLISHED) {
        throw new AppException('Package is not available for booking', 422);
    }

    // Validate remaining seats
    $requestedSeats = $data['number_of_travelers'];
    if ($package->remaining_seats < $requestedSeats) {
        throw new AppException(
            "Only {$package->remaining_seats} seats available. Requested: {$requestedSeats}",
            422
        );
    }

    // Validate booking dates
    if (now()->gt($package->booking_end_date)) {
        throw new AppException('Booking for this package has closed', 422);
    }

    // Calculate total amount
    $totalAmount = $package->price * $requestedSeats;

    // Create booking
    $booking = Booking::create([
        'package_id' => $package->id,
        'booking_reference' => $this->generateReference(),
        'contact_name' => $data['contact_name'],
        'contact_email' => $data['contact_email'],
        'contact_phone' => $data['contact_phone'],
        'number_of_travelers' => $requestedSeats,
        'total_amount' => $totalAmount,
        'status' => BookingStatus::PENDING,
        'payment_status' => PaymentStatus::PENDING,
    ]);

    // Create travelers
    foreach ($data['travelers'] as $index => $traveler) {
        Traveler::create([
            'booking_id' => $booking->id,
            'sequence_number' => $index + 1,
            'name' => $traveler['name'],
            'id_number' => $traveler['id_number'],
            'phone' => $traveler['phone'] ?? null,
        ]);
    }

    // Reduce remaining seats
    $package->decrement('remaining_seats', $requestedSeats);

    // Send booking confirmation email (silent)
    AppSafe::run('Booking confirmation email', fn() =>
        $this->emailService->sendBookingConfirmation($booking)
    );

    // Notify operations team (silent)
    AppSafe::run('Operations notification', fn() =>
        $this->emailService->sendNewBookingNotification($booking)
    );

    return $booking->fresh();
}

// In BookingService::confirm()
public function confirm(string $id): Booking
{
    $this->requireTransaction();

    $booking = $this->find($id);

    if ($booking->status !== BookingStatus::PENDING) {
        throw new AppException('Only pending bookings can be confirmed', 422);
    }

    if ($booking->payment_status !== PaymentStatus::PAID) {
        throw new AppException('Booking must be paid before confirmation', 422);
    }

    $booking->update([
        'status' => BookingStatus::CONFIRMED,
        'confirmed_at' => now(),
        'confirmed_by' => auth()->id(),
    ]);

    // Send confirmation email (silent)
    AppSafe::run('Booking confirmed email', fn() =>
        $this->emailService->sendBookingConfirmedEmail($booking)
    );

    // Generate travel documents (silent, async)
    AppSafe::run('Generate travel documents', fn() =>
        $this->documentService->generateTravelDocuments($booking)
    );

    // Update analytics (silent)
    AppSafe::run('Update analytics', fn() =>
        $this->analyticsService->trackBookingConfirmation($booking)
    );

    return $booking->fresh();
}
```

---

## Domain-Specific Enums

```php
<?php

namespace App\Enums;

enum PackageStatus: string
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

enum BookingStatus: string
{
    case PENDING = 'pe';
    case CONFIRMED = 'cf';
    case CANCELLED = 'ca';
    case COMPLETED = 'co';
    case REFUNDED = 're';

    public static function label(?string $value): ?string
    {
        return match($value) {
            self::PENDING->value => __('label.pending'),
            self::CONFIRMED->value => __('label.confirmed'),
            self::CANCELLED->value => __('label.cancelled'),
            self::COMPLETED->value => __('label.completed'),
            self::REFUNDED->value => __('label.refunded'),
            default => null,
        };
    }
}

enum PaymentStatus: string
{
    case PENDING = 'pe';
    case PROCESSING = 'pr';
    case PAID = 'pa';
    case FAILED = 'fa';
    case REFUNDED = 're';

    public static function label(?string $value): ?string
    {
        return match($value) {
            self::PENDING->value => __('label.pending'),
            self::PROCESSING->value => __('label.processing'),
            self::PAID->value => __('label.paid'),
            self::FAILED->value => __('label.failed'),
            self::REFUNDED->value => __('label.refunded'),
            default => null,
        };
    }
}

enum TravelerStatus: string
{
    case REGISTERED = 're';
    case CONFIRMED = 'cf';
    case CHECKED_IN = 'ci';
    case NO_SHOW = 'ns';

    public static function label(?string $value): ?string
    {
        return match($value) {
            self::REGISTERED->value => __('label.registered'),
            self::CONFIRMED->value => __('label.confirmed'),
            self::CHECKED_IN->value => __('label.checkedIn'),
            self::NO_SHOW->value => __('label.noShow'),
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
    $booking = DB::transaction(function() use ($request) {
        return $this->bookingService->create($request->validated());
    });

    // Send booking confirmation to customer (silent)
    AppSafe::run('Booking confirmation email', fn() =>
        $this->emailService->send(
            to: $booking->contact_email,
            subject: "Booking Confirmation #{$booking->booking_reference}",
            mailable: new BookingConfirmationEmail($booking)
        )
    );

    // Send WhatsApp message (silent)
    AppSafe::run('WhatsApp notification', fn() =>
        $this->whatsappService->sendBookingConfirmation($booking)
    );

    // Notify operations team (silent)
    AppSafe::run('Operations notification', fn() =>
        $this->emailService->send(
            to: 'operations@example.com',
            subject: "New Booking: #{$booking->booking_reference}",
            mailable: new NewBookingEmail($booking)
        )
    );

    // Update inventory system (silent)
    AppSafe::run('Update inventory', fn() =>
        $this->inventoryService->updatePackageAvailability($booking->package)
    );

    // Track analytics (silent)
    AppSafe::run('Track booking analytics', fn() =>
        $this->analyticsService->trackNewBooking($booking)
    );

    return AppResponse::success($booking, 'Booking created successfully');
}
```

### Payment Confirmation

```php
public function handlePaymentCallback(Request $request)
{
    $payment = DB::transaction(function() use ($request) {
        return $this->paymentService->handleCallback($request->all());
    });

    if ($payment->status === PaymentStatus::PAID) {
        // Send payment confirmation (silent)
        AppSafe::run('Payment confirmation email', fn() =>
            $this->emailService->sendPaymentConfirmation($payment)
        );

        // Attempt to auto-confirm booking if seats available (silent)
        AppSafe::run('Auto-confirm booking', fn() =>
            $this->bookingService->attemptAutoConfirm($payment->booking)
        );

        // Sync with accounting system (silent)
        AppSafe::run('Sync accounting', fn() =>
            $this->accountingService->recordPayment($payment)
        );
    }

    return response()->json(['status' => 'received']);
}
```

### Package Departure

```php
public function depart(Request $request, string $id)
{
    $package = DB::transaction(function() use ($request, $id) {
        return $this->packageService->markAsDeparted($id);
    });

    // Notify all confirmed travelers (silent)
    foreach ($package->bookings->where('status', BookingStatus::CONFIRMED) as $booking) {
        AppSafe::run("Departure notification for {$booking->contact_email}", fn() =>
            $this->emailService->sendPackageDepartureNotification($booking)
        );

        // Send WhatsApp message (silent)
        AppSafe::run("WhatsApp departure notification", fn() =>
            $this->whatsappService->sendDepartureNotification($booking)
        );
    }

    // Notify operations team (silent)
    AppSafe::run('Operations departure notification', fn() =>
        $this->emailService->sendPackageDepartureAlert($package)
    );

    // Update transportation schedules (silent)
    AppSafe::run('Update transportation', fn() =>
        $this->transportService->updatePackageStatus($package)
    );

    return AppResponse::success($package, 'Package marked as departed');
}
```

---

## Common Relationships

```php
// Package Model
class Package extends Model
{
    public function category(): BelongsTo
    {
        return $this->belongsTo(PackageCategory::class);
    }

    public function destination(): BelongsTo
    {
        return $this->belongsTo(Destination::class);
    }

    public function scheduleDays(): HasMany
    {
        return $this->hasMany(ScheduleDay::class)->orderBy('day_number');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function inclusions(): BelongsToMany
    {
        return $this->belongsToMany(Inclusion::class);
    }

    public function exclusions(): BelongsToMany
    {
        return $this->belongsToMany(Exclusion::class);
    }

    public function gallery(): HasMany
    {
        return $this->hasMany(PackageGallery::class);
    }
}

// Booking Model
class Booking extends Model
{
    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }

    public function travelers(): HasMany
    {
        return $this->hasMany(Traveler::class)->orderBy('sequence_number');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(BookingDocument::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(TourLeaderAssignment::class);
    }
}
```

---

**Domain:** Tourism/Travel
**Version:** 2.0
**Last Updated:** 2026-02-23