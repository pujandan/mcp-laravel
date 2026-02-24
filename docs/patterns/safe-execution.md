# Safe Execution Pattern (AppSafe)

## Overview

**AppSafe** is a helper class for executing operations that should **fail silently** without breaking the main application flow. It provides consistent logging and error handling for non-critical side effects.

> **Related:** See [Error Handling Pattern](./error-handling.md) for global exception handling via `Handler.php`

---

## What is "Silent Failure"?

Silent failure means: **If an operation fails, log it but don't break the user experience.**

### Use Cases:
- ✅ Sending emails (welcome, receipts, notifications)
- ✅ SMS/WhatsApp messages
- ✅ Push notifications
- ✅ Webhook calls to 3rd parties
- ✅ Cache updates
- ✅ Analytics tracking
- ✅ Logging to external services
- ✅ Social media posting
- ✅ Non-critical file uploads to CDN

### NOT Use Cases:
- ❌ Database operations (use transactions)
- ❌ Critical business logic (payments, inventory)
- ❌ Operations that MUST succeed for data integrity

---

## Installation

File location: `app/Helpers/AppSafe.php`

```php
use App\Helpers\AppSafe;
```

---

## Core Methods

### 1. `run()` - Basic Silent Execution

Execute callback with silent failure. Returns callback result or `null` on failure.

**Signature:**
```php
AppSafe::run(string $tag, callable $callback, ...$params): mixed
```

**Parameters:**
- `$tag` - Log tag for identification (e.g., "Send welcome email")
- `$callback` - Function to execute
- `...$params` - Parameters to pass to callback (optional)

**Example:**
```php
AppSafe::run('Send welcome email', function($user) {
    Mail::to($user->email)->send(new WelcomeEmail($user));
}, $user);

// Or with arrow function
AppSafe::run('Email applicant', fn() =>
    $this->emailService->send(
        to: $leaderCandidate->email,
        subject: 'Pengajuan Tour Leader Berhasil',
        mailable: new LeaderCandidateSubmittedEmail($leaderCandidate)
    )
);
```

---

### 2. `runWithLevel()` - Custom Log Level

Same as `run()` but with custom log level.

**Signature:**
```php
AppSafe::runWithLevel(string $tag, string $level, callable $callback, ...$params): mixed
```

**Log Levels:** `debug`, `info`, `warning`, `error`, `critical`

**Example:**
```php
// Log as ERROR (more severe)
AppSafe::runWithLevel('Office email', 'error', fn() =>
    $this->emailService->send(...)
);
```

---

### 3. `runMaybe()` - Conditional Silence

Execute callback with optional silence. Can throw if configured.

**Signature:**
```php
AppSafe::runMaybe(string $tag, callable $callback, bool $silent = true, ...$params): mixed
```

**Example:**
```php
// Silent (won't throw)
AppSafe::runMaybe('Non-critical email', $callback, silent: true);

// Will throw after logging (semi-critical)
try {
    AppSafe::runMaybe('Important email', $callback, silent: false);
} catch (Exception $e) {
    // Handle if needed
}
```

---

### 4. `runWithRetry()` - Auto Retry Mechanism

Execute callback with automatic retry on failure. Uses exponential backoff.

**Signature:**
```php
AppSafe::runWithRetry(
    string $tag,
    callable $callback,
    int $maxAttempts = 3,
    array $backoff = [1, 2, 4],
    ...$params
): mixed
```

**Retry Behavior:**
- Attempt 1: Execute immediately
- Attempt 2: Wait 1s, retry
- Attempt 3: Wait 2s, retry
- All failed: Log error, return `null`

**Example:**
```php
// Default: 3 attempts with [1s, 2s, 4s] delays
$result = AppSafe::runWithRetry('External API call', function() {
    return Http::timeout(10)->get('https://api.example.com/data');
});

// Custom: 5 attempts with [5s, 10s, 15s, 20s, 25s] delays
$result = AppSafe::runWithRetry(
    'Flaky service',
    $callback,
    maxAttempts: 5,
    backoff: [5, 10, 15, 20, 25]
);
```

---

### 5. `runBatch()` - Multiple Operations

Execute multiple operations. **All will run even if some fail.**

**Signature:**
```php
AppSafe::runBatch(array $operations): array
```

**Operations Structure:**
```php
[
    ['tag' => string, 'callback' => callable, 'params' => array],
    ['tag' => string, 'callback' => callable], // params optional
]
```

**Return Format:**
```php
[
    'tag1' => ['success' => bool, 'data' => mixed, 'error' => string|null],
    'tag2' => ['success' => bool, 'data' => mixed, 'error' => string|null],
]
```

**Example:**
```php
$results = AppSafe::runBatch([
    ['tag' => 'Email applicant', 'callback' => fn() =>
        $this->emailService->send(
            to: $leaderCandidate->email,
            subject: 'Pengajuan Tour Leader Berhasil',
            mailable: new LeaderCandidateSubmittedEmail($leaderCandidate)
        )
    ],
    ['tag' => 'Email office', 'callback' => fn() =>
        $this->emailService->send(
            to: 'operasioanalteam2025@gmail.com',
            subject: "Pengajuan Tour Leader Baru: {$leaderCandidate->name}",
            mailable: new LeaderCandidateNotificationEmail($leaderCandidate)
        )
    ],
    ['tag' => 'SMS notification', 'callback' => fn() =>
        $this->smsService->send(
            to: $leaderCandidate->phone,
            message: 'Pengajuan berhasil dikirim'
        )
    ],
]);

// Check results
if (!$results['Email office']['success']) {
    // Optionally notify admin
    Log::error('Critical office email failed');
}
```

---

### 6. `runWithTimeout()` - Timeout Protection

⚠️ **Warning:** Only works in CLI environment (requires `pcntl` extension)

**Signature:**
```php
AppSafe::runWithTimeout(string $tag, callable $callback, int $timeoutSeconds, ...$params): mixed
```

**Example:**
```php
// Timeout after 10 seconds
AppSafe::runWithTimeout('Slow API call', function() {
    return $this->externalService->fetchData();
}, timeoutSeconds: 10);
```

---

## Real-World Examples

### Example 1: User Registration

```php
public function register(Request $request)
{
    $user = DB::transaction(function() use ($request) {
        return User::create($request->validated());
    });

    // All silent failures - user registration still succeeds
    AppSafe::run('Welcome email', fn() =>
        Mail::to($user->email)->send(new WelcomeEmail($user))
    );

    AppSafe::run('SMS verification', fn() =>
        $this->smsService->sendVerification($user->phone)
    );

    AppSafe::run('Create CRM record', fn() =>
        $this->crmService->createCustomer($user)
    );

    AppSafe::run('Analytics tracking', fn() =>
        $this->analytics->track('user.registered', ['user_id' => $user->id])
    );

    return AppResponse::success($user, 'Registration successful');
}
```

---

### Example 2: Order Payment

```php
public function processPayment(Request $request)
{
    $order = DB::transaction(function() use ($request) {
        return $this->orderService->create($request->validated());
    });

    // Critical - MUST succeed
    try {
        $this->paymentGateway->charge($order->total_amount);
    } catch (Exception $e) {
        DB::rollBack();
        throw new AppException('Payment failed', 422);
    }

    // Non-critical - silent failures
    AppSafe::run('Email receipt', fn() =>
        $this->emailService->sendReceipt($order)
    );

    AppSafe::run('SMS notification', fn() =>
        $this->smsService->send($order->user->phone, 'Payment successful')
    );

    AppSafe::run('Update inventory', fn() =>
        $this->inventoryService->reserveItems($order->items)
    );

    return AppResponse::success($order, 'Payment successful');
}
```

---

### Example 3: Leader Candidate Submission (Youmrah)

```php
public function store(Request $request)
{
    $leaderCandidate = DB::transaction(function() use ($request) {
        return LeaderCandidate::create($request->validated());
    });

    // Method 1: Individual runs
    AppSafe::run('Email applicant', fn() =>
        $this->emailService->send(
            to: $leaderCandidate->email,
            subject: 'Pengajuan Tour Leader Berhasil - ' . config('app.name'),
            mailable: new LeaderCandidateSubmittedEmail($leaderCandidate)
        )
    );

    AppSafe::run('Email office', fn() =>
        $this->emailService->send(
            to: 'operasioanalteam2025@gmail.com',
            subject: "Pengajuan Tour Leader Baru: {$leaderCandidate->name}",
            mailable: new LeaderCandidateNotificationEmail($leaderCandidate)
        )
    );

    return AppResponse::success($leaderCandidate, 'Pengajuan berhasil dikirim');
}
```

---

### Example 4: Retry for External Services

```php
public function syncExternalData()
{
    // Will retry 3 times if API fails
    $result = AppSafe::runWithRetry('Sync CRM data', function() {
        return Http::timeout(30)->get('https://crm.api.com/customers');
    }, maxAttempts: 3);

    if ($result) {
        $this->processCrmData($result);
    }

    return AppResponse::success(null, 'Sync completed');
}
```

---

## Logging Structure

All failures are logged to `json-daily` channel with structured context:

```json
{
  "datetime": "2025-02-01T10:30:45.123456+07:00",
  "level": "warning",
  "level_name": "WARNING",
  "channel": "json-daily",
  "message": "SafeRun failed: Send welcome email",
  "context": {
    "tag": "Send welcome email",
    "exception_type": "Swift_TransportException",
    "message": "Connection to smtp.gmail.com timed out",
    "file": "/app/Services/MailService.php",
    "line": 45,
    "request": {
      "method": "POST",
      "url": "https://api.example.com/register",
      "ip": "192.168.1.1",
      "request_id": "abc123-def456"
    },
    "user": {
      "id": 1,
      "email": "use***@***"
    },
    "trace": "..."
  }
}
```

### Context Included:
- **Tag** - Operation identifier
- **Exception details** - Type, message, file, line
- **Request context** - Method, URL, IP, request ID
- **User context** - Authenticated user ID (email masked)
- **Trace** - Stack trace (only in debug mode)

---

## Best Practices

### ✅ DO:
1. **Use descriptive tags** - "Email applicant" not "Send email"
2. **Batch related operations** - Use `runBatch()` for multiple side effects
3. **Set appropriate log levels** - Use `error` for critical failures
4. **Add retry for external services** - Use `runWithRetry()` for APIs
5. **Check results in batch** - Verify critical operations succeeded
6. **Monitor logs regularly** - Watch for patterns of failures
7. **Set up alerts** - Alert on critical email failures

### ❌ DON'T:
1. **Don't use for critical DB operations** - Use transactions instead
2. **Don't overuse** - Only for non-critical operations
3. **Don't swallow all errors** - Logs capture everything
4. **Don't use for payments** - Payment failures must throw
5. **Don't use for data integrity** - Inventory/balance must be accurate

---

## Comparison: Direct Try-Catch vs AppSafe

### Direct Try-Catch (Verbose):
```php
// ❌ Verbose and repetitive
public function register(Request $request)
{
    $user = User::create($request->validated());

    try {
        Mail::to($user->email)->send(new WelcomeEmail($user));
    } catch (\Throwable $e) {
        Log::warning('Welcome email failed', [
            'user_id' => $user->id,
            'error' => $e->getMessage(),
        ]);
    }

    try {
        $this->smsService->sendVerification($user->phone);
    } catch (\Throwable $e) {
        Log::warning('SMS failed', [
            'user_id' => $user->id,
            'error' => $e->getMessage(),
        ]);
    }

    return AppResponse::success($user);
}
```

### AppSafe (Clean):
```php
// ✅ Clean and consistent
public function register(Request $request)
{
    $user = User::create($request->validated());

    AppSafe::run('Welcome email', fn() =>
        Mail::to($user->email)->send(new WelcomeEmail($user))
    );

    AppSafe::run('SMS verification', fn() =>
        $this->smsService->sendVerification($user->phone)
    );

    return AppResponse::success($user);
}
```

---

## Method Selection Guide

| Method | Use Case | Return Value |
|--------|----------|--------------|
| `run()` | Simple silent execution | mixed/null |
| `runWithLevel()` | Custom log level | mixed/null |
| `runMaybe()` | Conditional throw | mixed/null |
| `runWithRetry()` | External API calls | mixed/null |
| `runBatch()` | Multiple operations | array |
| `runWithTimeout()` | Long-running operations | mixed/null |

---

## Troubleshooting

**Q: Operations not executing?**
- Check queue worker is running: `php artisan queue:work`
- Check logs: `tail -f storage/logs/laravel.log`

**Q: Want to debug failures?**
- Set `APP_DEBUG=true` in .env
- Check trace in log context

**Q: Too many retries?**
- Reduce `maxAttempts` in `runWithRetry()`
- Check external service health

**Q: Logs not appearing?**
- Verify `LOG_CHANNEL` in .env
- Check `config/logging.php` for `json-daily` channel

---

## Related Documentation

- [Error Handling Pattern](./error-handling.md) - Global exception handling
- [Service Layer Pattern](./service-layer.md) - Business logic structure
- [Database Transaction Pattern](./database-transaction.md) - Transaction management

---

**Last Updated:** 2026-02-01
**Related Files:**
- `app/Helpers/AppSafe.php` - Implementation
- `docs/ai/quick-reference.md` - Section 15: Safe Execution Rules