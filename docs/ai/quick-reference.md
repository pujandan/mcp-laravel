# Quick Reference - All Coding Rules

This file contains ALL coding rules and patterns for Laravel development using this architecture. Use this as your primary reference when coding.

> **💡 Design & UI Rules:** For frontend/UI guidelines (colors, typography, components), refer to **docs/design-system.md**
>
> **⚡ Livewire 4 Rules:** For Livewire component patterns and best practices, refer to **docs/patterns/livewire.md**

---

## Table of Contents

1. [Naming Conventions](#1-naming-conventions)
2. [Controller Rules](#2-controller-rules)
3. [Service Rules](#3-service-rules)
4. [Model Rules](#4-model-rules)
5. [Request Rules](#5-request-rules)
6. [Resource Rules](#6-resource-rules)
7. [Route Rules](#7-route-rules)
8. [Migration Rules](#8-migration-rules)
9. [Response Format Rules](#9-response-format-rules)
10. [Transaction Pattern Rules](#10-transaction-pattern-rules)
11. [Error Handling Rules](#11-error-handling-rules)
12. [Model Retrieval Pattern](#12-model-retrieval-pattern)
13. [Enum Pattern Rules](#13-enum-pattern-rules)
14. [Common Mistakes](#14-common-mistakes)
15. [Safe Execution Pattern](#15-safe-execution-pattern)

---

## 1. Naming Conventions

### 1.1 Database Naming

| Type | Convention | Example | Rule |
|------|------------|---------|------|
| **Table Name** | `snake_case` + plural | `category_accounts`, `users`, `products` | Always plural |
| **Column Name** | `snake_case` | `device_id`, `created_at`, `is_active` | Lowercase with underscores |
| **Primary Key** | `id` (UUID) | `$table->uuid('id')->primary()` | Use UUID, not auto-increment |
| **Foreign Key** | `{relation}_id` | `user_id`, `category_id`, `parent_id` | Reference relation + _id |

### 1.2 Model Naming

| Type | Convention | Example | Rule |
|------|------------|---------|------|
| **Class Name** | `PascalCase` + singular | `CategoryAccount`, `User`, `Product` | Singular, not plural |
| **File Name** | Same as class | `CategoryAccount.php`, `User.php` | Match class name |
| **Properties** | `snake_case` | `$this->device_id`, `$this->created_at` | Match database columns |
| **Methods/Relations** | `camelCase` | `codeAccount()`, `user()`, `findById()` | NOT snake_case! |

### 1.3 Controller Naming

| Type | Convention | Example | Rule |
|------|------------|---------|------|
| **Class Name** | `PascalCase` + "Controller" | `UserController`, `ProductController` | Always end with Controller |
| **File Location** | `Api/{Module}/{Entity}/` | `Api/Common/User/UserController.php` | Module/Entity structure |
| **Methods** | `camelCase` | `index()`, `store()`, `update()`, `destroy()` | RESTful methods |

### 1.4 Service Naming

| Type | Convention | Example | Rule |
|------|------------|---------|------|
| **Service Class** | `PascalCase` + "Service" | `UserService`, `ProductService` | Always end with Service |
| **Interface Name** | `PascalCase` + "Interface" | `UserInterface`, `ProductInterface` | Without "Service" suffix |
| **File Location** | `app/Services/{Domain}/` | `Services/Common/User/UserService.php` | Domain-based structure |
| **Methods** | `camelCase` | `paginate()`, `find()`, `create()`, `update()`, `delete()` | CRUD operations |

### 1.5 Route Naming

| Type | Convention | Example | Rule |
|------|------------|---------|------|
| **URL Path** | `kebab-case` + plural | `/users`, `/products`, `/category-accounts` | Always plural, kebab-case |
| **Route Name** | `dot.notation` | `common.users.index`, `products.store` | Module.entity.action |
| **Route Prefix** | `lowercase` | `Route::prefix('common')`, `Route::prefix('api')` | Module name |

### 1.6 Request Naming

| Type | Convention | Example | Rule |
|------|------------|---------|------|
| **Index Request** | `{Entity}Request` | `UserRequest`, `ProductRequest` | For listing/filtering |
| **Form Request** | `{Entity}FormRequest` | `UserFormRequest`, `ProductFormRequest` | For store/update |
| **File Location** | `app/Http/Requests/Api/{Module}/{Entity}/` | `Requests/Api/Common/User/UserRequest.php` | Match entity structure |

### 1.7 Resource Naming

| Type | Convention | Example | Rule |
|------|------------|---------|------|
| **Resource (Single)** | `{Entity}Resource` | `UserResource`, `ProductResource` | For single entity |
| **Collection (List)** | `{Entity}Collection` | `UserCollection`, `ProductCollection` | For list of entities |
| **File Location** | `app/Http/Resources/Api/{Module}/{Entity}/` | `Resources/Api/Common/User/UserResource.php` | Match entity structure |

---

## 2. Controller Rules

### 2.1 Mandatory Rules

| # | Rule | Example |
|---|------|---------|
| 1 | **MUST inject Service via constructor** | `private ServiceInterface $service` |
| 2 | **MUST use DB::transaction for write operations** | `DB::transaction(function () { ... })` |
| 3 | **MUST NOT use DB::transaction for read operations** | No transaction for `index()`, `show()` |
| 4 | **MUST return via AppResponse::success()** | `AppResponse::success(JsonResource, message)` |
| 5 | **MUST use __() for locale (NOT Lang::get())** | `__('message.successLoaded')` |
| 6 | **MUST add @throws Throwable for methods with DB::transaction** | `@throws Throwable` in PHPDoc |
| 7 | **MUST NOT have try-catch blocks** | Let Handler.php manage exceptions |
| 8 | **MUST NOT put business logic in controller** | Business logic goes to service |
| 9 | **MUST NOT call Model directly (use service)** | `$this->service->find($id)` not `Model::find($id)` |
| 10 | **MUST wrap array responses with JsonResource::make()** | `JsonResource::make($arrayData)` |

### 2.2 Response Format

```php
// ✅ CORRECT - JsonResource first, message second
return AppResponse::success(
    JsonResource::make($data),      // Parameter 1: JsonResource
    __('message.successLoaded')     // Parameter 2: message
);

// ❌ WRONG - Parameters reversed
return AppResponse::success(
    __('message.successLoaded'),    // Wrong order!
    $data
);

// For array responses:
return AppResponse::success(
    JsonResource::make($arrayData), // Wrap array
    __('message.actionCompleted')
);
```

### 2.3 Transaction Pattern

```php
// ✅ CORRECT - Write operation with transaction
public function store(FormRequest $request): JsonResponse
{
    return DB::transaction(function () use ($request) {
        $item = $this->service->create($request->validated());
        return AppResponse::success(Resource::make($item), __('message.saved'));
    });
}

// ✅ CORRECT - Read operation without transaction
public function show(string $id): JsonResponse
{
    $item = $this->service->find($id);
    return AppResponse::success(Resource::make($item), __('message.loaded'));
}

// ❌ WRONG - Write operation without transaction
public function store(FormRequest $request): JsonResponse
{
    $item = $this->service->create($request->validated());
    return AppResponse::success(Resource::make($item), __('message.saved'));
}
```

### 2.4 Method Length

| Method Type | Maximum Lines | Notes |
|-------------|---------------|-------|
| **Controller methods** | 20 lines | Keep thin, delegate to service |
| **Custom actions** | 20 lines | Extract to service if longer |

---

## 3. Service Rules

### 3.1 Mandatory Rules

| # | Rule | Example |
|---|------|---------|
| 1 | **MUST have Interface** (REQUIRED for all services) | `interface EntityInterface` |
| 2 | **MUST implement Interface** | `class EntityService implements EntityInterface` |
| 3 | **MUST use AppTransactional trait** | `use AppTransactional;` |
| 4 | **MUST call $this->requireTransaction() in ALL write methods** | First line of write methods |
| 5 | **MUST NOT call requireTransaction() in read methods** | Only for write operations |
| 6 | **MUST NOT use DB::transaction()** | Transactions managed by controller |
| 7 | **MUST NOT have try-catch blocks** | Let Handler.php manage exceptions |
| 8 | **MUST handle all business logic** | Validation, checks, rules |
| 9 | **MUST return Model, not JSON** | Controller handles JSON response |
| 10 | **MUST use type hints for all methods** | Parameters and return types |
| 11 | **MUST register Interface binding in AppServiceProvider** | `$this->app->bind(Interface::class, Service::class);` |

### 3.2 Service Interface Pattern

**CRITICAL: ALL parameters must be explicit, NO array $data or array $filters!**

```php
// ✅ CORRECT - ALL parameters are explicit
interface UserInterface
{
    // Paginate: ALL filters as explicit parameters
    public function paginate(
        PaginationData $pagination,
        ?string $search = null,
        ?string $status = null,
        ?string $department = null
    ): LengthAwarePaginator;

    public function find(string $id): User;

    // Create: ALL fields as explicit parameters (NO array $data)
    public function create(
        string $name,
        string $email,
        ?string $phone = null,
        ?string $department = null
    ): User;

    // Update: ALL fields as explicit parameters (NO array $data)
    public function update(
        string $id,
        ?string $name = null,
        ?string $email = null,
        ?string $phone = null,
        ?string $department = null
    ): User;

    public function delete(string $id): User;
}

// Service implements interface
class UserService implements UserInterface
{
    use AppTransactional;

    // Implementation...
}
```

### 3.3 Write vs Read Methods

```php
// ✅ WRITE method - With requireTransaction(), ALL parameters explicit
public function create(
    string $name,
    string $email,
    ?string $phone = null,
    ?string $department = null
): User {
    $this->requireTransaction();  // Required at start

    // Business logic: Validate uniqueness
    $existing = User::where('email', $email)->first();
    if ($existing) {
        throw new AppException('Email already exists', 422);
    }

    // Build data with ALL explicit parameters
    $createData = [
        'name' => $name,
        'email' => $email,
        'phone' => $phone,
        'department' => $department,
    ];

    // Remove null values
    $createData = array_filter($createData, fn($v) => $v !== null);

    return User::create($createData);
}

// ✅ READ method - No requireTransaction(), ALL filters explicit
public function paginate(
    PaginationData $pagination,
    ?string $search = null,
    ?string $status = null,
    ?string $department = null
): LengthAwarePaginator {
    $query = User::query();

    if ($search !== null) {
        $query->where('name', 'like', "%{$search}%");
    }

    if ($status !== null) {
        $query->where('status', $status);
    }

    if ($department !== null) {
        $query->where('department', $department);
    }

    return AppQuery::paginate($query, $pagination);
}
```

### 3.4 Business Logic in Service

```php
// ✅ CORRECT - ALL fields as explicit parameters
public function create(
    string $name,
    string $email,
    ?string $phone = null,
    ?string $department = null
): User {
    $this->requireTransaction();

    // Business rule: Check uniqueness using explicit parameter
    $existing = User::where('email', $email)->first();
    if ($existing) {
        throw new AppException('Email already exists', 422);
    }

    // Build data with ALL explicit parameters
    $createData = [
        'name' => $name,
        'email' => $email,
        'phone' => $phone,
        'department' => $department,
        'status' => UserStatus::ACTIVE,
    ];

    // Remove null values for optional fields
    $createData = array_filter($createData, fn($v) => $v !== null);

    return User::create($createData);
}

// ❌ WRONG - Using array $data parameter
public function create(string $name, string $email, array $data = []): User
{
    // Missing explicit parameters for phone, department, etc.
    $createData = array_merge(['name' => $name, 'email' => $email], $data);
    return User::create($createData);
}

// ❌ WRONG - Business logic in controller
public function store(FormRequest $request): JsonResponse
{
    // Business logic should be in service!
    $existing = User::where('email', $request->email)->first();
    if ($existing) {
        // ...
    }
}
```

### 3.5 Method Length

| Method Type | Maximum Lines | Notes |
|-------------|---------------|-------|
| **Service methods** | 30 lines | Extract to private methods if longer |

### 3.6 Service Registration Pattern

**CRITICAL: After creating a new service, you MUST register it in AppServiceProvider immediately!**

```php
// ❌ WRONG - Service not registered
class UserService implements UserInterface
{
    // Implementation...
}

// Result: Error 500 - "Target [Interface] is not instantiable"

// ✅ CORRECT - Register service in AppServiceProvider
// File: app/Providers/AppServiceProvider.php

use App\Services\Common\User\UserInterface;
use App\Services\Common\User\UserService;

public function register(): void
{
    // Register User Service
    $this->app->bind(UserInterface::class, UserService::class);
}
```

**When to Register:**
- Immediately after creating Interface and Service classes
- Before testing the controller
- Add both `use` statements and binding in same commit

**Common Errors if Not Registered:**
- Error 500: "Target [Interface] is not instantiable"
- Dependency injection fails
- Controller cannot be instantiated

---

## 4. Model Rules

### 4.1 Mandatory Rules

| # | Rule | Example |
|---|------|---------|
| 1 | **MUST use HasUuids trait** | `use HasUuids;` for UUID primary keys |
| 2 | **MUST use AppAuditable trait** | `use AppAuditable;` for audit trails |
| 3 | **MUST use guarded instead of fillable** | `protected $guarded = ['id', 'created_at', 'updated_at'];` |
| 4 | **MUST use camelCase for relation methods** | `public function user()` not `user_relation()` |
| 5 | **MUST use SoftDeletes if deleted_by needed** | `use SoftDeletes;` |
| 6 | **MUST NOT put business logic in model** | Business logic goes to service |

### 4.2 Model Template

```php
<?php

namespace App\Models;

use App\Traits\AppAuditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Model
{
    use HasUuids, AppAuditable, SoftDeletes;

    protected $guarded = ['id', 'created_at', 'updated_at'];

    protected $casts = [
        'is_active' => 'boolean',
        'last_login_at' => 'datetime',
    ];

    // ✅ camelCase relation method
    public function profile(): BelongsTo
    {
        return $this->belongsTo(Profile::class);
    }

    // ❌ WRONG - snake_case relation
    // public function user_profile() { ... }
}
```

### 4.3 Relationship Naming

| Database Column | Model Method | Type |
|-----------------|--------------|------|
| `user_id` | `user()` | `belongsTo` |
| `category_id` | `category()` | `belongsTo` |
| `parent_id` | `parent()` | `belongsTo` |
| - | `posts()` | `hasMany` |
| - | `comments()` | `hasMany` |

---

## 5. Request Rules

### 5.1 Mandatory Rules

| # | Rule | Example |
|---|------|---------|
| 1 | **MUST create two request classes per entity** | `{Entity}Request` (index), `{Entity}FormRequest` (form) |
| 2 | **MUST use AppRequest::pagination() for index** | `AppRequest::pagination([...])` |
| 3 | **MUST define custom attribute names** | `attributes()` method with `__()` |
| 4 | **MUST use AppRequestTrait** | `use AppRequestTrait;` |

### 5.2 Index Request Template

```php
<?php

namespace App\Http\Requests\Api\Common\User;

use App\Helpers\AppRequest;
use App\Traits\AppRequestTrait;
use Illuminate\Foundation\Http\FormRequest;

class UserRequest extends FormRequest
{
    use AppRequestTrait;

    public function authorize(): bool
    {
        return true;
    }

    public function attributes()
    {
        return [
            'filter.search' => __('label.search'),
            'filter.status' => __('label.status'),
        ];
    }

    public function rules(): array
    {
        return AppRequest::pagination([
            'filter.search' => ['nullable', 'string'],
            'filter.status' => ['nullable', 'string'],
        ]);
    }
}
```

### 5.3 Form Request Template

```php
<?php

namespace App\Http\Requests\Api\Common\User;

use App\Traits\AppRequestTrait;
use Illuminate\Foundation\Http\FormRequest;

class UserFormRequest extends FormRequest
{
    use AppRequestTrait;

    public function authorize(): bool
    {
        return true;
    }

    public function attributes()
    {
        return [
            'name' => __('label.name'),
            'email' => __('label.email'),
            'phone_number' => __('label.phoneNumber'),
        ];
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'phone_number' => ['nullable', 'string'],
        ];
    }
}
```

---

## 6. Resource Rules

### 6.1 Mandatory Rules

| # | Rule | Example |
|---|------|---------|
| 1 | **MUST create two resource classes per entity** | `{Entity}Resource` (single), `{Entity}Collection` (list) |
| 2 | **MUST use AppHelper::toCamelCase() in toArray()** | Convert all keys to camelCase |
| 3 | **MUST include audit information** | Created/updated/deleted with user info |
| 4 | **MUST use $this->when() for conditional loading** | For relations |
| 5 | **MUST use dedicated Resource for nested relations** | Don't inline relation data |

### 6.2 Resource Template

```php
<?php

namespace App\Http\Resources\Api\Common\User;

use App\Helpers\AppHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'status' => $this->status,

            // ✅ Use dedicated Resource for relations
            'profile' => $this->when($this->relationLoaded('profile'), function () {
                return ProfileResource::make($this->profile);
            }),

            // ✅ Include audit information
            'audit' => [
                'created' => [
                    'at' => $this->created_at?->format('Y-m-d H:i:s'),
                    'by' => $this->creator_name,
                    'byId' => $this->created_by,
                ],
                'updated' => [
                    'at' => $this->updated_at?->format('Y-m-d H:i:s'),
                    'by' => $this->updater_name,
                    'byId' => $this->updated_by,
                ],
            ],
        ];

        // ✅ Convert to camelCase for API response
        return AppHelper::toCamelCase($data);
    }
}
```

### 6.3 Collection Template

```php
<?php

namespace App\Http\Resources\Api\Common\User;

use App\Helpers\AppResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

class UserCollection extends ResourceCollection
{
    /**
     * Transform the resource collection into an array.
     *
     * @param Request $request
     * @return array
     */
    public function toArray(Request $request): array
    {
        return [
            // ✅ CRITICAL: Wrap collection with dedicated Resource
            // This ensures each item goes through Resource transform (audit info, camelCase, etc.)
            'data' => UserResource::collection($this->collection),

            // ✅ Use AppResource helper for consistent pagination format
            'pagination' => AppResource::pagination($this),
        ];
    }
}
```

**IMPORTANT NOTES:**

1. **MUST wrap with Resource**: Always use `{Entity}Resource::collection($this->collection)`
   - Without this: No audit info, no camelCase conversion, no custom formatting
   - Each item must go through Resource's `toArray()` method

2. **MUST use AppResource::pagination()**: Helper for consistent pagination format
   - Returns: page, size, from, to, count, total, pageLast, pageMore
   - Consistent format across all collections

3. **Type hint toArray()**: Always use `Request $request` not just `$request`

---

## 7. Route Rules

### 7.1 Mandatory Rules

| # | Rule | Example |
|---|------|---------|
| 1 | **MUST use kebab-case + plural for URL** | `/users`, `/products` |
| 2 | **MUST group routes by module** | `Route::prefix('common')->group(...)` |
| 3 | **MUST use route names with dot notation** | `common.users.index` |
| 4 | **MUST use resource controllers for CRUD** | Standard RESTful methods |

### 7.2 Route Template

```php
// routes/api.php

Route::prefix('common')->group(function () {
    // Users Routes
    Route::get('users', [UserController::class, 'index'])
        ->name('common.users.index');

    Route::post('users', [UserController::class, 'store'])
        ->name('common.users.store');

    Route::get('users/{id}', [UserController::class, 'show'])
        ->name('common.users.show');

    Route::put('users/{id}', [UserController::class, 'update'])
        ->name('common.users.update');

    Route::delete('users/{id}', [UserController::class, 'destroy'])
        ->name('common.users.destroy');
});
```

### 7.3 Route Naming Convention

```php
// Format: {module}.{entity}.{action}
'common.users.index'
'common.users.store'
'common.users.show'
'common.users.update'
'common.users.destroy'
```

---

## 8. Migration Rules

### 8.1 Mandatory Rules

| # | Rule | Example |
|---|------|---------|
| 1 | **MUST use UUID for primary keys** | `$table->uuid('id')->primary()` |
| 2 | **MUST use auditFields() macro for new tables** | `$table->auditFields()` |
| 3 | **MUST use auditFieldsSafe() for existing tables** | `$table->auditFieldsSafe()` |
| 4 | **MUST add foreign key constraints** | `->constrained()->onUpdate('cascade')->onDelete('cascade')` |
| 5 | **MUST add indexes for frequently queried columns** | `$table->index(['column'])` |

### 8.2 Migration Template

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Foreign keys
            $table->foreignUuid('role_id')
                ->nullable()
                ->constrained()
                ->onUpdate('cascade')
                ->onDelete('set null');

            // Columns
            $table->string('name');
            $table->string('email')->unique();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->boolean('is_active')->default(true);

            // Audit fields
            $table->auditFields();

            $table->timestamps(6);
            $table->softDeletes(); // Add this if you need deleted_by
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
```

### 8.3 Audit Fields Macro

```php
// For NEW tables
$table->auditFields();

// What gets added:
// - created_by (UUID, nullable, FK to users)
// - updated_by (UUID, nullable, FK to users)
// - deleted_by (UUID, nullable, FK to users) ONLY if softDeletes() is present
// - All columns indexed
// - Foreign keys with ON DELETE SET NULL
```

---

## 9. Response Format Rules

### 9.1 Response Structure

```php
// Success Response
{
    "success": true,
    "message": "Data loaded successfully",
    "data": {
        "id": "uuid",
        "fieldName": "value",
        "audit": { ... }
    }
}

// Error Response
{
    "success": false,
    "message": "Error message",
    "errors": { ... }
}
```

### 9.2 AppResponse::success() Signature

```php
public static function success(?JsonResource $data, ?string $message = null): JsonResponse

// Parameter 1: JsonResource (or null)
// Parameter 2: Message string (or null)
```

### 9.3 Correct Response Patterns

```php
// ✅ Single entity
return AppResponse::success(
    EntityResource::make($entity),
    __('message.successLoaded')
);

// ✅ Collection
return AppResponse::success(
    new EntityCollection($entities),
    __('message.successLoaded')
);

// ✅ Array data (wrap with JsonResource::make())
return AppResponse::success(
    JsonResource::make($arrayData),
    __('message.actionCompleted')
);

// ❌ WRONG - Unwrapped array
return AppResponse::success(
    $arrayData,  // Type error!
    __('message.actionCompleted')
);
```

---

## 10. Transaction Pattern Rules

### 10.1 Controller Transaction Rules

| Operation | Transaction Required | Pattern |
|-----------|---------------------|---------|
| **CREATE (store)** | ✅ YES | `DB::transaction(function () { ... })` |
| **UPDATE (update)** | ✅ YES | `DB::transaction(function () { ... })` |
| **DELETE (destroy)** | ✅ YES | `DB::transaction(function () { ... })` |
| **READ (index, show)** | ❌ NO | No transaction wrapper |
| **Custom write** | ✅ YES | `DB::transaction(function () { ... })` |

### 10.2 Service Transaction Rules

| Method Type | requireTransaction() | Pattern |
|-------------|----------------------|---------|
| **CREATE** | ✅ YES | `$this->requireTransaction()` at start |
| **UPDATE** | ✅ YES | `$this->requireTransaction()` at start |
| **DELETE** | ✅ YES | `$this->requireTransaction()` at start |
| **READ** | ❌ NO | No requireTransaction() call |

### 10.3 Complete Transaction Pattern

```php
// Controller
public function store(FormRequest $request): JsonResponse
{
    return DB::transaction(function () use ($request) {
        $item = $this->service->create($request->validated());
        return AppResponse::success(Resource::make($item), __('message.saved'));
    });
}

// Service
public function create(array $data): Model
{
    $this->requireTransaction(); // Enforces transaction

    // Business logic...
    return Model::create($data);
}
```

---

## 11. Error Handling Rules

### 11.1 NO Try-Catch Rule

```php
// ❌ WRONG - Try-catch in controller
public function store(Request $request)
{
    try {
        DB::transaction(function () use ($request) {
            // ...
        });
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
}

// ❌ WRONG - Try-catch in service
public function create(array $data): Model
{
    try {
        $this->requireTransaction();
        return Model::create($data);
    } catch (\Exception $e) {
        throw new AppException('Failed to create', 500);
    }
}

// ✅ CORRECT - No try-catch (Handler.php manages exceptions)
public function store(FormRequest $request)
{
    return DB::transaction(function () use ($request) {
        // Exceptions handled globally
    });
}
```

### 11.2 Throw AppException for Business Logic

```php
// ✅ CORRECT - Business rule violation
if ($entity->quantity < $requested) {
    throw new AppException('Insufficient quantity available', 422);
}

// ✅ CORRECT - Data integrity issue
if ($user->balance < $amount) {
    throw new AppException('Insufficient balance', 422);
}

// ✅ CORRECT - Duplicate entry
$existing = Model::where('email', $email)->first();
if ($existing) {
    throw new AppException('Email already exists', 422);
}
```

### 11.3 Use findOrFail() for Required Models

```php
// ✅ CORRECT - Single line, auto 404
$entity = Entity::findOrFail($id);

// ❌ WRONG - Verbose null check
$entity = Entity::find($id);
if ($entity === null) {
    throw new AppException('Not found', 404);
}
```

---

## 12. Model Retrieval Pattern

### 12.1 When to Use Each Pattern

| Scenario | Method | Example |
|----------|--------|---------|
| **Model must exist** | `findOrFail()` | `$model = Model::findOrFail($id);` |
| **Null is valid state** | `find()` | `$parent = Model::find($parentId); // null OK` |
| **Query with where** | `firstOrFail()` | `$model = Model::where('code', $x)->firstOrFail();` |
| **Query with where (nullable)** | `first()` | `$model = Model::where('status', 'active')->first();` |

### 12.2 Benefits of findOrFail()

| Aspect | findOrFail() | find() + null check |
|--------|-------------|---------------------|
| **Lines of code** | 1 line | 3-4 lines |
| **Error handling** | Automatic via Handler.php | Manual throw required |
| **Consistency** | Standard Laravel pattern | Inconsistent messages |
| **Readability** | Cleaner, more expressive | Verbose, noisy |

---

## 13. Enum Pattern Rules

### 13.1 Enum Value Size Requirement

**For database storage optimization, enum values MUST be short (max 2-3 characters):**

| Type | ✅ Good | ❌ Bad |
|------|--------|-------|
| **Status** | `ac`, `in`, `pe` | `active`, `inactive`, `pending` |
| **Type** | `df`, `pr`, `tr` | `DEFAULT`, `PREMIUM`, `TRIAL` |
| **Category** | `in`, `out`, `tr` | `income`, `outcome`, `transfer` |

### 13.2 Enum Template

```php
<?php

namespace App\Enums;

enum UserStatus: string
{
    case ACTIVE = 'ac';
    case INACTIVE = 'in';
    case PENDING = 'pe';

    public static function label(?string $value): ?string
    {
        return match($value) {
            self::ACTIVE->value => __('label.active'),
            self::INACTIVE->value => __('label.inactive'),
            self::PENDING->value => __('label.pending'),
            default => null,
        };
    }

    public function getLabel(): ?string
    {
        return self::label($this->value);
    }

    public static function toArray(): array
    {
        return [
            self::ACTIVE->value => self::label(self::ACTIVE->value),
            self::INACTIVE->value => self::label(self::INACTIVE->value),
            self::PENDING->value => self::label(self::PENDING->value),
        ];
    }
}
```

### 13.3 Enum Usage

```php
// In Migration
$table->enum('status', array_keys(UserStatus::toArray()))->default('pe');

// In Model
protected $casts = [
    'status' => UserStatus::class,
];

// In Service
if ($user->status === UserStatus::ACTIVE) {
    // ...
}
```

---

## 14. Common Mistakes

### 14.1 Response Parameter Order

```php
// ❌ WRONG
return AppResponse::success(
    __('message.success'),
    $result  // Array in second parameter
);

// ✅ CORRECT
return AppResponse::success(
    JsonResource::make($result),
    __('message.success')
);
```

### 14.2 Locale Function

```php
// ❌ WRONG
Lang::get('message.success')

// ✅ CORRECT
__('message.success')
```

### 14.3 Try-Catch in Controller

```php
// ❌ WRONG
try {
    DB::transaction(function () {
        // ...
    });
} catch (\Exception $e) {
    // Handle
}

// ✅ CORRECT
DB::transaction(function () {
    // Let Handler.php handle exceptions
});
```

### 14.4 Snake_case Relations

```php
// ❌ WRONG
public function user_profile() {
    return $this->belongsTo(Profile::class);
}

// ✅ CORRECT
public function userProfile() {
    return $this->belongsTo(Profile::class);
}
```

### 14.5 Missing @throws Throwable

```php
// ❌ WRONG
public function store(Request $request): JsonResponse
{
    return DB::transaction(function () use ($request) {
        // ...
    });
}

// ✅ CORRECT
/**
 * Store new record.
 *
 * @param Request $request
 * @return JsonResponse
 * @throws Throwable
 */
public function store(Request $request): JsonResponse
{
    return DB::transaction(function () use ($request) {
        // ...
    });
}
```

### 14.6 Service Without Interface

```php
// ❌ WRONG
class UserService
{
    // No interface!
}

// ✅ CORRECT
interface UserInterface
{
    // ...
}

class UserService implements UserInterface
{
    // ...
}
```

### 14.7 DB::transaction in Service

```php
// ❌ WRONG
public function create(array $data): Model
{
    return DB::transaction(function () use ($data) {
        return Model::create($data);
    });
}

// ✅ CORRECT
public function create(array $data): Model
{
    $this->requireTransaction();
    return Model::create($data);
}
```

---

## 15. Safe Execution Pattern

### 15.1 What is AppSafe?

**AppSafe** is a helper for executing operations that should **fail silently** without breaking the main application flow.

**Location:** `app/Helpers/AppSafe.php`

**Deep Dive:** See [docs/patterns/safe-execution.md](../patterns/safe-execution.md) for complete documentation.

---

### 15.2 When to Use AppSafe

| ✅ Use AppSafe For | ❌ DON'T Use AppSafe For |
|-------------------|------------------------|
| Sending emails (welcome, receipts) | Database operations (use transactions) |
| SMS/WhatsApp messages | Critical business logic (payments, inventory) |
| Push notifications | Data integrity operations |
| Webhook calls to 3rd parties | Operations that MUST succeed |
| Cache updates | - |
| Analytics tracking | - |
| Logging to external services | - |

---

### 15.3 Core Methods

| Method | Use Case | Return Value |
|--------|----------|--------------|
| `AppSafe::run()` | Simple silent execution | mixed/null |
| `AppSafe::runWithLevel()` | Custom log level | mixed/null |
| `AppSafe::runMaybe()` | Conditional throw | mixed/null |
| `AppSafe::runWithRetry()` | External API calls (auto retry) | mixed/null |
| `AppSafe::runBatch()` | Multiple operations | array |
| `AppSafe::runWithTimeout()` | Long-running operations | mixed/null |

---

### 15.4 Usage Examples

#### Basic Silent Execution
```php
use App\Helpers\AppSafe;

public function register(Request $request)
{
    $user = User::create($request->validated());

    // Silent failure - won't break user registration
    AppSafe::run('Welcome email', fn() =>
        Mail::to($user->email)->send(new WelcomeEmail($user))
    );

    return AppResponse::success($user, 'Registration successful');
}
```

#### With Retry (External APIs)
```php
// Retry 3 times if API fails
$result = AppSafe::runWithRetry('External API call', function() {
    return Http::timeout(10)->get('https://api.example.com/data');
}, maxAttempts: 3);
```

#### Batch Operations
```php
$results = AppSafe::runBatch([
    ['tag' => 'Email user', 'callback' => fn() =>
        $this->emailService->send(...)
    ],
    ['tag' => 'Email admin', 'callback' => fn() =>
        $this->emailService->send(...)
    ],
]);

// Check results if needed
if (!$results['Email admin']['success']) {
    // Log alert
}
```

#### Custom Log Level
```php
// Log as ERROR instead of WARNING
AppSafe::runWithLevel('Admin email', 'error', fn() =>
    $this->emailService->send(...)
);
```

---

### 15.5 Business Domain Examples

#### E-commerce: Order Confirmation
```php
public function store(Request $request)
{
    $order = DB::transaction(function() use ($request) {
        return Order::create($request->validated());
    });

    // Email customer (silent)
    AppSafe::run('Email customer', fn() =>
        $this->emailService->send(
            to: $order->customer->email,
            subject: 'Order Confirmation - ' . config('app.name'),
            mailable: new OrderConfirmationEmail($order)
        )
    );

    // Email warehouse team (silent)
    AppSafe::run('Email warehouse', fn() =>
        $this->emailService->send(
            to: 'warehouse@example.com',
            subject: "New Order: {$order->number}",
            mailable: new NewOrderEmail($order)
        )
    );

    return AppResponse::success($order, 'Order placed successfully');
}
```

#### HR: Job Application
```php
public function store(Request $request)
{
    $application = DB::transaction(function() use ($request) {
        return JobApplication::create($request->validated());
    });

    // Email applicant (silent)
    AppSafe::run('Email applicant', fn() =>
        $this->emailService->send(
            to: $application->email,
            subject: 'Application Received - ' . config('app.name'),
            mailable: new ApplicationReceivedEmail($application)
        )
    );

    // Email HR team (silent)
    AppSafe::run('Email HR', fn() =>
        $this->emailService->send(
            to: 'hr@example.com',
            subject: "New Application: {$application->name}",
            mailable: new NewApplicationEmail($application)
        )
    );

    return AppResponse::success($application, 'Application submitted');
}
```

---

### 15.6 Logging Structure

All failures are automatically logged to `json-daily` channel:

```json
{
  "message": "SafeRun failed: Send welcome email",
  "context": {
    "tag": "Send welcome email",
    "exception_type": "Swift_TransportException",
    "message": "Connection timed out",
    "file": "/app/Services/MailService.php",
    "line": 45,
    "request": {
      "method": "POST",
      "url": "https://api.example.com/register",
      "request_id": "abc123"
    },
    "user": {
      "id": 1,
      "email": "use***@***"
    }
  }
}
```

---

### 15.7 Best Practices

✅ **DO:**
- Use descriptive tags: "Email customer" not "Send email"
- Use `runBatch()` for multiple related operations
- Use `runWithRetry()` for external API calls
- Monitor logs for failure patterns
- Set up alerts for critical failures

❌ **DON'T:**
- Use for database operations
- Use for critical business logic
- Use for payments or inventory operations
- Overuse (only for non-critical side effects)

---

### 15.8 Quick Reference

| Need to... | Use | Example |
|------------|-----|---------|
| **Send email silently** | `AppSafe::run()` | `AppSafe::run('Email user', fn() => Mail::to(...)->send(...))` |
| **Retry external API** | `AppSafe::runWithRetry()` | `AppSafe::runWithRetry('API call', $callback, maxAttempts: 3)` |
| **Multiple side effects** | `AppSafe::runBatch()` | `AppSafe::runBatch([['tag' => '...', 'callback' => fn() => ...]])` |
| **Custom log level** | `AppSafe::runWithLevel()` | `AppSafe::runWithLevel('tag', 'error', $callback)` |

---

## Quick Reference Tables

### What to Use When

| Need to... | Use | Reference |
|------------|-----|-----------|
| **Name a table** | `snake_case` + plural | Section 1.1 |
| **Name a model** | `PascalCase` + singular | Section 1.2 |
| **Name a relation method** | `camelCase` | Section 1.2 |
| **Return JSON response** | `AppResponse::success(JsonResource, message)` | Section 9 |
| **Wrap write operation** | `DB::transaction()` | Section 10 |
| **Enforce transaction in service** | `$this->requireTransaction()` | Section 10 |
| **Handle business logic error** | `throw new AppException($message, 422)` | Section 11 |
| **Get required model** | `Model::findOrFail($id)` | Section 12 |
| **Get optional model** | `Model::find($id)` | Section 12 |
| **Display locale message** | `__('message.key')` | Section 2 |
| **Create enum** | Short values (max 2-3 chars) | Section 13 |

---

**Last Updated:** 2026-02-24
**Version:** 2.0 (Generic/Universal)