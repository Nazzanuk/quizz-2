---
name: frontend-digital-wellness
description: Create distinctive, production-grade frontend interfaces rooted in a 'Digital Minimalism meets Gen-Z Lifestyle' aesthetic. Use this skill when the user asks to build web components, pages, or applications that feel calm, modern, and intentional. Generates clean, polished code with a specific visual language: soft neutrals, expressive cursive accents, grain overlays, floating blobs, and scroll-reveal animations.
---

This skill guides creation of frontend interfaces with a precise, opinionated aesthetic: **Digital Wellness**. The visual language is calm, tactile, and generationally resonant — not sterile minimalism, but warm digital softness.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

---

## Aesthetic Identity

**Concept**: Digital Minimalism × Gen-Z Lifestyle  
**Mood**: Intentional. Soft. Alive. Like a well-curated journal that lives on a screen.  
**What makes it unforgettable**: The grain overlay that makes everything feel printed. The blobs that breathe. The Reenie Beanie accent that breaks the grid in the best way.

This style is NOT:
- Cold, clinical white-box SaaS
- Purple gradient on white (generic AI aesthetic)
- Flat, lifeless, over-systematized design

This style IS:
- Warm off-white backgrounds with paper-like texture
- Rounded, organic shapes that feel handcrafted
- Typography that mixes structured clarity with expressive handwriting
- Animations that feel like a slow inhale, not a flashy transition

---

## Design Tokens (Always Use These)

### Color Palette
```css
:root {
  --bg:        #FDFCF8; /* Primary background — warm off-white */
  --sage:      #E8EFE8; /* Soft green tint — cards, sections */
  --lavender:  #EFEDF4; /* Soft purple tint — alternate cards */
  --peach:     #FFB7B2; /* Primary accent — CTAs, highlights */
  --text-dark: #292524; /* Soft black — headings, primary text */
  --text-muted:#78716C; /* Warm gray — body copy, labels */
}
```

### Typography
```css
/* Import in <head> or @import */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Reenie+Beanie&display=swap');

:root {
  --font-primary: 'Outfit', sans-serif;
  --font-accent:  'Reenie Beanie', cursive;
}

/* Heading scale */
/* Hero:    clamp(3rem, 7vw, 6rem)  — tracking: -0.025em */
/* H2:      clamp(2rem, 4vw, 3rem)  — tracking: -0.02em  */
/* H3:      1.5rem                  — tracking: -0.01em  */
/* Body:    1rem / 1.6              — color: var(--text-muted) */
/* Accent:  'Reenie Beanie', 1.4–2× the adjacent size */

/* RULES:
   - Sentence-case ONLY (never ALL CAPS for headings)
   - Accent font used sparingly: 1–2 moments per section
   - Reenie Beanie pairs best with a line of Outfit before/after it */
```

### Spacing & Shape
```css
:root {
  --radius-sm: 1.5rem;   /* Tags, pills, small cards */
  --radius-md: 2rem;     /* Standard cards, inputs */
  --radius-lg: 3rem;     /* Large feature cards */
  --radius-xl: 4rem;     /* Hero sections, blobs */
  --shadow:    0 4px 20px -2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 8px 32px -4px rgba(0, 0, 0, 0.08);
}
```

---

## Required Visual Effects

### 1. Grain Overlay (Always Present)
Apply as a fixed pseudo-element over the entire page. This is non-negotiable — it's the texture that makes everything feel real.

```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.35;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-size: 128px 128px;
}
```

### 2. Floating Background Blobs
Use 2–4 blobs per section. Give them large border-radii (60–80% border-radius using the blob trick), low opacity, and the palette colors. Animate with `float` keyframes.

```css
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-10px); }
}

@keyframes float-slow {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50%       { transform: translateY(-8px) rotate(3deg); }
}

.blob {
  position: absolute;
  border-radius: 60% 40% 70% 30% / 50% 60% 40% 50%;
  filter: blur(40px);
  opacity: 0.5;
  animation: float 6s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}

/* Stagger delays for organic feel */
.blob:nth-child(2) { animation-delay: -2s; animation-duration: 7s; }
.blob:nth-child(3) { animation-delay: -4s; animation-duration: 8s; }
```

### 3. Scroll Reveal Animation
Apply to all content cards, headings, and feature blocks.

```css
@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.reveal {
  opacity: 0;
  animation: reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* JS IntersectionObserver triggers .is-visible */
.reveal.is-visible {
  animation-play-state: running;
}
```

```js
// Scroll reveal observer
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      entry.target.style.animationDelay = `${i * 0.1}s`;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
```

---

## Component Patterns

### Card
Rounded, soft shadow, background in `--sage` or `--lavender`, no hard borders.
```css
.card {
  background: var(--sage);
  border-radius: var(--radius-md);
  padding: 2rem;
  box-shadow: var(--shadow);
}
```

### Primary Button (Peach CTA)
```css
.btn-primary {
  background: var(--peach);
  color: var(--text-dark);
  border: none;
  border-radius: var(--radius-sm);
  padding: 0.85rem 2rem;
  font-family: var(--font-primary);
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px -4px rgba(255, 183, 178, 0.5);
}
```

### Accent Text (Reenie Beanie)
Use inline with Outfit body text to create emphasis. Always slightly larger than surrounding text.
```html
<p class="body-text">
  A tool built for <span class="accent">real people</span>, not perfect ones.
</p>
```
```css
.accent {
  font-family: var(--font-accent);
  font-size: 1.5em;
  color: var(--text-dark);
  display: inline-block;
  transform: rotate(-1deg);
  line-height: 1;
}
```

### Section with Blobs
```html
<section class="hero">
  <div class="blob" style="width:400px;height:400px;background:var(--peach);top:-100px;right:-80px;"></div>
  <div class="blob" style="width:300px;height:300px;background:var(--lavender);bottom:-60px;left:-40px;animation-delay:-3s;"></div>
  <div class="content reveal">
    <!-- section content here -->
  </div>
</section>
```

---

## Layout Principles

- **Max content width**: 1100px, centered, generous horizontal padding (clamp(1.5rem, 5vw, 5rem))
- **Section rhythm**: 6rem–10rem vertical padding between sections
- **Grid**: CSS Grid with intentional asymmetry — avoid perfectly equal columns
- **Z-index stack**: Blobs at z:0, content at z:1, grain overlay at z:9999
- **No hard borders** between sections — use background color transitions and blob positioning instead

---

## Typography Rhythm Examples

```
HERO SECTION:
[Outfit 600, ~80px, tracking-tight] "Find your rhythm"
[Reenie Beanie, ~96px]              "again."
[Outfit 400, 18px, muted]           Supporting copy in warm gray.

FEATURE CARD:
[Outfit 600, 22px]  Card heading in sentence-case
[Outfit 400, 15px]  Body copy, muted, relaxed line height (1.6)

LABEL / PILL:
[Outfit 500, 13px]  ALL-lowercase label, sage or peach background
```

---

## What to Avoid

| Avoid | Use instead |
|---|---|
| Inter, Roboto, Arial, system-ui | Outfit + Reenie Beanie |
| Pure white (#FFF) backgrounds | Warm off-white (#FDFCF8) |
| Hard borders (`border: 1px solid`) | Soft shadows + background contrast |
| Sharp corners | 2rem–4rem border-radius |
| Abrupt animations (`0.15s linear`) | 0.8s cubic-bezier(0.16, 1, 0.3, 1) |
| Flat, textureless surfaces | Grain overlay at 35% opacity (always) |
| Purple gradients on white | Sage, lavender, peach on warm off-white |
| ALL CAPS headings | Sentence-case only |
| Symmetrical, balanced grids | Intentional asymmetry, grid-breaking blobs |

---

## Implementation Checklist

Before delivering any output, verify:
- [ ] Grain overlay is present (`body::after` or equivalent fixed layer)
- [ ] At least 2 floating blobs with `float` animation in hero or primary sections
- [ ] Scroll reveal applied to all major content blocks
- [ ] Only `Outfit` and `Reenie Beanie` used (Google Fonts imported)
- [ ] All containers use 2rem–4rem `border-radius`
- [ ] `--peach` is the primary CTA color
- [ ] No pure white backgrounds — only `#FDFCF8`
- [ ] Heading tracking is `-0.025em` or tighter
- [ ] `Reenie Beanie` used for at least one expressive moment per page
- [ ] Shadows are soft (max `0.08` opacity, negative spread)
