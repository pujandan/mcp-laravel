# Livewire 4 Pattern Guide

**Project:** Youmrah
**Version:** Livewire 4.1.0
**Last Updated:** 2026-01-31
**Framework:** Laravel 12 + Tailwind CSS 4

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Component Structure](#component-structure)
4. [Naming Conventions](#naming-conventions)
5. [Best Practices](#best-practices)
6. [Common Patterns](#common-patterns)
7. [Integration with Service Layer](#integration-with-service-layer)
8. [Styling with Tailwind CSS 4](#styling-with-tailwind-css-4)
9. [Testing](#testing)
10. [Common Mistakes](#common-mistakes)

---

## 🎯 Overview

### What is Livewire?

Livewire is a full-stack framework for Laravel that allows you to build dynamic, reactive interfaces without leaving PHP. It handles:
- **State Management**: Automatic synchronization between frontend and backend
- **Real-time Updates**: AJAX requests without writing JavaScript
- **Form Handling**: Server-side validation with immediate feedback
- **File Uploads**: Easy file upload handling with progress tracking

### Livewire 4 Key Features

- **Single File Components (SFC)**: PHP class and Blade template in one file
- **Performance Improvements**: Faster rendering with morphing algorithm
- **Better Type Safety**: Improved PHP type hints
- **Alpine.js Integration**: Built-in Alpine for client-side interactivity
- **Lazy Loading**: Load components on-demand for better performance

### Youmrah Livewire Stack

```
Livewire 4.1.0
├── Laravel 12.49.0
├── PHP 8.3
├── Tailwind CSS 4 (Gold theme)
└── Service Layer Pattern (for business logic)
```

---

## 📦 Installation

### Already Installed in Youmrah

Livewire 4.1.0 is already installed and configured in the Youmrah project.

### Installation Steps (Reference)

```bash
# Install Livewire
composer require livewire/livewire

# Publish config (optional)
php artisan livewire:publish --config

# Clear cache
php artisan config:clear
php artisan config:cache
```

### Configuration

Located in: `config/livewire.php`

**Important Settings:**
```php
'inject_assets' => true,          // Auto-inject Livewire JS/CSS
'pagination_theme' => 'tailwind', // Use Tailwind for pagination
'make_command' => [
    'type' => 'sfc',              // Single File Component (default)
    'emoji' => true,              // Use ⚡ prefix
]
```

---

## 🧩 Component Structure

### Single File Component (SFC) Format

**Default in Livewire 4** - Recommended for most cases.

**Location:** `resources/views/components/⚡component-name.blade.php`

**Example:**
```blade
<?php

use Livewire\Component;
use App\Services\SomeService;

new class extends Component
{
    // Public properties (reactive state)
    public $count = 0;
    public $title = '';

    // Dependency injection
    public function mount(SomeService $service)
    {
        // Runs once on component load
        $this->title = $service->getDefaultTitle();
    }

    // Actions (methods callable from frontend)
    public function increment()
    {
        $this->count++;
    }

    public function save()
    {
        // Validate
        $validated = $this->validate();

        // Use service layer for business logic
        app(SomeService::class)->create($validated);
    }

    // Validation rules
    protected function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
        ];
    }
};
?>

<div>
    {{-- Template --}}
    <h1>{{ $title }}</h1>
    <p>Count: {{ $count }}</p>
    <button wire:click="increment">+</button>
</div>
```

### Multi-File Component Format

**Alternative** - Useful for complex components.

**Location:**
- Class: `app/Livewire/ComponentName.php`
- View: `resources/views/livewire/component-name.blade.php`

**Create Command:**
```bash
php artisan make:livewire ComponentName --class
```

---

## 📝 Naming Conventions

### File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Single File Component | `⚡kebab-case.blade.php` | `⚡user-list.blade.php` |
| Class Name | `PascalCase` | `UserList` |
| Folder Structure | `resources/views/components/` | Components directory |
| Livewire Class | `PascalCase` | `app/Livewire/UserList.php` |

### Component Usage in Blade

```blade
{{-- Using kebab-case (recommended) --}}
<livewire:user-list />

{{-- Using snake_case (also works) --}}
<livewire:user_list />
```

### Property Naming

```php
// Public properties (reactive to frontend)
public $searchQuery;     // camelCase
public $selectedItems = []; // Descriptive, plural for arrays

// Private/Protected properties (backend only)
private $internalService;
protected $cache = [];
```

### Method Naming

```php
// Actions (called from frontend)
public function addItem()     // Verb + Noun
public function deleteUser()  // Verb + Noun

// Lifecycle hooks
public function mount()       // Runs once on load
public function updating()    // Before update
public function updated()     // After update

// Computed properties
public function getTotalProperty() // get + PropertyName
```

---

## ✅ Best Practices

### 1. Component Responsibility

**DO:**
- Handle UI state and interactions
- Manage form inputs and validation
- Call Service layer for business logic
- Keep components focused and small

**DON'T:**
- Put business logic in Livewire components
- Make direct database queries (use Service layer)
- Create monolithic components (break them down)

### 2. State Management

```php
// ✅ GOOD: Simple state
public $count = 0;

// ✅ GOOD: Array state
public $items = [];

// ❌ AVOID: Complex nested state (hard to track)
public $complexData = [
    'nested' => [
        'deep' => [
            'structure' => []
        ]
    ]
];

// ✅ BETTER: Use separate properties
public $category;
public $filters = [];
public $sortBy = 'created_at';
```

### 3. Validation

```php
// ✅ GOOD: Define rules method
protected function rules(): array
{
    return [
        'title' => 'required|string|max:255',
        'email' => 'required|email',
    ];
}

public function save()
{
    $validated = $this->validate(); // Uses rules() method
    // Save logic...
}

// ✅ ALSO GOOD: Inline validation for specific scenarios
public function specificAction()
{
    $this->validate([
        'specificField' => 'required|numeric',
    ]);
}
```

### 4. Service Layer Integration

```php
use App\Services\User\UserService;

new class extends Component
{
    public $name;
    public $email;

    // ✅ GOOD: Use Service layer for business logic
    public function save()
    {
        $validated = $this->validate();

        try {
            DB::transaction(function () use ($validated) {
                app(UserService::class)->create($validated);
            });

            session()->flash('message', 'User created successfully!');
        } catch (\Throwable $e) {
            // Handler.php will catch this
            throw $e;
        }
    }

    // ❌ AVOID: Direct database queries
    public function badExample()
    {
        User::create([ /* ... */ ]); // DON'T DO THIS
    }
}
```

### 5. Performance Optimization

```php
// ✅ GOOD: Use lazy loading for heavy components
<livewire:heavy-component lazy />

// ✅ GOOD: Use pagination
use Livewire\WithPagination;

class UserList extends Component
{
    use WithPagination;

    public function render()
    {
        return view('livewire.user-list', [
            'users' => User::paginate(10), // Use pagination
        ]);
    }
}

// ✅ GOOD: Use computed properties for expensive operations
public function getExpensiveComputationProperty()
{
    return Cache::remember('expensive', 3600, function () {
        return HeavyCalculation::perform();
    });
}
```

### 6. Event Handling

```php
// ✅ GOOD: Use events for component communication

// Parent component
public function refreshChild()
{
    $this->dispatch('child-refresh');
}

// Child component
#[On('child-refresh')]
public function refresh()
{
    // Handle refresh...
}
```

---

## 🎨 Common Patterns

### Pattern 1: Search with Debounce

```blade
<?php

new class extends Component
{
    public $search = '';

    public function render()
    {
        return view('livewire.user-search', [
            'users' => User::where('name', 'like', '%'.$this->search.'%')
                ->get(),
        ]);
    };
?>

<div>
    {{-- Debounced search input --}}
    <input
        type="text"
        wire:model.debounce.500ms="search"
        placeholder="Search users..."
    >

    <ul>
        @foreach($users as $user)
            <li>{{ $user->name }}</li>
        @endforeach
    </ul>
</div>
```

### Pattern 2: CRUD with Modal

```blade
<?php

use App\Services\User\UserService;
use Livewire\Attributes\Locked;

new class extends Component
{
    public $users;
    public $modalOpen = false;
    public $userId = null; // For editing
    public $name;
    public $email;

    public function mount()
    {
        $this->users = User::all();
    }

    public function openModal($userId = null)
    {
        $this->modalOpen = true;
        $this->userId = $userId;

        if ($userId) {
            $user = User::find($userId);
            $this->name = $user->name;
            $this->email = $user->email;
        }
    }

    public function closeModal()
    {
        $this->modalOpen = false;
        $this->reset(['name', 'email', 'userId']);
    }

    public function save()
    {
        $validated = $this->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email',
        ]);

        DB::transaction(function () use ($validated) {
            $service = app(UserService::class);

            if ($this->userId) {
                $service->update($this->userId, $validated);
            } else {
                $service->create($validated);
            }
        });

        $this->closeModal();
        $this->users = User::all(); // Refresh list
    }

    public function delete($userId)
    {
        DB::transaction(function () use ($userId) {
            app(UserService::class)->delete($userId);
        });

        $this->users = User::all();
    }
};
?>

<div>
    <button wire:click="openModal">Add User</button>

    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            @foreach($users as $user)
                <tr>
                    <td>{{ $user->name }}</td>
                    <td>{{ $user->email }}</td>
                    <td>
                        <button wire:click="openModal({{ $user->id }})">Edit</button>
                        <button wire:click="delete({{ $user->id }})">Delete</button>
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    {{-- Modal --}}
    @if($modalOpen)
        <div class="modal">
            <div class="modal-content">
                <h2>{{ $userId ? 'Edit' : 'Add' }} User</h2>
                <input type="text" wire:model="name" placeholder="Name">
                <input type="email" wire:model="email" placeholder="Email">
                <button wire:click="save">Save</button>
                <button wire:click="closeModal">Cancel</button>
            </div>
        </div>
    @endif
</div>
```

### Pattern 3: Wizard / Multi-Step Form

```blade
<?php

new class extends Component
{
    public $step = 1;
    public $formData = [
        'step1' => [],
        'step2' => [],
        'step3' => [],
    ];

    public function goToStep($step)
    {
        // Validate current step before proceeding
        $this->validateStep($this->step);
        $this->step = $step;
    }

    public function validateStep($step)
    {
        $rules = [
            1 => ['field1' => 'required'],
            2 => ['field2' => 'required|email'],
            3 => ['field3' => 'required|numeric'],
        ];

        if (isset($rules[$step])) {
            $this->validate($rules[$step]);
        }
    }

    public function submit()
    {
        $this->validateStep(3);

        // Save all data...
        DB::transaction(function () {
            // Service call...
        });

        session()->flash('message', 'Form submitted successfully!');
    }
};
?>

<div>
    @if($step === 1)
        <h2>Step 1</h2>
        <input wire:model="formData.step1.field1">

    @elseif($step === 2)
        <h2>Step 2</h2>
        <input wire:model="formData.step2.field2">

    @elseif($step === 3)
        <h2>Step 3</h2>
        <input wire:model="formData.step3.field3">
    @endif

    <div class="navigation">
        @if($step > 1)
            <button wire:click="goToStep({{ $step - 1 }})">Previous</button>
        @endif

        @if($step < 3)
            <button wire:click="goToStep({{ $step + 1 }})">Next</button>
        @else
            <button wire:click="submit">Submit</button>
        @endif
    </div>
</div>
```

---

## 🔗 Integration with Service Layer

### Always Use Service Layer for Business Logic

```php
use App\Services\Product\ProductService;

new class extends Component
{
    public $products;
    public $name;
    public $price;

    public function mount(ProductService $productService)
    {
        // Inject service in mount
        $this->products = $productService->getAll();
    }

    public function create()
    {
        $validated = $this->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
        ]);

        // ❌ WRONG: Direct DB query
        // Product::create($validated);

        // ✅ CORRECT: Use service layer
        DB::transaction(function () use ($validated) {
            app(ProductService::class)->create($validated);
        });

        // Refresh list
        $this->products = app(ProductService::class)->getAll();

        // Reset form
        $this->reset(['name', 'price']);

        // Flash message
        session()->flash('message', 'Product created successfully!');
    }
}
```

### Why Service Layer?

1. **Separation of Concerns**: Livewire handles UI, Service handles logic
2. **Reusability**: Services can be used by Controllers, Commands, Jobs
3. **Testability**: Easier to unit test services
4. **Consistency**: Same business logic across entire application

---

## 🎨 Styling with Tailwind CSS 4

### Using Youmrah Design System

All Livewire components should use Youmrah's Gold theme colors:

```blade
<div class="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
    {{-- Primary action (Gold) --}}
    <button wire:click="save"
        class="w-full bg-gold-500 hover:bg-gold-600 text-white font-semibold py-2 px-6 rounded-lg transition shadow-md">
        Save
    </button>

    {{-- Secondary action (Blue) --}}
    <button wire:click="cancel"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition shadow-md">
        Cancel
    </button>

    {{-- Input with gold focus ring --}}
    <input type="text" wire:model="name"
        class="w-full px-4 py-2 border border-neutral-300 rounded-lg outline-none focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition">
</div>
```

### Complete Component Example with Styling

```blade
<?php

new class extends Component
{
    public $count = 0;

    public function increment()
    {
        $this->count++;
    }
};
?>

<div class="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
    <h2 class="text-2xl font-bold text-gold-600 mb-4">Counter Component</h2>

    <div class="text-center mb-6">
        <p class="text-neutral-600 mb-2">
            Count: <span class="text-4xl font-bold text-gold-600">{{ $count }}</span>
        </p>
    </div>

    <div class="flex gap-4 justify-center">
        {{-- Primary button (Gold) --}}
        <button wire:click="increment"
            class="px-6 py-2 bg-gold-500 hover:bg-gold-600 text-white font-semibold rounded-lg transition shadow-md">
            + Increment
        </button>
    </div>
</div>
```

---

## 🧪 Testing

### Creating Testable Components

```php
// Keep logic simple and testable
new class extends Component
{
    public $items = [];

    // ✅ GOOD: Pure function, easy to test
    public function getTotalProperty()
    {
        return array_sum($this->items);
    }

    // ✅ GOOD: Use service layer (testable separately)
    public function save()
    {
        app(SomeService::class)->create($this->validate());
    }
}
```

### Testing Livewire Components

```php
use Livewire\Livewire;

test('component can increment counter', function () {
    Livewire::test('test-component')
        ->assertSet('count', 0)
        ->call('increment')
        ->assertSet('count', 1);
});

test('input validation works', function () {
    Livewire::test('user-form')
        ->set('name', '')
        ->call('save')
        ->assertHasErrors(['name' => 'required']);
});
```

---

## ❌ Common Mistakes

### 1. Not Using Service Layer

```php
// ❌ WRONG
public function save()
{
    User::create($this->validate()); // Direct DB call
}

// ✅ CORRECT
public function save()
{
    DB::transaction(function () {
        app(UserService::class)->create($this->validate());
    });
}
```

### 2. Heavy Computations in render()

```php
// ❌ WRONG: Heavy computation on every render
public function render()
{
    return view('livewire.dashboard', [
        'stats' => $this->calculateExpensiveStats(), // Runs every time
    ]);
}

// ✅ CORRECT: Use computed property with caching
public function getStatsProperty()
{
    return Cache::remember('stats', 3600, function () {
        return $this->calculateExpensiveStats();
    });
}
```

### 3. Forgetting to Reset State

```php
// ❌ WRONG: State persists
public function openModal()
{
    $this->modalOpen = true;
    // Old data still in $name, $email
}

// ✅ CORRECT: Reset state
public function openModal()
{
    $this->modalOpen = true;
    $this->reset(['name', 'email', 'userId']);
}
```

### 4. Not Using Validation Rules

```php
// ❌ WRONG: Inline validation everywhere
public function save()
{
    $this->validate(['name' => 'required']);
}

public function update()
{
    $this->validate(['name' => 'required']);
}

// ✅ CORRECT: Define once, use everywhere
protected function rules(): array
{
    return ['name' => 'required'];
}

public function save()
{
    $this->validate(); // Uses rules() method
}
```

### 5. Missing wire:key in Loops

```blade
{{-- ❌ WRONG: No key (causes DOM issues) --}}
@foreach($items as $item)
    <livewire:item-card :item="$item" />
@endforeach

{{-- ✅ CORRECT: Always use keys --}}
@foreach($items as $item)
    <livewire:item-card :item="$item" :key="$item->id" />
@endforeach
```

---

## 📚 Quick Reference

### Create Component

```bash
# Single File Component (default)
php artisan make:livewire ComponentName

# Multi-File Component
php artisan make:livewire ComponentName --class
```

### Common Directives

```blade
@livewireScripts          {{-- Include Livewire JS --}}
@livewireStyles           {{-- Include Livewire CSS --}}
<livewire:component />    {{-- Render component --}}
```

### Common Modifiers

```blade
wire:model                {{-- Real-time sync --}}
wire:model.lazy           {{-- Sync on change --}}
wire:model.debounce.500ms {{-- Debounced sync --}}
wire:click                {{-- Click event --}}
wire:submit.prevent       {{-- Form submit --}}
wire:key                  {{-- Loop key --}}
```

### Lifecycle Hooks

```php
public function mount()          // Once on load
public function hydrate()        // Before every request
public function dehydrate()      // After every request
public function updating($name)  // Before property update
public function updated($name)   // After property update
```

---

## 🔗 Useful Links

- **Official Docs**: https://livewire.laravel.com/docs/4.x
- **Youmrah Design System**: docs/design-system.md
- **Service Layer Pattern**: docs/patterns/service-layer.md

---

**Last Updated:** 2026-01-31
**Livewire Version:** 4.1.0
**Maintained by:** Youmrah Development Team