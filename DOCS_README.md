# Laravel AI Documentation - Universal

**Version:** 2.0 (Generic/Universal)
**Last Updated:** 2026-02-23

Universal Laravel documentation for AI-assisted development using Service Layer Pattern.

## 📦 What's Included

- **AI Documentation** (`docs/ai/`)
  - Quick reference with all coding rules
  - Implementation templates
  - Validation checklist

- **Pattern Documentation** (`docs/patterns/`)
  - Service layer pattern
  - Database transactions
  - Error handling
  - Safe execution patterns

- **Domain Examples** (`docs/domains/`)
  - E-commerce
  - HR/Workforce
  - Tourism/Travel

- **Design System** (`docs/design-system.md`)
  - Configurable color themes
  - Typography system
  - Component library

## 🏗️ Architecture

**Service Layer Pattern:**

```
HTTP Request → Controller → Service → Model → Database
                  ↓           ↓
             Transactions  Business Logic
             & JSON        & Validation
```

**Key Principles:**
- ✅ Services MUST have Interfaces
- ✅ Controllers wrap writes in `DB::transaction()`
- ✅ Services use `$this->requireTransaction()` for writes
- ✅ No try-catch in layers (Handler.php manages exceptions)
- ✅ Response format: `AppResponse::success(JsonResource, message)`
- ✅ UUID primary keys with audit trails

## 🌐 Domain Examples

### E-commerce
- Products (SKU validation, inventory management)
- Orders (seat allocation, payment processing)

### HR/Workforce
- Employees (ID validation, onboarding)
- Leave requests (balance validation, approvals)

### Tourism/Travel
- Packages (seat allocation, schedule management)
- Bookings (availability checks, confirmations)

## 🎨 Design System

Configurable color system using CSS custom properties with example themes:
- Blue (Corporate)
- Purple (SaaS)
- Orange (E-commerce)
- Green (Health/Wellness)

## 📝 Usage

### For New Projects

1. Copy `docs/` folder to your project
2. Configure design system colors
3. Follow templates and patterns
4. Adapt domain examples to your business

### For Existing Projects

1. Review patterns for applicable improvements
2. Gradually adopt Service Layer Pattern
3. Use templates for new features
4. Reference domain examples for business logic

---

**Framework:** Laravel 12.49.0
**PHP Version:** 8.3+
