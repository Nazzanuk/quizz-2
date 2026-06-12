---
name: neo-brutalism
description: Build distinctive, production-grade frontend interfaces in the Neo-brutalism (Neu-Brutalism) style using plain CSS — thick black borders, hard offset shadows, high-saturation pop colors, heavy type, and sticker-like layering. Use this skill whenever the user asks to build, redesign, or refactor a web component, page, or app and wants a bold, raw, anti-corporate look — or explicitly says "neo-brutalism", "neubrutalism", "brutalist UI", "sticker UI", "hard shadows", "Gumroad-style", or describes a loud, playful, in-your-face aesthetic. Also use it to retrofit an existing codebase (React, Next.js, Vue, vanilla JS) into a neo-brutalist design system. All styling is written in plain CSS (custom properties + stylesheets or CSS modules) — never Tailwind or other utility-class frameworks. Reach for this skill even when the user doesn't name the style by name but clearly wants something punchy, retro, and unpolished rather than clean/minimal/corporate.
license: Complete terms in LICENSE.txt
---

This skill guides creation of distinctive, production-grade frontend interfaces in the **Neo-brutalism** style, written entirely in **plain CSS** (custom properties plus stylesheets, CSS modules, or styled-components — never Tailwind or any utility-class framework). Implement real, working code with exceptional attention to the aesthetic's hard-edged, high-energy personality — never a generic, polished, "clean SaaS" approximation of it.

Neo-brutalism is the digital punk rebellion against soft gradients, floating borderless cards, and Corporate Memphis. It is **vibrant, loud, and tactile**: structure is enforced with thick black lines, shadows are solid blocks of ink, colors are unmixed highlighter brights, and elements behave like physical stickers slapped on a bulletin board. The guiding instinct: **if it doesn't have a border, it doesn't exist.** Confidence over timidity, density over emptiness, mechanical snap over ethereal fade.

## Styling Approach (Plain CSS Only)

Write all styles as real CSS. Do **not** use Tailwind or any utility-class system, and don't reach for utility class names like `border-4` or `shadow-lg`.

- **Centralize tokens as CSS custom properties** on `:root` — palette, shadow scale, border defaults, type scale. Define them once so nothing is a magic one-off. Full values and a ready-to-use stylesheet are in `references/design-tokens.md`.
- **Use semantic class names** (`.btn`, `.btn--accent`, `.card`, `.badge`) backed by a stylesheet or CSS modules, not inline utility soup.
- Match the project's existing CSS conventions (BEM, CSS modules, styled-components, plain stylesheets) — but keep it vanilla CSS underneath.

## Working Process (Integrating Into a Codebase)

If you're dropping this style into an existing project rather than building greenfield, build a mental model first, then commit hard to the aesthetic.

- **Read the stack**: framework (React/Next/Vue/vanilla), how CSS is authored today (global stylesheets, CSS modules, styled-components), and any existing tokens, global styles, and conventions.
- **Map the component architecture**: layout primitives, naming conventions, atom/molecule/organism boundaries. Match these when you write code.
- **Clarify scope** if it's ambiguous — but don't over-interrogate. Usually one question settles it: do they want a *single component/page* redesigned, *existing components refactored* into the system, or *new features built* in the style?
- **Define the token layer first** (the `:root` custom properties from the reference) before styling anything, so the palette, shadow scale, and border defaults exist in one place.
- **Leave it cleaner than you found it**: reusable bordered primitives (button, card, badge, input) over duplicated rules. Preserve or improve accessibility and responsiveness.

Briefly explain *why* as you go — token centralization, a chosen 60/40 split, a focus-state decision — so the architecture is legible, not magic.

## The Neo-Brutalist Ethos (Non-Negotiable DNA)

These are the principles that make the style instantly recognizable. Execute them deliberately and exaggeratedly — nothing here is subtle.

1. **Unapologetic visibility.** Structure is enforced, never implied. A `4px solid #000` border is the default on every meaningful element. No invisible cards, no soft elevation.
2. **Hard offset shadows.** Solid black rectangles, **zero blur, zero spread**, offset bottom-right at 45°. A `4 / 8 / 12 / 16px` scale (e.g. `box-shadow: 8px 8px 0 0 #000`). These are ink blocks, not light diffusion.
3. **The pop palette.** A warm cream canvas (`#FFFDF5`) carrying intense bursts of Hot Red, Vivid Yellow, and Soft Violet. Pure black for all borders/text/shadows. **Never subtle grays** — it's black or a color, never `#333` or `#666`.
4. **Type as texture.** Heavy weights only (`font-weight: 700` and `900`). Massive display sizes, `text-transform: uppercase` for emphasis, tight `letter-spacing` on headlines, wide on labels. Hollow `-webkit-text-stroke` headlines for drama.
5. **Digital tactility.** Elements are stickers and paper cutouts. Buttons **press down** to cover their shadow on `:active`. Cards **lift up** and grow their shadow on `:hover`. Badges **rotate further** on hover.
6. **Organized chaos.** Slight rotations (`transform: rotate(1deg)`, `rotate(-2deg)`, `rotate(3deg)`) on cards, badges, and headline spans. Intentional overlap via absolute positioning. Asymmetry (60/40, 70/30) over perfect symmetry — but the underlying grid stays rigid and usable.
7. **Maximalism + texture.** Never leave a background flat. Layer halftone dots, grid lines, or noise. Alternate large color-blocked sections (cream → yellow → violet → black) for rhythm.
8. **Mechanical motion.** Fast and snappy (`transition: ... 100ms`–`300ms`), `ease-out`/`linear`, never `ease-in-out`. Interactions snap into place; they don't glow or soften.

## Aesthetic Execution Guidelines

Apply the ethos through these concrete moves. Exact values, the `:root` token block, CSS snippets, and full component stylesheets live in `references/design-tokens.md` — read it before writing styles so colors, shadows, and patterns stay consistent.

- **Typography**: `Space Grotesk` is the canonical face for this style. Headings `font-weight: 900`, body/labels/buttons `700`. Pair display sizes (~`4.5rem`–`8rem`) against small, wide-tracked uppercase labels. Use `-webkit-text-stroke: 2px #000; color: transparent;` for hollow hero headlines. *(When generating multiple distinct neo-brutalist pieces, it's fine to swap in another heavy geometric/grotesque display face for variety — the style is defined by the structure, not one font.)*
- **Color & blocking**: Commit to the cream canvas with bold color-blocked sections. Use color to chunk the page, not to decorate evenly. High contrast is mandatory — every text/background pair must pass WCAG AA.
- **Borders & radius**: `4px solid #000` default; `2px` for subtle separators/ghost buttons; `8px` for hero dividers. `border-radius: 0` (sharp) everywhere, with `border-radius: 9999px` reserved only for pill badges and circular stickers. Never mid-range rounding (`8px`/`12px` corners).
- **Shadows**: Use the hard-shadow scale as primary depth. Buttons `4–6px`, cards `8–12px`, hero elements up to `16–20px`. On black backgrounds, switch the shadow color to white (`box-shadow: 20px 20px 0 0 #fff`).
- **Motion & interaction physics** (this is what sells it):
  - Buttons: on `:active`, `transform: translate(2px, 2px); box-shadow: none;` — a mechanical click-down.
  - Cards: on `:hover`, `transform: translateY(-4px); box-shadow: 12px 12px 0 0 #000;` (or `-8px` / `16px`) — a physical lift.
  - Badges/stickers: `:hover { transform: rotate(12deg); }`; slow decorative spin (`animation: spin-slow 10s linear infinite`); attention bounce/pulse.
- **Spatial composition**: Dense 8px grid, `4rem`–`8rem` section padding, `2rem`–`3rem` gaps. Break the grid on purpose — overlap floating shapes, absolutely-position rotated badges on card corners (`position:absolute; top:-1.5rem; right:-1.5rem`), set giant low-opacity background text/numbers as texture, build deliberate "chaos zones" (e.g. a busy hero right side). Horizontal marquees of repeated text make great trust strips and dividers.
- **Components**: Build a small set of bordered primitives and reuse them:
  - *Button* — sharp, `height: 3rem`–`3.5rem`, colored fill + `4px solid #000` + hard shadow + click-down. Label `font-weight:700; font-size:.875rem; text-transform:uppercase; letter-spacing:.05em`.
  - *Card* — `background:#fff; border:4px solid #000;` sharp corners, deep shadow, lift on hover, often a colored header with `border-bottom:4px solid #000`.
  - *Input* — `4px solid #000` sharp, large bold text, and a **background color change** on focus (`:focus-visible { background: var(--neo-secondary); box-shadow: 4px 4px 0 0 #000; outline:none; }`) instead of a soft ring. Touch-friendly `height: 3.5rem`+.
  - *Badge* — pill or square, colored fill, thick border, rotated, often absolutely positioned and overlapping.
- **Iconography**: `lucide` icons (or inline SVG) with thick strokes (`stroke-width: 3`–`4`), often placed inside bordered colored boxes. Stars and arrows are signature decorative motifs.

## Anti-Patterns (These Break the Style — Avoid)

- **Tailwind or any utility-class framework.** Write real CSS.
- **Blur of any kind** — no `filter: blur()`, no `backdrop-filter`, no blurred `box-shadow`. Every shadow is hard (0 blur).
- **Smooth gradients** as fills (`linear-gradient` fades). Use hard color stops, solid blocks, or patterns instead.
- **Mid-range rounded corners.** Sharp (`0`) or fully round (`9999px`) only.
- **Subtle grays** (`#333/#666/#999`) and timid low-contrast palettes. Pure black or a pop color.
- **Soft, slow easing** (`ease-in-out`, long durations) and fades/glows on interaction.
- **Minimalist empty whitespace.** Fill it with texture, pattern, or decoration. Density is the point.
- **Borderless floating elements.** If it has no visible border, it feels wrong.

## Accessibility (Built In, Not Bolted On)

The high-contrast palette makes AA easy — keep it that way and verify each pair. Use semantic HTML (`<button>`, `<nav>`, `<header>`, `<main>`), `aria-label` on icon-only buttons, and logical tab order. Provide a visible focus state (thick black outline, e.g. `:focus-visible { outline: 3px solid #000; outline-offset: 2px; }`, or the yellow background swap on inputs). Honor reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

Touch targets ≥ 44px (`height: 3rem`–`3.5rem`). On mobile, scale type and shadows down via media queries but **keep the thick borders, hard shadows, and bold type** — never collapse into a generic mobile look.

---

Neo-brutalism rewards confidence. The whole style is a statement: "I know this looks unpolished, and that's exactly why it's good." Don't hedge it into a tame, half-borrowed version. Commit fully — thick lines, ink shadows, screaming color, stickers slapped at angles — and execute every detail in clean, hand-written CSS with precision. That intentionality, not restraint, is what makes it land.
