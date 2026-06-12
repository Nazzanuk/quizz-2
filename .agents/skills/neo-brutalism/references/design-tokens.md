# Neo-Brutalism — Design Tokens & CSS Reference (No Tailwind)

Everything here is **plain CSS**. No utility-class framework. Read this before writing styles. Drop the `:root` block in once, give elements semantic class names, and the rest follows. Centralize the custom properties so colors, shadows, and spacing are never one-off magic values.

## Table of Contents
1. The token block (`:root`)
2. Color palette
3. Typography
4. Borders & radius
5. Hard shadow scale
6. Background patterns & textures
7. Component stylesheets (button, card, input, badge, nav)
8. Animations & motion
9. Responsive scaling (media queries)

---

## 1. The Token Block — paste once

```css
:root {
  /* Color */
  --neo-bg:        #FFFDF5;  /* cream canvas */
  --neo-ink:       #000000;  /* all text, borders, shadows */
  --neo-accent:    #FF6B6B;  /* hot red — primary actions */
  --neo-secondary: #FFD93D;  /* vivid yellow */
  --neo-muted:     #C4B5FD;  /* soft violet */
  --neo-white:     #FFFFFF;

  /* Borders */
  --neo-border-thin: 2px solid var(--neo-ink);
  --neo-border:      4px solid var(--neo-ink);  /* default */
  --neo-border-thick:8px solid var(--neo-ink);

  /* Hard shadows (0 blur, 0 spread) */
  --neo-shadow-sm: 4px 4px 0 0 var(--neo-ink);
  --neo-shadow:    8px 8px 0 0 var(--neo-ink);
  --neo-shadow-lg: 12px 12px 0 0 var(--neo-ink);
  --neo-shadow-xl: 16px 16px 0 0 var(--neo-ink);
  --neo-shadow-inv:20px 20px 0 0 var(--neo-white); /* on black bgs */

  /* Type */
  --neo-font: "Space Grotesk", system-ui, sans-serif;

  /* Motion */
  --neo-fast: 100ms ease-out;
  --neo-med:  200ms ease-out;
}

html { font-family: var(--neo-font); }
body { background: var(--neo-bg); color: var(--neo-ink); }
*    { border-radius: 0; }  /* sharp by default */
```

---

## 2. Color Palette

| Token | Hex | Role |
|---|---|---|
| `--neo-bg` | `#FFFDF5` | Cream/off-white. Page bg, card interiors, contrast panels. Warmer than white. |
| `--neo-ink` | `#000000` | Pure black. ALL text, ALL borders, ALL shadows. No grays. |
| `--neo-accent` | `#FF6B6B` | Hot red. Primary actions, CTAs, important badges, hover fills. |
| `--neo-secondary` | `#FFD93D` | Vivid yellow. Secondary buttons, badges, logo/footer bg, alternate sections, input focus bg. |
| `--neo-muted` | `#C4B5FD` | Soft violet. Subtle bg, card headers, FAQ panels, decoration. |
| `--neo-white` | `#FFFFFF` | Contrast text on dark sections, inverted buttons, contrast panels. |

**Rules:** never subtle grays (`#333/#666/#999`); high contrast mandatory (WCAG AA); color-block sections (cream → yellow → violet → black) for rhythm.

---

## 3. Typography

- **Family:** `Space Grotesk` (canonical). Load weights 400;500;700;900:
  `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700;900&display=block`
  *(For variety across separate generations, any heavy geometric/grotesque display face works — the style is the structure, not the font.)*
- **Weights — heavy only:** `900` for h1–h3; `700` for body/labels/buttons; `500` sparingly; `400` generally avoided.
- **Scale (rem / px):**

  | Role | size |
  |---|---|
  | Display (hero) | `6rem`–`8rem` (96–128px) |
  | H2 | `3.75rem`–`6rem` (60–96px) |
  | H3 | `2.25rem`–`3rem` (36–48px) |
  | Body large | `1.5rem`–`1.875rem` (24–30px) |
  | Body | `1.125rem`–`1.25rem` (18–20px) |
  | Small / labels | `.875rem`–`1rem` (14–16px) |

- **Techniques:**

```css
/* Hollow display headline */
.neo-hollow {
  -webkit-text-stroke: 2px var(--neo-ink);
  color: transparent;
  font-weight: 900;
}

/* Headline density vs. label spacing */
.neo-headline { font-weight: 900; text-transform: uppercase;
                letter-spacing: -0.03em; line-height: 0.85; }
.neo-label    { font-weight: 700; text-transform: uppercase;
                letter-spacing: 0.1em; font-size: .875rem; }

/* Text shadow on colored bg */
.neo-text-shadow { text-shadow: 4px 4px 0 var(--neo-ink); }
```

Line height: `1` / `0.85` for display; `1.4`–`1.6` for body.

---

## 4. Borders & Radius

- Default: `border: 4px solid #000;` (`var(--neo-border)`) — the signature thickness.
- Thin: `2px` (subtle separators, ghost buttons).
- Thick: `8px` (hero/major dividers).
- All borders solid black, no transparency.
- Radius: `border-radius: 0` everywhere. Exception: `9999px` for pill badges / circular stickers only. Never mid-range corners.

---

## 5. Hard Shadow Scale (0 blur, 0 spread, bottom-right)

| Size | Value |
|---|---|
| Small | `box-shadow: 4px 4px 0 0 #000;` |
| Medium | `box-shadow: 8px 8px 0 0 #000;` |
| Large | `box-shadow: 12px 12px 0 0 #000;` |
| Massive | `box-shadow: 16px 16px 0 0 #000;` |
| On black bg | `box-shadow: 20px 20px 0 0 #fff;` |

---

## 6. Background Patterns & Textures (never leave a bg flat)

```css
/* Halftone dots */
.bg-halftone {
  background-image: radial-gradient(#000 1.5px, transparent 1.5px);
  background-size: 20px 20px;
}

/* Grid / graph paper */
.bg-grid {
  background-size: 40px 40px;
  background-image:
    linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px);
}

/* Larger radial dots */
.bg-dots {
  background-image: radial-gradient(circle, #000 2px, transparent 2.5px);
  background-size: 30px 30px;
}

/* Noise texture (SVG filter) */
.bg-noise {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'%2F%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
}
```

---

## 7. Component Stylesheets

**Button**
```css
.btn {
  height: 3rem; padding: 0 1.5rem;
  background: var(--neo-accent); color: var(--neo-ink);
  font: 700 .875rem/1 var(--neo-font);
  text-transform: uppercase; letter-spacing: .05em;
  border: var(--neo-border); border-radius: 0;
  box-shadow: var(--neo-shadow-sm);
  cursor: pointer;
  transition: transform var(--neo-fast), box-shadow var(--neo-fast), background var(--neo-fast);
}
.btn:hover   { background: #ff5252; }            /* slight darken */
.btn:active  { transform: translate(2px, 2px); box-shadow: none; } /* click-down */
.btn:focus-visible { outline: 3px solid var(--neo-ink); outline-offset: 2px; }

.btn--secondary { background: var(--neo-secondary); }
.btn--outline   { background: var(--neo-white); }
.btn--ghost     { background: transparent; border: var(--neo-border-thin) transparent; box-shadow: none; }
.btn--ghost:hover { border-color: var(--neo-ink); }
```
```html
<button class="btn">Click me</button>
```

**Card (lift on hover)**
```css
.card {
  background: var(--neo-white);
  border: var(--neo-border); border-radius: 0;
  box-shadow: var(--neo-shadow);
  transition: transform var(--neo-med), box-shadow var(--neo-med);
}
.card:hover { transform: translateY(-4px); box-shadow: var(--neo-shadow-lg); }
.card__header { background: var(--neo-muted); border-bottom: var(--neo-border);
                padding: 1rem; font-weight: 900; text-transform: uppercase; }
.card__body { padding: 1.5rem; font-weight: 700; }
```

**Input (focus = background swap, not ring)**
```css
.input {
  height: 3.5rem; width: 100%; padding: 0 1rem;
  background: var(--neo-white); color: var(--neo-ink);
  font: 700 1.125rem/1 var(--neo-font);
  border: var(--neo-border); border-radius: 0;
}
.input::placeholder { color: rgba(0,0,0,.4); }
.input:focus-visible {
  background: var(--neo-secondary);
  box-shadow: var(--neo-shadow-sm);
  outline: none;
}
```

**Badge (rotated sticker)**
```css
.badge {
  display: inline-block; padding: .25rem 1rem;
  background: var(--neo-accent); color: var(--neo-ink);
  font: 900 .875rem/1 var(--neo-font);
  text-transform: uppercase; letter-spacing: .1em;
  border: var(--neo-border); border-radius: 9999px;
  box-shadow: var(--neo-shadow-sm);
  transform: rotate(3deg);
  transition: transform var(--neo-med);
}
.badge:hover { transform: rotate(12deg); }
/* Pin to a card corner */
.badge--pinned { position: absolute; top: -1.5rem; right: -1.5rem; }
```

**Nav link**
```css
.nav-link {
  font-weight: 700; text-transform: uppercase;
  border: var(--neo-border-thin) transparent;
  transition: all var(--neo-fast);
}
.nav-link:hover {
  border-color: var(--neo-ink);
  background: var(--neo-accent);
  padding: 0 .5rem;
  box-shadow: var(--neo-shadow-sm);
}
```

---

## 8. Animations & Motion

```css
@keyframes spin-slow { from { transform: rotate(0); } to { transform: rotate(360deg); } }
.spin-slow { animation: spin-slow 10s linear infinite; }
```

- Speed: buttons `100ms`; cards/hovers `200`–`300ms`.
- Easing: `linear` (mechanical) or `ease-out` (natural decel). Never `ease-in-out`.
- Loops: slow spin (decorative stars), pulse (CTAs), bounce (attention badges).
- Reduced motion:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

---

## 9. Responsive Scaling (media queries; keep the aesthetic)

Mobile-first: set base (small) values, then scale up. Breakpoints: 640 / 768 / 1024 / 1280px.

```css
.hero-title { font-size: 2.25rem; }                 /* base */
@media (min-width: 640px) { .hero-title { font-size: 3.75rem; } }
@media (min-width: 768px) { .hero-title { font-size: 6rem; } }

.section { padding: 4rem 2rem; }
@media (min-width: 768px) { .section { padding: 8rem 4rem; } }

.grid { display: grid; grid-template-columns: 1fr; gap: 2rem; }
@media (min-width: 768px)  { .grid { grid-template-columns: 1fr 1fr; } }
@media (min-width: 1024px) { .grid { grid-template-columns: 1fr 1fr 1fr; } }

/* Shadows shrink on small screens */
.card { box-shadow: 6px 6px 0 0 #000; }
@media (min-width: 640px) { .card { box-shadow: var(--neo-shadow); } }

/* Buttons full-width on mobile */
.btn { width: 100%; }
@media (min-width: 640px) { .btn { width: auto; } }
```

- Touch targets `height: 3rem`–`3.5rem`.
- Nav: hamburger as a bordered square with shadow; slide-in drawer of stacked bordered buttons.
- Keep thick borders, hard shadows, and bold type at every breakpoint — never collapse to generic mobile.

---

## Layout container

```css
.container { width: 100%; max-width: 80rem; margin-inline: auto; padding-inline: 1.5rem; }
```
Favor asymmetry inside it — 60/40 and 70/30 splits via `grid-template-columns: 3fr 2fr`, offset columns, rotated blocks — over perfect symmetry.
