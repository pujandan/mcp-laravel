# Implementation Templates

This file contains all implementation templates for each layer. Copy and customize these templates for your needs.

---

## Table of Contents

1. [Controller Template](#1-controller-template)
2. [Service Interface Template](#2-service-interface-template)
3. [Service Implementation Template](#3-service-implementation-template)
4. [Model Template](#4-model-template)
5. [Index Request Template](#5-index-request-template)
6. [Form Request Template](#6-form-request-template)
7. [Resource Template](#7-resource-template)
8. [Collection Template](#8-collection-template)
9. [Migration Template](#9-migration-template)

---

## 1. Controller Template

**File Location:** `app/Http/Controllers/Api/{Module}/{Entity}/{Entity}Controller.php`

```php
<?php

namespace App\Http\Controllers\Api\{Module}\{Entity};

use App\Helpers\AppResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\{Module}\{Entity}\{Entity}FormRequest;
use App\Http\Requests\Api\{Module}\{Entity}\{Entity}Request;
use App\Http\Resources\Api\{Module}\{Entity}\{Entity}Collection;
use App\Http\Resources\Api\{Module}\{Entity}\{Entity}Resource;
use App\Services\{Module}\{Entity}\{Entity}Interface;
use App\Traits\AppPagination;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;
use Throwable;

class {Entity}Controller extends Controller
{
    use AppPagination;

    public function __construct(
        private readonly {Entity}Interface $service
    ) {}

    public function index({Entity}Request $request): JsonResponse
    {
        $items = $this->service->paginate(
            filters: $request->input('filter', []),
            pagination: $this->pagination($request)
        );

        return AppResponse::success(
            new {Entity}Collection($items),
            __('message.successLoaded')
        );
    }

    /**
     * Store new record.
     *
     * @param {Entity}FormRequest $request
     * @return JsonResponse
     * @throws Throwable
     */
    public function store({Entity}FormRequest $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            $item = $this->service->create($request->validated());

            return AppResponse::success(
                {Entity}Resource::make($item),
                __('message.successSaved')
            );
        });
    }

    /**
     * Show single record.
     *
     * @param string $id
     * @return JsonResponse
     */
    public function show(string $id): JsonResponse
    {
        $item = $this->service->find($id);

        return AppResponse::success(
            {Entity}Resource::make($item),
            __('message.successLoaded')
        );
    }

    /**
     * Update existing record.
     *
     * @param {Entity}FormRequest $request
     * @param string $id
     * @return JsonResponse
     * @throws Throwable
     */
    public function update({Entity}FormRequest $request, string $id): JsonResponse
    {
        return DB::transaction(function () use ($request, $id) {
            $item = $this->service->update($id, $request->validated());

            return AppResponse::success(
                {Entity}Resource::make($item),
                __('message.successUpdated')
            );
        });
    }

    /**
     * Delete record.
     *
     * @param string $id
     * @return JsonResponse
     * @throws Throwable
     */
    public function destroy(string $id): JsonResponse
    {
        return DB::transaction(function () use ($id) {
            $item = $this->service->delete($id);

            return AppResponse::success(
                {Entity}Resource::make($item),
                __('message.successDeleted')
            );
        });
    }

    /**
     * Custom action returning array data.
     *
     * @param string $id
     * @return JsonResponse
     * @throws Throwable
     */
    public function customAction(string $id): JsonResponse
    {
        return DB::transaction(function () use ($id) {
            $result = $this->service->customAction($id);

            // Wrap array with JsonResource::make()
            return AppResponse::success(
                JsonResource::make($result),
                __('message.actionCompleted')
            );
        });
    }
}
```

### Template Usage Guide

**Placeholders to replace:**
- `{Module}` - Your module name (e.g., `Common`, `Finance`, `Sales`)
- `{Entity}` - Your entity name (e.g., `User`, `Product`, `Order`)
- `{entity}` - Entity in kebab-case (e.g., `users`, `products`, `orders`)

**Example 1: E-commerce - Product**
```php
// Module: Sales, Entity: Product

namespace App\Http\Controllers\Api\Sales\Product;

use App\Services\Sales\Product\ProductInterface;

class ProductController extends Controller
{
    private ProductInterface $service;
    // ...
}
```

**Example 2: HR - Employee**
```php
// Module: Hr, Entity: Employee

namespace App\Http\Controllers\Api\Hr\Employee;

use App\Services\Hr\Employee\EmployeeInterface;

class EmployeeController extends Controller
{
    private EmployeeInterface $service;
    // ...
}
```

**Example 3: Common - User**
```php
// Module: Common, Entity: User

namespace App\Http\Controllers\Api\Common\User;

use App\Services\Common\User\UserInterface;

class UserController extends Controller
{
    private UserInterface $service;
    // ...
}
```

---

## 2. Service Interface Template

**File Location:** `app/Services/{Module}/{Entity}/{Entity}Interface.php`

```php
<?php

namespace App\Services\{Module}\{Entity};

use App\Models\{Entity};
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use App\Data\PaginationData;

interface {Entity}Interface
{
    /**
     * Get paginated list with filters.
     *
     * @param array $filters
     * @param PaginationData $pagination
     * @return LengthAwarePaginator
     */
    public function paginate(array $filters, PaginationData $pagination): LengthAwarePaginator;

    /**
     * Find by ID or throw 404.
     *
     * @param string $id
     * @return {Entity}
     */
    public function find(string $id): {Entity};

    /**
     * Create new record.
     *
     * @param array $data
     * @return {Entity}
     */
    public function create(array $data): {Entity};

    /**
     * Update existing record.
     *
     * @param string $id
     * @param array $data
     * @return {Entity}
     */
    public function update(string $id, array $data): {Entity};

    /**
     * Delete record.
     *
     * @param string $id
     * @return {Entity}
     */
    public function delete(string $id): {Entity};
}
```

---

## 3. Service Implementation Template

**File Location:** `app/Services/{Module}/{Entity}/{Entity}Service.php`

```php
<?php

namespace App\Services\{Module}\{Entity};

use App\Models\{Entity};
use App\Traits\AppTransactional;
use App\Exceptions\AppException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use App\Data\PaginationData;
use App\Helpers\AppQuery;

class {Entity}Service implements {Entity}Interface
{
    use AppTransactional;

    /**
     * {@inheritdoc}
     */
    public function paginate(array $filters, PaginationData $pagination): LengthAwarePaginator
    {
        $query = {Entity}::query();

        // Apply filters
        if (!empty($filters['search'])) {
            $query->where('name', 'like', "%{$filters['search']}%");
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return AppQuery::paginate($query, $pagination);
    }

    /**
     * {@inheritdoc}
     */
    public function find(string $id): {Entity}
    {
        return {Entity}::findOrFail($id);
    }

    /**
     * {@inheritdoc}
     */
    public function create(array $data): {Entity}
    {
        $this->requireTransaction();

        // Business logic: Validate uniqueness
        $existing = {Entity}::where('unique_field', $data['unique_field'])->first();
        if ($existing) {
            throw new AppException('Record already exists', 422);
        }

        // Business logic: Set default values
        $data['status'] = '{DefaultValue}';

        // Create model
        $entity = {Entity}::create($data);

        return $entity->fresh();
    }

    /**
     * {@inheritdoc}
     */
    public function update(string $id, array $data): {Entity}
    {
        $this->requireTransaction();

        $entity = $this->find($id);

        // Business logic: Prevent immutable field updates
        unset($data['immutable_field']);

        $entity->update($data);

        return $entity->fresh();
    }

    /**
     * {@inheritdoc}
     */
    public function delete(string $id): {Entity}
    {
        $this->requireTransaction();

        $entity = $this->find($id);

        // Business logic: Validation before delete
        if ($entity->status === 'active') {
            throw new AppException('Cannot delete active record', 422);
        }

        $entity->delete();

        return $entity;
    }
}
```

### Service Implementation Notes

**READ methods (NO requireTransaction):**
- `paginate()` - For listing with filters
- `find()` - For single record retrieval
- Any custom query methods

**WRITE methods (WITH requireTransaction):**
- `create()` - Must call `$this->requireTransaction()` at start
- `update()` - Must call `$this->requireTransaction()` at start
- `delete()` - Must call `$this->requireTransaction()` at start
- Any custom methods that modify data

---

## 4. Model Template

**File Location:** `app/Models/{Entity}.php`

```php
<?php

namespace App\Models;

use App\Traits\AppAuditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class {Entity} extends Model
{
    use HasUuids, AppAuditable, SoftDeletes;

    /**
     * The attributes that aren't mass assignable.
     *
     * @var array
     */
    protected $guarded = ['id', 'created_at', 'updated_at'];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relation to user (creator).
     *
     * @return BelongsTo
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relation to related model.
     *
     * @return BelongsTo
     */
    public function relatedModel(): BelongsTo
    {
        return $this->belongsTo(RelatedModel::class);
    }
}
```

### Model Notes

**Required Traits:**
- `HasUuids` - For UUID primary keys
- `AppAuditable` - For audit trails (created_by, updated_by, deleted_by)
- `SoftDeletes` - Only if you need `deleted_by` field

**Relation Naming:**
- Use `camelCase` for relation methods
- Example: `user()`, `relatedModel()`, `category()`
- NOT: `user_relation()`, `related_model()`

---

## 5. Index Request Template

**File Location:** `app/Http/Requests/Api/{Module}/{Entity}/{Entity}Request.php`

```php
<?php

namespace App\Http\Requests\Api\{Module}\{Entity};

use App\Helpers\AppRequest;
use App\Traits\AppRequestTrait;
use Illuminate\Foundation\Http\FormRequest;

class {Entity}Request extends FormRequest
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
            'filter.field_name' => __('label.fieldName'),
        ];
    }

    public function rules(): array
    {
        return AppRequest::pagination([
            'filter.search' => ['nullable', 'string'],
            'filter.status' => ['nullable', 'string'],
            'filter.field_name' => ['nullable', 'string'],
        ]);
    }
}
```

---

## 6. Form Request Template

**File Location:** `app/Http/Requests/Api/{Module}/{Entity}/{Entity}FormRequest.php`

```php
<?php

namespace App\Http\Requests\Api\{Module}\{Entity};

use App\Traits\AppRequestTrait;
use Illuminate\Foundation\Http\FormRequest;

class {Entity}FormRequest extends FormRequest
{
    use AppRequestTrait;

    public function authorize(): bool
    {
        return true;
    }

    public function attributes()
    {
        return [
            'field_name' => __('label.fieldName'),
            'email' => __('label.email'),
            'phone_number' => __('label.phoneNumber'),
        ];
    }

    public function rules(): array
    {
        return [
            'field_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:{table_name},email'],
            'phone_number' => ['required', 'string'],
            'status' => ['nullable', 'in:active,inactive'],
            'nested_data' => ['nullable', 'array'],
            'nested_data.*.field' => ['required', 'string'],
        ];
    }
}
```

---

## 7. Resource Template

**File Location:** `app/Http/Resources/Api/{Module}/{Entity}/{Entity}Resource.php`

```php
<?php

namespace App\Http\Resources\Api\{Module}\{Entity};

use App\Helpers\AppHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class {Entity}Resource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param Request $request
     * @return array
     */
    public function toArray(Request $request): array
    {
        $data = [
            'id' => $this->id,
            'field_name' => $this->field_name,
            'status' => $this->status,

            // Nested relations - use dedicated Resource
            'user' => $this->when($this->relationLoaded('user'), function () {
                return UserResource::make($this->user);
            }),

            'relatedModel' => $this->when($this->relationLoaded('relatedModel'), function () {
                return RelatedModelResource::make($this->relatedModel);
            }),

            // Audit information
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

        // Convert to camelCase for API response
        return AppHelper::toCamelCase($data);
    }
}
```

### Resource Notes

**Important:**
- Always use `AppHelper::toCamelCase()` at the end
- Use `$this->when()` for conditional loading
- Use dedicated Resource classes for relations (don't inline)
- Include audit information (created/updated)

---

## 8. Collection Template

**File Location:** `app/Http/Resources/Api/{Module}/{Entity}/{Entity}Collection.php`

```php
<?php

namespace App\Http\Resources\Api\{Module}\{Entity};

use App\Helpers\AppResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

class {Entity}Collection extends ResourceCollection
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
            'data' => {Entity}Resource::collection($this->collection),
            'meta' => [
                'pagination' => AppResource::pagination($this),
            ],
        ];
    }
}
```

---

## 9. Migration Template

**File Location:** `database/migrations/YYYY_MM_DD_HHMMSS_create_{table_name}_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('{table_name}', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Foreign keys
            $table->foreignUuid('user_id')
                ->constrained()
                ->onUpdate('cascade')
                ->onDelete('cascade');

            $table->foreignUuid('related_model_id')
                ->nullable()
                ->constrained()
                ->onUpdate('cascade')
                ->onDelete('set null');

            // Columns
            $table->string('field_name');
            $table->string('email')->unique();
            $table->text('description')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->boolean('is_active')->default(true);

            // Audit fields
            $table->auditFields();

            $table->timestamps(6);
            $table->softDeletes(); // Add this if you need deleted_by
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('{table_name}');
    }
};
```

### Migration Notes

**auditFields() macro adds:**
- `created_by` (UUID, nullable, FK to users)
- `updated_by` (UUID, nullable, FK to users)
- `deleted_by` (UUID, nullable, FK to users) - ONLY if softDeletes() is present
- Indexes on all audit columns
- Foreign keys with ON DELETE SET NULL

**Table Naming:**
- Use `snake_case` + plural
- Example: `users`, `products`, `category_accounts`

---

## Template Customization Guide

### Step-by-Step: Create Complete CRUD

**Step 1: Replace placeholders**
```
{Module} → Common, Finance, Sales, Hr, etc.
{Entity} → User, Product, Order, Employee, etc.
{entity} → users, products, orders, employees, etc.
{table_name} → users, products, orders, employees, etc.
```

**Step 2: Customize business logic in service**
- Add validation rules in `create()`
- Add business rules in `update()` and `delete()`
- Add custom filters in `paginate()`

**Step 3: Customize validation in requests**
- Add field-specific rules in `FormRequest`
- Add filter-specific rules in `IndexRequest`
- Add custom attribute names

**Step 4: Customize resource output**
- Add fields to display in `Resource`
- Add relations to load
- Customize audit information if needed

**Step 5: Customize migration**
- Add columns needed
- Add indexes for frequently queried columns
- Add foreign key constraints

---

## Business Domain Examples

### Example 1: E-commerce - Product

**Files:**
- `Sales/ProductController.php`
- `Sales/Product/ProductInterface.php`
- `Sales/Product/ProductService.php`
- `Product.php` (Model)
- `products` table

**Business Logic Examples:**
```php
// In ProductService::create()
$this->requireTransaction();

// Validate SKU uniqueness
$existing = Product::where('sku', $data['sku'])->first();
if ($existing) {
    throw new AppException('SKU already exists', 422);
}

// Set default status
$data['status'] = ProductStatus::DRAFT;

return Product::create($data);
```

### Example 2: HR - Employee

**Files:**
- `Hr/EmployeeController.php`
- `Hr/Employee/EmployeeInterface.php`
- `Hr/Employee/EmployeeService.php`
- `Employee.php` (Model)
- `employees` table

**Business Logic Examples:**
```php
// In EmployeeService::create()
$this->requireTransaction();

// Validate employee ID uniqueness
$existing = Employee::where('employee_id', $data['employee_id'])->first();
if ($existing) {
    throw new AppException('Employee ID already exists', 422);
}

// Set default status
$data['employment_status'] = EmploymentStatus::ACTIVE;

return Employee::create($data);
```

### Example 3: Common - User

**Files:**
- `Common/UserController.php`
- `Common/User/UserInterface.php`
- `Common/User/UserService.php`
- `User.php` (Model)
- `users` table

**Business Logic Examples:**
```php
// In UserService::create()
$this->requireTransaction();

// Validate email uniqueness
$existing = User::where('email', $data['email'])->first();
if ($existing) {
    throw new AppException('Email already exists', 422);
}

// Hash password
$data['password'] = bcrypt($data['password']);

// Set default status
$data['status'] = UserStatus::ACTIVE;

return User::create($data);
```

---

## Quick Reference: Which Template to Use?

| Task | Template |
|------|----------|
| **Create controller** | [Controller Template](#1-controller-template) |
| **Create service interface** | [Service Interface Template](#2-service-interface-template) |
| **Create service** | [Service Implementation Template](#3-service-implementation-template) |
| **Create model** | [Model Template](#4-model-template) |
| **Create index request** | [Index Request Template](#5-index-request-template) |
| **Create form request** | [Form Request Template](#6-form-request-template) |
| **Create resource** | [Resource Template](#7-resource-template) |
| **Create collection** | [Collection Template](#8-collection-template) |
| **Create migration** | [Migration Template](#9-migration-template) |

---

**Remember:** After using templates, always validate your code with `checklist.md`!

---

**Last Updated:** 2026-02-23
**Version:** 2.0 (Generic/Universal)