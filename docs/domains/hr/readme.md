# HR/Workforce Domain Examples

Examples for implementing HR and workforce management functionality using the generic Laravel patterns.

---

## Common Entities

### 1. Employee

**File Structure:**
```
app/
├── Http/
│   ├── Controllers/Api/Hr/Employee/
│   │   └── EmployeeController.php
│   ├── Requests/Api/Hr/Employee/
│   │   ├── EmployeeRequest.php
│   │   └── EmployeeFormRequest.php
│   └── Resources/Api/Hr/Employee/
│       ├── EmployeeResource.php
│       └── EmployeeCollection.php
├── Models/
│   └── Employee.php
└── Services/
    └── Hr/
        └── Employee/
            ├── EmployeeInterface.php
            └── EmployeeService.php
```

**Business Logic Examples:**

```php
// In EmployeeService::create()
public function create(array $data): Employee
{
    $this->requireTransaction();

    // Validate employee ID uniqueness
    $existing = Employee::where('employee_id', $data['employee_id'])->first();
    if ($existing) {
        throw new AppException('Employee ID already exists', 422);
    }

    // Validate email uniqueness
    $existing = Employee::where('email', $data['email'])->first();
    if ($existing) {
        throw new AppException('Email already exists', 422);
    }

    // Set default employment status
    $data['employment_status'] = EmploymentStatus::ACTIVE;

    // Generate user account if needed
    if (isset($data['create_user_account']) && $data['create_user_account']) {
        $user = User::create([
            'name' => $data['first_name'] . ' ' . $data['last_name'],
            'email' => $data['email'],
            'password' => bcrypt(Str::random(16)),
            'status' => UserStatus::ACTIVE,
        ]);

        $data['user_id'] = $user->id;

        // Send welcome email with password setup link (silent)
        AppSafe::run('Employee welcome email', fn() =>
            $this->emailService->sendEmployeeWelcome($user, $data)
        );
    }

    $employee = Employee::create($data);

    // Create default payroll record (silent)
    AppSafe::run('Create payroll record', fn() =>
        $this->payrollService->initializeForEmployee($employee)
    );

    // Notify HR team (silent)
    AppSafe::run('HR notification', fn() =>
        $this->emailService->sendNewEmployeeNotification($employee)
    );

    return $employee->fresh();
}

// In EmployeeService::update()
public function update(string $id, array $data): Employee
{
    $this->requireTransaction();

    $employee = $this->find($id);

    // Prevent employment status changes without proper authorization
    if (isset($data['employment_status']) &&
        $data['employment_status'] !== $employee->employment_status) {

        // Validate status transition
        $validTransitions = [
            EmploymentStatus::ACTIVE->value => [EmploymentStatus::ON_LEAVE, EmploymentStatus::TERMINATED],
            EmploymentStatus::ON_LEAVE->value => [EmploymentStatus::ACTIVE, EmploymentStatus::TERMINATED],
        ];

        if (!in_array($data['employment_status'], $validTransitions[$employee->employment_status->value] ?? [])) {
            throw new AppException('Invalid employment status transition', 422);
        }
    }

    // Handle termination
    if (isset($data['employment_status']) &&
        $data['employment_status'] === EmploymentStatus::TERMINATED->value) {

        $data['termination_date'] = now();
        $data['terminated_by'] = auth()->id();

        // Process final payroll (silent)
        AppSafe::run('Final payroll processing', fn() =>
            $this->payrollService->processFinalPayroll($employee)
        );
    }

    $employee->update($data);

    return $employee->fresh();
}

// In EmployeeService::delete()
public function delete(string $id): Employee
{
    $this->requireTransaction();

    $employee = $this->find($id);

    // Cannot delete active employees
    if ($employee->employment_status === EmploymentStatus::ACTIVE) {
        throw new AppException('Cannot delete active employee. Terminate employment first.', 422);
    }

    // Check for pending payroll
    $pendingPayroll = Payroll::where('employee_id', $employee->id)
        ->whereIn('status', [PayrollStatus::PENDING, PayrollStatus::PROCESSING])
        ->exists();

    if ($pendingPayroll) {
        throw new AppException('Cannot delete employee with pending payroll', 422);
    }

    $employee->delete();

    return $employee;
}
```

### 2. Leave Request

**Business Logic Examples:**

```php
// In LeaveRequestService::create()
public function create(array $data): LeaveRequest
{
    $this->requireTransaction();

    $employee = Employee::findOrFail($data['employee_id']);

    // Validate leave balance
    $leaveBalance = $this->leaveBalanceService->getBalance(
        $employee->id,
        $data['leave_type']
    );

    $requestedDays = $this->calculateBusinessDays(
        $data['start_date'],
        $data['end_date']
    );

    if ($leaveBalance < $requestedDays) {
        throw new AppException(
            "Insufficient leave balance. Available: {$leaveBalance} days, Requested: {$requestedDays} days",
            422
        );
    }

    // Check for overlapping leave requests
    $overlapping = LeaveRequest::where('employee_id', $employee->id)
        ->where('status', LeaveStatus::APPROVED)
        ->where(function ($q) use ($data) {
            $q->whereBetween('start_date', [$data['start_date'], $data['end_date']])
              ->orWhereBetween('end_date', [$data['start_date'], $data['end_date']]);
        })
        ->exists();

    if ($overlapping) {
        throw new AppException('Overlapping leave request exists', 422);
    }

    $leaveRequest = LeaveRequest::create([
        'employee_id' => $employee->id,
        'leave_type' => $data['leave_type'],
        'start_date' => $data['start_date'],
        'end_date' => $data['end_date'],
        'reason' => $data['reason'] ?? null,
        'status' => LeaveStatus::PENDING,
        'requested_days' => $requestedDays,
    ]);

    // Notify manager (silent)
    AppSafe::run('Leave request notification', fn() =>
        $this->emailService->sendLeaveRequestNotification($leaveRequest)
    );

    return $leaveRequest->fresh();
}

// In LeaveRequestService::approve()
public function approve(string $id, array $data): LeaveRequest
{
    $this->requireTransaction();

    $leaveRequest = $this->find($id);

    if ($leaveRequest->status !== LeaveStatus::PENDING) {
        throw new AppException('Can only approve pending requests', 422);
    }

    $leaveRequest->update([
        'status' => LeaveStatus::APPROVED,
        'approved_by' => auth()->id(),
        'approved_at' => now(),
        'approval_notes' => $data['notes'] ?? null,
    ]);

    // Deduct from leave balance
    $this->leaveBalanceService->deduct(
        $leaveRequest->employee_id,
        $leaveRequest->leave_type,
        $leaveRequest->requested_days
    );

    // Notify employee (silent)
    AppSafe::run('Leave approval notification', fn() =>
        $this->emailService->sendLeaveApprovalNotification($leaveRequest)
    );

    // Update calendar (external service, silent)
    AppSafe::run('Update calendar', fn() =>
        $this->calendarService->blockEmployeeDates($leaveRequest)
    );

    return $leaveRequest->fresh();
}
```

---

## Domain-Specific Enums

```php
<?php

namespace App\Enums;

enum EmploymentStatus: string
{
    case ACTIVE = 'ac';
    case ON_LEAVE = 'ol';
    case SUSPENDED = 'su';
    case TERMINATED = 'te';
    case RESIGNED = 're';

    public static function label(?string $value): ?string
    {
        return match($value) {
            self::ACTIVE->value => __('label.active'),
            self::ON_LEAVE->value => __('label.onLeave'),
            self::SUSPENDED->value => __('label.suspended'),
            self::TERMINATED->value => __('label.terminated'),
            self::RESIGNED->value => __('label.resigned'),
            default => null,
        };
    }
}

enum LeaveStatus: string
{
    case PENDING = 'pe';
    case APPROVED = 'ap';
    case REJECTED = 're';
    case CANCELLED = 'ca';

    public static function label(?string $value): ?string
    {
        return match($value) {
            self::PENDING->value => __('label.pending'),
            self::APPROVED->value => __('label.approved'),
            self::REJECTED->value => __('label.rejected'),
            self::CANCELLED->value => __('label.cancelled'),
            default => null,
        };
    }
}

enum LeaveType: string
{
    case ANNUAL = 'an';
    case SICK = 'si';
    case PERSONAL = 'pe';
    case UNPAID = 'un';
    case MATERNITY = 'ma';
    case PATERNITY = 'pa';

    public static function label(?string $value): ?string
    {
        return match($value) {
            self::ANNUAL->value => __('label.annualLeave'),
            self::SICK->value => __('label.sickLeave'),
            self::PERSONAL->value => __('label.personalLeave'),
            self::UNPAID->value => __('label.unpaidLeave'),
            self::MATERNITY->value => __('label.maternityLeave'),
            self::PATERNITY->value => __('label.paternityLeave'),
            default => null,
        };
    }
}

enum PayrollStatus: string
{
    case DRAFT = 'dr';
    case PENDING = 'pe';
    case PROCESSING = 'pr';
    case PAID = 'pa';
    case FAILED = 'fa';

    public static function label(?string $value): ?string
    {
        return match($value) {
            self::DRAFT->value => __('label.draft'),
            self::PENDING->value => __('label.pending'),
            self::PROCESSING->value => __('label.processing'),
            self::PAID->value => __('label.paid'),
            self::FAILED->value => __('label.failed'),
            default => null,
        };
    }
}
```

---

## Common AppSafe Patterns

### New Employee Onboarding

```php
public function store(Request $request)
{
    $employee = DB::transaction(function() use ($request) {
        return $this->employeeService->create($request->validated());
    });

    // Send welcome email (silent)
    AppSafe::run('Welcome email', fn() =>
        $this->emailService->send(
            to: $employee->email,
            subject: 'Welcome to the Team!',
            mailable: new EmployeeWelcomeEmail($employee)
        )
    );

    // Send IT setup instructions (silent)
    AppSafe::run('IT setup instructions', fn() =>
        $this->emailService->sendItSetupInstructions($employee)
    );

    // Notify manager (silent)
    AppSafe::run('Manager notification', fn() =>
        $this->emailService->sendNewHireNotification($employee)
    );

    // Update HRIS system (external, silent)
    AppSafe::run('Update HRIS', fn() =>
        $this->hrisService->syncEmployee($employee)
    );

    // Schedule orientation meeting (silent)
    AppSafe::run('Schedule orientation', fn() =>
        $this->calendarService->scheduleOrientation($employee)
    );

    return AppResponse::success($employee, 'Employee created successfully');
}
```

### Leave Request Notification

```php
public function approve(Request $request, string $id)
{
    $leaveRequest = DB::transaction(function() use ($request, $id) {
        return $this->leaveService->approve($id, $request->validated());
    });

    // Notify employee (silent)
    AppSafe::run('Approval notification', fn() =>
        $this->emailService->sendLeaveApprovalNotification($leaveRequest)
    );

    // Update team calendar (silent)
    AppSafe::run('Update team calendar', fn() =>
        $this->calendarService->updateTeamAvailability($leaveRequest)
    );

    // Update project assignments (external, silent)
    AppSafe::run('Update project assignments', fn() =>
        $this->projectService->adjustForEmployeeLeave($leaveRequest)
    );

    return AppResponse::success($leaveRequest, 'Leave request approved');
}
```

### Payroll Processing

```php
public function processBatch(Request $request)
{
    $payroll = DB::transaction(function() use ($request) {
        return $this->payrollService->processBatch($request->validated());
    });

    foreach ($payroll as $record) {
        // Send payslip (silent, individual failures shouldn't affect others)
        AppSafe::run("Send payslip for {$record->employee->name}", fn() =>
            $this->emailService->sendPayslip($record)
        );
    }

    // Notify accounting team (silent)
    AppSafe::run('Accounting notification', fn() =>
        $this->emailService->sendPayrollSummaryNotification($payroll)
    );

    // Sync with accounting software (external, silent)
    AppSafe::run('Sync accounting software', fn() =>
        $this->accountingService->syncPayroll($payroll)
    );

    return AppResponse::success($payroll, 'Payroll processed successfully');
}
```

---

## Common Relationships

```php
// Employee Model
class Employee extends Model
{
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'manager_id');
    }

    public function subordinates(): HasMany
    {
        return $this->hasMany(Employee::class, 'manager_id');
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function payroll(): HasMany
    {
        return $this->hasMany(Payroll::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }
}

// LeaveRequest Model
class LeaveRequest extends Model
{
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(LeaveRequestDocument::class);
    }
}
```

---

**Domain:** HR/Workforce
**Version:** 2.0
**Last Updated:** 2026-02-23