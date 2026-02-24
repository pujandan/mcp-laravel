# Model Retrieval Pattern

Detailed guide for model retrieval patterns using findOrFail() vs find().

---

## Overview

**CRITICAL: Use `findOrFail()` instead of `find()` + null check**

This pattern leverages the global `ModelNotFoundException` handler in `app/Exceptions/Handler.php` to automatically return 404 responses.

---

## When to Use Each Pattern

| Scenario | Method | Example |
|----------|--------|---------|
| **Model must exist** | `findOrFail()` | `$model = Model::findOrFail($id);` |
| **Null is valid state** | `find()` | `$parent = Model::find($parentId); // null OK` |
| **Query with where (required)** | `firstOrFail()` | `$model = Model::where('code', $x)->firstOrFail();` |
| **Query with where (optional)** | `first()` | `$model = Model::where('status', 'active')->first();` |

---

## ✅ CORRECT: findOrFail()

```php
// Service Layer - Use findOrFail() for cleaner code
class PackageService
{
    public function updatePoint(string $id, int $point): void
    {
        // ✅ Single line - auto-throw 404 via Handler
        $package = Package::findOrFail($id);

        $package->point = $point;
        $package->save();
    }

    public function confirm(string $scheduleId, bool $isJournal): void
    {
        // ✅ Validate schedule existence
        $schedule = Schedule::findOrFail($scheduleId);

        // Business logic continues...
    }
}
```

## ❌ WRONG: find() + Null Check

```php
// Service Layer - Manual null checking (verbose!)
class PackageService
{
    public function updatePoint(string $id, int $point): void
    {
        // ❌ 3-4 lines for simple null check
        $package = Package::find($id);

        if ($package === null) {
            throw new AppException(__('message.emptyLoaded'), 404);
        }

        $package->point = $point;
        $package->save();
    }
}
```

---

## Comparison Table

| Aspect | findOrFail() | find() + Null Check |
|--------|-------------|---------------------|
| **Lines of code** | 1 line | 3-4 lines |
| **Error handling** | Automatic via Handler.php | Manual throw required |
| **Consistency** | Standard Laravel pattern | Inconsistent messages |
| **DRY Principle** | ✅ Follows DRY | ❌ Repeated pattern |
| **Code readability** | Cleaner, more expressive | Verbose, noisy |

---

## How It Works

```php
// app/Exceptions/Handler.php
public function register(): void
{
    $this->renderable(function (ModelNotFoundException $e, Request $request) {
        if ($request->expectsJson()) {
            return response()->json([
                'success' => false,
                'message' => 'Data tidak ditemukan',
            ], 404);
        }
    });
}
```

When you use `Model::findOrFail($id)`:
1. If model exists → returns the model
2. If model not found → throws `ModelNotFoundException`
3. Handler.php catches it → returns JSON 404 response
4. **No manual null checking needed!**

---

## Benefits

1. **Cleaner Code**: Reduces 3-4 lines to 1 line
2. **Consistent Errors**: Standard 404 message via Handler.php
3. **DRY Principle**: No repeated null-checking logic
4. **Expressive**: `findOrFail()` clearly indicates the model must exist
5. **Laravel Standard**: Follows framework best practices

---

## Examples

```php
// ✅ CORRECT - Use findOrFail() for required models
public function update(string $id, array $data): Model
{
    $model = Package::findOrFail($id); // Must exist
    $model->update($data);
    return $model->fresh();
}

// ✅ CORRECT - Use firstOrFail() for query conditions
public function findByCode(string $code): Model
{
    return CategoryAccount::where('code', $code)->firstOrFail();
}

// ✅ CORRECT - Use find() when null is expected
public function getOptionalParent(string $parentId): ?Model
{
    return Model::find($parentId); // null is OK here
}

// ❌ WRONG - Manual null check when findOrFail is better
public function update(string $id, array $data): Model
{
    $model = Model::find($id);
    if ($model === null) {
        throw new AppException('Not found');
    }
    // ...
}
```

---

## Code Reduction Metrics

- **Before**: 4 lines per retrieval
- **After**: 1 line per retrieval
- **Reduction**: 75% less code
- **Impact**: If you have 100 retrievals, you save ~300 lines of code

---

**Related Patterns:**
- [Service Layer Pattern](./service-layer.md)
- [Error Handling Pattern](./error-handling.md)

---

**Last Updated:** 2026-01-29
