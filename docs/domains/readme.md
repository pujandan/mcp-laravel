# Domain-Specific Examples

This directory contains implementation examples for different business domains. Each domain shows how to apply the generic Laravel patterns to specific business contexts.

---

## Available Domains

| Domain | Description | Status |
|--------|-------------|--------|
| [E-commerce](./ecommerce/) | Online store, products, orders, inventory | ✅ Available |
| [HR/Workforce](./hr/) | Employee management, payroll, attendance | ✅ Available |
| [Tourism/Travel](./tourism/) | Tour packages, bookings, travelers | ✅ Available |
| [Satiket](./satiket/) | All-in-One Ticketing & Booking Platform (travel, event, room, attraction) | ✅ Available |

---

## How to Use These Examples

Each domain directory contains:

1. **Business Logic Examples** - Domain-specific validation and rules
2. **Entity Examples** - Typical entities for that domain
3. **AppSafe Patterns** - Common side-effect operations
4. **Enum Examples** - Domain-specific status enums
5. **Relationship Patterns** - Common entity relationships

---

## Quick Start

1. Navigate to your business domain
2. Review the entity examples
3. Adapt the patterns to your specific needs
4. Reference the generic templates in `/docs/ai/templates.md`

---

## Contribution Guidelines

To add a new domain:

1. Create a new directory: `docs/domains/{domain-name}/`
2. Add a `readme.md` with domain overview
3. Include concrete examples following the generic patterns
4. Show domain-specific business logic
5. Document common AppSafe use cases

---

**Version:** 2.0 (Generic/Universal)
**Last Updated:** 2026-02-23