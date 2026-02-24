# Reusable Relationships Pattern

**ALWAYS extract duplicate eager loading to a private method** (DRY principle).

This pattern is **REQUIRED** when multiple service methods use the same relationships.

---

## ✅ CORRECT Pattern

```php
class JournalService
{
    /**
     * Get relationships for eager loading
     *
     * @return array
     */
    private function relations(): array
    {
        return [
            'categoryAccount',
            'categoryAccount.codeAccount',
            'categoryAccount.depositAccount',
            'creator',
            'transable' => function (MorphTo $morph) {
                $morph->morphWith([
                    Package::class => ['identity'],
                    Marketing::class => ['identity'],
                    Entity::class => ['identity'],
                ]);
            },
        ];
    }

    // ✅ Use in get() method
    public function get(PaginationData $pagination): array
    {
        $query = Journal::with($this->relations());
        // ... filter and paginate
    }

    // ✅ Use in findById() method
    public function findById(string $id): Journal
    {
        $journal = Journal::with($this->relations())->find($id);

        if ($journal === null) {
            throw new AppException('Not found', 404);
        }

        return $journal;
    }
}
```

---

## ❌ WRONG Pattern

```php
class JournalService
{
    // ❌ DUPLICATED - Same relationships in multiple methods
    public function get(PaginationData $pagination): array
    {
        $query = Journal::with([
            'categoryAccount',
            'categoryAccount.codeAccount',
            'categoryAccount.depositAccount',
            'creator',
            'transable' => function (MorphTo $morph) {
                $morph->morphWith([...]);
            },
        ]);
        // ...
    }

    public function findById(string $id): Journal
    {
        // ❌ DUPLICATED - Same relationships again
        $journal = Journal::with([
            'categoryAccount',
            'categoryAccount.codeAccount',
            'categoryAccount.depositAccount',
            'creator',
            'transable' => function (MorphTo $morph) {
                $morph->morphWith([...]);
            },
        ])->find($id);
        // ...
    }
}
```

---

## Benefits

1. **DRY (Don't Repeat Yourself)** - Single source of truth
2. **Maintainable** - Change relations in one place
3. **Consistent** - Same eager loading across all methods
4. **Testable** - Easier to test with consistent relations

---

## Naming Convention

```php
// ✅ Format: relations() - GENERIC, reusable for all services
private function relations(): array

// Examples:
// UserService::relations() → user relationships
// OrderService::relations() → order relationships
// JournalService::relations() → journal relationships
```

---

**Related Patterns:**
- [Service Layer Pattern](./service-layer.md)

---

**Last Updated:** 2026-01-29
