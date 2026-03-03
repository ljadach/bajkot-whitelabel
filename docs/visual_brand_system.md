Updated: 13 Feb 2026

# Visual Brand System

Companion to the [Editorial Style Guide](editorial_style_guide.md). That document governs **words**. This document governs **everything you see**.

Designed for human designers AND AI agents generating content programmatically.

---

## 1. Design Philosophy

Three principles, derived from the Editorial Efficiency Mandate:

| Principle | In words | In visuals |
|-----------|----------|------------|
| **Clarity Over Cleverness** | Delete any pun that obscures meaning. | Delete any decoration that obscures function. |
| **Intellectual Respect** | Assume the user is intelligent but busy. | Design for scanning, not admiring. |
| **Efficiency Mandate** | Every word must contribute horsepower. | Every pixel must contribute signal. |

**We are the "Guide on the Side."** Visually, this means: warm but not playful, precise but not clinical, authoritative but not corporate-boring.

**Reference aesthetic:** Apple clarity + Notion density + Stripe sophistication.

---

## 2. Color System

### 2.1 Primary Palette

| Role | Name | Hex | RGB | Usage |
|------|------|-----|-----|-------|
| **Brand Accent** | Coral | `#ff6b35` | 255, 107, 53 | CTAs, active states, brand emphasis, links (homepage) |
| **Accent Hover** | Deep Coral | `#e55a2b` | 229, 90, 43 | Hover/pressed states on accent elements |
| **Accent Subtle** | Coral Wash | `#fff5f0` | 255, 245, 240 | Accent backgrounds, badges, highlight areas |
| **Accent Dark** | Burnt Coral | `#cc4a1a` | 204, 74, 26 | Text on accent-subtle backgrounds |
| **Ink** | Near Black | `#0f0f0f` | 15, 15, 15 | Primary text, headings, dark buttons |
| **Ink Secondary** | Dark Gray | `#525252` | 82, 82, 82 | Body text, descriptions |
| **Muted** | Mid Gray | `#737373` | 115, 115, 115 | Captions, placeholders, timestamps |
| **Line** | Light Gray | `#e5e5e5` | 229, 229, 229 | Borders, dividers |
| **Line Subtle** | Faint Gray | `#f0f0f0` | 240, 240, 240 | Subtle separators, table rows |
| **Surface Subtle** | Off White | `#fafafa` | 250, 250, 250 | Card backgrounds, sections |
| **Surface Muted** | Light Warm | `#f5f5f5` | 245, 245, 245 | Muted backgrounds, code blocks |
| **Background** | White | `#ffffff` | 255, 255, 255 | Page background |

### 2.2 Segment Palettes

Segment pages override **secondary elements only** (icons, outline buttons, subtle backgrounds). Primary CTAs use Ink (`#0f0f0f`) on segment pages, NOT coral.

| Segment | Accent | Accent Subtle | CSS Variable |
|---------|--------|---------------|--------------|
| **Business** | `#1e3a5f` (Navy) | `#f0f4f8` | `--segment-accent` |
| **Education** | `#4a7c59` (Forest) | `#f0f7f2` | `--segment-accent` |
| **Executive** | `#4a5568` (Slate) | `#f7f8f9` | `--segment-accent` |

**Rule:** Coral appears on the **homepage and shared brand contexts**. Segment pages use the **dark CTA + segment accent** pattern.

### 2.3 Semantic Colors

| State | Color | Subtle BG | Usage |
|-------|-------|-----------|-------|
| **Success** | `#16a34a` | `#f0fdf4` | Completion, positive feedback |
| **Warning** | `#ca8a04` | `#fefce8` | Alerts, attention needed |
| **Error** | `#dc2626` | `#fef2f2` | Errors, destructive actions |

### 2.4 Scroll Reader Palette (Content Consumption)

The Scroll Tutor reading experience uses a separate warm palette for long-form content. This is intentional — it shifts the user from "interface mode" to "reading mode."

| Role | Hex | Usage |
|------|-----|-------|
| Background | `#faf8f5` | Warm off-white page |
| Text | `#3b3632` | Warm brown body text |
| Heading | `#1c1816` | Near-black headings |
| Muted | `#8c8279` | Secondary/caption text |
| Accent | `#8B6914` | Brass/gold highlights |
| Accent Subtle | `#f7f3ea` | Warm highlight backgrounds |
| Completion | `#7a6e5d` | Progress, bookmarks |

### 2.5 Color Usage Rules

**Accessibility:**
- Body text on white: minimum 4.5:1 contrast ratio (WCAG AA).
- Large text (18px+ or 14px+ bold): minimum 3:1.
- Coral `#ff6b35` on white = 3.2:1. **Use only for large text, buttons, or icons** — never for small body text.
- For small coral text, use Burnt Coral `#cc4a1a` on white = 5.1:1. Passes AA.

**Hierarchy:**
- Coral = action and brand. Maximum 1-2 coral elements per viewport.
- Ink = content. Headlines, body, dark buttons.
- Muted = supporting. Captions, meta, timestamps.
- Do not combine coral and segment accents on the same page.

### 2.6 CSS Variables Reference

```css
:root {
  --bg: #ffffff;
  --bg-subtle: #fafafa;
  --bg-muted: #f5f5f5;
  --ink: #0f0f0f;
  --ink-secondary: #525252;
  --muted: #737373;
  --line: #e5e5e5;
  --line-subtle: #f0f0f0;
  --accent: #ff6b35;
  --accent-hover: #e55a2b;
  --accent-subtle: #fff5f0;
  --accent-dark: #cc4a1a;
  --success: #16a34a;
  --success-subtle: #f0fdf4;
  --warning: #ca8a04;
  --warning-subtle: #fefce8;
  --error: #dc2626;
  --error-subtle: #fef2f2;
}
```

---

## 3. Typography

### 3.1 Font Stack

```
Primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif
OpenType features: 'cv02', 'cv03', 'cv04', 'cv11'
```

No secondary or display fonts. Inter handles everything.

### 3.2 Type Scale

| Level | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| **Display** | 40px / 2.5rem | 700 | 1.1 | -0.025em | Landing page heroes |
| **H1** | 32px / 2rem | 700 | 1.2 | -0.02em | Page titles |
| **H2** | 24px / 1.5rem | 600 | 1.25 | -0.02em | Section headings |
| **H3** | 18px / 1.125rem | 600 | 1.3 | -0.015em | Subsection headings, card titles |
| **Body** | 16px / 1rem | 400 | 1.6 | 0 | Paragraph text |
| **Body Small** | 14px / 0.875rem | 400 | 1.5 | 0 | Descriptions, secondary text |
| **Caption** | 12px / 0.75rem | 500 | 1.4 | 0.01em | Labels, timestamps, meta |
| **Overline** | 12px / 0.75rem | 600 | 1.4 | 0.08em | Section labels (uppercase) |
| **2XS** | 11px / 0.6875rem | 500 | 1rem | 0.01em | Badges, chips |
| **Button** | 14px / 0.875rem | 600 | 1 | 0 | Button labels |

### 3.3 Weight System

| Weight | Value | Usage |
|--------|-------|-------|
| Regular | 400 | Body text |
| Medium | 500 | Captions, badges, emphasis |
| Semibold | 600 | Headings, buttons, labels |
| Bold | 700 | Display, H1, strong emphasis |

### 3.4 Language-Specific Notes

- **German text** expands ~30% wider than English. Test all layouts with DE content.
- **Polish diacritics** (ą, ę, ó, ś, ż, ź, ć, ń, ł) — Inter supports them natively. No fallback needed.
- Button labels: enforce the 4-word max more strictly in DE (words are longer).

---

## 4. Logo & Brand Mark

### 4.1 Current Mark

The AITutoro mark is a monogram/icon used as favicon and app icon. It serves as the primary brand identifier.

- **Favicon suite:** 16px to 512px, all in `/public/`
- **Primary usage:** Navigation bar (top-left), app icon, social profile
- **Format:** PNG (raster), needs SVG master for scalability

### 4.2 Wordmark

The text "AITutoro" in Inter Bold with standard tracking. Always rendered as live text, not as a graphic.

- **Orthography:** `AITutoro` — no space, capital A-I-T. See Editorial Style Guide Section 6.
- **PRE-BETA badge:** Coral background, white text, rounded pill. Temporary — remove at launch.

### 4.3 Usage Rules

| Rule | Specification |
|------|--------------|
| **Clear space** | Minimum 1x mark height on all sides |
| **Minimum size** | 16px for icon, 14px for wordmark text |
| **Backgrounds** | White or light neutral only. No placement on photos, gradients, or patterns |
| **Color** | Mark in original colors or monochrome black. Never coral, never segment colors |
| **Distortion** | Never stretch, rotate, add effects, or alter proportions |

### 4.4 TODO

- [ ] Create SVG master of the mark
- [ ] Define monochrome and inverse (white on dark) variants
- [ ] Formalize lockup (mark + wordmark) with spacing rules

---

## 5. Iconography

### 5.1 Style Definition

| Property | Value |
|----------|-------|
| **Style** | Outlined / line-based (Heroicons aesthetic) |
| **Stroke width** | 1.5px |
| **Line cap** | Round |
| **Line join** | Round |
| **Corner radius** | Proportional to icon size |
| **Fill** | `none` (stroke only) |
| **Color** | `currentColor` (inherits from parent) |

### 5.2 Sizing

| Context | Size | Container |
|---------|------|-----------|
| **Inline text** | 16px (w-4 h-4) | None |
| **UI element** | 20px (w-5 h-5) | None |
| **Standard** | 24px (w-6 h-6) | None |
| **Feature card** | 24px | 48px box with accent-subtle bg, rounded-lg |
| **Navigation** | 20px | None |

### 5.3 Color Application

- **Default:** `ink-secondary` (`#525252`)
- **Active / selected:** `accent` (`#ff6b35`) or segment accent
- **Muted / disabled:** `muted` (`#737373`)
- **On dark backgrounds:** White (`#ffffff`)
- **In icon boxes:** accent color on accent-subtle background

### 5.4 Icon Library

Current icons are inline SVGs in components. As the library grows:
- Source from [Heroicons](https://heroicons.com/) (outline set) for consistency.
- Custom icons must match stroke weight, cap, and join specs exactly.
- No filled icons, no emoji, no illustrations mixed into icon slots.

---

## 6. Layout & Spacing

### 6.1 Spacing Scale

Base unit: **4px**. All spacing uses multiples:

| Token | Value | Usage |
|-------|-------|-------|
| `1` | 4px | Tight gaps (icon-to-text) |
| `2` | 8px | Compact spacing |
| `3` | 12px | Standard inner padding |
| `4` | 16px | Component padding, grid gap |
| `5` | 20px | Card padding |
| `6` | 24px | Section inner spacing |
| `8` | 32px | Section gaps |
| `section` | 32px (2rem) | Between major sections |
| `12` | 48px | Major vertical rhythm |
| `16` | 64px | Page section separation |

### 6.2 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 6px | Small elements, badges |
| `DEFAULT` | 8px | Inputs, standard cards |
| `lg` | 12px | Prominent cards, modals, CTA buttons |
| `xl` | 16px | Feature sections |
| `2xl` | 20px | Hero sections |
| `chip` | 999px | Pills, badges, tags |

### 6.3 Shadow System

| Level | Value | Usage |
|-------|-------|-------|
| `sm` | `0 1px 2px rgb(0 0 0 / 0.03)` | Subtle lift |
| `DEFAULT` | `0 1px 3px rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)` | Cards |
| `md` | `0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)` | Elevated cards |
| `lg` | `0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)` | Modals, dropdowns |

Shadows are intentionally subtle. No hard drop shadows, no colored shadows (exception: coral CTA glow `rgba(255, 107, 53, 0.25)`).

### 6.4 Responsive Breakpoints

| Name | Width | Layout behavior |
|------|-------|----------------|
| Mobile | < 640px | Single column, full-width cards |
| `sm` | 640px | Minor adjustments |
| `md` | 768px | Two-column layouts begin |
| `lg` | 1024px | Full desktop layout |
| Max content width | 960-1100px | Centered, 80% width |

### 6.5 Page Structure

```
[Nav Bar — fixed, white, border-bottom]
[Hero Section — generous padding, centered text]
[Content Sections — alternating white/subtle bg]
[Footer — minimal]
```

- Content is **centered** with max-width constraint.
- Mobile-first: design at 360px, enhance upward.

---

## 7. Component Patterns

### 7.1 Buttons

| Variant | Background | Text | Border | Usage |
|---------|-----------|------|--------|-------|
| **Primary (Homepage)** | `#ff6b35` | White | None | Main CTA on homepage/brand pages |
| **Primary (Segments)** | `#0f0f0f` | White | None | Main CTA on segment pages |
| **Secondary** | White | `ink` | `#e5e5e5` | Secondary actions |
| **Outline Accent** | Transparent | `#ff6b35` | `#ff6b35` | Secondary on homepage |
| **Outline Segment** | Transparent | Segment color | Segment color | Secondary on segment pages |
| **Ghost** | Transparent | `#525252` | None | Tertiary, toolbar actions |

**Shared button specs:**
- Padding: `10px 24px`
- Border radius: `10px` (standard), `12px` (CTA)
- Font: 14px / 600 weight
- Max 4 words (from Editorial Style Guide)
- Hover: subtle lift + darken
- Focus: visible ring, 2px offset

### 7.2 Cards

| Variant | Background | Border | Shadow | Usage |
|---------|-----------|--------|--------|-------|
| **Base** | White | `#e5e5e5` | None | Standard container |
| **Elevated** | White | `#e5e5e5` | `sm` | Prominent cards |
| **Feature** | White | `#e5e5e5` | `DEFAULT` | Landing page features, hover-lift |
| **Dashboard** | White | `#e5e5e5` | Warm-toned | In-app dashboard |

Cards use `rounded-xl` (12px). Padding: 20-24px.

### 7.3 Inputs

| State | Border | Ring | Usage |
|-------|--------|------|-------|
| Default | `#e5e5e5` | None | Resting state |
| Focus | `#a3a3a3` | `#f0f0f0` 3px | Active editing |
| Error | `#dc2626` | `#fef2f2` 3px | Validation failure |
| Disabled | `#f0f0f0` | None | Non-interactive |

Input specs: `rounded-lg`, padding `10px 14px`, font 14px.

### 7.4 Badges & Tags

| Variant | Background | Text |
|---------|-----------|------|
| Default | `#f5f5f5` | `#525252` |
| Accent | `#fff5f0` | `#cc4a1a` |
| Segment | Segment subtle | Segment dark |
| Success | `#f0fdf4` | `#16a34a` |

Badge specs: `rounded-md` (6px), padding `2px 8px`, font 11px/500.

### 7.5 Loading States

- **Skeleton:** `bg-neutral-100 animate-pulse rounded`
- **Spinner:** Border ring, `border-t-neutral-600`, 20px size
- **No empty states without guidance** — always show a message or action.

---

## 8. Accessibility Baseline

**Target:** WCAG 2.1 Level AA.

| Requirement | Specification |
|-------------|--------------|
| **Text contrast** | 4.5:1 minimum (normal text), 3:1 (large text) |
| **Focus indicators** | Visible ring on all interactive elements. Never remove `outline`. |
| **Keyboard navigation** | All interactive elements reachable via Tab. Logical order. |
| **Touch targets** | Minimum 44x44px on mobile |
| **Alt text** | All meaningful images. Decorative images get `alt=""`. |
| **ARIA labels** | Icon-only buttons must have `aria-label`. |
| **Motion** | Respect `prefers-reduced-motion`. No essential info conveyed only through animation. |
| **Color alone** | Never use color as the sole indicator of state. Pair with icons or text. |

---

## 9. Dark Mode

**Status:** Not implemented. Not planned for MVP.

Infrastructure exists (CSS variables). When implemented:
- Swap background/ink values
- Coral accent remains — it works on dark backgrounds
- Test all segment palettes on dark surfaces

---

## 10. Version History

| Version | Date | Summary | Author |
|---------|------|---------|--------|
| 1.0 | 2026 Feb 13 | Initial publication. Color system, typography, layout, components. | Lukasz + Claude |
| | | | |
