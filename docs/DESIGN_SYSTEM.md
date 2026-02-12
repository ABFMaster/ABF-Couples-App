# ABF Design System

A comprehensive design system for the Always Be Flirting (ABF) couples relationship app. This document serves as the single source of truth for all visual and interaction design decisions.

**Version:** 2.0
**Last Updated:** February 2024

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Color Palette](#2-color-palette)
3. [Typography Scale](#3-typography-scale)
4. [Spacing System](#4-spacing-system)
5. [Component Library](#5-component-library)
6. [Layout System](#6-layout-system)
7. [Patterns](#7-patterns)
8. [Emoji vs Icon Usage](#8-emoji-vs-icon-usage)
9. [Animation](#9-animation)
10. [Implementation Examples](#10-implementation-examples)
11. [Before/After Examples](#11-beforeafter-examples)

---

## 1. Design Principles

### The 7 Core Principles

#### 1.1 Romantic but Professional
The app should feel warm and intimate without being cheesy or juvenile. Use soft gradients and warm colors, but maintain clean lines and professional typography.

**Do:** Use subtle pink gradients, heart accents in appropriate contexts
**Don't:** Overuse hearts, use cartoonish illustrations, or bright neon colors

#### 1.2 Emoji-Rich
Emojis add personality and warmth. Use them intentionally in headers, empty states, and feature icons—but never in body text or error messages.

**Do:** 💕 as section headers, 🎵 for music features
**Don't:** "Please try again 😢" or "Error occurred 💔"

#### 1.3 Card-Based Architecture
Every piece of content lives in a card. Cards create visual hierarchy, touch targets, and scannable interfaces.

**Do:** Group related content in rounded cards with consistent padding
**Don't:** Leave content floating without containers

#### 1.4 Generous White Space
White space is not wasted space. It creates breathing room and reduces cognitive load.

**Do:** Use `p-4` or `p-6` for card padding, `gap-6` between sections
**Don't:** Cram elements together to "fit more content"

#### 1.5 Consistent Hierarchy
Visual hierarchy should be immediately clear. One primary action per screen, clear heading levels, and consistent emphasis patterns.

**Do:** Single primary CTA button, clear H1 > H2 > Body progression
**Don't:** Multiple competing CTAs, inconsistent heading sizes

#### 1.6 Delightful Interactions
Every interaction should feel responsive and rewarding. Subtle animations, hover states, and success feedback create joy.

**Do:** Scale on hover, animated success states, smooth transitions
**Don't:** Jarring transitions, no feedback on interactions

#### 1.7 Mobile-First
Design for thumb-friendly mobile use first, then enhance for larger screens.

**Do:** 44px minimum touch targets, bottom-placed primary actions
**Don't:** Tiny buttons, hover-only interactions

---

## 2. Color Palette

### 2.1 Primary Colors — Pink

The signature ABF pink creates warmth and romance.

| Level | Name | Hex Code | RGB | Tailwind | Usage |
|-------|------|----------|-----|----------|-------|
| 50 | Pink Whisper | `#FDF2F8` | 253, 242, 248 | `pink-50` | Page backgrounds, hover fills |
| 100 | Pink Blush | `#FCE7F3` | 252, 231, 243 | `pink-100` | Card backgrounds, badges |
| 300 | Pink Light | `#F9A8D4` | 249, 168, 212 | `pink-300` | Borders, unread indicators |
| 500 | Pink Primary | `#EC4899` | 236, 72, 153 | `pink-500` | **Primary buttons, links, icons** |
| 600 | Pink Dark | `#DB2777` | 219, 39, 119 | `pink-600` | Hover states, headings |

### 2.2 Secondary Colors — Purple

Purple complements pink and represents the partner/received states.

| Level | Name | Hex Code | RGB | Tailwind | Usage |
|-------|------|----------|-----|----------|-------|
| 50 | Purple Whisper | `#FAF5FF` | 250, 245, 255 | `purple-50` | Partner backgrounds |
| 100 | Purple Blush | `#F3E8FF` | 243, 232, 255 | `purple-100` | Partner card fills |
| 300 | Purple Light | `#D8B4FE` | 216, 180, 254 | `purple-300` | Partner accents |
| 500 | Purple Primary | `#A855F7` | 168, 85, 247 | `purple-500` | Partner indicators |
| 600 | Purple Dark | `#9333EA` | 147, 51, 234 | `purple-600` | Partner emphasis |

### 2.3 Semantic Colors

| Intent | Background | Text | Border | Tailwind BG | Tailwind Text |
|--------|------------|------|--------|-------------|---------------|
| **Success** | `#DCFCE7` | `#15803D` | `#86EFAC` | `green-100` | `green-700` |
| **Warning** | `#FEF3C7` | `#D97706` | `#FCD34D` | `amber-100` | `amber-600` |
| **Error** | `#FEE2E2` | `#DC2626` | `#FCA5A5` | `red-100` | `red-600` |
| **Info** | `#DBEAFE` | `#2563EB` | `#93C5FD` | `blue-100` | `blue-600` |

### 2.4 Neutral Colors — Gray

| Level | Hex Code | Tailwind | Usage |
|-------|----------|----------|-------|
| 50 | `#F9FAFB` | `gray-50` | Page backgrounds |
| 100 | `#F3F4F6` | `gray-100` | Card hover, dividers |
| 200 | `#E5E7EB` | `gray-200` | Borders, separators |
| 400 | `#9CA3AF` | `gray-400` | Placeholder text, disabled |
| 500 | `#6B7280` | `gray-500` | Secondary text, captions |
| 600 | `#4B5563` | `gray-600` | Body text |
| 700 | `#374151` | `gray-700` | Emphasis text |
| 800 | `#1F2937` | `gray-800` | Headings |
| 900 | `#111827` | `gray-900` | High contrast, dark mode bg |

### 2.5 Accent Colors

| Name | Hex Code | Tailwind | Usage |
|------|----------|----------|-------|
| Spotify Green | `#1DB954` | `[#1DB954]` | Spotify integration |
| Spotify Green Hover | `#1ED760` | `[#1ed760]` | Spotify hover state |
| Heart Red | `#EF4444` | `red-500` | Favorites, hearts |
| Gold | `#F59E0B` | `amber-500` | Premium, achievements |

### 2.6 Gradient Definitions

```css
/* Primary Brand Gradient — Buttons, Headers */
.gradient-primary {
  background: linear-gradient(to right, #F472B6, #EC4899);
  /* Tailwind: bg-gradient-to-r from-pink-400 to-pink-500 */
}

/* Page Background Gradient */
.gradient-page {
  background: linear-gradient(to bottom right, #FDF2F8, #FCE7F3);
  /* Tailwind: bg-gradient-to-br from-pink-50 to-pink-100 */
}

/* Feature Header Gradient */
.gradient-header {
  background: linear-gradient(to right, #F472B6, #A855F7);
  /* Tailwind: bg-gradient-to-r from-pink-400 to-purple-500 */
}

/* Dark Section Gradient (Spotify) */
.gradient-dark {
  background: linear-gradient(to right, #111827, #1F2937);
  /* Tailwind: bg-gradient-to-r from-gray-900 to-gray-800 */
}

/* Success Celebration Gradient */
.gradient-success {
  background: linear-gradient(to bottom right, #F472B6, #A855F7);
  /* Tailwind: bg-gradient-to-br from-pink-400 to-purple-500 */
}
```

### 2.7 Color Intent Mapping

| Intent | Color | When to Use |
|--------|-------|-------------|
| User's content | Pink-500 | Content sent by the current user |
| Partner's content | Purple-600 | Content from partner |
| Primary action | Pink gradient | Main CTA on any screen |
| Secondary action | White + gray border | Alternative actions |
| Destructive action | Red-500 | Delete, disconnect, cancel subscription |
| Success feedback | Green-700 | Completion confirmations |
| Interactive element | Pink-600 on hover | Links, clickable items |
| Disabled state | Gray-400 | Unavailable actions |

---

## 3. Typography Scale

### 3.1 Font Family

```css
--font-sans: 'Geist Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'Geist Mono', ui-monospace, SFMono-Regular, monospace;
```

### 3.2 Type Scale

| Name | Size | Line Height | Weight | Tailwind | Use Case |
|------|------|-------------|--------|----------|----------|
| **Display** | 48px / 3rem | 1.1 (52.8px) | Bold 700 | `text-5xl font-bold leading-tight` | Hero headlines, splash screens |
| **H1** | 32px / 2rem | 1.2 (38.4px) | Bold 700 | `text-3xl font-bold` | Page titles |
| **H2** | 24px / 1.5rem | 1.25 (30px) | Bold 700 | `text-2xl font-bold` | Section headers |
| **H3** | 18px / 1.125rem | 1.3 (23.4px) | Semibold 600 | `text-lg font-semibold` | Card titles, subsections |
| **Body** | 16px / 1rem | 1.5 (24px) | Regular 400 | `text-base` | Default paragraph text |
| **Body Small** | 14px / 0.875rem | 1.5 (21px) | Regular 400 | `text-sm` | Secondary descriptions |
| **Caption** | 12px / 0.75rem | 1.4 (16.8px) | Regular 400 | `text-xs` | Timestamps, labels, metadata |
| **Overline** | 12px / 0.75rem | 1.4 (16.8px) | Medium 500 | `text-xs font-medium uppercase tracking-wider` | Section labels, categories |

### 3.3 Font Weights

| Weight | Value | Tailwind | Usage |
|--------|-------|----------|-------|
| Regular | 400 | `font-normal` | Body text, descriptions |
| Medium | 500 | `font-medium` | Buttons, emphasis, labels |
| Semibold | 600 | `font-semibold` | Subheadings, card titles |
| Bold | 700 | `font-bold` | Headlines, CTAs, stats |

### 3.4 Text Color Assignments

| Element | Color | Tailwind |
|---------|-------|----------|
| Page title | Gray-800 | `text-gray-800` |
| Section heading | Pink-600 | `text-pink-600` |
| Card title | Gray-800 | `text-gray-800` |
| Body text | Gray-600 | `text-gray-600` |
| Secondary text | Gray-500 | `text-gray-500` |
| Caption/timestamp | Gray-400 | `text-gray-400` |
| Link | Pink-600 | `text-pink-600 hover:text-pink-700` |
| Error text | Red-600 | `text-red-600` |
| Success text | Green-700 | `text-green-700` |

---

## 4. Spacing System

### 4.1 Base Unit: 8px

All spacing derives from an 8px base unit for visual consistency.

| Token | Value | Tailwind | Use Case |
|-------|-------|----------|----------|
| **3xs** | 2px | `p-0.5`, `gap-0.5` | Micro adjustments only |
| **2xs** | 4px | `p-1`, `gap-1` | Icon-to-text gap, tight inline |
| **xs** | 8px | `p-2`, `gap-2` | Inline element spacing, badge padding |
| **sm** | 12px | `p-3`, `gap-3` | Card grid gaps, form field spacing |
| **md** | 16px | `p-4`, `gap-4` | **Standard card padding**, section margins |
| **lg** | 24px | `p-6`, `gap-6` | **Section spacing**, modal padding |
| **xl** | 32px | `p-8`, `gap-8` | Large section breaks |
| **2xl** | 48px | `p-12`, `gap-12` | Page-level margins |
| **3xl** | 64px | `p-16`, `gap-16` | Hero sections, major breaks |

### 4.2 Spacing Intent Guide

| Context | Token | Value | Example |
|---------|-------|-------|---------|
| Icon to label | xs | 8px | `gap-2` between icon and text |
| Form field gap | sm | 12px | `gap-3` between form inputs |
| Card internal padding | md | 16px | `p-4` inside cards |
| Between cards | sm | 12px | `gap-3` in card grids |
| Section to section | lg | 24px | `mb-6` between page sections |
| Page edge padding | md | 16px | `px-4` on mobile containers |
| Modal padding | lg | 24px | `p-6` in modal body |
| Empty state padding | xl | 32px | `p-8` for empty state containers |

### 4.3 Container Widths

| Breakpoint | Max Width | Tailwind | Usage |
|------------|-----------|----------|-------|
| Mobile | 100% | `w-full` | Full width with `px-4` |
| Tablet | 672px | `max-w-2xl` | Standard content pages |
| Desktop | 896px | `max-w-4xl` | Dashboard, wide layouts |
| Wide | 1152px | `max-w-6xl` | Admin, complex tables |

---

## 5. Component Library

### 5.1 Buttons

#### Primary Button (Gradient Pill)
The main CTA on any screen. Full-width on mobile, auto-width on desktop.

```jsx
<button className="w-full py-4 bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-2xl font-bold text-lg hover:from-pink-500 hover:to-pink-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
  Send to Partner 💕
</button>
```

**Specs:**
- Height: 56px (`py-4` + text)
- Border radius: 16px (`rounded-2xl`)
- Font: 18px Bold
- Shadow: `shadow-lg`
- Hover: Darken gradient + slight scale up
- Active: Scale down slightly

#### Secondary Button (Outline)
For alternative actions that don't compete with primary.

```jsx
<button className="px-6 py-3 bg-white text-gray-700 rounded-xl border-2 border-gray-200 font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors">
  Cancel
</button>
```

**Specs:**
- Border: 2px gray-200
- Border radius: 12px (`rounded-xl`)
- Background: White
- Hover: Gray-50 background

#### Tertiary Button (Text Only)
For low-emphasis actions like "Skip" or "Maybe later".

```jsx
<button className="px-4 py-2 text-gray-500 font-medium hover:text-gray-700 transition-colors">
  Skip for now
</button>
```

#### Pill Button (Compact)
For filters, tags, and inline actions.

```jsx
// Active state
<button className="px-4 py-2 rounded-full text-sm font-medium bg-pink-500 text-white">
  Active
</button>

// Inactive state
<button className="px-4 py-2 rounded-full text-sm font-medium bg-white text-gray-600 hover:bg-pink-50 border border-gray-200">
  Inactive
</button>
```

#### Icon Button
For actions represented by icons only.

```jsx
<button className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors" aria-label="Close">
  <svg className="w-5 h-5" />
</button>
```

**Specs:**
- Size: 40x40px minimum (touch target)
- Must include `aria-label`

### 5.2 Cards

#### Standard Card
The default container for content groups.

```jsx
<div className="bg-white rounded-xl p-4 shadow-sm">
  <h3 className="text-lg font-semibold text-gray-800 mb-2">Card Title</h3>
  <p className="text-gray-600">Card content goes here.</p>
</div>
```

**Specs:**
- Background: White
- Border radius: 12px (`rounded-xl`)
- Padding: 16px (`p-4`)
- Shadow: `shadow-sm`

#### Interactive Card
Cards that navigate or open modals.

```jsx
<div className="bg-white rounded-xl p-4 shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99]">
  {/* Content */}
</div>
```

**Additional specs:**
- Cursor: pointer
- Hover: Elevate shadow + slight scale
- Active: Scale down slightly

#### Feature Card (Gradient Header)
For highlighted features or modals.

```jsx
<div className="bg-white rounded-2xl shadow-lg overflow-hidden">
  <div className="bg-gradient-to-r from-pink-400 to-purple-500 text-white p-6">
    <div className="flex items-center gap-3">
      <span className="text-3xl">💕</span>
      <div>
        <h2 className="text-xl font-bold">Feature Title</h2>
        <p className="text-pink-100 text-sm">Subtitle description</p>
      </div>
    </div>
  </div>
  <div className="p-6">
    {/* Content */}
  </div>
</div>
```

**Specs:**
- Border radius: 16px (`rounded-2xl`)
- Header padding: 24px (`p-6`)
- Body padding: 24px (`p-6`)
- Shadow: `shadow-lg`

#### Stat Card
For displaying metrics and counts.

```jsx
<div className="bg-white rounded-xl p-4 text-center shadow-sm">
  <p className="text-2xl font-bold text-pink-600">42</p>
  <p className="text-xs text-gray-500 mt-1">Flirts Sent</p>
</div>
```

**Specs:**
- Text alignment: Center
- Number: 24px Bold, colored by intent
- Label: 12px gray-500, uppercase optional

### 5.3 Inputs

#### Text Input

```jsx
<div className="space-y-1">
  <label className="block text-sm font-medium text-gray-700">
    Label
  </label>
  <input
    type="text"
    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:outline-none transition-colors placeholder:text-gray-400"
    placeholder="Enter text..."
  />
  <p className="text-xs text-gray-500">Helper text</p>
</div>
```

**Specs:**
- Height: ~48px (`py-3` + text)
- Border: 2px gray-200, pink-400 on focus
- Border radius: 12px (`rounded-xl`)
- No outline, use border color for focus

#### Textarea

```jsx
<textarea
  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:outline-none transition-colors resize-none placeholder:text-gray-400"
  rows={4}
  maxLength={500}
  placeholder="Write something..."
/>
<p className="text-right text-xs text-gray-400 mt-1">0/500</p>
```

#### Search Input

```jsx
<div className="relative">
  <input
    type="text"
    className="w-full px-4 py-3 pl-10 border-2 border-gray-200 rounded-full focus:border-pink-400 focus:outline-none transition-colors"
    placeholder="Search..."
  />
  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
</div>
```

**Specs:**
- Border radius: Full (`rounded-full`)
- Icon: 20px, left-positioned

### 5.4 Modals

#### Bottom Sheet Modal

```jsx
<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
  {/* Backdrop */}
  <div
    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
    onClick={onClose}
  />

  {/* Modal */}
  <div className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slideUp">
    {/* Header */}
    <div className="flex-shrink-0 p-4 border-b border-gray-100 flex items-center justify-between">
      <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-medium">
        Cancel
      </button>
      <h2 className="font-bold text-lg text-gray-800">Modal Title</h2>
      <div className="w-16" /> {/* Spacer for centering */}
    </div>

    {/* Body - Scrollable */}
    <div className="flex-1 overflow-y-auto p-6">
      {/* Content */}
    </div>

    {/* Footer - Fixed */}
    <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-gray-50">
      <button className="w-full py-4 bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-2xl font-bold">
        Confirm Action
      </button>
    </div>
  </div>
</div>
```

**Specs:**
- Backdrop: Black 50% opacity + blur
- Border radius: 24px top on mobile, all corners on desktop
- Max height: 90vh
- Shadow: `shadow-2xl`
- Animation: Slide up from bottom

### 5.5 Navigation

#### Bottom Tab Bar

```jsx
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pb-safe">
  <div className="flex justify-around py-2">
    {tabs.map(tab => (
      <button
        key={tab.id}
        className={`flex flex-col items-center gap-1 py-2 px-3 ${
          active === tab.id ? 'text-pink-600' : 'text-gray-400'
        }`}
      >
        <span className="text-xl">{tab.icon}</span>
        <span className="text-xs font-medium">{tab.label}</span>
      </button>
    ))}
  </div>
</nav>
```

**Specs:**
- Position: Fixed bottom
- Background: White
- Active: Pink-600
- Inactive: Gray-400
- Icon: 20px, Label: 12px

#### Top Navigation Bar

```jsx
<div className="flex items-center justify-between p-4">
  {/* Back Button */}
  <button className="flex items-center gap-2 text-pink-600 hover:text-pink-700">
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
    <span>Back</span>
  </button>

  {/* Logo/Title */}
  <div className="bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-xl px-4 py-2 shadow-lg">
    <span className="font-bold">ABF</span>
  </div>

  {/* Action Button */}
  <button className="bg-pink-500 text-white px-4 py-2 rounded-full text-sm font-medium">
    + New
  </button>
</div>
```

---

## 6. Layout System

### 6.1 Grid Rules

#### Mobile (< 640px)
- 2-column grid for cards
- Full-width for forms and primary content
- `gap-3` (12px) between grid items

```jsx
<div className="grid grid-cols-2 gap-3">
  {/* Cards */}
</div>
```

#### Tablet (640px - 1024px)
- 3-column grid for cards
- Centered container with `max-w-2xl`

```jsx
<div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
  {/* Cards */}
</div>
```

#### Desktop (> 1024px)
- 3-4 column grid depending on content
- `max-w-4xl` for wide layouts

### 6.2 Responsive Breakpoints

| Breakpoint | Min Width | Tailwind | Common Usage |
|------------|-----------|----------|--------------|
| Default | 0px | — | Mobile-first base styles |
| sm | 640px | `sm:` | Tablet portrait |
| md | 768px | `md:` | Tablet landscape |
| lg | 1024px | `lg:` | Desktop |
| xl | 1280px | `xl:` | Wide desktop |

### 6.3 Dashboard Layout Pattern

```jsx
<div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 pb-24">
  {/* Header Section */}
  <div className="p-4">
    <div className="max-w-2xl mx-auto">
      {/* Greeting */}
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Good morning, Sarah 💕</h1>
      <p className="text-gray-600 mb-6">Daily quote or status here</p>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {/* Stat cards */}
      </div>

      {/* Feature Cards */}
      <div className="space-y-4">
        {/* Stacked feature cards */}
      </div>
    </div>
  </div>

  {/* Bottom Nav Spacer */}
  <div className="h-20" />
</div>
```

### 6.4 Visual Hierarchy Levels

| Level | Element | Treatment |
|-------|---------|-----------|
| 1 | Primary CTA | Gradient button, full-width, bottom of screen |
| 2 | Page Title | H1, 32px Bold, pink-600 or gray-800 |
| 3 | Feature Cards | White bg, shadow-sm, prominent placement |
| 4 | Section Headers | H2, 24px Bold, with icon/emoji |
| 5 | Content Cards | Grouped in sections, consistent styling |
| 6 | Secondary Actions | Text links, outline buttons |
| 7 | Metadata | Captions, timestamps, gray-500 |

---

## 7. Patterns

### 7.1 Empty States

```jsx
<div className="bg-white rounded-2xl shadow-lg p-8 text-center">
  <div className="text-6xl mb-4">💕</div>
  <h3 className="text-xl font-bold text-gray-800 mb-2">
    No flirts yet
  </h3>
  <p className="text-gray-600 mb-6">
    Send your partner something special!
  </p>
  <button className="bg-gradient-to-r from-pink-400 to-pink-500 text-white px-6 py-3 rounded-full font-semibold hover:from-pink-500 hover:to-pink-600 transition-all">
    Send a Flirt
  </button>
</div>
```

**Pattern Rules:**
1. Large emoji (48-64px) as visual anchor
2. Clear, encouraging headline
3. Helpful description (not blaming)
4. Primary action to resolve the empty state

### 7.2 Loading States

#### Full Page Loading
```jsx
<div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center">
  <div className="text-center">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent mx-auto mb-4"></div>
    <p className="text-pink-600 text-lg font-medium">Loading...</p>
  </div>
</div>
```

#### Inline Loading (Button)
```jsx
<button disabled className="opacity-50 flex items-center justify-center gap-2">
  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
  Sending...
</button>
```

#### Skeleton Loading
```jsx
<div className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
</div>
```

### 7.3 Error States

```jsx
<div className="bg-red-50 border border-red-200 rounded-xl p-4">
  <div className="flex items-start gap-3">
    <span className="text-red-500 text-xl">⚠️</span>
    <div>
      <h4 className="font-semibold text-red-800">Something went wrong</h4>
      <p className="text-red-600 text-sm mt-1">
        We couldn't load your data. Please try again.
      </p>
      <button className="mt-3 text-red-700 font-medium hover:text-red-800 underline">
        Try again
      </button>
    </div>
  </div>
</div>
```

### 7.4 Success States

```jsx
<div className="absolute inset-0 bg-gradient-to-br from-pink-400 to-purple-500 z-10 flex items-center justify-center animate-fadeIn">
  <div className="text-center text-white">
    <div className="text-6xl mb-4 animate-bounce">💕</div>
    <p className="text-2xl font-bold">Sent to Sarah!</p>
  </div>
</div>
```

### 7.5 Stat Displays

#### Single Stat
```jsx
<div className="bg-white rounded-xl p-4 text-center shadow-sm">
  <p className="text-2xl font-bold text-pink-600">42</p>
  <p className="text-xs text-gray-500 mt-1">Flirts Sent</p>
</div>
```

#### Stat with Trend
```jsx
<div className="bg-white rounded-xl p-4 shadow-sm">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider">This Week</p>
      <p className="text-2xl font-bold text-gray-800">14</p>
    </div>
    <div className="text-green-600 text-sm font-medium">
      ↑ 23%
    </div>
  </div>
</div>
```

### 7.6 Filter Tabs

```jsx
<div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
  {filters.map(filter => (
    <button
      key={filter.id}
      onClick={() => setActive(filter.id)}
      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
        active === filter.id
          ? 'bg-pink-500 text-white'
          : 'bg-white text-gray-600 hover:bg-pink-50'
      }`}
    >
      {filter.label}
    </button>
  ))}
</div>
```

---

## 8. Emoji vs Icon Usage

### 8.1 When to Use Emoji

| Context | Example | Reasoning |
|---------|---------|-----------|
| Feature headers | 💕 Flirts | Adds warmth, immediately scannable |
| Empty states | 🎧 No songs yet | Creates emotional connection |
| Success celebrations | 🎉 Sent! | Adds delight |
| Category/type indicators | 🎵 Song, 📸 Photo | Quick visual identification |
| Stat card accents | 💕 42 flirts | Adds personality |
| Navigation tabs | 💕 Home, 💬 Chat | Mobile-friendly touch targets |

### 8.2 When to Use Icons

| Context | Example | Reasoning |
|---------|---------|-----------|
| UI affordances | ← Back, × Close | Universal understanding |
| Action buttons | + Add, 🔍 Search | Cleaner, more professional |
| Form elements | ✓ Checkbox | Standard UI patterns |
| Status indicators | ● Online | Precise, subtle |
| Navigation arrows | → Next | Directional clarity |

### 8.3 Icon Specifications

```jsx
// Standard inline icon
<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="..." />
</svg>

// Icon sizes
// Small (inline): w-4 h-4
// Default (buttons): w-5 h-5
// Medium (features): w-6 h-6
// Large (empty states): w-8 h-8
// XL (heroes): w-12 h-12
```

### 8.4 Emoji Library

| Category | Emojis | Usage |
|----------|--------|-------|
| Love | 💕 ❤️ 💗 💝 | Flirts, favorites, core features |
| Communication | 💬 📝 ✉️ | Messages, notes |
| Media | 🎵 📸 🎬 🎉 | Songs, photos, GIFs |
| Activities | 🍽️ 🎭 🏕️ ✈️ | Dates, trips |
| Success | ✨ 🎉 🙌 💯 | Celebrations, achievements |
| Time | ⏰ 📅 🌙 ☀️ | Reminders, scheduling |

---

## 9. Animation

### 9.1 Timing

| Duration | Value | Tailwind | Use Case |
|----------|-------|----------|----------|
| Fast | 150ms | `duration-150` | Hover states, toggles |
| Normal | 300ms | `duration-300` | Page transitions, modals |
| Slow | 500ms | `duration-500` | Success animations |

### 9.2 Easing Functions

| Easing | CSS | Use Case |
|--------|-----|----------|
| ease-out | `ease-out` | Elements entering (modals appearing) |
| ease-in | `ease-in` | Elements leaving (modals closing) |
| ease-in-out | `ease-in-out` | Continuous animations (loading) |

### 9.3 Hover States

#### Lift Effect
```jsx
className="hover:shadow-md hover:-translate-y-0.5 transition-all"
```

#### Brighten Effect
```jsx
className="hover:brightness-110 transition-all"
```

#### Scale Effect
```jsx
className="hover:scale-[1.02] active:scale-[0.98] transition-transform"
```

### 9.4 Keyframe Animations

```css
/* Slide Up - Modal entry */
@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
.animate-slideUp {
  animation: slideUp 0.3s ease-out forwards;
}

/* Fade In */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fadeIn {
  animation: fadeIn 0.2s ease-out forwards;
}

/* Slide Down - Dropdown/toast entry */
@keyframes slideDown {
  from {
    transform: translateY(-10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
.animate-slideDown {
  animation: slideDown 0.2s ease-out forwards;
}
```

### 9.5 Page Transitions

For React/Next.js, use CSS transitions on route changes:

```jsx
// Wrapper component
<div className="animate-fadeIn">
  {children}
</div>
```

---

## 10. Implementation Examples

### 10.1 Complete Button Set

```jsx
// buttons.jsx
export const Button = {
  // Primary gradient
  Primary: ({ children, ...props }) => (
    <button
      className="w-full py-4 bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-2xl font-bold text-lg hover:from-pink-500 hover:to-pink-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      {...props}
    >
      {children}
    </button>
  ),

  // Secondary outline
  Secondary: ({ children, ...props }) => (
    <button
      className="px-6 py-3 bg-white text-gray-700 rounded-xl border-2 border-gray-200 font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
      {...props}
    >
      {children}
    </button>
  ),

  // Tertiary text
  Tertiary: ({ children, ...props }) => (
    <button
      className="px-4 py-2 text-gray-500 font-medium hover:text-gray-700 transition-colors"
      {...props}
    >
      {children}
    </button>
  ),

  // Pill (for filters)
  Pill: ({ children, active, ...props }) => (
    <button
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
        active
          ? 'bg-pink-500 text-white'
          : 'bg-white text-gray-600 hover:bg-pink-50 border border-gray-200'
      }`}
      {...props}
    >
      {children}
    </button>
  ),

  // Icon button
  Icon: ({ children, label, ...props }) => (
    <button
      className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
      aria-label={label}
      {...props}
    >
      {children}
    </button>
  ),

  // Danger
  Danger: ({ children, ...props }) => (
    <button
      className="px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
      {...props}
    >
      {children}
    </button>
  ),
};
```

### 10.2 Card Components

```jsx
// cards.jsx
export const Card = {
  // Standard
  Base: ({ children, className = '' }) => (
    <div className={`bg-white rounded-xl p-4 shadow-sm ${className}`}>
      {children}
    </div>
  ),

  // Interactive
  Interactive: ({ children, onClick, className = '' }) => (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-4 shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99] ${className}`}
    >
      {children}
    </div>
  ),

  // Stat
  Stat: ({ value, label, color = 'pink-600' }) => (
    <div className="bg-white rounded-xl p-4 text-center shadow-sm">
      <p className={`text-2xl font-bold text-${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  ),

  // Feature with gradient header
  Feature: ({ icon, title, subtitle, children }) => (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-pink-400 to-purple-500 text-white p-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            {subtitle && <p className="text-pink-100 text-sm">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  ),
};
```

### 10.3 Form Components

```jsx
// forms.jsx
export const Input = {
  Text: ({ label, helper, error, ...props }) => (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-3 border-2 rounded-xl transition-colors placeholder:text-gray-400 focus:outline-none ${
          error
            ? 'border-red-300 focus:border-red-500'
            : 'border-gray-200 focus:border-pink-400'
        }`}
        {...props}
      />
      {(helper || error) && (
        <p className={`text-xs ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {error || helper}
        </p>
      )}
    </div>
  ),

  Textarea: ({ label, maxLength, value, ...props }) => (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <textarea
        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:outline-none transition-colors resize-none placeholder:text-gray-400"
        maxLength={maxLength}
        value={value}
        {...props}
      />
      {maxLength && (
        <p className="text-right text-xs text-gray-400">
          {value?.length || 0}/{maxLength}
        </p>
      )}
    </div>
  ),
};
```

### 10.4 Page Template

```jsx
// PageTemplate.jsx
export default function PageTemplate({ title, subtitle, children, showBack = true }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 pb-24">
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          {showBack ? (
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-pink-600 hover:text-pink-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          ) : (
            <div />
          )}
          <div className="bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-xl px-4 py-2 shadow-lg">
            <span className="font-bold">ABF</span>
          </div>
          <div className="w-16" />
        </div>

        {/* Title */}
        {title && (
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-pink-600 mb-2">{title}</h1>
            {subtitle && <p className="text-gray-600">{subtitle}</p>}
          </div>
        )}

        {/* Content */}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}
```

---

## 11. Before/After Examples

### 11.1 Dashboard Card Inconsistency

**Before (Inconsistent):**
```jsx
// Card 1: rounded-lg, p-3, no shadow
<div className="bg-white rounded-lg p-3">
  <h3 className="font-bold">Title</h3>
</div>

// Card 2: rounded-2xl, p-5, shadow-md
<div className="bg-white rounded-2xl p-5 shadow-md">
  <h3 className="text-lg font-semibold">Title</h3>
</div>

// Card 3: rounded-xl, p-4, shadow-sm
<div className="bg-white rounded-xl p-4 shadow-sm">
  <h3 className="font-medium text-gray-900">Title</h3>
</div>
```

**After (Consistent):**
```jsx
// All cards use the same base styles
<div className="bg-white rounded-xl p-4 shadow-sm">
  <h3 className="text-lg font-semibold text-gray-800">Title</h3>
</div>
```

### 11.2 Stat Card Variations

**Before (Inconsistent):**
```jsx
// Stat 1: Number below label
<div className="text-center">
  <p className="text-gray-500">Sent</p>
  <p className="text-xl text-pink-500">42</p>
</div>

// Stat 2: Different sizing
<div className="p-2">
  <span className="text-3xl font-black">42</span>
  <small className="block">sent</small>
</div>
```

**After (Consistent):**
```jsx
// Standard stat card pattern
<div className="bg-white rounded-xl p-4 text-center shadow-sm">
  <p className="text-2xl font-bold text-pink-600">42</p>
  <p className="text-xs text-gray-500 mt-1">Sent</p>
</div>
```

### 11.3 Typography Hierarchy Issues

**Before (Flat hierarchy):**
```jsx
<div>
  <p className="text-lg">Section Title</p>
  <p className="text-lg">Description text here</p>
  <p className="text-lg">More content</p>
</div>
```

**After (Clear hierarchy):**
```jsx
<div>
  <h2 className="text-2xl font-bold text-gray-800 mb-2">Section Title</h2>
  <p className="text-gray-600 mb-4">Description text here</p>
  <p className="text-sm text-gray-500">More content</p>
</div>
```

### 11.4 Button Inconsistency

**Before (Inconsistent):**
```jsx
// Button 1
<button className="bg-pink-500 p-2 rounded">
  Save
</button>

// Button 2
<button className="bg-gradient-to-r from-pink-400 to-pink-600 px-8 py-4 rounded-full text-white font-bold">
  Submit
</button>

// Button 3
<button className="text-pink-500 underline">
  Cancel
</button>
```

**After (Consistent button system):**
```jsx
// Primary - Main actions
<button className="w-full py-4 bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-2xl font-bold">
  Save Changes
</button>

// Secondary - Alternative actions
<button className="px-6 py-3 bg-white text-gray-700 rounded-xl border-2 border-gray-200 font-medium">
  Cancel
</button>

// Tertiary - Low emphasis
<button className="px-4 py-2 text-gray-500 font-medium">
  Skip
</button>
```

### 11.5 Empty State Before/After

**Before (Minimal, unhelpful):**
```jsx
<div>
  <p>No data</p>
</div>
```

**After (Encouraging, actionable):**
```jsx
<div className="bg-white rounded-2xl shadow-lg p-8 text-center">
  <div className="text-6xl mb-4">💕</div>
  <h3 className="text-xl font-bold text-gray-800 mb-2">No flirts yet</h3>
  <p className="text-gray-600 mb-6">
    Send your partner something special to get started!
  </p>
  <button className="bg-gradient-to-r from-pink-400 to-pink-500 text-white px-6 py-3 rounded-full font-semibold">
    Send Your First Flirt
  </button>
</div>
```

---

## Quick Reference Card

### Colors
- **Primary:** `pink-500` (#EC4899)
- **Secondary:** `purple-600` (#9333EA)
- **Background:** `from-pink-50 to-pink-100`
- **Text:** `gray-800` (headings), `gray-600` (body)

### Spacing
- **Card padding:** `p-4` (16px)
- **Section gap:** `gap-6` (24px)
- **Page padding:** `p-4` (16px)

### Border Radius
- **Cards:** `rounded-xl` (12px)
- **Buttons:** `rounded-2xl` (16px) or `rounded-full`
- **Modals:** `rounded-3xl` (24px)

### Typography
- **H1:** `text-3xl font-bold`
- **H2:** `text-2xl font-bold`
- **Body:** `text-base text-gray-600`
- **Caption:** `text-xs text-gray-500`

### Shadows
- **Cards:** `shadow-sm`
- **Modals:** `shadow-2xl`
- **Hover:** `hover:shadow-md`

---

*This design system is a living document. Update it as the product evolves.*
