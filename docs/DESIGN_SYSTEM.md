# ABF Design System
Version: 3.0 | Last Updated: April 2026

## Design Philosophy
Presence over engagement. The app should feel alive, warm, and earned — not performative. Every visual decision serves the relationship, not the interface.

## Color Palette

### Base
- Cream background: #FAF6F0
- Warm dark (primary text): #1C1410
- Stone (secondary text): #8B7355
- Stone light (muted/labels): #C4AA87
- Blush (borders/dividers): #EDE4D8
- Blush dark (stronger borders): #D9CBBA

### Category Colors (geometric identifiers — no emoji)
- Travel: #C4714A (terracotta)
- Watch: #5A6B8A (slate blue)
- Eat: #C9A84C (gold)
- Listen: #7A8C7E (sage)
- Do: #6B5B8A (muted indigo)

### Feature Mood Colors
- Spark/Hot Take: linear-gradient(135deg, #8B4A2A, #C4714A, #D4956A) — terracotta warm
- Rabbit Hole: linear-gradient(135deg, #1C1B3A, #2D3561, #3D4878) — deep indigo
- Game Room: linear-gradient(135deg, #2D3561, #4A3570, #6B5B8A) — indigo-violet
- Timeline/Custom: linear-gradient(135deg, #4A6B5A, #7A8C7E, #9BAA9E) — sage
- Nora/Callback: linear-gradient(135deg, #6B5020, #C9A84C, #D4BA7A) — amber gold
- Nora dark card: linear-gradient(145deg, #1C1410, #2D3561) — warm dark to indigo

### Accent
- Gold (Nora): #C9A84C
- Indigo (Game Room/CTA): #2D3561 / linear-gradient(135deg, #1E1B4B, #4338CA)

## Typography

### Fonts
- Display/Headings: Cormorant Garamond, serif — weight 300 (light), sizes 18-48px
- Body/UI: DM Sans, sans-serif — weights 400 (regular), 500 (medium)
- Never use: Fraunces, Geist, or any other font

### Scale
- Page title: 44px Cormorant Garamond 300
- Section heading: 28-32px Cormorant Garamond 300
- Card title: 18-22px Cormorant Garamond 400
- Body: 13-14px DM Sans 400
- Labels/caps: 9-11px DM Sans 500, letter-spacing 0.12-0.18em, uppercase

## Texture & Depth
- Grain texture: applied via SVG feTurbulence noise at 7-10% opacity on mood field gradients
- Box shadows: 0 1px 4px rgba(28,20,16,0.06) light / 0 2px 12px rgba(28,20,16,0.08) medium
- No drop shadows on flat cards — only on elevated/featured cards

## Component Patterns

### Cards
- Border radius: 18-20px for primary cards, 14px for secondary
- White background with 1px #EDE4D8 border for flat cards
- Mood field: 60-88px gradient header on featured cards, with grain texture overlay
- Type pill inside mood field: 9px uppercase, rgba(255,255,255,0.7) text, rgba(255,255,255,0.12) background

### Navigation
- Bottom nav: 5 tabs — Home · Nora · Us · Game Room · Profile
- Active tab: #1C1410 (warm dark)
- Inactive tab: #C4AA87 (stone light)
- Tab labels: 9px DM Sans 500, uppercase, letter-spacing 0.08-0.1em
- Badge dot: 7px circle, #C4714A (terracotta), positioned top-right of icon

### Buttons
- Primary CTA: gradient matching feature mood color, white text, border-radius 30px, padding 13-16px
- Secondary: border 1px solid #2D3561, color #2D3561, border-radius 20px, no fill
- Ghost: border 1px solid #D9CBBA, color #8B7355, border-radius 20px, no fill
- Pill/tag: border-radius 20px, small padding, category color background at 8-12% opacity

### Category Identifiers
- Small filled rounded square: 7-8px, border-radius 2px
- Color matches category (Travel=#C4714A, Watch=#5A6B8A, Eat=#C9A84C, Listen=#7A8C7E, Do=#6B5B8A)
- Never use emoji as category identifiers

### Dividers
- Section divider: 1px #EDE4D8, full width with 20px horizontal margin
- Labeled divider: flex row with line + centered label in 9px uppercase stone-light

## Design Principles
1. Warmth over polish — grain texture, organic gradients, never sterile
2. Earned specificity — Nora's observations feel personal because they are
3. Presence over engagement — the app opens to something meaningful, not a notification list
4. Depth without clutter — 3-5 items maximum on any surface, archive everything else
5. No emoji in UI — geometric colored shapes only
6. Text labels over icons — until custom icons are designed and implemented
7. Mood fields encode meaning — color tells you what type of moment this is before you read it

## What We Never Do
- No emoji in UI elements (category identifiers, nav tabs, card headers)
- No Geist, Fraunces, or generic sans-serif fonts
- No dark/colored full-page backgrounds (except Game Room dark mode)
- No busy layouts — maximum 2 columns, generous whitespace
- No generic AI aesthetic (no purple gradients, no floating orbs, no glowing effects)
- No self-help copy ("journey", "every couple", "what's interesting is")
