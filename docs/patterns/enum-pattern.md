# Enum Pattern

Detailed guide for using PHP 8+ enums in the Youmrah project.

---

## When to Use Enums

Use PHP 8+ **backed enums** for:
- Fixed sets of related constants
- Database ENUM columns
- Type-safe value choices
- Validation rule sets

---

## Naming Convention

**Enum classes should NOT have `Enum` suffix:**

| ❌ WRONG | ✅ CORRECT |
|---------|-----------|
| `DeviceStatusEnum` | `DeviceStatus` |
| `DeviceTypeEnum` | `DeviceType` |
| `TransactionTypeEnum` | `TransactionType` |

**Why?** Redundant - the `enum` keyword already indicates it's an enum.

---

## Enum Value Size Requirement

**For database storage optimization, enum values MUST be short (max 2-3 characters):**

| Type | ✅ Good | ❌ Bad |
|------|--------|-------|
| **Status** | `pn`, `cn`, `dc`, `er` | `pending`, `connected`, `disconnected` |
| **Type** | `df`, `mk` | `DEFAULT`, `MARKETING` |
| **Category** | `in`, `out`, `tr` | `income`, `outcome`, `transfer` |

**Why?**
- Database ENUM stores full value in every row
- Short values = significant storage savings at scale
- Example: 1M rows × `disconnected` (12 chars) vs `dc` (2 chars) = **10MB saved**

---

## Enum Template

**Location:** `app/Enums/{Name}.php` (NO `Enum` suffix)

```php
<?php

namespace App\Enums;

use Illuminate\Support\Str;

enum DeviceStatus: string
{
    case PENDING = 'pn';       // Pending connection
    case CONNECTED = 'cn';     // Connected
    case DISCONNECTED = 'dc';  // Disconnected
    case ERROR = 'er';         // Error

    public function label(): string
    {
        return match ($this) {
            self::PENDING => __('label.deviceStatusPending'),
            self::CONNECTED => __('label.deviceStatusConnected'),
            self::DISCONNECTED => __('label.deviceStatusDisconnected'),
            self::ERROR => __('label.deviceStatusError'),
        };
    }

    public function code(): string
    {
        return Str::upper($this->value);
    }
}
```

**Important Notes:**
- Use `case` NOT `const` for backed enums
- Use `self::CASE_NAME` to access enum case (NOT `self::CASE_NAME->value` in match expressions)
- `label()` is instance method using `match($this)` - simpler than static approach
- `code()` instance method returns uppercase backing value
- Case names should be descriptive (PascalCase, UPPER_CASE)
- Laravel automatically converts enum objects to backing values when serialized to JSON or used in queries/validation

---

## Enum Usage

### In Migrations

```php
// ✅ CORRECT - Use built-in cases() method directly
$table->enum('type', PaymentType::cases())->default(PaymentType::PAYMENT_PACKAGE->value);

// ❌ WRONG - Hardcoded values
$table->enum('status', ['pending', 'connected', 'disconnected'])->default('pending');
```

### In Models

```php
use App\Enums\DeviceStatus;

class WhatsappDevice extends Model
{
    protected $casts = [
        'status' => DeviceStatus::class, // Auto-cast to enum
    ];

    public function isConnected(): bool
    {
        return $this->status === DeviceStatus::CONNECTED;
    }
}
```

### In Validation

```php
// FormRequest validation - WAJIB gunakan AppHelper atau manual convert
use App\Helpers\AppHelper;

public function rules(): array
{
    return [
        // ✅ BENAR - Dengan helper (paling clean)
        'status' => ['required', 'in:' . AppHelper::enumCasesToString(PaymentType::class)],
        'type' => ['required', 'in:' . AppHelper::enumCasesToString(PackageType::class)],
        'passport_status' => ['required', 'in:' . AppHelper::enumCasesToString(PassportStatus::class)],

        // ✅ JUGA BENAR - Manual convert (verbose tapi work)
        'vaccine_status' => ['required', 'in:' . implode(',', array_map(fn($t) => $t->value, VaccineStatus::cases()))],
    ];
}
```

**⚠️ PENTING - Jangan Lakukan Ini:**
```php
// ❌ SALAH - TIDAK AKAN WORK!
'type' => ['required', 'in:' . implode(',', PaymentType::cases())]
// Error: Object of class PaymentType could not be converted to string
```

**Kenapa?** `cases()` mengembalikan **array of enum objects**, bukan string. `implode()` tidak bisa convert enum objects ke string secara otomatis. Jadi **WAJIB** convert ke backing values dulu dengan helper atau manual `array_map(fn($t) => $t->value, ...)`.

### In Services

```php
// Type-safe value comparison
if ($device->status === DeviceStatus::CONNECTED) {
    // Do something
}

// Get label from enum
$label = $device->status->label();
$code = $device->status->code();  // Returns uppercase backing value

// Get backing value directly
$value = DeviceStatus::PENDING->value;  // 'pn'
```

### In Queries

```php
// Query builder - Use cases() directly
$payments = Payment::whereIn('type', PaymentType::cases())->get();

// Raw queries - Use ->value for actual backing value
$type = PaymentType::PAYMENT_PACKAGE->value;  // 'pp'
DB::table('payments')->where('type', $type)->get();
```

### Helper Functions

Untuk kode yang lebih clean dan reusable, gunakan helper functions dari `AppHelper`:

#### 1. `AppHelper::enumCasesToString()` - Convert Enum to String

Mengubah enum cases menjadi string dengan separator.

**Signature:**
```php
public static function enumCasesToString(string $enumClass, string $separator = ','): string
```

**Usage:**
```php
use App\Helpers\AppHelper;

// Default separator (comma)
$string = AppHelper::enumCasesToString(PackageType::class);
// Result: "direct,closing,free_owner,free_marketing,leader_owner,leader_marketing"

// Custom separator
$string = AppHelper::enumCasesToString(PackageType::class, '|');
// Result: "direct|closing|free_owner|free_marketing|leader_owner|leader_marketing"

// In validation rules
public function rules(): array
{
    return [
        'type' => ['required', 'in:' . AppHelper::enumCasesToString(PackageType::class)],
        'status' => ['required', 'in:' . AppHelper::enumCasesToString(PackageStatus::class)],
    ];
}

// In return statement (API response)
return AppHelper::enumCasesToString(PackageType::class);
```

#### 2. `AppHelper::enumCasesToArray()` - Convert Enum to Array

Mengubah enum cases menjadi array of backing values.

**Signature:**
```php
public static function enumCasesToArray(string $enumClass): array
```

**Usage:**
```php
use App\Helpers\AppHelper;

$array = AppHelper::enumCasesToArray(PackageType::class);
// Result: ['direct', 'closing', 'free_owner', 'free_marketing', 'leader_owner', 'leader_marketing']

// Use in array operations
$allowedTypes = AppHelper::enumCasesToArray(PackageType::class);
if (in_array($inputType, $allowedTypes)) {
    // Valid type
}
```

#### When to Use Helper vs Direct Methods?

| Scenario | Approach | Reason |
|----------|----------|--------|
| **Validation rules** | `AppHelper::enumCasesToString()` | ✅ More readable |
| **Return string** | `AppHelper::enumCasesToString()` | ✅ Cleaner than `implode(array_map(...))` |
| **Array operations** | `AppHelper::enumCasesToArray()` | ✅ Reusable and clean |
| **whereIn() queries** | `PaymentType::cases()` | ✅ Laravel auto-converts |
| **Migration enum()** | `PaymentType::cases()` | ✅ Laravel accepts array of enum objects |

---

## When to Use `->value`

**Golden Rule:** Use enum object WITHOUT `->value` whenever possible. Only use `->value` when explicitly required.

---

### ✅ TANPA `->value` (Gunakan Enum Object)

Gunakan dalam situasi berikut:

#### 1. Comparison dengan Enum Object
```php
// Type-safe comparison
if ($payment->type === PaymentType::PAYMENT_PACKAGE) { }
if ($status !== DeviceStatus::CONNECTED) { }
```

#### 2. Laravel Auto-Convert (whereIn, cases(), validation)
```php
// Query builder whereIn - Laravel otomatis convert SELALU works!
Payment::whereIn('type', PaymentType::cases())->get()  // ✅
Payment::whereIn('type', [PaymentType::PAYMENT_PACKAGE])->get()  // ✅
DB::table('payments')->whereIn('type', [PaymentType::PAYMENT_PACKAGE])->get()  // ✅

// where() dengan Model yang punya enum cast - Works!
Payment::where('type', PaymentType::PAYMENT_PACKAGE)->get()  // ✅ (jika 'type' ada di $casts)

// Validation rules - WAJIB gunakan helper atau manual convert
'in:' . AppHelper::enumCasesToString(PaymentType::class)  // ✅ Helper method
'in:' . implode(',', array_map(fn($t) => $t->value, PaymentType::cases()))  // ✅ Manual

// Migration enum definition
$table->enum('type', PaymentType::cases())
```

#### 3. Match Expression dalam Enum
```php
// Di dalam enum method - gunakan self::CASE_NAME
public function label(): string
{
    return match ($this) {
        self::PAYMENT_PACKAGE => __('label.lbPay'),
        self::REFUND_PACKAGE => __('label.lbRefund'),
    };
}
```

---

### ❌ WAJIB PAKAI `->value` (Butuh String Asli)

Gunakan `->value` dalam situasi berikut:

#### 1. Query Builder `where()` TANPA Enum Cast
```php
// ❌ TIDAK BISA: DB::table('payments')->where('type', PaymentType::PAYMENT_PACKAGE)
// ✅ BENAR (untuk query tanpa model / tanpa enum cast):
DB::table('payments')->where('type', PaymentType::PAYMENT_PACKAGE->value)
DB::table('devices')->where('status', DeviceStatus::CONNECTED->value)
```

**CATATAN:** Jika model punya enum cast untuk column, BISA gunakan tanpa `->value`:
```php
// ✅ BENAR (jika 'type' ada di $casts sebagai PaymentType::class)
Payment::where('type', PaymentType::PAYMENT_PACKAGE)->get()
```

#### 2. Migration Default Values
```php
// ❌ TIDAK BISA: ->default(PaymentType::PAYMENT_PACKAGE)
// ✅ BENAR:
$table->enum('type', PaymentType::cases())->default(PaymentType::PAYMENT_PACKAGE->value);
```

#### 3. String Operations (concat, dsb)
```php
// String concatenation, formatting, dsb
$prefix = 'TYPE_';
$code = $prefix . PaymentType::PAYMENT_PACKAGE->value;  // 'TYPE_pp'
```

#### 4. Array/Object Keys
```php
// Sebagai key array atau object
$data[PaymentType::PAYMENT_PACKAGE->value] = $amount;
```

#### 5. Raw SQL / Database Operations
```php
// Raw queries atau manual database operations
DB::statement("UPDATE payments SET type = '" . PaymentType::PAYMENT_PACKAGE->value . "'");
DB::raw("... WHERE type = '" . PaymentType::PAYMENT_PACKAGE->value . "'");
```

---

### Quick Reference

| Operation | Tanpa `->value` | Pakai `->value` | Helper Function |
|-----------|-----------------|-----------------|-----------------|
| **Comparison** | `$x === PaymentType::PAYMENT_PACKAGE` ✅ | - | - |
| **whereIn()** | `Payment::whereIn('type', [...])` ✅<br/>`DB::table()->whereIn('type', [...])` ✅ | - | - |
| **where()** | `Payment::where('type', PaymentType::PAYMENT_PACKAGE)` ✅<br/><small>*(jika ada enum cast)*</small> | `DB::table()->where('type', PaymentType::PAYMENT_PACKAGE->value)` ✅<br/><small>*(tanpa enum cast)*</small> | - |
| **Migration** | `$table->enum('type', PaymentType::cases())` ✅ | `->default(PaymentType::PAYMENT_PACKAGE->value)` ✅ | - |
| **Validation** | - ❌ Tidak bisa | - | `AppHelper::enumCasesToString(PackageType::class)` ✅ |
| **Array ops** | - | - | `AppHelper::enumCasesToArray(PackageType::class)` ✅ |
| **Return string** | - | `implode(',', array_map(fn($t) => $t->value, ...))` ✅ | `AppHelper::enumCasesToString(PackageType::class)` ✅ |
| **Raw SQL** | - ❌ Tidak bisa | `selectRaw('...', [PaymentType::PAY->value])` ✅ | - |
| **String ops** | - ❌ Tidak bisa | `'prefix_' . PaymentType::PAYMENT_PACKAGE->value` ✅ | - |
| **Match expr** | `self::PAYMENT_PACKAGE` ✅ | - | - |

---

**Related Patterns:**
- [Service Layer Pattern](./service-layer.md)

---

**Last Updated:** 2026-02-05
