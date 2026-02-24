# Design System

**Version:** 2.0 (Generic/Universal)
**Last Updated:** 2026-02-23
**Framework:** Laravel 12 + Tailwind CSS v4

---

## 📋 Table of Contents

1. [Color Palette](#color-palette)
2. [Typography](#typography)
3. [Components](#components)
4. [Design Patterns](#design-patterns)
5. [Best Practices](#best-practices)
6. [Configuration](#configuration)
7. [Live Reference](#live-reference)

---

## 🎨 Color Palette

### Primary Color (Brand Color)

The primary color is your main brand color. Configure it in your project.

```css
/* Tailwind CSS v4 Configuration */
@theme {
  /* Define your brand color */
  --color-primary-50: oklch(0.95 0.05 95);
  --color-primary-100: oklch(0.90 0.08 95);
  --color-primary-500: oklch(0.75 0.15 95);  /* Default brand color */
  --color-primary-600: oklch(0.70 0.18 95);  /* Hover states */
  --color-primary-700: oklch(0.65 0.20 95);  /* Darker shade */
}
```

**Tailwind classes:**
```css
bg-primary-50      /* Lightest backgrounds */
bg-primary-500     /* Primary buttons */
bg-primary-600     /* Default brand color */
bg-primary-700     /* Darker for hover states */

text-primary-600   /* Primary text */
text-primary-700   /* Darker text */
```

**Usage:**
- Primary buttons
- Call-to-action elements
- Brand highlights
- Important notifications (warnings)
- Feature highlights

### Secondary Color

Supporting color for secondary actions and logo accents.

```css
@theme {
  --color-secondary-600: oklch(0.50 0.15 250);
  --color-secondary-700: oklch(0.45 0.18 250);
}
```

**Tailwind classes:**
```css
bg-secondary-600   /* Default secondary */
bg-secondary-700   /* Darker for hover */

text-secondary-600 /* Secondary text */
border-secondary-600 /* Secondary borders */
```

**Usage:**
- Secondary buttons
- Links
- Informational content
- Header accents
- Supporting visual elements

### Accent Color

Accent color for success states and tertiary actions.

```css
@theme {
  --color-accent-600: oklch(0.60 0.15 185);
  --color-accent-700: oklch(0.55 0.18 185);
}
```

**Tailwind classes:**
```css
bg-accent-600      /* Default accent */
bg-accent-700      /* Darker for hover */

text-accent-600    /* Accent text */
border-accent-600  /* Accent borders */
```

**Usage:**
- Success messages
- Accent buttons
- Positive indicators
- Supporting highlights
- Success notifications

### Neutral Colors

```css
/* Backgrounds: */
bg-neutral-50    /* Page background */
bg-neutral-100   /* Card backgrounds */
bg-white         /* Primary container */

/* Text: */
text-neutral-900  /* Headings */
text-neutral-700  /* Body text */
text-neutral-600  /* Secondary text */
text-neutral-400  /* Muted text */

/* Borders: */
border-neutral-200  /* Default borders */
border-neutral-300  /* Input borders */
```

### Color Usage Rules

1. **Primary Actions** → Always use Primary color (`bg-primary-500/600`)
2. **Secondary Actions** → Use Secondary color (`bg-secondary-600`)
3. **Success States** → Use Accent color (`bg-accent-600`)
4. **Destructive Actions** → Use Red (`bg-red-600`)
5. **Information** → Use Secondary color (`bg-secondary-50/500`)
6. **Warnings** → Use Primary color (`bg-primary-50/500`)

---

## 📝 Typography

### Font Family

Default system fonts (Tailwind defaults):
- **Sans:** `ui-sans-serif, system-ui, sans-serif`
- **Mono:** `ui-monospace, SFMono-Regular, Menlo, monospace`

### Heading Scale

| Level | Size | Weight | Tailwind Class | Usage |
|-------|------|--------|---------------|-------|
| H1 | 48px (text-5xl) | Bold (700) | `text-5xl font-bold` | Page titles |
| H2 | 36px (text-4xl) | Bold (700) | `text-4xl font-bold` | Section headers |
| H3 | 30px (text-3xl) | Bold (700) | `text-3xl font-bold` | Subsection headers |
| H4 | 24px (text-2xl) | Semibold (600) | `text-2xl font-semibold` | Card titles |
| H5 | 20px (text-xl) | Semibold (600) | `text-xl font-semibold` | Small headers |
| H6 | 18px (text-lg) | Semibold (600) | `text-lg font-semibold` | Minor headers |

### Body Text

| Size | Tailwind Class | Usage |
|------|---------------|-------|
| Large | `text-lg` | Lead paragraphs, emphasized content |
| Base | `text-base` | Default body text |
| Small | `text-sm` | Captions, helper text, metadata |
| XSmall | `text-xs` | Disclaimers, fine print |

### Font Weights

```css
font-light        /* 300 - Rarely used */
font-normal       /* 400 - Body text */
font-medium       /* 500 - Emphasized text */
font-semibold     /* 600 - Headings, buttons */
font-bold         /* 700 - Strong emphasis */
```

### Text Color Rules

1. **Headings** → `text-neutral-900`
2. **Body text** → `text-neutral-700`
3. **Secondary text** → `text-neutral-600`
4. **Muted text** → `text-neutral-400`
5. **Brand text** → `text-primary-600`
6. **Links** → `text-secondary-600` (default)

---

## 🧩 Components

### Buttons

#### Primary Button
```blade
<button class="bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 px-6 rounded-lg transition shadow-md hover:shadow-lg">
    Button Text
</button>
```

**Variants:**
- Large: `py-3 px-8 text-lg`
- Small: `py-1.5 px-4 text-sm`
- Rounded full: `rounded-full`

#### Secondary Button
```blade
<button class="bg-secondary-600 hover:bg-secondary-700 text-white font-semibold py-2 px-6 rounded-lg transition shadow-md hover:shadow-lg">
    Button Text
</button>
```

#### Outline Button
```blade
<button class="border-2 border-primary-500 text-primary-600 hover:bg-primary-50 font-semibold py-2 px-6 rounded-lg transition">
    Button Text
</button>
```

#### Ghost Button
```blade
<button class="text-primary-600 hover:text-primary-700 font-semibold py-2 px-4 rounded-lg transition hover:bg-primary-50">
    Button Text
</button>
```

### Cards

#### Basic Card
```blade
<div class="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm hover:shadow-md transition">
    <!-- Content -->
</div>
```

#### Accent Card
```blade
<div class="bg-white border-l-4 border-primary-500 rounded-xl p-6 shadow-md">
    <!-- Content -->
</div>
```

#### Featured Card
```blade
<div class="bg-white rounded-xl p-6 shadow-lg border-t-4 border-primary-500">
    <!-- Content -->
</div>
```

#### Dark Card
```blade
<div class="bg-neutral-800 rounded-xl p-6 text-white">
    <!-- Content -->
</div>
```

### Alerts

#### Success (Accent)
```blade
<div class="bg-accent-50 border-l-4 border-accent-500 p-4 rounded">
    <div class="flex">
        <span class="text-accent-500 text-xl mr-3">✅</span>
        <div>
            <p class="text-sm font-medium text-accent-800">Success</p>
            <p class="text-sm text-accent-700 mt-1">Message here</p>
        </div>
    </div>
</div>
```

#### Warning (Primary)
```blade
<div class="bg-primary-50 border-l-4 border-primary-500 p-4 rounded">
    <div class="flex">
        <span class="text-primary-500 text-xl mr-3">⚠️</span>
        <div>
            <p class="text-sm font-medium text-primary-800">Warning</p>
            <p class="text-sm text-primary-700 mt-1">Message here</p>
        </div>
    </div>
</div>
```

#### Error (Red)
```blade
<div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
    <div class="flex">
        <span class="text-red-500 text-xl mr-3">❌</span>
        <div>
            <p class="text-sm font-medium text-red-800">Error</p>
            <p class="text-sm text-red-700 mt-1">Message here</p>
        </div>
    </div>
</div>
```

#### Info (Secondary)
```blade
<div class="bg-secondary-50 border-l-4 border-secondary-500 p-4 rounded">
    <div class="flex">
        <span class="text-secondary-500 text-xl mr-3">ℹ️</span>
        <div>
            <p class="text-sm font-medium text-secondary-800">Information</p>
            <p class="text-sm text-secondary-700 mt-1">Message here</p>
        </div>
    </div>
</div>
```

### Form Elements

#### Text Input
```blade
<div>
    <label class="block text-sm font-medium text-neutral-700 mb-2">Label</label>
    <input type="text"
        class="w-full px-4 py-2 border border-neutral-300 rounded-lg outline-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
        placeholder="Placeholder">
</div>
```

**Note:** `outline-none focus:outline-none` removes browser default outline, leaving only the primary ring.

#### Select Dropdown
```blade
<div>
    <label class="block text-sm font-medium text-neutral-700 mb-2">Label</label>
    <select class="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition">
        <option>Option 1</option>
        <option>Option 2</option>
    </select>
</div>
```

#### Checkbox
```blade
<div class="flex items-center">
    <input type="checkbox" id="agree" class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500">
    <label for="agree" class="ml-2 text-sm text-neutral-700">Label text</label>
</div>
```

### Badges

#### Color Badge
```blade
<span class="px-3 py-1 bg-primary-100 text-primary-800 text-xs font-semibold rounded-full">
    Badge Text
</span>
```

#### Status Badge with Dot
```blade
<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
    <span class="w-2 h-2 mr-2 bg-green-500 rounded-full"></span>
    Active
</span>
```

---

## 🎯 Design Patterns

### Spacing

Use Tailwind's spacing scale (multiples of 0.25rem = 4px):

```css
/* Common spacings: */
p-4     /* 16px - Card padding */
p-6     /* 24px - Section padding */
p-8     /* 32px - Large section padding */
gap-4   /* 16px - Grid/column gap */
mb-4    /* 16px - Margin bottom */
mb-6    /* 24px - Section spacing */
mb-8    /* 32px - Large section spacing */
```

### Border Radius

```css
rounded     /* 4px - Small elements */
rounded-lg  /* 8px - Cards, buttons */
rounded-xl  /* 12px - Large cards */
rounded-2xl /* 16px - Featured cards */
rounded-full /* Fully rounded - Pills, badges */
```

### Shadows

```css
shadow-sm    /* Subtle elevation - cards on hover */
shadow-md    /* Medium elevation - default cards */
shadow-lg    /* High elevation - featured cards */
shadow-xl    /* Very high elevation - modals, popups */
```

### Responsive Design

Mobile-first approach:
```blade
<!-- Mobile: 1 column, Medium: 2 columns, Large: 3 columns -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <!-- Items -->
</div>
```

---

## ✅ Best Practices

### DO's ✅

1. **ALWAYS** use Primary color for primary CTAs
2. **ALWAYS** use semantic colors (accent for success, primary for warning)
3. **ALWAYS** include hover states for interactive elements
4. **ALWAYS** use proper spacing (multiples of 4)
5. **ALWAYS** ensure color contrast meets WCAG AA standards
6. **ALWAYS** use rounded corners consistently
7. **ALWAYS** add transitions to interactive elements
8. **ALWAYS** use proper heading hierarchy

### DON'Ts ❌

1. **NEVER** use red for non-destructive actions
2. **NEVER** hardcode color values (use Tailwind classes)
3. **NEVER** skip hover states
4. **NEVER** use more than 3 colors in one component
5. **NEVER** mix border-radius styles in same context
6. **NEVER** use font weights inconsistently
7. **NEVER** create custom colors outside the palette
8. **NEVER** use deprecated Tailwind classes

### Component Guidelines

1. **Buttons**
   - Always use `transition` class
   - Add `shadow-md` for depth
   - Include `hover:shadow-lg` for interaction feedback
   - Use consistent padding: `py-2 px-6`

2. **Cards**
   - Always use `rounded-xl` or `rounded-lg`
   - Add `shadow-sm` with `hover:shadow-md`
   - Use `bg-white` for card background
   - Include proper padding: `p-6`

3. **Forms**
   - Always use `focus:ring-2 focus:ring-primary-500`
   - Include labels with `font-medium`
   - Add helper text with `text-sm text-neutral-500`
   - Use consistent border: `border-neutral-300`

4. **Typography**
   - Use `text-neutral-900` for headings
   - Use `text-neutral-700` for body text
   - Use `text-neutral-600` for secondary text
   - Maintain proper hierarchy (H1 → H6)

---

## ⚙️ Configuration

### Tailwind CSS v4 Theme Definition

Located in: `resources/css/app.css`

```css
@theme {
  /* ===== PRIMARY COLOR (Your Brand Color) ===== */
  /* Customize these OKLCH values for your brand */
  --color-primary-50: oklch(0.95 0.05 95);
  --color-primary-100: oklch(0.90 0.08 95);
  --color-primary-500: oklch(0.75 0.15 95);  /* Main brand color */
  --color-primary-600: oklch(0.70 0.18 95);
  --color-primary-700: oklch(0.65 0.20 95);

  /* ===== SECONDARY COLOR ===== */
  /* Customize for secondary branding */
  --color-secondary-600: oklch(0.50 0.15 250);
  --color-secondary-700: oklch(0.45 0.18 250);

  /* ===== ACCENT COLOR ===== */
  /* Customize for success/accent states */
  --color-accent-600: oklch(0.60 0.15 185);
  --color-accent-700: oklch(0.55 0.18 185);
}
```

### Using Colors in Your Project

```blade
<!-- Background -->
<div class="bg-primary-500">...</div>

<!-- Text -->
<p class="text-primary-600">...</p>

<!-- Border -->
<div class="border-2 border-primary-500">...</div>

<!-- Hover states -->
<button class="bg-primary-500 hover:bg-primary-600">...</button>
```

### Color Customization Examples

#### Example 1: Blue Theme (Corporate)
```css
@theme {
  --color-primary-600: oklch(0.55 0.20 250);  /* Blue */
  --color-secondary-600: oklch(0.45 0.12 250);  /* Lighter blue */
  --color-accent-600: oklch(0.55 0.15 150);     /* Green for success */
}
```

#### Example 2: Purple Theme (SaaS)
```css
@theme {
  --color-primary-600: oklch(0.60 0.20 300);  /* Purple */
  --color-secondary-600: oklch(0.50 0.15 250); /* Blue */
  --color-accent-600: oklch(0.60 0.15 120);    /* Green for success */
}
```

#### Example 3: Orange Theme (E-commerce)
```css
@theme {
  --color-primary-600: oklch(0.70 0.18 50);   /* Orange */
  --color-secondary-600: oklch(0.50 0.15 250); /* Blue */
  --color-accent-600: oklch(0.60 0.15 150);    /* Green for success */
}
```

#### Example 4: Green Theme (Health/Wellness)
```css
@theme {
  --color-primary-600: oklch(0.60 0.15 150);  /* Green */
  --color-secondary-600: oklch(0.50 0.15 250); /* Blue */
  --color-accent-600: oklch(0.60 0.15 50);     /* Orange for highlights */
}
```

---

## 🌐 Live Reference

Access the live design system guide at:
```
/typography
```

This page includes:
- Live component examples
- Interactive demonstrations
- Code snippets for copy-paste
- Color palette reference
- Typography scale reference

---

## 📦 Design Tokens Reference

### Color Mapping

| Token | Tailwind Class | Usage |
|-------|---------------|-------|
| `--color-primary-600` | `bg-primary-600` | Brand color (configurable) |
| `--color-secondary-600` | `bg-secondary-600` | Secondary (configurable) |
| `--color-accent-600` | `bg-accent-600` | Accent/success (configurable) |

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `4` | 16px | Card padding, small gaps |
| `6` | 24px | Section padding, medium gaps |
| `8` | 32px | Large section spacing |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `lg` | 8px | Cards, buttons |
| `xl` | 12px | Large cards |
| `2xl` | 16px | Featured elements |

---

## 📝 Notes

- This design system is built on **Tailwind CSS v4**
- Using **OKLCH** color space for better color consistency
- All colors defined in `resources/css/app.css`
- Live examples at `/typography` route
- Follows Laravel 12 + Tailwind v4 best practices
- **Primary, Secondary, and Accent colors are configurable per project**

---

**Version:** 2.0 (Generic/Universal)
**Last Updated:** 2026-02-23