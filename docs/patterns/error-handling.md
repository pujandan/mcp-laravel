# Error Handling & Logging Pattern

Detailed guide for exception handling and logging in the Youmrah project.

---

## Overview

**Philosophy:** "Log what matters, ignore what's expected"

The system uses hybrid selective logging to reduce noise and focus on important issues.

### Logging Behavior

| Request Type | Log Behavior | Examples |
|--------------|--------------|----------|
| **Web requests** | NO logging | Browser ke halaman tidak ada |
| **API 404/422** | NO logging | Wrong endpoint, validation error |
| **API 401/403** | WARNING log | Unauthorized, forbidden (security monitoring) |
| **API 500+** | ERROR log | Database errors, runtime exceptions |

---

## NO Try-Catch in Controllers or Services

### Rule

**Controllers and Services MUST NOT have try-catch blocks.** Exception handling is centralized in `app/Exceptions/Handler.php`.

### ❌ WRONG - Try-Catch in Controller

```php
class PackageController extends Controller
{
    public function store(Request $request)
    {
        try {
            $package = $this->service->create($request->all());
            return response()->json($package);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
```

**Problems:**
- ❌ Duplicated error handling logic
- ❌ Inconsistent error responses
- ❌ Bypasses global handler
- ❌ Hard to test

### ✅ CORRECT - No Try-Catch

```php
class PackageController extends Controller
{
    public function store(PackageFormRequest $request)
    {
        return DB::transaction(function () use ($request) {
            $package = $this->service->create($request->validated());
            return AppResponse::success(PackageResource::make($package), __('message.saved'));
        });
    }
}
```

**Benefits:**
- ✅ Clean code
- ✅ Consistent error handling via Handler.php
- ✅ Automatic logging (401/403/500+)
- ✅ Automatic JSON responses
- ✅ Easier to test

---

## When to Throw AppException

### Use AppException for Business Logic Violations

```php
// ✅ CORRECT - Business rule violations
class PaymentService
{
    public function processPayment(string $packageId, float $amount): void
    {
        $package = Package::findOrFail($packageId);

        // Business rule: Minimum payment
        if ($amount < 100000) {
            throw new AppException('Minimum payment is Rp 100.000', 422);
        }

        // Business rule: Insufficient balance
        if ($user->balance < $amount) {
            throw new AppException('Insufficient balance', 422);
        }
    }
}
```

### Exception vs Validation

| Scenario | Use | Example |
|----------|-----|---------|
| **User input validation** | Form Request | Email format, required fields |
| **Business logic violation** | AppException | Insufficient balance, duplicate entry |
| **Data not found** | findOrFail() | Model not found (auto 404) |
| **Authorization** | Auth middleware | User cannot access resource |

---

## When to Use Each Pattern

### Pattern 1: Business Rule Validation

```php
class PackageService
{
    public function bookPackage(string $packageId, int $seats): void
    {
        $package = Package::findOrFail($packageId);

        // Business rule: Check availability
        if ($package->remaining_seats < $seats) {
            throw new AppException("Only {$package->remaining_seats} seats available", 422);
        }

        // Business rule: Max booking limit
        if ($seats > 10) {
            throw new AppException('Maximum 10 seats per booking', 422);
        }
    }
}
```

### Pattern 2: Data Integrity Checks

```php
class JournalService
{
    public function createJournal(array $data): Journal
    {
        // Validate debit/credit balance
        if ($data['total_debit'] !== $data['total_credit']) {
            throw new AppException('Journal entry must balance (debit != credit)', 422);
        }

        // Validate accounts exist
        $debitAccount = CodeAccount::findOrFail($data['debit_account_id']);
        $creditAccount = CodeAccount::findOrFail($data['credit_account_id']);

        // Create journal...
    }
}
```

---

## Quick Reference

| Exception Type | HTTP Code | Log Level | Usage |
|----------------|-----------|-----------|-------|
| **AuthenticationException** | 401 | WARNING | User not logged in |
| **AuthorizationException** | 403 | WARNING | User lacks permission |
| **ModelNotFoundException** | 404 | None | Auto-thrown by findOrFail() |
| **ValidationException** | 422 | None | Auto-thrown by Form Request |
| **AppException (422)** | 422 | ERROR | Business logic violation |
| **QueryException** | 500 | ERROR | Database error |
| **RuntimeException** | 500 | ERROR | Unexpected system error |

---

**Related Patterns:**
- [Service Layer Pattern](./service-layer.md)
- [Database Transaction Pattern](./database-transaction.md)

---

**Last Updated:** 2026-01-29
