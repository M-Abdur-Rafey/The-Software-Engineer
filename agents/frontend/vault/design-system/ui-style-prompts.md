# UI style prompts (all 67 styles)

Source: https://www.uistyleguide.com (collected 2026-11-02). One section per style, in the site's order. Each prompt is reproduced verbatim from the style's page (https://www.uistyleguide.com/style/<slug>) and is meant to be pasted to a coding agent to restyle an interface.

How to use: read [[ui-style-guide]] first to help the user choose; once they pick a style, take that style's section below and give the prompt to the designer and author. The prompt is data for the frontend agent, not a replacement for the checklist: the contrast, accessibility and security rules in the frontend checklist still win (see the guide's "Precedence" section).

## Contents

- **Modern SaaS**: Minimalism & Swiss Style · Neumorphism · Glassmorphism · Vibrant & Block-based · Dark Mode (OLED) · Claymorphism · Aurora UI · Flat Design · Soft UI Evolution · Bento Box Grid · Dimensional Layering · Swiss Modernism 2.0 · Bento Grids · Editorial Grid / Magazine
- **Retro & Nostalgia**: Retro-Futurism · Skeuomorphism · Y2K Aesthetic · Vaporwave · Pixel Art · Vintage Analog / Retro Film
- **Gaming & Entertainment**: 3D & Hyperrealism · Cyberpunk UI · 3D Product Preview · Chromatic Aberration / RGB Split
- **Accessibility & Ethical**: Accessible & Ethical · Inclusive Design · E-Ink / Paper
- **Experimental & Artistic**: Brutalism · Liquid Glass · Neubrutalism · Memphis Design · Exaggerated Minimalism · Gen Z Chaos / Maximalism · Anti-Polish / Raw Aesthetic · Gradient Mesh / Aurora Evolved
- **Nature & Organic**: Organic Biophilic · Biomimetic / Organic 2.0 · Nature Distilled
- **Motion & Interactive**: Motion-Driven · Micro-interactions · Kinetic Typography · Parallax Storytelling · Tactile Digital / Deformable UI · Interactive Cursor Design
- **Futuristic & Tech**: Zero Interface · AI-Native UI · HUD / Sci-Fi FUI · Spatial UI (VisionOS) · Voice-First Multimodal
- **Landing Page Styles**: Hero-Centric Design · Conversion-Optimized · Feature-Rich Showcase · Minimal & Direct · Social Proof-Focused · Interactive Product Demo · Trust & Authority · Storytelling-Driven
- **BI & Analytics**: Data-Dense Dashboard · Heatmap Dashboard · Executive Dashboard · Real-Time Monitoring · Drill-Down Analytics · Comparative Analysis Dashboard · Predictive Analytics · User Behavior Analytics · Financial Dashboard · Sales Intelligence Dashboard

---

# Modern SaaS

## Minimalism & Swiss Style

- slug: `minimalism-swiss-style`
- source: https://www.uistyleguide.com/style/minimalism-swiss-style
- category: Modern SaaS

````text
Apply the Minimalism & Swiss Style style to this interface.

What it is: Rooted in the Swiss International Style of the 1950s, this approach emphasizes clarity, readability, and objectivity. Uses grid-based layouts, sans-serif typography, and generous white space to create functional, timeless designs.
Look and feel: Clean, Simple, Spacious, Functional, White space, Grid-based.
Colors: primary #000000, #FFFFFF; secondary #F5F1E8, #808080, #B38B6D.
Effects and motion: Subtle color-change hovers (200ms), no gradients or shadows, thin 2px black top rules instead of card borders, 1px light-grey section dividers.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --swiss-black: #000000;
  --swiss-white: #FFFFFF;
  --swiss-paper: #F5F1E8; /* alternate section bands */
  --swiss-grey: #808080; /* dividers and disabled states only, never text */
  --swiss-tan: #B38B6D; /* sparing accent rules and hovers, never text */
  --swiss-text: #4B5563; /* secondary text */
  --swiss-rule: #E5E7EB; /* 1px section dividers */
}

body {
  background: var(--swiss-white);
  color: var(--swiss-black);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  line-height: 1.6;
}

.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 2rem;
  max-width: 72rem;
  margin: 0 auto;
  padding: 6rem 2rem;
}

section + section {
  border-top: 1px solid var(--swiss-rule);
}

.band {
  background: var(--swiss-paper);
}

h1,
h2 {
  font-weight: 300;
  letter-spacing: -0.01em;
  line-height: 1.1;
}

.eyebrow {
  font-size: 0.875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--swiss-text);
}

/* Thin 2px black top rules replace card borders and shadows */
.card {
  border-top: 2px solid var(--swiss-black);
  padding-top: 1.5rem;
  color: var(--swiss-text);
  transition: border-color 200ms ease;
}

.card:hover {
  border-top-color: var(--swiss-tan);
}

.button {
  padding: 1rem 2rem;
  border: 1px solid var(--swiss-black);
  border-radius: 0;
  background: var(--swiss-black);
  color: var(--swiss-white);
  font-size: 0.875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: background-color 200ms ease, color 200ms ease;
}

.button:hover {
  background: #1F2937;
}

.button--outline {
  background: transparent;
  color: var(--swiss-black);
}

.button--outline:hover {
  background: var(--swiss-black);
  color: var(--swiss-white);
}

a:focus-visible,
.button:focus-visible {
  outline: 2px solid var(--swiss-black);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .card,
  .button {
    transition: none;
  }
}
```

Works best for: Enterprise apps, Dashboards, Documentation sites, SaaS platforms.
Avoid it for: Creative portfolios, Entertainment, Playful brands. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Neumorphism

- slug: `neumorphism`
- source: https://www.uistyleguide.com/style/neumorphism
- category: Modern SaaS

````text
Apply the Neumorphism style to this interface.

What it is: A modern evolution of skeuomorphism that creates soft, extruded plastic-like interfaces. Uses subtle shadows and highlights to simulate depth while maintaining a minimal aesthetic.
Look and feel: Soft UI, Embossed, Debossed, Subtle depth, Rounded, Monochromatic.
Colors: primary #C8E0F4, #F5E0E8, #E8E8E8; secondary #FFFFFF, #D0D0D0.
Effects and motion: Paired soft shadows (white highlight top-left, grey shade bottom-right), inset shadows for pressed and input states, smooth press (150ms).

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --neu-base: #E8E8E8;
  --neu-blue: #C8E0F4;
  --neu-pink: #F5E0E8;
  --neu-light: #FFFFFF;
  --neu-dark: #D0D0D0;
  --neu-accent: #7B68EE;
  --neu-heading: #3F3F46;
  --neu-text: #52525B;
}

body {
  background: var(--neu-base);
  color: var(--neu-text);
  font-family: system-ui, sans-serif;
}

h1,
h2,
h3 {
  color: var(--neu-heading);
  font-weight: 600;
}

h1 {
  font-size: clamp(2.5rem, 6vw, 3.5rem);
}

/* Raised surface: light shadow top-left, dark shadow bottom-right, same colour as the page */
.card {
  padding: 2rem;
  border-radius: 1.5rem;
  background: var(--neu-base);
  box-shadow: -10px -10px 30px var(--neu-light), 10px 10px 30px var(--neu-dark);
}

.inset {
  padding: 1.5rem;
  border-radius: 1rem;
  background: var(--neu-base);
  box-shadow: inset -5px -5px 15px var(--neu-light), inset 5px 5px 15px var(--neu-dark);
}

.button {
  min-width: 3.5rem;
  min-height: 3.5rem;
  padding: 0.75rem 1.5rem;
  border: 0;
  border-radius: 9999px;
  background: var(--neu-base);
  color: var(--neu-heading);
  font-weight: 600;
  box-shadow: -5px -5px 15px var(--neu-light), 5px 5px 15px var(--neu-dark);
  transition: box-shadow 150ms ease;
}

.button:active {
  box-shadow: inset -5px -5px 15px var(--neu-light), inset 5px 5px 15px var(--neu-dark);
}

/* The main action is larger so it stands out in a monochrome UI */
.button--primary {
  min-width: 4.5rem;
  min-height: 4.5rem;
  font-size: 1.25rem;
}

/* Pastel tints for small raised icons and badges only, never large surfaces */
.chip {
  display: inline-grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border-radius: 1rem;
  background: var(--neu-blue); /* alternate with --neu-pink; every chip gets a tint */
  color: var(--neu-heading);
  box-shadow: -4px -4px 10px var(--neu-light), 4px 4px 10px var(--neu-dark);
}

.button:focus-visible {
  outline: 3px solid var(--neu-accent);
  outline-offset: 4px;
}

.progress {
  height: 0.5rem;
  border-radius: 9999px;
  box-shadow: inset -2px -2px 5px var(--neu-light), inset 2px 2px 5px var(--neu-dark);
}

.progress__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(145deg, #7B68EE, #9370DB);
  box-shadow: 0 0 10px rgba(123, 104, 238, 0.5);
}

@media (prefers-reduced-motion: reduce) {
  .button {
    transition: none;
  }
}
```

Works best for: Health/wellness apps, Meditation platforms, Fitness trackers.
Avoid it for: Complex apps, Data-heavy dashboards, High-contrast required. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Glassmorphism

- slug: `glassmorphism`
- source: https://www.uistyleguide.com/style/glassmorphism
- category: Modern SaaS

````text
Apply the Glassmorphism style to this interface.

What it is: Inspired by frosted glass, this style creates depth through transparency and blur effects. Perfect for layered interfaces where content hierarchy is important.
Look and feel: Frosted glass, Transparent, Blurred background, Layered, Vibrant.
Colors: primary rgba(255,255,255,0.15), #0080FF, #8B00FF; secondary #FF1493, #20B2AA.
Effects and motion: Backdrop blur (10-20px), subtle 1px rgba(255,255,255,0.2) border, soft heavily blurred colour blobs behind the glass.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --glass-fill: rgba(255,255,255,0.15);
  --glass-blue: #0080FF;
  --glass-violet: #8B00FF;
  --glass-pink: #FF1493;
  --glass-teal: #20B2AA;
  --glass-border: rgba(255, 255, 255, 0.2);
}

/* Glass needs something colourful behind it to blur. Keep the gradient bright;
   never lay a dark tint over the glass or darken the background. */
body {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--glass-blue) 0%, var(--glass-violet) 50%, var(--glass-pink) 100%);
  color: #FFFFFF;
  font-family: system-ui, sans-serif;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}

/* Soft light blooms behind the panels: large, heavily blurred, fixed */
.blob {
  position: fixed;
  z-index: -1;
  width: 28rem;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--glass-teal);
  filter: blur(80px);
  opacity: 0.6;
  pointer-events: none;
}

.card {
  padding: 2rem;
  border: 1px solid var(--glass-border);
  border-radius: 1.5rem;
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.card p {
  color: #FFFFFF;
}

.button {
  padding: 0.75rem 1.5rem;
  border: 1px solid var(--glass-border);
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  color: #FFFFFF;
  font-weight: 600;
  transition: transform 150ms ease, background-color 150ms ease;
}

.button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.button:focus-visible {
  outline: 2px solid #FFFFFF;
  outline-offset: 3px;
}

.badge--positive {
  color: #86EFAC;
  font-weight: 600;
}

@media (prefers-reduced-transparency: reduce) {
  .card,
  .button {
    background: rgba(30, 20, 60, 0.85);
  }
}

@media (prefers-reduced-motion: reduce) {
  .button {
    transition: none;
  }

  .button:hover {
    transform: none;
  }
}
```

Works best for: Modern SaaS, Financial dashboards, High-end corporate, Modal overlays.
Avoid it for: Low-contrast backgrounds, Critical accessibility, Performance-limited. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Vibrant & Block-based

- slug: `vibrant-block-based`
- source: https://www.uistyleguide.com/style/vibrant-block-based
- category: Modern SaaS

````text
Apply the Vibrant & Block-based style to this interface.

What it is: High-energy design with bold color blocks, geometric shapes, and vibrant palettes. Creates excitement and draws attention through visual contrast.
Look and feel: Bold, Energetic, Playful, Block layout, Geometric shapes, High color contrast.
Colors: primary #39FF14, #BF00FF, #FF1493, #00FFFF, #FFAA00; secondary #FF7F00, #FF006E, #CCFF00.
Effects and motion: Large sections with gaps of 48px or more, animated geometric patterns, bold scale-up hovers, scroll-snap sections, display type of 32px and up.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --vb-lime: #39FF14;
  --vb-purple: #BF00FF;
  --vb-pink: #FF1493;
  --vb-cyan: #00FFFF;
  --vb-amber: #FFAA00;
  --vb-orange: #FF7F00;
  --vb-rose: #FF006E;
  --vb-chartreuse: #CCFF00;
  --vb-bg: #0D0D0D;
}

html {
  /* Proximity, not mandatory: short or uneven sections never trap scrolling */
  scroll-snap-type: y proximity;
}

body {
  background: var(--vb-bg);
  color: #FFFFFF;
  font-family: system-ui, sans-serif;
}

section {
  scroll-snap-align: start;
}

h1 {
  font-size: clamp(3rem, 8vw, 6rem);
  font-weight: 900;
  line-height: 1.05;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 3rem;
}

.block {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  aspect-ratio: 1;
  padding: 1.5rem;
  border-radius: 1.5rem;
  background: var(--vb-lime);
  color: #000000;
  font-weight: 900;
  transition: transform 150ms ease;
}

.block:hover {
  transform: scale(1.05);
}

.block:nth-child(4n + 2) {
  background: var(--vb-purple);
}

.block:nth-child(4n + 3) {
  background: var(--vb-pink);
}

.block:nth-child(4n + 4) {
  background: var(--vb-cyan);
}

.button {
  padding: 1.25rem 2.5rem;
  border: 0;
  border-radius: 1rem;
  background: linear-gradient(90deg, var(--vb-pink), var(--vb-purple));
  color: #000000;
  font-size: 1.25rem;
  font-weight: 700;
  transition: transform 150ms ease;
}

.button:hover {
  transform: scale(1.05);
}

.button:focus-visible {
  outline: 3px solid var(--vb-lime);
  outline-offset: 4px;
}

/* Decorative geometric shapes; keep them clear of headings and CTAs */
.shape {
  position: absolute;
  pointer-events: none;
  animation: vb-spin 18s linear infinite;
}

@keyframes vb-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-snap-type: none; }
  .shape { animation: none; }
  .block, .button { transition: none; }
  .block:hover, .button:hover { transform: none; }
}
```

Works best for: Startups, Creative agencies, Gaming, Youth-focused, Entertainment.
Avoid it for: Financial institutions, Healthcare, Government, Elderly audiences. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Dark Mode (OLED)

- slug: `dark-mode-oled`
- source: https://www.uistyleguide.com/style/dark-mode-oled
- category: Modern SaaS

````text
Apply the Dark Mode (OLED) style to this interface.

What it is: Optimized for OLED displays and low-light environments. Uses true blacks to save battery and reduce eye strain while maintaining vibrant accent colors.
Look and feel: Dark theme, Low light, High contrast, Deep black, Eye-friendly, OLED.
Colors: primary #000000, #121212, #0A0E27; secondary #39FF14, #0080FF, #FFD700, #BF00FF.
Effects and motion: Soft neon glow on accents only (text-shadow and box-shadow), subtle border-color hovers, light grey body text on true black for readability.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --oled-black: #000000;
  --oled-surface: #121212;
  --oled-navy: #0A0E27;
  --oled-green: #39FF14;
  --oled-blue: #0080FF;
  --oled-gold: #FFD700;
  --oled-purple: #BF00FF;
  --oled-text: #9CA3AF;
  --oled-border: #1F2937;
}

body {
  background: var(--oled-black);
  color: var(--oled-text);
  font-family: system-ui, sans-serif;
}

h1,
h2,
h3 {
  color: #FFFFFF;
  font-weight: 700;
}

/* Glow only on accents, never on body text */
.glow {
  color: var(--oled-green);
  text-shadow: 0 0 30px rgba(57, 255, 20, 0.5);
}

/* Give each stat or feature its own accent instead of repeating green */
.accent-green { color: var(--oled-green); }
.accent-blue { color: var(--oled-blue); }
.accent-gold { color: var(--oled-gold); }
.accent-purple { color: var(--oled-purple); }

.card {
  padding: 1.5rem;
  border: 1px solid var(--oled-border);
  border-radius: 0.75rem;
  background: var(--oled-black);
  transition: border-color 150ms ease;
}

.card:hover {
  border-color: #374151;
}

.code {
  border: 1px solid var(--oled-border);
  border-radius: 0.75rem;
  background: var(--oled-surface);
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
}

.button {
  padding: 1rem 2rem;
  border: 0;
  border-radius: 0.5rem;
  background: var(--oled-green);
  color: var(--oled-black);
  font-weight: 600;
  box-shadow: 0 0 30px rgba(57, 255, 20, 0.3);
}

.button--ghost {
  border: 1px solid #374151;
  background: transparent;
  color: #FFFFFF;
  box-shadow: none;
}

.button:focus-visible {
  outline: 2px solid #FFFFFF;
  outline-offset: 3px;
}
```

Works best for: Night-mode apps, Coding platforms, Entertainment, OLED devices.
Avoid it for: Print-first content, High-brightness outdoor, Color-accuracy-critical. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Claymorphism

- slug: `claymorphism`
- source: https://www.uistyleguide.com/style/claymorphism
- category: Modern SaaS

````text
Apply the Claymorphism style to this interface.

What it is: A playful evolution of neumorphism that looks like soft clay or plasticine. Features chunky rounded elements with thick borders and soft shadows.
Look and feel: Soft 3D, Chunky, Playful, Toy-like, Bubbly, Thick borders.
Colors: primary #FDBCB4, #ADD8E6, #98FF98, #E6E6FA; secondary #FFD1DC, #B5EAD7.
Effects and motion: Inner+outer shadows, soft press (200ms ease-out), fluffy elements.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --clay-peach: #FDBCB4;
  --clay-blue: #ADD8E6;
  --clay-mint: #98FF98;
  --clay-lavender: #E6E6FA;
  --clay-pink: #FFD1DC;
  --clay-sage: #B5EAD7;
  --clay-pink-deep: #EC4899; /* fill end only, keeps 3:1 against the track */
  --clay-bg: #F0E6FA;
  --clay-text: #374151;
  --clay-shadow: inset -4px -4px 8px rgba(0, 0, 0, 0.1), 8px 8px 16px rgba(0, 0, 0, 0.15);
}

body {
  background: var(--clay-bg);
  color: var(--clay-text);
  font-family: "Nunito", system-ui, sans-serif;
}

h1,
h2,
h3 {
  font-weight: 700;
}

/* Thick translucent rim + inner shade + soft drop shadow = clay */
.card {
  padding: 1.5rem;
  border: 4px solid rgba(255, 255, 255, 0.5);
  border-radius: 1.5rem;
  background: var(--clay-lavender);
  box-shadow: var(--clay-shadow);
}

.button {
  padding: 1.25rem 3rem;
  border: 4px solid rgba(255, 255, 255, 0.5);
  border-radius: 1rem;
  background: var(--clay-peach);
  color: var(--clay-text);
  font-size: 1.25rem;
  font-weight: 700;
  box-shadow: var(--clay-shadow);
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
}

.button:hover {
  transform: scale(1.05);
}

.button:active {
  transform: scale(0.97);
  box-shadow: inset 4px 4px 8px rgba(0, 0, 0, 0.12), 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.button:focus-visible {
  outline: 3px solid #6D28D9;
  outline-offset: 4px;
}

.progress {
  height: 1rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.5);
  box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.progress > span {
  display: block;
  height: 100%;
  border-radius: 9999px;
  background: linear-gradient(90deg, var(--clay-pink), var(--clay-pink-deep));
}

@media (prefers-reduced-motion: reduce) {
  .button {
    transition: none;
  }
}
```

Works best for: Educational apps, Children's apps, SaaS platforms, Creative tools, Onboarding.
Avoid it for: Formal corporate, Professional services, Medical, Finance. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Aurora UI

- slug: `aurora-ui`
- source: https://www.uistyleguide.com/style/aurora-ui
- category: Modern SaaS

````text
Apply the Aurora UI style to this interface.

What it is: Inspired by the Northern Lights, featuring flowing gradients and smooth color transitions. Creates a premium, modern feel with dynamic backgrounds.
Look and feel: Vibrant gradients, Smooth blend, Northern Lights effect, Mesh gradient, Luminous.
Colors: primary #0080FF, #FF1493, #00FFFF; secondary #8B00FF, #20B2AA.
Effects and motion: Large flowing CSS/SVG gradients, subtle 8-12s animations, depth via color layering.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --aurora-blue: #0080FF;
  --aurora-pink: #FF1493;
  --aurora-cyan: #00FFFF;
  --aurora-violet: #8B00FF;
  --aurora-teal: #20B2AA;
  --aurora-text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35), 0 4px 16px rgba(0, 0, 0, 0.25);
}

/* Whole page glows: violet sky with bright cyan, pink and teal light; no dark scrims */
body {
  background:
    radial-gradient(40rem 30rem at 10% 0%, rgb(0 255 255 / 0.55), transparent 70%),
    radial-gradient(36rem 28rem at 90% 15%, rgb(255 20 147 / 0.6), transparent 70%),
    radial-gradient(44rem 32rem at 50% 100%, rgb(32 178 170 / 0.5), transparent 70%),
    linear-gradient(160deg, var(--aurora-violet), var(--aurora-blue));
  background-attachment: fixed;
  color: #FFFFFF;
  text-shadow: var(--aurora-text-shadow);
}

/* Oversized gradient drifts slowly to mimic the northern lights; full-bleed band */
.hero {
  position: relative;
  overflow: hidden;
  background: linear-gradient(-45deg, var(--aurora-blue), var(--aurora-violet), var(--aurora-pink), var(--aurora-cyan), var(--aurora-blue));
  background-size: 400% 400%;
  color: #FFFFFF;
  animation: aurora 12s ease infinite;
}

@keyframes aurora {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.hero h1 {
  font-weight: 700;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.card {
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.15);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
}

.button {
  padding: 1rem 2rem;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.2);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  color: #FFFFFF;
  font-weight: 600;
  transition: background-color 150ms ease;
}

.button:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Primary action, e.g. play or sign up: solid white so it stands out */
.button--solid {
  background: #FFFFFF;
  color: #7E22CE;
  text-shadow: none;
}

.button:focus-visible,
a:focus-visible {
  outline: 3px solid #FFFFFF;
  outline-offset: 3px;
  box-shadow: 0 0 0 6px rgba(11, 11, 43, 0.6);
}

@media (prefers-reduced-motion: reduce) {
  .hero {
    animation: none;
  }
}
```

Works best for: Modern SaaS, Creative agencies, Music platforms, Premium products, Hero sections.
Avoid it for: Data-heavy dashboards, Critical accessibility, Content-heavy sites. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Flat Design

- slug: `flat-design`
- source: https://www.uistyleguide.com/style/flat-design
- category: Modern SaaS

````text
Apply the Flat Design style to this interface.

What it is: Emerged in the early 2010s as a reaction to skeuomorphism. Uses simple 2D elements, bold colors, and no shadows or gradients.
Look and feel: 2D, Minimalist, Bold colors, No shadows, Clean lines, Icon-heavy.
Colors: primary #FF5722, #2196F3, #4CAF50, #FFC107; secondary #9C27B0, #00BCD4.
Effects and motion: No gradients/shadows, simple hover (color/opacity shift), fast loading.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  /* Bright palette: icon tiles, fills and accents (pair with dark text) */
  --flat-orange: #FF5722;
  --flat-blue: #2196F3;
  --flat-green: #4CAF50;
  --flat-amber: #FFC107;
  --flat-purple: #9C27B0;
  --flat-cyan: #00BCD4;
  /* -dark variants: surfaces behind white text */
  --flat-orange-dark: #BF360C;
  --flat-blue-dark: #1976D2;
  --flat-green-dark: #2E7D32;
  --flat-cyan-dark: #00838F;
  --flat-bg: #F3F4F6;
  --flat-surface: #FFFFFF;
  --flat-border: #E5E7EB;
  --flat-text: #1F2937;
  --flat-muted: #4B5563;
}

body {
  background: var(--flat-bg);
  color: var(--flat-text);
  font-family: Roboto, "Helvetica Neue", Arial, sans-serif;
}

h1,
h2,
h3 {
  font-weight: 700;
  color: var(--flat-text);
}

.card {
  padding: 1.5rem;
  background: var(--flat-surface);
  border: 1px solid var(--flat-border);
  border-radius: 8px;
  box-shadow: none;
}

/* Single-colour glyphs or currentColor SVG on solid tiles */
.icon-tile {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border-radius: 8px;
  background: var(--flat-blue);
  color: #FFFFFF;
}

/* Existing emoji icons: wrap them and flatten to a white silhouette */
.icon-tile .emoji {
  filter: grayscale(1) brightness(10);
}

.button {
  padding: 1rem 2rem;
  border: none;
  border-radius: 6px;
  background: var(--flat-blue-dark);
  color: #FFFFFF;
  font-weight: 500;
  box-shadow: none;
  transition: background-color 150ms ease;
}

.button:hover {
  background: #1565C0;
}

.button:active {
  background: #0D47A1;
}

.button:focus-visible {
  outline: 3px solid var(--flat-text);
  outline-offset: 2px;
}

.button-secondary {
  background: var(--flat-border);
  color: var(--flat-text);
}

.button-secondary:hover {
  background: #D1D5DB;
}

@media (prefers-reduced-motion: reduce) {
  .button {
    transition: none;
  }
}
```

Works best for: Web apps, Mobile apps, Cross-platform, Startup MVPs, SaaS, Dashboards.
Avoid it for: Complex 3D, Premium/luxury, Artistic portfolios, Immersive experiences. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Soft UI Evolution

- slug: `soft-ui-evolution`
- source: https://www.uistyleguide.com/style/soft-ui-evolution
- category: Modern SaaS

````text
Apply the Soft UI Evolution style to this interface.

What it is: The next evolution of neumorphism with improved accessibility and contrast. Maintains the soft aesthetic while meeting WCAG standards.
Look and feel: Evolved soft UI, Better contrast, Modern aesthetics, Subtle depth, Accessibility-focused.
Colors: primary #F0F4F8, #D1D9E6, #FFFFFF; secondary #2563EB, #22C55E, #EA580C.
Effects and motion: Soft dual shadows (white top-left, cool grey bottom-right), inset wells for grouped content, 200-300ms transitions, visible focus rings, WCAG AA contrast.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --soft-bg: #F0F4F8;
  --soft-shadow: #D1D9E6;
  --soft-light: #FFFFFF;
  --soft-blue: #2563EB;
  --soft-green: #22C55E;  /* icons, rings, progress fills only */
  --soft-orange: #EA580C; /* icons, rings, progress fills only */
  --soft-green-text: #15803D;
  --soft-orange-text: #C2410C;
  --soft-text: #1F2937;
  --soft-muted: #4B5563;
}

body {
  background: var(--soft-bg);
  color: var(--soft-text);
}

.surface {
  padding: 1.5rem;
  border-radius: 1rem;
  background: var(--soft-bg);
  box-shadow: -6px -6px 15px var(--soft-light), 6px 6px 15px var(--soft-shadow);
}

/* Pressed-in well for grouped or secondary content; nest at most one level (surface > well) */
.well {
  padding: 1.5rem;
  border-radius: 1rem;
  background: var(--soft-bg);
  box-shadow: inset -4px -4px 10px var(--soft-light), inset 4px 4px 10px var(--soft-shadow);
}

.muted {
  color: var(--soft-muted);
}

/* Coloured metrics: bright accent for the ring or bar, darker shade for the number */
.stat--up { color: var(--soft-green-text); }
.stat--warn { color: var(--soft-orange-text); }

.meter {
  height: 0.5rem;
  border-radius: 9999px;
  background: linear-gradient(90deg, var(--soft-green) var(--value, 60%), transparent 0);
  box-shadow: inset 2px 2px 4px var(--soft-shadow), inset -2px -2px 4px var(--soft-light);
}

.button {
  padding: 0.75rem 1.5rem;
  border: 1px solid rgba(209, 217, 230, 0.6);
  border-radius: 12px;
  background: var(--soft-bg);
  color: var(--soft-blue);
  font-weight: 600;
  box-shadow: -4px -4px 10px var(--soft-light), 4px 4px 10px var(--soft-shadow);
  transition: box-shadow 250ms ease, transform 250ms ease;
}

.button:hover {
  box-shadow: -6px -6px 14px var(--soft-light), 6px 6px 14px var(--soft-shadow);
  transform: translateY(-1px);
}

.button:active {
  box-shadow: inset -3px -3px 8px var(--soft-light), inset 3px 3px 8px var(--soft-shadow);
  transform: none;
}

.button:focus-visible {
  outline: 3px solid var(--soft-blue);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .button {
    transition: none;
  }
}
```

Works best for: Modern enterprise apps, SaaS platforms, Health/wellness, Modern business tools.
Avoid it for: Extreme minimalism, Critical performance, Bold, high-energy brands. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Bento Box Grid

- slug: `bento-box-grid`
- source: https://www.uistyleguide.com/style/bento-box-grid
- category: Modern SaaS

````text
Apply the Bento Box Grid style to this interface.

What it is: Inspired by Japanese bento boxes, this layout uses modular cards of varying sizes to create visual hierarchy and interest.
Look and feel: Modular cards, Asymmetric grid, Varied sizes, Apple-style, Dashboard tiles.
Colors: primary #FFFFFF, #F5F5F5; secondary #007AFF, #34C759.
Effects and motion: CSS grid of tiles spanning one or two columns and rows, 24px rounded corners, soft shadows, subtle hover scale (1.02) on tiles that link somewhere.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --bento-white: #FFFFFF;
  --bento-canvas: #F5F5F5;
  --bento-blue: #007AFF; /* fills, icons and focus rings; white text uses #0A55C4 */
  --bento-green: #34C759;
  --bento-ink: #1D1D1F;
  --bento-muted: #6E6E73;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(200px, auto);
  gap: 16px;
  background: var(--bento-canvas);
}

.card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.5rem;
  border-radius: 24px;
  background: var(--bento-white);
  color: var(--bento-ink);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: transform 150ms ease, box-shadow 150ms ease;
}

/* Only tiles that link somewhere lift on hover */
a.card:hover,
.card:has(a, button):hover {
  transform: scale(1.02);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
}

/* Varied spans are what make it a bento: one hero tile, a few wide ones, the rest single */
.card--hero {
  grid-column: span 2;
  grid-row: span 2;
  background: linear-gradient(135deg, #0A55C4, #5856D6);
  color: #FFFFFF;
}

.card--wide {
  grid-column: span 2;
}

.card--accent {
  background: var(--bento-green);
  color: var(--bento-ink);
}

.card p {
  margin: 0;
  color: var(--bento-muted);
}

.card--hero p {
  color: rgba(255, 255, 255, 0.85);
}

.button {
  padding: 0.75rem 1.5rem;
  border: 0;
  border-radius: 12px;
  background: var(--bento-ink);
  color: #FFFFFF;
  font-weight: 600;
}

a.card:focus-visible,
.card a:focus-visible,
.button:focus-visible {
  outline: 3px solid var(--bento-blue);
  outline-offset: 3px;
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: minmax(150px, auto);
    gap: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }
}
```

Works best for: Dashboards, Product pages, Portfolios, Apple-style marketing, Feature showcases.
Avoid it for: Dense data tables, Text-heavy content, Real-time monitoring. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Dimensional Layering

- slug: `dimensional-layering`
- source: https://www.uistyleguide.com/style/dimensional-layering
- category: Modern SaaS

````text
Apply the Dimensional Layering style to this interface.

What it is: Creates visual hierarchy through overlapping elements and elevation shadows. Gives interfaces a 3D paper-stack feel.
Look and feel: Depth, Overlapping, Z-index, Layers, 3D, Shadows, Elevation, Floating.
Colors: primary #FFFFFF, #F5F5F5, #E0E0E0; secondary #6366F1, #3B82F6.
Effects and motion: Offset backing sheets behind cards, a four-step shadow elevation scale, z-index stacking, cards lifting on hover.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --layer-surface: #FFFFFF;
  --layer-canvas: #F5F5F5;
  --layer-edge: #E0E0E0;
  --layer-indigo: #6366F1;
  --layer-blue: #3B82F6;
  --elevation-1: 0 1px 2px rgba(0, 0, 0, 0.05);
  --elevation-2: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  --elevation-3: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  --elevation-4: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
}

body {
  background: var(--layer-canvas);
  color: #111827;
}

/* Hard offset shadows draw the two sheets peeking out behind the main surface */
.stack {
  padding: 2rem;
  border-radius: 24px;
  background: var(--layer-surface);
  box-shadow: -8px -8px 0 #E0E7FF, -16px -16px 0 #C7D2FE, var(--elevation-4);
}

.card {
  position: relative;
  padding: 1rem;
  border: 1px solid var(--layer-edge);
  border-radius: 12px;
  background: var(--layer-surface);
  box-shadow: 4px 4px 0 var(--layer-edge), var(--elevation-1);
  transition: box-shadow 150ms ease, transform 150ms ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 4px 4px 0 var(--layer-edge), var(--elevation-3);
}

/* Focus ring on whatever is interactive: links, buttons, focusable cards */
:is(a, button, .button, [tabindex]):focus-visible {
  outline: 3px solid var(--layer-indigo);
  outline-offset: 3px;
}

.button {
  padding: 0.75rem 1.25rem;
  border: 0;
  border-radius: 12px;
  background: #4F46E5;
  color: #FFFFFF;
  font-weight: 600;
  box-shadow: var(--elevation-3);
}

@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }

  .card:hover {
    transform: none;
  }
}
```

Works best for: Dashboards, Card layouts, Modals, Navigation, Product showcases, SaaS.
Avoid it for: Print-style layouts, Simple blogs, Low-end devices, Flat design requirements. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Swiss Modernism 2.0

- slug: `swiss-modernism-2`
- source: https://www.uistyleguide.com/style/swiss-modernism-2
- category: Modern SaaS

````text
Apply the Swiss Modernism 2.0 style to this interface.

What it is: A modern interpretation of the Swiss International Style with strict grid systems and mathematical spacing.
Look and feel: Grid system, Helvetica, Modular, Asymmetric, International style, Rational.
Colors: primary #000000, #FFFFFF, #F5F5F5; secondary #DC2626.
Effects and motion: No decorative effects: flat colour, hairline rules, strict alignment to a 12-column grid and modular type scale, simple colour-change hovers.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --black: #000000;
  --white: #FFFFFF;
  --gray: #F5F5F5;
  --red: #DC2626;
  --text-muted: #4B5563;
  --rule: #E5E7EB;
}

body {
  background: var(--white);
  color: var(--black);
  font-family: "Helvetica Neue", Helvetica, Inter, Arial, sans-serif;
}

.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 2rem;
  max-width: 72rem;
  margin: 0 auto;
  padding: 4rem 2rem;
  border-top: 1px solid var(--rule);
}

.grid > .main {
  grid-column: span 8;
}

.grid > .aside {
  grid-column: span 4;
}

h1 {
  font-size: 3.75rem;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.eyebrow {
  color: var(--red);
  font-weight: 500;
}

.lead {
  font-size: 1.25rem;
  color: var(--text-muted);
}

.button {
  padding: 0.75rem 1.5rem;
  border: 1px solid var(--black);
  border-radius: 0;
  background: var(--black);
  color: var(--white);
  font-weight: 500;
}

.button--outline {
  background: transparent;
  color: var(--black);
}

.button:hover {
  background: var(--red);
  border-color: var(--red);
  color: var(--white);
}

.button:focus-visible {
  outline: 2px solid var(--red);
  outline-offset: 3px;
}

@media (max-width: 768px) {
  .grid > .main,
  .grid > .aside {
    grid-column: 1 / -1;
  }
}
```

Works best for: Corporate sites, Architecture, Editorial, SaaS, Museums, Professional services.
Avoid it for: Playful brands, Children's sites, Entertainment, Gaming, Emotional storytelling. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Bento Grids

- slug: `bento-grids`
- source: https://www.uistyleguide.com/style/bento-grids
- category: Modern SaaS

````text
Apply the Bento Grids style to this interface.

What it is: Apple-inspired modular grid of rounded cards in mixed sizes, with soft shadows, bold accent tiles and clean typography.
Look and feel: Apple-style, Modular, Cards, Organized, Clean, Hierarchy, Rounded, Soft.
Colors: primary #F5F5F7, #FFFFFF, #1D1D1F; secondary #007AFF, #34C759.
Effects and motion: Hover scale (1.02) on linked tiles, soft shadow expansion, staggered content reveal.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --canvas: #F5F5F7;
  --tile: #FFFFFF;
  --ink: #1D1D1F;
  --blue: #007AFF; /* focus rings and icons; tiles with white text use #0066CC */
  --blue-tile: #0066CC;
  --green: #34C759;
  --text-muted: #4B5563;
}

body {
  background: var(--canvas);
  color: var(--ink);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(140px, auto);
  gap: 1rem;
  max-width: 64rem;
  margin: 0 auto;
}

.tile {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.5rem;
  border-radius: 1.5rem;
  background: var(--tile);
  color: var(--text-muted);
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  transition: transform 200ms ease, box-shadow 200ms ease;
}

/* Only tiles that link somewhere lift on hover */
a.tile:hover,
.tile:has(a, button):hover {
  transform: scale(1.02);
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.08);
}

a.tile:focus-visible,
.tile a:focus-visible {
  outline: 3px solid var(--blue);
  outline-offset: 3px;
}

.tile--wide {
  grid-column: span 2;
}

/* Featured tile: 2x2 with a bold gradient */
.tile--feature {
  grid-column: span 2;
  grid-row: span 2;
  padding: 2rem;
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: #FFFFFF;
}

.tile--blue {
  background: var(--blue-tile);
  color: #FFFFFF;
}

.tile--green {
  background: var(--green);
  color: var(--ink);
}

.tile--dark {
  background: var(--ink);
  color: #FFFFFF;
}

.tile h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: inherit;
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: minmax(120px, auto);
    gap: 0.75rem;
  }
}

/* Content reveal: tiles rise in one after another */
@media (prefers-reduced-motion: no-preference) {
  .tile {
    animation: reveal 500ms ease-out backwards;
  }

  .tile:nth-child(2) { animation-delay: 60ms; }
  .tile:nth-child(3) { animation-delay: 120ms; }
  .tile:nth-child(4) { animation-delay: 180ms; }
  .tile:nth-child(n + 5) { animation-delay: 240ms; }
}

@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tile {
    transition: none;
  }
}
```

Works best for: Product features, Dashboards, Personal sites, Marketing summaries, Galleries.
Avoid it for: Long-form reading, Data tables, Complex forms. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Editorial Grid / Magazine

- slug: `editorial-grid-magazine`
- source: https://www.uistyleguide.com/style/editorial-grid-magazine
- category: Modern SaaS

````text
Apply the Editorial Grid / Magazine style to this interface.

What it is: Brings print magazine aesthetics to the web with asymmetric grids, pull quotes, and editorial typography.
Look and feel: Magazine layout, Asymmetric grid, Editorial typography, Pull quotes, Drop caps, Column layout.
Colors: primary #000000, #FFFFFF; secondary #DC2626, #6B7280.
Effects and motion: Smooth scroll, headlines that rise into view on scroll, hairline column rules, serif display headlines.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --ink: #000000;
  --paper: #FFFFFF;
  --accent: #DC2626;
  --muted: #6B7280;
  --display: "Playfair Display", Georgia, "Times New Roman", serif;
}

body {
  background: var(--paper);
  color: var(--ink);
  font-family: system-ui, "Helvetica Neue", Arial, sans-serif;
}

.grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 2rem;
  border-top: 2px solid var(--ink);
  padding-top: 2rem;
}

.grid > .feature {
  grid-column: span 8;
}

/* Hairline column rule between the lead story and the sidebar */
.grid > aside {
  grid-column: span 4;
  border-left: 1px solid var(--ink);
  padding-left: 2rem;
}

.kicker {
  color: var(--accent);
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
}

/* High-contrast serif display face for headlines */
h1,
h2 {
  font-family: var(--display);
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

/* Long-form body text only. Without an article body, skip the columns, drop cap
   and pull quote; never put a drop cap on a short standfirst or deck. */
.article-body {
  column-count: 2;
  column-gap: 2rem;
  font-family: Georgia, "Times New Roman", serif;
  line-height: 1.7;
}

.article-body > p:first-of-type::first-letter {
  float: left;
  font-family: var(--display);
  font-size: 4.5em;
  line-height: 0.8;
  font-weight: 900;
  padding-right: 0.5rem;
}

.pull-quote {
  margin: 2rem 0;
  border-top: 2px solid var(--ink);
  border-bottom: 2px solid var(--ink);
  padding: 1rem 0;
  font-family: var(--display);
  font-size: 1.75rem;
  font-weight: 700;
}

a:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Smooth scroll and headlines that rise into view, where supported */
@media (prefers-reduced-motion: no-preference) {
  html {
    scroll-behavior: smooth;
  }

  @supports (animation-timeline: view()) {
    .reveal {
      animation: rise linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 40%;
    }
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(1.5rem);
  }
}

@media (max-width: 768px) {
  .grid > .feature,
  .grid > aside {
    grid-column: 1 / -1;
  }

  .grid > aside {
    border-left: 0;
    padding-left: 0;
  }

  .article-body {
    column-count: 1;
  }
}
```

Works best for: News sites, Blogs, Magazines, Editorial content, Long-form articles, Publishing.
Avoid it for: Dashboards, Apps, E-commerce catalogs, Real-time data, Short-form content. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

---

# Retro & Nostalgia

## Retro-Futurism

- slug: `retro-futurism`
- source: https://www.uistyleguide.com/style/retro-futurism
- category: Retro & Nostalgia

````text
Apply the Retro-Futurism style to this interface.

What it is: Combines 1980s retrofuturistic aesthetics with modern web technology. Features neon colors, synthwave vibes, and CRT-style effects.
Look and feel: Vintage sci-fi, 80s aesthetic, Neon glow, CRT scanlines, Synthwave.
Colors: primary #0080FF, #FF006E, #00FFFF, #1A1A2E; secondary #C0C0C0, #FFD700, #FF10F0.
Effects and motion: CRT scanlines overlay, neon glow (text-shadow+box-shadow), glitch effects.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --rf-blue: #0080FF;     /* glows and borders only */
  --rf-pink: #FF006E;     /* fills and glows; text uses --rf-pink-text */
  --rf-pink-text: #FF3D8B;
  --rf-cyan: #00FFFF;
  --rf-night: #1A1A2E;
  --rf-chrome: #C0C0C0;   /* body copy */
  --rf-gold: #FFD700;
  --rf-magenta: #FF10F0;  /* section titles */
}

body {
  background: var(--rf-night);
  color: var(--rf-cyan);
  font-family: "Courier New", ui-monospace, monospace;
}

p { color: var(--rf-chrome); }
h2 { color: var(--rf-magenta); text-shadow: 0 0 12px rgba(255, 16, 240, 0.6); }

/* CRT scanlines over the whole page */
body::after {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  opacity: 0.2;
  background-image: repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(0, 0, 0, 0.3) 2px, rgba(0, 0, 0, 0.3) 4px);
}

.hero-title {
  font-weight: 900;
  text-transform: uppercase;
  background: linear-gradient(180deg, var(--rf-pink-text), #C44DFF);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 30px rgba(255, 0, 110, 0.5));
  animation: glitch 5s steps(1) infinite;
}

/* Glitch: brief RGB-split jitter (filter, so it works on gradient-clipped text) */
@keyframes glitch {
  0%, 90%, 100% { transform: none; filter: drop-shadow(0 0 30px rgba(255, 0, 110, 0.5)); }
  92% { transform: translateX(-3px); filter: drop-shadow(3px 0 0 var(--rf-cyan)) drop-shadow(-3px 0 0 var(--rf-magenta)); }
  95% { transform: translateX(3px); filter: drop-shadow(-3px 0 0 var(--rf-blue)) drop-shadow(3px 0 0 var(--rf-pink)); }
}

.logo {
  color: var(--rf-pink-text);
  text-shadow: 0 0 10px var(--rf-pink), 0 0 20px var(--rf-pink);
}

.card {
  padding: 1.5rem;
  border: 2px solid var(--rf-cyan);
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.3), 0 0 40px rgba(0, 128, 255, 0.25);
}

.button {
  padding: 1rem 2rem;
  border: 2px solid var(--rf-cyan);
  background: transparent;
  color: #FFFFFF;
  font-family: inherit;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.5), inset 0 0 20px rgba(0, 255, 255, 0.1);
  transition: box-shadow 150ms ease;
}

.button:hover { box-shadow: 0 0 35px rgba(0, 255, 255, 0.8), inset 0 0 20px rgba(0, 255, 255, 0.2); }
.button:active { transform: translateY(1px); }
.button:focus-visible { outline: 3px solid var(--rf-gold); outline-offset: 3px; }

.button-primary {
  border-color: var(--rf-pink);
  background: var(--rf-pink);
  color: #000000;
  box-shadow: 0 0 30px rgba(255, 0, 110, 0.5);
}

/* Synthwave grid floor: place it under the hero as the horizon, not behind body text */
.grid-floor {
  height: 16rem;
  background-image:
    linear-gradient(to top, transparent, var(--rf-night) 95%),
    repeating-linear-gradient(0deg, transparent 0, transparent 30px, rgba(255, 16, 240, 0.6) 30px, rgba(255, 16, 240, 0.6) 32px),
    repeating-linear-gradient(90deg, transparent 0, transparent 30px, rgba(0, 255, 255, 0.5) 30px, rgba(0, 255, 255, 0.5) 32px);
  transform: perspective(500px) rotateX(60deg);
  transform-origin: bottom;
}

@media (prefers-reduced-motion: reduce) {
  .hero-title { animation: none; }
  .button { transition: none; }
}
```

Works best for: Gaming, Entertainment, Music platforms, Tech brands, Cyberpunk themes.
Avoid it for: Conservative industries, Healthcare, Professional/corporate, Elderly. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Skeuomorphism

- slug: `skeuomorphism`
- source: https://www.uistyleguide.com/style/skeuomorphism
- category: Retro & Nostalgia

````text
Apply the Skeuomorphism style to this interface.

What it is: Uses real-world textures and metaphors to make digital interfaces feel familiar. Think leather textures, wood grain, and realistic shadows.
Look and feel: Realistic, Texture, Depth, 3D appearance, Real-world metaphors, Tactile.
Colors: primary #8B4513, #CD853F, #A0522D; secondary #D2691E, #DEB887.
Effects and motion: Realistic layered shadows, bevels and pressed states, texture details (noise, wood grain).

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --sk-leather: #8B4513;
  --sk-tan: #CD853F;
  --sk-sienna: #A0522D;
  --sk-chocolate: #D2691E;
  --sk-wood: #DEB887;
  --sk-leather-dark: #654321;
  --sk-ink-dark: #3B1F0A; /* text on wood */
  --sk-paper: #FFFEF9;
  --sk-ink: #1F2937;
  /* Fine grain noise, layered over leather and wood */
  --sk-noise: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* Leather: grain noise over a warm gradient */
body {
  background: var(--sk-noise), linear-gradient(180deg, var(--sk-leather) 0%, var(--sk-leather-dark) 100%);
  color: #FEF3C7;
  font-family: Georgia, "Times New Roman", serif;
}

h1,
h2 {
  color: #FEF3C7;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

/* Bound notebook in a wood frame: grain lines, bevel and a deep drop shadow */
.panel {
  border: 6px solid var(--sk-leather);
  border-radius: 8px;
  background:
    repeating-linear-gradient(92deg, rgba(101, 67, 33, 0.12) 0 2px, transparent 2px 9px, rgba(101, 67, 33, 0.08) 9px 10px, transparent 10px 17px),
    var(--sk-noise),
    linear-gradient(145deg, var(--sk-wood), #D9A066);
  color: var(--sk-ink-dark);
  box-shadow: inset 3px 3px 6px rgba(255, 255, 255, 0.2), inset -3px -3px 6px rgba(0, 0, 0, 0.3), 0 20px 50px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

/* Ruled paper page */
.paper {
  padding: 2rem;
  background-color: var(--sk-paper);
  background-image: repeating-linear-gradient(transparent 0, transparent 31px, #E8E4C9 31px, #E8E4C9 32px);
  box-shadow: inset 0 5px 10px rgba(0, 0, 0, 0.1);
  color: var(--sk-ink);
  line-height: 32px;
}

.button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background: linear-gradient(180deg, #E8C9A0, var(--sk-wood));
  color: var(--sk-leather-dark);
  font-family: inherit;
  box-shadow: 0 3px 0 var(--sk-leather), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transition: transform 80ms ease, box-shadow 80ms ease;
}

.button:hover { background: linear-gradient(180deg, #F0D6B4, #E8C9A0); }

.button:active {
  transform: translateY(3px);
  box-shadow: 0 0 0 var(--sk-leather), inset 0 2px 4px rgba(0, 0, 0, 0.25);
}

/* Cream inner ring plus dark outer ring: visible on wood and on leather */
.button:focus-visible {
  outline: 3px solid var(--sk-ink-dark);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--sk-paper), 0 3px 0 var(--sk-leather);
}

/* Brass stud or clasp */
.stud {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #FFD700, #B8860B);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

@media (prefers-reduced-motion: reduce) {
  .button { transition: none; }
}
```

Works best for: Legacy apps, Gaming, Immersive storytelling, Premium products, Luxury.
Avoid it for: Modern enterprise, Critical accessibility, Data-dense dashboards. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Y2K Aesthetic

- slug: `y2k-aesthetic`
- source: https://www.uistyleguide.com/style/y2k-aesthetic
- category: Retro & Nostalgia

````text
Apply the Y2K Aesthetic style to this interface.

What it is: Celebrates early 2000s digital optimism with chrome textures, bubblegum colors, and futuristic-retro aesthetics.
Look and feel: Neon pink, Chrome, Metallic, Bubblegum, Iridescent, Glossy, 2000s.
Colors: primary #FF69B4, #00FFFF, #C0C0C0, #9400D3; secondary #FFD700, #FF1493.
Effects and motion: linear-gradient metallic, glossy buttons, 3D chrome effects, glow animations.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --y2k-pink: #FF69B4;
  --y2k-cyan: #00FFFF;
  --y2k-chrome: #C0C0C0;
  --y2k-violet: #9400D3;
  --y2k-gold: #FFD700;
  --y2k-hot-pink: #FF1493;
}

body {
  background: linear-gradient(135deg, var(--y2k-pink), var(--y2k-cyan));
  font-family: "Arial Black", "Helvetica Neue", sans-serif;
}

/* Stacked hard shadows give the chrome-extruded wordmark; set it straight on the gradient, no dark header slab */
.hero-title {
  color: #FFFFFF;
  font-weight: 900;
  text-transform: uppercase;
  text-shadow: 3px 3px 0 var(--y2k-violet), 6px 6px 0 var(--y2k-chrome);
}

.card {
  padding: 1.5rem;
  border-radius: 24px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7));
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2), inset 0 -5px 20px rgba(0, 0, 0, 0.05);
  color: #6B21A8;
}

.button {
  padding: 0.75rem 1.5rem;
  border: 2px solid rgba(255, 255, 255, 0.7);
  border-radius: 9999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 50%), linear-gradient(90deg, var(--y2k-hot-pink), var(--y2k-violet));
  color: #FFFFFF;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  transition: filter 150ms ease, transform 150ms ease;
}

.button:hover {
  filter: drop-shadow(0 0 12px var(--y2k-cyan));
}

.button:active {
  transform: scale(0.97);
}

/* Two-tone ring: gold inner glow, violet outer line, visible on white cards and on the gradient */
.button:focus-visible,
.card:focus-visible {
  outline: 3px solid var(--y2k-violet);
  outline-offset: 3px;
  box-shadow: 0 0 0 3px var(--y2k-gold);
}

/* Slow pulsing glow for a featured card or the wordmark */
.glow {
  animation: y2k-glow 2.4s ease-in-out infinite alternate;
}

@keyframes y2k-glow {
  from { filter: drop-shadow(0 0 4px var(--y2k-cyan)); }
  to { filter: drop-shadow(0 0 16px var(--y2k-hot-pink)); }
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  background: linear-gradient(135deg, #FFFFFF, var(--y2k-chrome) 50%, #FFFFFF);
  color: var(--y2k-violet);
  font-weight: 700;
}

@media (prefers-reduced-motion: reduce) {
  .glow { animation: none; }
  .button { transition: none; }
  .button:active { transform: none; }
}
```

Works best for: Fashion brands, Music platforms, Gen Z brands, Nostalgia marketing, Entertainment.
Avoid it for: B2B enterprise, Healthcare, Finance, Elderly users. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Vaporwave

- slug: `vaporwave`
- source: https://www.uistyleguide.com/style/vaporwave
- category: Retro & Nostalgia

````text
Apply the Vaporwave style to this interface.

What it is: A visual celebration of 80s-90s computer aesthetics with sunset gradients, glitch effects, and dreamy atmospheres.
Look and feel: Synthwave, Retro-futuristic, 80s-90s, Neon, Glitch, Nostalgic, Sunset gradient.
Colors: primary #FF71CE, #01CDFE, #05FFA1, #B967FF; secondary #FFFB96, #00FFC6.
Effects and motion: Sunset gradient backgrounds, stacked neon offset text-shadows, CRT scanlines, frosted glass panels, occasional glitch or hue-shift animation.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --vw-pink: #FF71CE;
  --vw-blue: #01CDFE;
  --vw-mint: #05FFA1;
  --vw-purple: #B967FF;
  --vw-lemon: #FFFB96;
  --vw-aqua: #00FFC6;
  --vw-ink: #2E0050;
  /* Airy frosted glass: keep it light so the sunset shows through */
  --vw-glass: rgba(255, 255, 255, 0.15);
}

body {
  background-color: var(--vw-purple);
  /* Scanlines over the sunset gradient */
  background-image: repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(255, 255, 255, 0.03) 2px, rgba(255, 255, 255, 0.03) 4px), linear-gradient(180deg, var(--vw-pink) 0%, var(--vw-blue) 50%, var(--vw-purple) 100%);
  color: #FFFFFF;
  font-family: "Times New Roman", Times, serif;
  /* Soft violet shadow keeps white text legible on the bright sunset */
  text-shadow: 0 1px 3px rgba(60, 0, 90, 0.6);
}

/* Wide tracking and the neon shadow stack belong on the hero title only */
.hero-title {
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  text-shadow: 4px 4px 0 var(--vw-purple), 8px 8px 0 var(--vw-blue);
  animation: vw-hue 12s steps(1) infinite;
}

/* Occasional hue-shift glitch: a brief flicker every 12s */
@keyframes vw-hue {
  0%, 96% { filter: none; }
  97% { filter: hue-rotate(90deg); transform: translateX(-3px); }
  98% { filter: hue-rotate(-60deg); transform: translateX(3px); }
}

/* Frosted glass panels; translucent, never opaque dark slabs */
.panel {
  padding: 2rem;
  border-radius: 8px;
  background: var(--vw-glass);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

.card {
  padding: 1.5rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.35);
  text-align: center;
  transition: transform 150ms ease;
}

/* Fullwidth (ＡＢＣ) titles: modest tracking and no mid-word breaks in narrow cards */
.card h3 {
  font-size: clamp(1rem, 2vw, 1.25rem);
  letter-spacing: 0.08em;
  word-break: keep-all;
}

.card:hover {
  transform: scale(1.05);
}

.button {
  padding: 1rem 1.5rem;
  border: 0;
  border-radius: 9999px;
  background: #FFFFFF;
  color: #7A2BC2;
  font-weight: 700;
  text-shadow: none;
  box-shadow: 0 0 40px rgba(255, 255, 255, 0.5);
}

.button:hover {
  box-shadow: 0 0 40px var(--vw-lemon);
}

/* Two-tone ring: white inner + deep violet outer stays visible on glass and on the gradient */
.button:focus-visible,
.card:focus-visible {
  outline: 3px solid var(--vw-ink);
  outline-offset: 3px;
  box-shadow: 0 0 0 3px #FFFFFF;
}

@media (prefers-reduced-motion: reduce) {
  .hero-title { animation: none; }
  .card { transition: none; }
  .card:hover { transform: none; }
}
```

Works best for: Music platforms, Gaming, Creative portfolios, Tech startups, Entertainment.
Avoid it for: Business apps, E-commerce, Education, Healthcare, Enterprise. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Pixel Art

- slug: `pixel-art`
- source: https://www.uistyleguide.com/style/pixel-art
- category: Retro & Nostalgia

````text
Apply the Pixel Art style to this interface.

What it is: Celebrates the aesthetics of early video games with pixelated graphics, limited palettes, and 8-bit charm.
Look and feel: Retro, 8-bit, 16-bit, Gaming, Blocky, Nostalgic, Pixelated, Arcade.
Colors: primary #FF0000, #00FF00, #0000FF, #FFFF00; secondary #0F0F23, #FFFFFF.
Effects and motion: Frame-by-frame steps() animation, blinking cursor, instant transitions, stepped marquee text.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --red: #FF0000;
  --green: #00FF00;
  --blue: #0000FF;
  --yellow: #FFFF00;
  --bg: #0F0F23;
  --white: #FFFFFF;
  --black: #000000;
}

/* Load Press Start 2P from Google Fonts; it has one weight, so never fake bold */
body {
  background: var(--bg);
  color: var(--white);
  font-family: "Press Start 2P", "Courier New", monospace;
  font-synthesis: none;
}

img,
canvas {
  image-rendering: pixelated;
}

h1,
h2 {
  text-transform: uppercase;
  text-shadow: 4px 4px 0 var(--red);
}

/* 4px white frame, darker bottom-right bevel and a hard black drop shadow, all square-cornered */
.card {
  padding: 1.5rem;
  border-radius: 0;
  background: var(--blue);
  box-shadow: inset -4px -4px 0 rgb(0 0 0 / 0.35), 0 0 0 4px var(--white), 12px 12px 0 var(--black);
}

.button {
  padding: 0.5rem 1rem;
  border: 0;
  border-radius: 0;
  background: var(--yellow);
  color: var(--black);
  font-family: inherit;
  text-transform: uppercase;
  box-shadow: inset -4px -4px 0 rgb(0 0 0 / 0.25), 4px 4px 0 var(--black);
}

.button:hover {
  background: var(--green);
}

.button:active {
  transform: translate(4px, 4px);
  box-shadow: none;
}

.button:focus-visible {
  outline: 4px solid var(--white);
  outline-offset: 4px;
}

.blink {
  color: var(--green);
  animation: blink 1s steps(1) infinite;
}

@keyframes blink {
  50% { visibility: hidden; }
}

/* Marquee that ticks in hard steps; one copy of the text is enough, no duplication needed */
.marquee {
  overflow: hidden;
  white-space: nowrap;
}

.marquee > * {
  display: inline-block;
  padding-left: 100%;
  animation: marquee 12s steps(120) infinite;
}

@keyframes marquee {
  to { transform: translateX(-100%); }
}

@media (prefers-reduced-motion: reduce) {
  .blink,
  .marquee > * {
    animation: none;
  }

  .marquee > * {
    padding-left: 0;
  }
}
```

Works best for: Indie games, Retro tools, Creative portfolios, Nostalgia marketing, Web3/NFT.
Avoid it for: Professional corporate, Modern SaaS, High-res photography sites. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Vintage Analog / Retro Film

- slug: `vintage-analog-retro-film`
- source: https://www.uistyleguide.com/style/vintage-analog-retro-film
- category: Retro & Nostalgia

````text
Apply the Vintage Analog / Retro Film style to this interface.

What it is: Celebrates the imperfect beauty of analog media with film grain, faded colors, and light leaks.
Look and feel: Film grain, VHS, Cassette tape, Polaroid, Analog warmth, Faded colors, Light leaks.
Colors: primary #F5E6C8, #D4A574, #4A7B7C, #E8B4B8; secondary #8B4513, #6B7280.
Effects and motion: Film grain overlay, hover-only VHS tracking jitter on photos, polaroid shake, fade-in transitions.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --film-cream: #F5E6C8;
  --kodak-tan: #D4A574;
  --faded-teal: #4A7B7C;
  --dusty-rose: #E8B4B8;
  --sepia-brown: #8B4513;
  --grey: #6B7280;
  --ink: #4E342E;
  --ink-soft: #6D4C41;
}

body {
  position: relative;
  background: var(--film-cream);
  color: var(--ink-soft);
  font-family: Georgia, "Times New Roman", serif;
}

/* Film grain overlay: visible but light enough to keep text above 4.5:1 */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  opacity: 0.18;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

h1,
h2,
h3 {
  font-weight: 400;
  color: var(--ink);
}

/* Polaroid: each print rests at its own tilt (--tilt) so the hover shake never jumps */
.photo {
  --tilt: -1.2deg;
  position: relative;
  overflow: hidden;
  border: 8px solid #FFFFFF;
  border-bottom-width: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  transform: rotate(var(--tilt));
}

.photo:nth-child(even) {
  --tilt: 1.4deg;
}

.photo:hover {
  animation: film-shake 400ms ease-in-out;
}

@keyframes film-shake {
  0%, 100% { transform: rotate(var(--tilt)); }
  33% { transform: rotate(calc(var(--tilt) + 1.5deg)); }
  66% { transform: rotate(calc(var(--tilt) - 1.5deg)); }
}

@keyframes film-fade {
  from { opacity: 0; }
}

/* Fade-in for sections or prints as they load */
.fade-in {
  animation: film-fade 600ms ease-out both;
}

.photo img {
  display: block;
  width: 100%;
  filter: sepia(0.15) contrast(0.95) saturate(0.9);
}

/* VHS tracking: brief horizontal jitter + RGB split on image hover only */
.photo:hover img {
  animation: vhs-track 500ms steps(4) 1;
}

@keyframes vhs-track {
  0%, 100% { transform: none; }
  25% { transform: translateX(-4px); filter: sepia(0.15) drop-shadow(3px 0 0 rgba(255, 0, 0, 0.5)) drop-shadow(-3px 0 0 rgba(0, 200, 255, 0.5)); }
  50% { transform: translateX(3px) skewX(-2deg); }
  75% { transform: translateX(-2px); }
}

/* Warm light leak bleeding in from the corner */
.photo::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at 100% 0%, rgba(232, 180, 184, 0.45), transparent 55%);
  mix-blend-mode: screen;
}

a:hover {
  text-decoration: underline;
}

a:focus-visible {
  outline: 2px solid var(--faded-teal);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .fade-in,
  .photo,
  .photo:hover,
  .photo:hover img {
    animation: none;
  }
}
```

Works best for: Photography portfolios, Music/vinyl brands, Vintage fashion, Nostalgia marketing, Film industry.
Avoid it for: Modern tech, SaaS, Healthcare, Children's apps, Corporate enterprise. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

---

# Gaming & Entertainment

## 3D & Hyperrealism

- slug: `3d-hyperrealism`
- source: https://www.uistyleguide.com/style/3d-hyperrealism
- category: Gaming & Entertainment

````text
Apply the 3D & Hyperrealism style to this interface.

What it is: Creates immersive experiences through realistic 3D rendering, complex textures, and spatial depth. Best suited for showcasing products or creating game-like interfaces.
Look and feel: Depth, Realistic textures, 3D models, Spatial navigation, Immersive.
Colors: primary #001F3F, #0A1628, #F59E0B, #EA580C; secondary #FFD700, #C0C0C0.
Effects and motion: WebGL/Three.js 3D, realistic shadows, physics lighting, parallax (3-5 layers).

How to build it:
- If a glTF model exists, render it in a lazy-loaded Three.js canvas with PBR materials, an HDRI environment and one shadow-casting key light
- Without 3D assets, fake depth in CSS: a lit plinth with radial highlight and contact shadow, a perspective-tilted product image and layered box-shadows
- Add 3–5 parallax depth layers driven by pointer or scroll, moving HTML layers with transform: translate3d
- Provide a static fallback (poster image or the CSS-styled product) on low-end devices, WebGL failure or prefers-reduced-motion
- Keep text, forms and data in plain HTML over the scene, never rendered inside the canvas
- Reserve amber and orange for highlights and calls to action; give icon slots glossy tiles only when they hold a real icon

Works best for: Gaming, Product showcase, Immersive experiences, Architectural viz.
Avoid it for: Low-end mobile, Performance-limited, Data tables/forms. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Cyberpunk UI

- slug: `cyberpunk-ui`
- source: https://www.uistyleguide.com/style/cyberpunk-ui
- category: Gaming & Entertainment

````text
Apply the Cyberpunk UI style to this interface.

What it is: Dark, neon-lit interfaces inspired by cyberpunk fiction. Features terminal aesthetics, glitch effects, and dystopian vibes.
Look and feel: Neon, Dark mode, Terminal, HUD, Sci-fi, Glitch, Dystopian, Matrix.
Colors: primary #00FF00, #FF00FF, #00FFFF, #0D0D0D; secondary #FFD700, #FF0000.
Effects and motion: Neon glow (text-shadow), glitch animations, scanlines, terminal fonts.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --cp-green: #00FF00;
  --cp-magenta: #FF00FF;
  --cp-cyan: #00FFFF;
  --cp-black: #0D0D0D;
  --cp-yellow: #FFD700;
  --cp-red: #FF0000;
}

body {
  background-color: var(--cp-black);
  /* CRT scanlines */
  background-image: repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(0, 255, 0, 0.04) 2px, rgba(0, 255, 0, 0.04) 4px);
  color: #D1D5DB;
  font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
}

h1,
h2 {
  color: var(--cp-green);
  font-weight: 700;
  text-transform: uppercase;
  text-shadow: 0 0 40px rgba(0, 255, 0, 0.5);
}

.card {
  padding: 1.5rem;
  border: 1px solid rgba(0, 255, 0, 0.3);
  background: rgba(0, 255, 0, 0.05);
}

.button {
  padding: 1rem 2rem;
  border: 1px solid var(--cp-green);
  background: var(--cp-green);
  color: #000000;
  font-family: inherit;
  font-weight: 700;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
}

.button--ghost {
  background: transparent;
  color: var(--cp-green);
  box-shadow: none;
}

.button--ghost:hover {
  background: rgba(0, 255, 0, 0.1);
}

.button:focus-visible {
  outline: 2px solid var(--cp-cyan);
  outline-offset: 3px;
}

@keyframes glitch {
  0%,
  100% {
    text-shadow: -2px 0 var(--cp-magenta), 2px 0 var(--cp-cyan);
  }
  50% {
    text-shadow: 2px 0 var(--cp-magenta), -2px 0 var(--cp-cyan);
  }
}

.glitch:hover {
  animation: glitch 0.3s steps(2) infinite;
}

@media (prefers-reduced-motion: reduce) {
  .glitch:hover {
    animation: none;
  }
}
```

Works best for: Gaming platforms, Tech products, Crypto apps, Sci-fi applications, Developer tools.
Avoid it for: Corporate enterprise, Healthcare, Family apps, Elderly users. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## 3D Product Preview

- slug: `3d-product-preview`
- source: https://www.uistyleguide.com/style/3d-product-preview
- category: Gaming & Entertainment

````text
Apply the 3D Product Preview style to this interface.

What it is: Interactive 3D product visualization with rotation, zoom, and AR capabilities.
Look and feel: 360 product view, Rotatable, Zoomable, Touch-to-spin, AR preview, Product configurator.
Colors: primary #E8E8E8, #FFFFFF; secondary #3B82F6, #10B981, #1D4ED8, #047857.
Effects and motion: Drag-to-rotate, pinch-to-zoom, spin animation, AR placement, material switching.

How to build it:
- Embed models with Google's <model-viewer> (camera-controls, auto-rotate) or Three.js OrbitControls, showing a poster image until the model loads
- Without a 3D model, show the product photos as a swipeable gallery or image sequence in the stage, keeping the rotate and zoom controls
- Put the viewer in a large square stage (light radial gradient, 24px radius, soft floor shadow) beside the configurator, price and Add to Cart
- Swap materials on swatch click via variantName or mesh materials; without a model, switch to the matching photo and ring the selected swatch
- Show View in AR only where model-viewer reports support; keep keyboard rotate and zoom buttons, zooming on wheel only while the stage is focused
- Use #3B82F6 and #10B981 for fills, rings and icons; #1D4ED8 and #047857 for text and white-on-colour buttons

Works best for: E-commerce, Furniture, Fashion, Automotive, Electronics, Jewelry.
Avoid it for: Content-heavy sites, Blogs, Dashboards, Low-bandwidth, Accessibility-critical. If this product falls into one of those, say so before restyling.

Keep the existing content and layout. Restyle it with the colors above, and add the interactions described.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Chromatic Aberration / RGB Split

- slug: `chromatic-aberration-rgb-split`
- source: https://www.uistyleguide.com/style/chromatic-aberration-rgb-split
- category: Gaming & Entertainment

````text
Apply the Chromatic Aberration / RGB Split style to this interface.

What it is: Recreates the chromatic aberration effect from cameras and VHS tapes with RGB channel splitting.
Look and feel: RGB split, Color fringing, Glitch, Retro tech, VHS, Analog error, Distortion.
Colors: primary #FF0000, #00FF00, #0000FF, #000000; secondary #00FFFF, #FF00FF.
Effects and motion: Steady red/cyan RGB split on display type with a brief channel-swap burst every few seconds, hover glitch jitter, faint drifting scanlines on media only (never over text), slow subtle noise flicker under 3 per second.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --red: #FF0000;
  --green: #00FF00;
  --blue: #0000FF;
  --black: #000000;
  --cyan: #00FFFF;
  --magenta: #FF00FF;
  --surface: #0A0A0A;
}

body {
  background: var(--surface);
  color: #9CA3AF;
  font-family: system-ui, sans-serif;
}

/* Red and cyan copies of the glyphs offset sideways = the RGB split */
.rgb-text {
  color: #FFFFFF;
  font-weight: 900;
  text-shadow: -2px 0 var(--red), 2px 0 var(--cyan);
  /* Split holds steady; channels swap in a brief burst every 3s */
  animation: rgb-split 3s steps(1) infinite;
}

.button {
  border: 1px solid #FFFFFF;
  border-radius: 0;
  padding: 1rem 2rem;
  background: transparent;
  color: #FFFFFF;
  font-weight: 700;
  text-transform: uppercase;
  text-shadow: -1px 0 var(--red), 1px 0 var(--cyan);
}

.button:hover {
  animation: glitch 0.3s infinite;
}

.button:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 3px;
}

.media {
  position: relative;
  overflow: hidden;
  background: linear-gradient(45deg, var(--red), var(--green), var(--blue));
  animation: flicker 4s steps(1) infinite;
}

/* Faint drifting scanlines on media only, never over text */
.media::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.12) 0 1px, transparent 1px 3px);
  animation: scan 8s linear infinite;
}

@keyframes rgb-split {
  0%, 100% { text-shadow: -2px 0 var(--red), 2px 0 var(--cyan); }
  94% { text-shadow: 3px 0 var(--red), -3px 0 var(--cyan); }
  97% { text-shadow: -2px 0 var(--red), 2px 0 var(--cyan); }
}

@keyframes scan { to { background-position: 0 60px; } }

/* Subtle noise flicker: two small dips per 4s, well under 3 flashes/s */
@keyframes flicker {
  0%, 100% { opacity: 1; }
  48% { opacity: 0.92; }
  52% { opacity: 1; }
}

@keyframes glitch {
  0%, 90%, 100% { transform: translate(0); }
  93% { transform: translate(-2px, 1px); }
  97% { transform: translate(2px, -1px); }
}

@media (prefers-reduced-motion: reduce) {
  .rgb-text,
  .button:hover,
  .media,
  .media::after {
    animation: none;
  }
}
```

Works best for: Music platforms, Gaming, Tech brands, Creative portfolios, Nightlife, Video.
Avoid it for: Corporate, Healthcare, Finance, Accessibility-critical, Elderly users. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

---

# Accessibility & Ethical

## Accessible & Ethical

- slug: `accessible-ethical`
- source: https://www.uistyleguide.com/style/accessible-ethical
- category: Accessibility & Ethical

````text
Apply the Accessible & Ethical style to this interface.

What it is: Prioritizes accessibility and ethical considerations above all else. Ensures everyone can use the interface regardless of ability or device.
Look and feel: High contrast, Large text, Keyboard navigation, Screen reader friendly, WCAG compliant.
Colors: primary #000000, #FFFFFF; secondary #1E40AF, #166534.
Effects and motion: AAA text contrast (7:1), clear focus rings (3-4px), ARIA labels, skip links, 44x44px touch targets.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --a11y-black: #000000;
  --a11y-white: #FFFFFF;
  --a11y-blue: #1E40AF;
  --a11y-green: #166534;
  --a11y-ink: #111827;
  --a11y-text: #374151;
}

/* Target AAA: every text pair here is 7:1 or better */
html {
  font-size: 100%;
}

body {
  background: var(--a11y-white);
  color: var(--a11y-ink);
  font-family: system-ui, sans-serif;
  font-size: 1.125rem;
  line-height: 1.6;
}

a {
  color: var(--a11y-blue);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.skip-link {
  position: absolute;
  top: -100px;
  left: 1rem;
  padding: 0.75rem 1rem;
  background: var(--a11y-blue);
  color: var(--a11y-white);
}

.skip-link:focus {
  top: 1rem;
}

.card {
  display: block;
  padding: 1.5rem;
  border: 2px solid var(--a11y-ink);
  border-radius: 0.5rem;
  color: var(--a11y-text);
}

.button,
input {
  min-height: 44px;
  padding: 1rem 2rem;
  border: 2px solid var(--a11y-blue);
  border-radius: 0.5rem;
  font-size: 1.125rem;
}

.button {
  background: var(--a11y-blue);
  color: var(--a11y-white);
  font-weight: 600;
}

/* Two-tone ring stays visible on light and dark backgrounds */
:focus-visible {
  outline: 4px solid var(--a11y-blue);
  outline-offset: 2px;
  box-shadow: 0 0 0 8px var(--a11y-white);
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

Works best for: Government, Healthcare, Education, Inclusive products, Public services.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Inclusive Design

- slug: `inclusive-design`
- source: https://www.uistyleguide.com/style/inclusive-design
- category: Accessibility & Ethical

````text
Apply the Inclusive Design style to this interface.

What it is: Goes beyond basic accessibility to create truly universal experiences. Considers all users including those with disabilities, elderly, and those in challenging environments.
Look and feel: Accessible, Color-blind friendly, High contrast, Large touch targets, Universal.
Colors: primary #1E3A8A, #166534; secondary #DC2626, #F59E0B.
Effects and motion: Thick high-contrast focus rings (3-4px), large text and 48px+ touch targets, labels and icons alongside color, reduced-motion options.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --inc-navy: #1E3A8A;
  --inc-green: #166534;
  --inc-red: #DC2626;
  --inc-amber: #F59E0B;
  --inc-text: #111827;
  --inc-muted: #374151;
  --inc-border: #6B7280;
}

body {
  background: #FFFFFF;
  color: var(--inc-text);
  font-family: "Atkinson Hyperlegible", system-ui, sans-serif;
  font-size: 1.125rem;
  line-height: 1.6;
}

a {
  color: var(--inc-navy);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.field {
  width: 100%;
  min-height: 3.5rem;
  padding: 1rem;
  border: 2px solid var(--inc-border);
  border-radius: 8px;
  font-size: 1.125rem;
}

.button {
  min-height: 3.5rem;
  padding: 1rem 1.5rem;
  border: 2px solid transparent;
  border-radius: 8px;
  background: var(--inc-navy);
  color: #FFFFFF;
  font-size: 1.25rem;
  font-weight: 700;
}

.button:hover {
  background: #172554;
  text-decoration: underline;
}

/* Thick, high-contrast focus ring on every interactive element */
a:focus-visible,
.field:focus-visible,
.button:focus-visible,
input[type="checkbox"]:focus-visible {
  outline: 4px solid var(--inc-navy);
  outline-offset: 3px;
}

input[type="checkbox"] {
  width: 1.5rem;
  height: 1.5rem;
  accent-color: var(--inc-navy);
}

.alert {
  padding: 1rem;
  border-left: 6px solid var(--inc-amber);
  border-radius: 0 8px 8px 0;
  background: #FEF3C7;
  color: var(--inc-text);
}

.error-message {
  color: var(--inc-red);
  font-weight: 600;
}

/* Group related checkboxes or radios in a <fieldset> with a <legend> */
fieldset {
  padding: 1rem 1.5rem;
  border: 2px solid var(--inc-border);
  border-radius: 8px;
}

legend {
  padding: 0 0.5rem;
  font-weight: 700;
}

/* Wrap nav links on small screens; only add a menu toggle if you also script it */
.nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Works best for: Public services, Education, Healthcare, Finance, Government.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## E-Ink / Paper

- slug: `e-ink-paper`
- source: https://www.uistyleguide.com/style/e-ink-paper
- category: Accessibility & Ethical

````text
Apply the E-Ink / Paper style to this interface.

What it is: Mimics the experience of reading on paper or e-ink displays. High contrast, no animations, and distraction-free.
Look and feel: Paper-like, Matte, High contrast, Texture, Reading, Calm, Monochrome.
Colors: primary #FDFBF7, #F5F5F5, #1A1A1A; secondary #4A4A4A, #FFFF00.
Effects and motion: No animation or motion blur; pagination and state changes swap content instantly; optional faint paper grain under 3% opacity.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --paper: #FDFBF7;
  --paper-alt: #F5F5F5;
  --ink: #1A1A1A;
  --ink-soft: #4A4A4A;
  --highlight: #FFFF00;
}

/* E-ink screens can't animate: everything changes instantly */
*,
*::before,
*::after {
  transition: none;
  animation: none;
}

/* Optional paper grain: fine monochrome noise kept under 3% opacity */
body {
  background-color: var(--paper);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
  color: var(--ink);
  font-family: Georgia, "Iowan Old Style", "Times New Roman", serif;
  font-size: 1.125rem;
  line-height: 1.65;
}

article {
  max-width: 42rem;
  margin: 0 auto;
  padding: 3rem 2rem;
}

header {
  border-bottom: 2px solid var(--ink);
}

h1,
h2 {
  font-weight: 700;
  line-height: 1.2;
}

.byline,
.meta {
  color: var(--ink-soft);
}

article > p:first-of-type::first-letter {
  float: left;
  margin: 0.25rem 0.75rem 0 0;
  font-size: 3.75rem;
  font-weight: 700;
  line-height: 1;
}

blockquote {
  margin: 2rem 0;
  padding-left: 1.5rem;
  border-left: 4px solid var(--ink);
  font-style: italic;
}

mark {
  background: var(--highlight);
  color: var(--ink);
}

.button {
  border: 0;
  background: none;
  color: var(--ink-soft);
  font: inherit;
}

.button:hover {
  color: var(--ink);
  text-decoration: underline;
}

.button:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 3px;
}
```

Works best for: Reading apps, Digital newspapers, Minimal journals, Distraction-free writing.
Avoid it for: Gaming, Video platforms, High-energy marketing, Dark mode dependent. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

---

# Experimental & Artistic

## Brutalism

- slug: `brutalism`
- source: https://www.uistyleguide.com/style/brutalism
- category: Experimental & Artistic

````text
Apply the Brutalism style to this interface.

What it is: Inspired by Brutalist architecture, this style embraces raw, honest aesthetics. Features intentionally "ugly" design with default fonts, visible borders, and a rejection of conventional beauty.
Look and feel: Raw, Unpolished, Stark, High contrast, Plain text, Anti-design.
Colors: primary #FF0000, #0000FF, #FFFF00, #000000, #FFFFFF; secondary #00FF00, #FF00FF.
Effects and motion: Instant state changes with no transitions, sharp 0px corners, heavy black type, thick borders and hard offset shadows.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --brut-red: #FF0000;
  --brut-blue: #0000FF;
  --brut-yellow: #FFFF00;
  --brut-black: #000000;
  --brut-white: #FFFFFF;
  --brut-green: #00FF00;
  --brut-magenta: #FF00FF;
}

* {
  border-radius: 0;
  transition: none;
}

body {
  background: var(--brut-white);
  color: var(--brut-black);
  font-family: Arial, Helvetica, sans-serif;
}

h1 {
  font-size: clamp(2.5rem, 9vw, 7rem);
}

h1,
h2,
h3 {
  font-weight: 900;
  text-transform: uppercase;
  line-height: 1;
  letter-spacing: -0.025em;
}

.mono {
  font-family: "Courier New", Courier, monospace;
  font-weight: 400;
}

/* Black text on yellow, green, magenta and red fills; white text only on blue and black */
.card--red { background: var(--brut-red); color: var(--brut-black); }
.card--magenta { background: var(--brut-magenta); color: var(--brut-black); }
.card--blue { background: var(--brut-blue); color: var(--brut-white); }
.card--black { background: var(--brut-black); color: var(--brut-white); }

/* Even columns so a short last row never strands one card */
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.card {
  padding: 2rem;
  border: 4px solid var(--brut-black);
  background: var(--brut-yellow);
  box-shadow: 8px 8px 0 var(--brut-black);
}

.button {
  padding: 0.5rem 1.5rem;
  border: 4px solid var(--brut-black);
  background: var(--brut-white);
  color: var(--brut-black);
  font-weight: 700;
  text-transform: uppercase;
  box-shadow: 4px 4px 0 var(--brut-black);
}

/* Instant press: the button drops onto its hard shadow */
.button:active {
  transform: translate(4px, 4px);
  box-shadow: none;
}

.button:focus-visible {
  outline: 4px solid var(--brut-blue);
  outline-offset: 4px;
}

.nav a:hover {
  text-decoration: line-through;
}
```

Works best for: Design portfolios, Artistic projects, Counter-culture brands, Tech blogs.
Avoid it for: Corporate environments, Conservative industries, Customer-facing professional. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Liquid Glass

- slug: `liquid-glass`
- source: https://www.uistyleguide.com/style/liquid-glass
- category: Experimental & Artistic

````text
Apply the Liquid Glass style to this interface.

What it is: Advanced glassmorphism with flowing, morphing animations. Creates a liquid-like feel with chromatic aberration and iridescent effects.
Look and feel: Flowing glass, Morphing, Smooth transitions, Fluid effects, Iridescent.
Colors: primary #667EEA, #764BA2, #F093FB; secondary #FF6B6B, #4ECDC4, #95E1D3.
Effects and motion: Morphing blobs (SVG/CSS), fluid animations (400-600ms), dynamic blur, iridescent glass edges, chromatic split on large headings.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --lg-indigo: #667EEA;
  --lg-purple: #764BA2;
  --lg-pink: #F093FB;
  --lg-coral: #FF6B6B;
  --lg-teal: #4ECDC4;
  --lg-mint: #95E1D3;
}

/* Keep the gradient vivid: no dark scrims over the page. A soft shadow keeps white text legible */
body {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--lg-indigo), var(--lg-purple), var(--lg-pink));
  color: #FFFFFF;
  text-shadow: 0 1px 2px rgba(40, 20, 90, 0.35);
}

/* Soft colour blobs that slowly morph behind the glass */
.blob {
  position: absolute;
  width: 32rem;
  height: 32rem;
  background: var(--lg-pink);
  filter: blur(64px);
  opacity: 0.5;
  animation: liquid-morph 12s ease-in-out infinite;
}

@keyframes liquid-morph {
  0%, 100% { border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%; transform: translate(0, 0) scale(1); }
  50% { border-radius: 70% 30% 46% 54% / 30% 39% 61% 70%; transform: translate(4%, -3%) scale(1.08); }
}

.glass {
  position: relative;
  padding: 2rem;
  border-radius: 1.5rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05));
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

/* Iridescent 1px edge: a conic gradient masked down to the border */
.glass::before {
  content: "";
  position: absolute;
  inset: 0;
  padding: 1px;
  border-radius: inherit;
  background: conic-gradient(from 120deg, var(--lg-mint), var(--lg-pink), var(--lg-coral), var(--lg-teal), var(--lg-mint));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

/* Chromatic aberration for large headings only */
.chromatic { text-shadow: -2px 0 rgba(255, 107, 107, 0.6), 2px 0 rgba(78, 205, 196, 0.6); }

.button {
  padding: 1rem 2rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 1rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.1));
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  color: #FFFFFF;
  font-weight: 600;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  transition: transform 400ms cubic-bezier(0.22, 1, 0.36, 1), background 400ms ease;
}

/* Primary action: an opaque pearl pill so it stands apart from the clear glass secondary */
.button--primary {
  background: linear-gradient(135deg, #FFFFFF, #F5E8FF);
  color: #4C1D95;
  text-shadow: none;
}

.button:hover { background: linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.15)); transform: scale(1.03); }
.button--primary:hover { background: #FFFFFF; }
.button:active { transform: scale(0.98); }

/* Dark inner ring plus white outer ring stays visible over every part of the gradient */
.button:focus-visible {
  outline: 3px solid #2E1A66;
  box-shadow: 0 0 0 6px #FFFFFF, 0 8px 32px rgba(0, 0, 0, 0.2);
}

@media (prefers-reduced-motion: reduce) {
  .blob { animation: none; }
  .button { transition: none; }
}
```

Works best for: Premium SaaS, High-end e-commerce, Creative platforms, Luxury portfolios.
Avoid it for: Performance-limited, Critical accessibility, Complex data, Budget projects. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Neubrutalism

- slug: `neubrutalism`
- source: https://www.uistyleguide.com/style/neubrutalism
- category: Experimental & Artistic

````text
Apply the Neubrutalism style to this interface.

What it is: A modern, playful take on brutalism. Combines raw aesthetics with bright colors and bold shadows. Think Gumroad and Figma's marketing pages.
Look and feel: Bold borders, Black outlines, Primary colors, Thick shadows, Flat colors, Playful.
Colors: primary #FFEB3B, #FF5252, #2196F3, #000000; secondary #4CAF50, #FF9800.
Effects and motion: Hard offset black shadows (4-8px, no blur), thick 3-4px black borders, flat fills with no gradients, sharp corners, press-down hover and active states.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
/* Black text on every fill colour (white on blue/red fails AA); white text only on black */
:root {
  --nb-yellow: #FFEB3B;
  --nb-red: #FF5252;
  --nb-blue: #2196F3;
  --nb-black: #000000;
  --nb-green: #4CAF50;
  --nb-orange: #FF9800;
  --nb-paper: #FFFBEB;
}

/* Load Space Grotesk 400;700 from Google Fonts; 700 is its heaviest weight */
body {
  background: var(--nb-paper);
  color: var(--nb-black);
  font-family: "Space Grotesk", system-ui, sans-serif;
}

h1,
h2,
h3 {
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.card {
  padding: 1.5rem;
  border: 4px solid var(--nb-black);
  border-radius: 0;
  background: var(--nb-yellow);
  box-shadow: 8px 8px 0 var(--nb-black);
}

.tag {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: var(--nb-black);
  color: #FFFFFF;
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
}

.highlight {
  padding: 0 0.5rem;
  background: var(--nb-yellow);
}

.button,
.input {
  padding: 0.75rem 1.5rem;
  border: 4px solid var(--nb-black);
  border-radius: 0;
  font-weight: 700;
}

.button {
  background: var(--nb-black);
  color: #FFFFFF;
  box-shadow: 4px 4px 0 var(--nb-blue);
  transition: transform 100ms ease, box-shadow 100ms ease;
}

.button:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--nb-blue);
}

.button:active {
  transform: translate(4px, 4px);
  box-shadow: 0 0 0 var(--nb-blue);
}

/* Black ring stays visible on paper and on every colour block */
.button:focus-visible,
.input:focus-visible {
  outline: 4px solid var(--nb-black);
  outline-offset: 4px;
}

.input {
  background: #FFFFFF;
  font-family: ui-monospace, monospace;
}

@media (prefers-reduced-motion: reduce) {
  .button {
    transition: none;
  }
}
```

Works best for: Gen Z brands, Startups, Creative agencies, Figma-style apps, Tech blogs.
Avoid it for: Luxury brands, Finance, Healthcare, Conservative industries. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Memphis Design

- slug: `memphis-design`
- source: https://www.uistyleguide.com/style/memphis-design
- category: Experimental & Artistic

````text
Apply the Memphis Design style to this interface.

What it is: Inspired by the 1980s Memphis Group, featuring bold geometric shapes, clashing colors, and playful patterns.
Look and feel: 80s, Geometric, Playful, Postmodern, Shapes, Patterns, Squiggles, Bold.
Colors: primary #FF71CE, #FFCE5C, #86CCCA, #6A7BB4; secondary #FF6B6B, #4ECDC4.
Effects and motion: Rotated cards, hard offset shadows, clip-path triangles and squiggles, repeating stripe and dot patterns.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --memphis-pink: #FF71CE;
  --memphis-yellow: #FFCE5C;
  --memphis-teal: #86CCCA;
  --memphis-periwinkle: #6A7BB4;
  --memphis-coral: #FF6B6B;
  --memphis-aqua: #4ECDC4;
  --memphis-paper: #FFFEF7;
}

body {
  background-color: var(--memphis-paper);
  /* Confetti dot pattern */
  background-image: radial-gradient(var(--memphis-periwinkle) 2px, transparent 2px);
  background-size: 32px 32px;
  color: #111111;
  /* Futura ships only on Apple systems: load Jost (or League Spartan) from Google Fonts for everyone else */
  font-family: "Futura", "Jost", "League Spartan", "Avenir Next", sans-serif;
}

h1,
h2 {
  font-weight: 900;
  line-height: 1;
  text-transform: uppercase;
}

.card {
  padding: 1.5rem;
  border: 4px solid #000000;
  background: var(--memphis-yellow);
  box-shadow: 12px 12px 0 #000000;
  transform: rotate(-2deg);
}

.card:nth-child(even) {
  background: var(--memphis-teal);
  transform: rotate(2deg);
}

.button {
  padding: 1.25rem 2.5rem;
  border: 3px solid #000000;
  background: var(--memphis-pink);
  color: #000000;
  font-weight: 900;
  font-size: 1.25rem;
  box-shadow: 8px 8px 0 var(--memphis-periwinkle);
  transition: transform 100ms ease, box-shadow 100ms ease;
}

.button:active {
  transform: translate(4px, 4px);
  box-shadow: 4px 4px 0 var(--memphis-periwinkle);
}

.button:focus-visible {
  outline: 4px dashed #000000;
  outline-offset: 6px;
}

.shape-triangle {
  width: 80px;
  height: 70px;
  background: var(--memphis-aqua);
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
}

.shape-stripes {
  width: 64px;
  height: 160px;
  background: repeating-linear-gradient(45deg, #000000 0 5px, transparent 5px 10px);
}
```

Works best for: Creative agencies, Music sites, Youth brands, Event promotion, Artistic portfolios.
Avoid it for: Corporate finance, Healthcare, Legal, Elderly users. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Exaggerated Minimalism

- slug: `exaggerated-minimalism`
- source: https://www.uistyleguide.com/style/exaggerated-minimalism
- category: Experimental & Artistic

````text
Apply the Exaggerated Minimalism style to this interface.

What it is: Takes minimalism to the extreme with oversized typography, dramatic white space, and bold statements.
Look and feel: Bold minimalism, Oversized typography, High contrast, Negative space, Statement design.
Colors: primary #000000, #FFFFFF; secondary #FF0000.
Effects and motion: Viewport-scaled display type up to 12rem at weight 900 with tight tracking, outlined words, vast padding, instant color-inversion hovers.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --ink: #000000;
  --paper: #FFFFFF;
  --signal: #FF0000;
  --muted: #4B5563;
  --ghost: #E5E7EB;
}

body {
  background: var(--paper);
  color: var(--ink);
  font-family: Inter, "Archivo Black", "Helvetica Neue", Helvetica, Arial, sans-serif;
}

.hero {
  padding: 8rem 2rem;
}

.display {
  margin: 0 0 6rem;
  font-size: clamp(3rem, 12vw, 12rem);
  font-weight: 900;
  line-height: 0.85;
  letter-spacing: -0.05em;
  text-transform: uppercase;
}

/* Outlined words need looser tracking so neighbouring strokes don't cross */
.display .outline {
  color: var(--paper);
  -webkit-text-stroke: 1.5px var(--ink);
  letter-spacing: -0.02em;
}

.lead {
  max-width: 24rem;
  font-size: 1.25rem;
  color: var(--muted);
}

/* Oversized index numbers as quiet decoration: mark them aria-hidden */
.index {
  font-size: 8rem;
  font-weight: 900;
  line-height: 1;
  color: var(--ghost);
}

/* Instant inversion hovers: no transition */
.button {
  padding: 1.5rem 3rem;
  border: 2px solid var(--ink);
  background: transparent;
  color: var(--ink);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.card {
  padding: 2rem;
  border-top: 2px solid var(--ink);
}

.button:hover,
.card:hover {
  background: var(--ink);
  color: var(--paper);
}

.card:hover .lead {
  color: #D1D5DB;
}

.card:hover .index {
  color: #374151;
}

.button:focus-visible,
.card:focus-within {
  outline: 3px solid var(--signal);
  outline-offset: 4px;
}

.nav a:hover {
  text-decoration: line-through;
}
```

Works best for: Fashion, Architecture, Portfolios, Agency landing pages, Luxury brands.
Avoid it for: E-commerce catalogs, Dashboards, Forms, Data-heavy, Elderly users. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Gen Z Chaos / Maximalism

- slug: `gen-z-chaos-maximalism`
- source: https://www.uistyleguide.com/style/gen-z-chaos-maximalism
- category: Experimental & Artistic

````text
Apply the Gen Z Chaos / Maximalism style to this interface.

What it is: Embraces chaos and maximalism with sticker overlays, collage aesthetics, and internet culture references.
Look and feel: Chaos, Clutter, Stickers, Raw, Collage, Mixed media, Loud, Internet culture.
Colors: primary #FF00FF, #00FF00, #FFFF00, #0000FF; secondary #FF6B6B, #4ECDC4.
Effects and motion: Marquee scrolls, jitter on hover, layered emoji stickers with hard shadows, scattered rotated placement.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --magenta: #FF00FF;
  --lime: #00FF00;
  --yellow: #FFFF00;
  --blue: #0000FF;
  --coral: #FF6B6B;
  --teal: #4ECDC4;
  --black: #000000;
}

body {
  background: var(--yellow);
  color: var(--black);
  font-family: "Arial Black", Impact, sans-serif;
  font-weight: 900;
  overflow-x: hidden;
}

.headline {
  font-size: 3.75rem;
  text-transform: uppercase;
  transform: rotate(-2deg);
  text-shadow: 4px 4px 0 var(--magenta);
}

.card {
  padding: 1.5rem;
  background: var(--teal);
  box-shadow: 6px 6px 0 var(--black);
  transform: rotate(-2deg);
}

.card:nth-child(even) {
  background: var(--coral);
  transform: rotate(2deg);
}

.card:nth-child(3n) {
  background: var(--magenta);
}

/* Emoji stickers scattered over the layout (parent needs position: relative) */
.sticker {
  position: absolute;
  font-size: 5rem;
  transform: rotate(12deg);
  filter: drop-shadow(4px 4px 0 var(--black));
  pointer-events: none;
}

.button {
  padding: 0.5rem 1.5rem;
  border: 0;
  background: var(--black);
  color: #FFFFFF;
  font: inherit;
  text-transform: uppercase;
}

.button:hover {
  animation: jitter 150ms steps(2) infinite;
  background: var(--blue);
}

.button:focus-visible {
  outline: 4px solid var(--black);
  outline-offset: 3px;
}

/* Put the ticker text in the track twice (second copy aria-hidden)
   so translateX(-50%) loops seamlessly with no empty gap */
.marquee {
  overflow: hidden;
  background: var(--black);
  color: var(--lime);
}

.marquee__track {
  display: flex;
  width: max-content;
  white-space: nowrap;
  font-size: 2.25rem;
  animation: marquee 12s linear infinite;
}

.marquee__track > * {
  padding-right: 2rem;
}

@keyframes jitter {
  50% {
    transform: translate(2px, -2px) rotate(-2deg);
  }
}

@keyframes marquee {
  to {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .button:hover,
  .marquee__track {
    animation: none;
  }
}
```

Works best for: Gen Z lifestyle brands, Music artists, Creative portfolios, Viral marketing, Fashion.
Avoid it for: Corporate, Government, Healthcare, Banking, Serious tools. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Anti-Polish / Raw Aesthetic

- slug: `anti-polish-raw-aesthetic`
- source: https://www.uistyleguide.com/style/anti-polish-raw-aesthetic
- category: Experimental & Artistic

````text
Apply the Anti-Polish / Raw Aesthetic style to this interface.

What it is: Celebrates imperfection and human touch with hand-drawn elements, scanned textures, and an unfinished aesthetic.
Look and feel: Hand-drawn, Collage, Scanned textures, Unfinished, Imperfect, Authentic, Sketch.
Colors: primary #FAFAF8, #4A4A4A, #1A1A1A, #C4A77D; secondary #D4C4A8, #8B4513.
Effects and motion: No smooth transitions, hand-drawn animations, paper texture overlays, jitter effects.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --paper: #FAFAF8;
  --pencil: #4A4A4A;
  --ink: #1A1A1A;
  --kraft: #C4A77D;
  --sand: #D4C4A8;
  --rust: #8B4513;
  --note: #FFFEF0;
}

body {
  background: var(--paper);
  color: var(--ink);
  font-family: "Patrick Hand", "Comic Sans MS", cursive, sans-serif;
  font-size: 1.125rem;
}

/* Scanned-paper grain over the whole page */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  opacity: 0.08;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

h1,
h2 {
  font-weight: 400;
  text-transform: lowercase;
  transform: rotate(-1deg);
}

/* Wobbly hand-drawn outline from uneven elliptical radii */
.card {
  padding: 1.5rem 2rem;
  border: 2px solid var(--ink);
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
  background: var(--note);
  transform: rotate(-0.5deg);
}

.card:nth-child(even) {
  background: #FFF9DB;
  transform: rotate(0.5deg);
}

.card p {
  color: var(--pencil);
}

a {
  color: var(--rust);
  text-decoration: underline wavy;
  text-underline-offset: 4px;
}

.button {
  padding: 0.5rem 1.25rem;
  border: 2px solid var(--ink);
  border-radius: 15px 225px 15px 255px / 255px 15px 225px 15px;
  background: var(--sand);
  color: var(--ink);
  font: inherit;
  transform: rotate(1deg);
}

.button:hover {
  background: var(--kraft);
  transform: rotate(-1deg);
}

/* Jitter: hand-drawn wobble in hard steps, never a smooth tween */
.card:hover,
.button:hover {
  animation: jitter 0.3s steps(2) infinite;
}

@keyframes jitter {
  0% { translate: 0 0; }
  50% { translate: 1px -1px; }
  100% { translate: -1px 1px; }
}

.button:focus-visible,
a:focus-visible {
  outline: 2px dashed var(--ink);
  outline-offset: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .card:hover,
  .button:hover {
    animation: none;
  }
}
```

Works best for: Creative portfolios, Artist sites, Indie brands, Handmade products, Editorial.
Avoid it for: Corporate enterprise, Fintech, Healthcare, Government, Polished SaaS. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Gradient Mesh / Aurora Evolved

- slug: `gradient-mesh-aurora-evolved`
- source: https://www.uistyleguide.com/style/gradient-mesh-aurora-evolved
- category: Experimental & Artistic

````text
Apply the Gradient Mesh / Aurora Evolved style to this interface.

What it is: Advanced gradient techniques creating flowing, aurora-like color transitions with holographic effects.
Look and feel: Complex gradients, Mesh gradients, Multi-color blend, Aurora effect, Iridescent, Holographic.
Colors: primary #00FFFF, #FF00FF, #FFFF00, #0066FF, #00FF66; secondary #FF6B6B, #4ECDC4.
Effects and motion: Layered multi-colour gradients blurred into a mesh, slow background-position drift, frosted glass panels over the colour.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --cyan: #00FFFF;
  --magenta: #FF00FF;
  --yellow: #FFFF00;
  --blue: #0066FF;
  --green: #00FF66;
  --coral: #FF6B6B;
  --teal: #4ECDC4;
}

/* Mesh: overlapping radial blooms over a blue base, drifting slowly */
.hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  color: #FFFFFF;
  font-weight: 500;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  background-color: var(--blue);
  background-image:
    radial-gradient(at 15% 20%, var(--magenta) 0, transparent 50%),
    radial-gradient(at 85% 10%, var(--cyan) 0, transparent 50%),
    radial-gradient(at 80% 85%, var(--yellow) 0, transparent 45%),
    radial-gradient(at 10% 90%, var(--green) 0, transparent 45%),
    radial-gradient(at 50% 50%, var(--coral) 0, transparent 55%);
  background-size: 200% 200%;
  animation: aurora-drift 20s ease-in-out infinite;
}

/* Light veil melts the blooms together. Keep it at or below 0.3:
   never darken the whole background, the neon colour is the point. */
.hero::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.25), transparent 60%), rgba(17, 24, 39, 0.25);
  backdrop-filter: blur(64px);
  -webkit-backdrop-filter: blur(64px);
}

.hero h1 {
  font-weight: 700;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.card {
  border-radius: 1.5rem;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.button {
  border: 0;
  border-radius: 9999px;
  padding: 1rem 2rem;
  background: #FFFFFF;
  color: #111827;
  font-weight: 600;
  text-shadow: none;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  transition: transform 0.15s ease;
}

.button:hover {
  transform: scale(1.05);
}

/* Two-tone ring stays visible over both bright and deep parts of the mesh */
.button:focus-visible {
  outline: 3px solid #FFFFFF;
  outline-offset: 3px;
  box-shadow: 0 0 0 6px #111827;
}

@keyframes aurora-drift {
  0%, 100% { background-position: 0% 0%; }
  50% { background-position: 100% 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .hero {
    animation: none;
  }

  .button:hover {
    transform: none;
  }
}
```

Works best for: Hero sections, Backgrounds, Creative brands, Music platforms, Fashion.
Avoid it for: Data interfaces, Text-heavy content, Accessibility-critical, Conservative brands. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

---

# Nature & Organic

## Organic Biophilic

- slug: `organic-biophilic`
- source: https://www.uistyleguide.com/style/organic-biophilic
- category: Nature & Organic

````text
Apply the Organic Biophilic style to this interface.

What it is: Brings nature indoors through organic shapes, natural colors, and flowing elements. Creates a calming, sustainable aesthetic.
Look and feel: Nature, Organic shapes, Green, Sustainable, Rounded, Flowing, Earthy.
Colors: primary #228B22, #8B4513, #87CEEB, #F5F5DC; secondary #6B8E23, #DAA520.
Effects and motion: Rounded corners (16-24px), organic curves, natural shadows, flowing SVG shapes.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --forest: #228B22;
  --bark: #8B4513;
  --sky: #87CEEB;
  --linen: #F5F5DC;
  --olive: #6B8E23;
  --goldenrod: #DAA520; /* sunny accent fills and icons, never text */
  --leaf-ink: #14532D;
  --leaf-text: #166534;
}

body {
  background: var(--linen);
  color: var(--leaf-text);
  font-family: system-ui, sans-serif;
}

h1,
h2,
h3 {
  color: var(--leaf-ink);
  font-family: Georgia, "Times New Roman", serif;
  font-weight: 400;
  line-height: 1.15;
}

.card {
  padding: 2rem;
  border-radius: 24px;
  background: rgba(34, 139, 34, 0.1);
}

.card--earth {
  background: rgba(139, 69, 19, 0.1);
}

/* Uneven radii read as a pebble or leaf. Decorative blobs sit in empty margins or frame an
   image, never behind translucent cards or text */
.blob {
  border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%;
  background: linear-gradient(135deg, var(--olive), var(--forest));
}

/* Flowing SVG wave between sections instead of a straight edge */
.wave {
  height: 4rem;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 80' preserveAspectRatio='none'%3E%3Cpath d='M0 40C240 0 480 80 720 40S1200 0 1440 40V80H0Z' fill='%23228B22' fill-opacity='0.12'/%3E%3C/svg%3E") center / 100% 100% no-repeat;
}

/* White on --forest passes only as large text (19px bold); smaller buttons use --leaf-text */
.button {
  padding: 1rem 2rem;
  border: 2px solid var(--forest);
  border-radius: 9999px;
  background: var(--forest);
  color: #FFFFFF;
  font-size: 1.1875rem;
  font-weight: 700;
  box-shadow: 0 10px 30px rgba(34, 139, 34, 0.3);
  transition: background-color 150ms ease, color 150ms ease;
}

.button--outline {
  border-color: var(--leaf-text);
  background: transparent;
  color: var(--leaf-text);
  box-shadow: none;
}

.button:hover,
.button--outline:hover {
  background: var(--leaf-text);
  color: #FFFFFF;
}

.button:focus-visible {
  outline: 3px solid var(--leaf-ink);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .button {
    transition: none;
  }
}
```

Works best for: Wellness apps, Sustainability brands, Eco products, Health apps, Meditation.
Avoid it for: Tech-focused products, Gaming, Industrial, Urban brands. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Biomimetic / Organic 2.0

- slug: `biomimetic-organic-2`
- source: https://www.uistyleguide.com/style/biomimetic-organic-2
- category: Nature & Organic

````text
Apply the Biomimetic / Organic 2.0 style to this interface.

What it is: Takes organic design further with growing cells, breathing animations, and bio-inspired patterns.
Look and feel: Nature-inspired, Cellular, Fluid, Breathing, Growing, Life-like.
Colors: primary #00FF41, #00FFFF, #001E3C; secondary #0A2540, #FF9999.
Effects and motion: Breathing animations on decorative cells, fluid morphing, cells growing in on load, soft bioluminescent glow.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --chlorophyll: #00FF41;
  --cyan: #00FFFF;
  --deep: #001E3C;
  --deep-2: #0A2540;
  --blush: #FF9999; /* warm accent: icon glows and badges */
  --text-muted: rgb(255 255 255 / 0.7);
}

body {
  background: linear-gradient(180deg, var(--deep) 0%, var(--deep-2) 100%);
  color: #FFFFFF;
  font-weight: 300;
}

.card {
  padding: 1.5rem;
  border: 1px solid rgb(0 255 65 / 0.2);
  border-radius: 1.5rem;
  background: rgb(0 255 65 / 0.05);
}

/* Text stays still; only decorative cells and icons breathe */
.card h3 {
  color: #FFFFFF;
}

.icon {
  width: 3rem;
  aspect-ratio: 1;
  border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
  background: radial-gradient(circle at 35% 35%, var(--blush), rgb(255 153 153 / 0.35) 70%);
  box-shadow: 0 0 20px rgb(255 153 153 / 0.45);
  animation: breathe 4s ease-in-out infinite;
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  background: rgb(255 153 153 / 0.15);
  color: var(--blush);
}

.card p {
  color: var(--text-muted);
}

/* Cell-like blob that slowly morphs its outline */
.cell {
  width: 10rem;
  aspect-ratio: 1;
  border: 2px solid rgb(0 255 65 / 0.5);
  background: radial-gradient(circle, rgb(0 255 65 / 0.3) 0%, transparent 70%);
  animation: grow 1.2s ease-out backwards, breathe 4s ease-in-out 1.2s infinite, morph 12s ease-in-out infinite;
}

.button {
  padding: 1rem 2rem;
  border: 1px solid rgb(0 255 65 / 0.5);
  border-radius: 9999px;
  background: linear-gradient(135deg, rgb(0 255 65 / 0.3), rgb(0 255 255 / 0.3));
  color: #FFFFFF;
  font-weight: 500;
}

.button:hover {
  box-shadow: 0 0 24px rgb(0 255 65 / 0.35);
}

.button:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 4px;
}

@keyframes breathe {
  50% {
    transform: scale(1.05);
  }
}

/* Growth: cells bud from small to full size on load */
@keyframes grow {
  from {
    opacity: 0;
    transform: scale(0.3);
  }
}

@keyframes morph {
  0%,
  100% {
    border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
  }
  50% {
    border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .icon,
  .cell {
    animation: none;
  }
}
```

Works best for: Sustainability tech, Biotech, Advanced health, Meditation, Generative art.
Avoid it for: Standard SaaS, Data grids, Strict corporate, Accounting. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Nature Distilled

- slug: `nature-distilled`
- source: https://www.uistyleguide.com/style/nature-distilled
- category: Nature & Organic

````text
Apply the Nature Distilled style to this interface.

What it is: Distills nature into its essence with earthy colors, organic materials, and handmade warmth.
Look and feel: Muted earthy, Skin tones, Wood, Soil, Sand, Terracotta, Warmth, Handmade.
Colors: primary #C67B5C, #D4C4A8, #B5651D, #F5F0E1; secondary #8B4513, #6B7B3C, #9C8B7A.
Effects and motion: Natural easing (ease-out), paper texture overlays, fine grain effects.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
/* Text uses --bark and --bark-soft only; the other colours are fills, borders and dividers */
:root {
  --terracotta: #C67B5C; /* decorative fills, never text or white-text buttons */
  --sand: #D4C4A8; /* image and thumbnail fills */
  --clay: #B5651D;
  --linen: #F5F0E1;
  --saddle: #8B4513; /* buttons with white text */
  --moss: #6B7B3C; /* focus rings and small accents */
  --stone: #9C8B7A; /* borders and dividers */
  --bark: #5D4E37;
  --bark-soft: #6E5A42;
  --oat: #E8DFD0;
}

body {
  position: relative;
  isolation: isolate;
  background: var(--linen);
  color: var(--bark-soft);
  font-family: system-ui, sans-serif;
  line-height: 1.6;
}

/* Fine paper grain, kept behind the content so it never lowers text contrast */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: 0.12;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

h1,
h2,
h3 {
  font-family: Georgia, "Times New Roman", serif;
  font-weight: 400;
  color: var(--bark);
}

.card {
  background: var(--oat);
  border-radius: 1.5rem 2rem 1.25rem 1.75rem;
  padding: 3rem;
}

.button {
  border: 0;
  border-radius: 9999px;
  padding: 1rem 2rem;
  background: var(--saddle);
  color: #FFFFFF;
  font-weight: 500;
  transition: background-color 0.3s ease-out, transform 0.3s ease-out;
}

.button:hover {
  background: #73390F;
  transform: translateY(-1px);
}

.button:focus-visible {
  outline: 2px solid var(--moss);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .button {
    transition: none;
  }
}
```

Works best for: Wellness brands, Sustainable products, Artisan goods, Organic food, Spa/beauty.
Avoid it for: Tech startups, Gaming, Nightlife, Corporate finance, High-energy brands. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

---

# Motion & Interactive

## Motion-Driven

- slug: `motion-driven`
- source: https://www.uistyleguide.com/style/motion-driven
- category: Motion & Interactive

````text
Apply the Motion-Driven style to this interface.

What it is: Design where animation is the primary mode of communication. Every interaction has purposeful motion that guides users through the experience.
Look and feel: Animation-heavy, Microinteractions, Smooth transitions, Scroll effects, Parallax.
Colors: primary #667EEA, #764BA2; secondary #EC4899, #EAB308, #06B6D4.
Effects and motion: Scroll animations, hover (300-400ms), entrance animations, parallax (3-5 layers).

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --md-indigo: #667EEA;
  --md-purple: #764BA2;
  --md-pink: #EC4899; /* shapes and fills; too dark for text on this background */
  --md-yellow: #EAB308;
  --md-cyan: #06B6D4;
  --md-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
}

body {
  background: linear-gradient(135deg, #312E81, #581C87, #9D174D);
  color: #FFFFFF;
}

/* Entrance: slide in from the left, staggered with animation-delay */
.reveal {
  animation: slide-in 800ms var(--md-ease-out) both;
}

@keyframes slide-in {
  from { opacity: 0; transform: translateX(-50px); }
  to { opacity: 1; transform: translateX(0); }
}

/* Parallax: 3-5 decorative layers behind the content, each drifting a different distance */
.layer {
  position: absolute;
  z-index: -1;
  pointer-events: none;
}

.layer--far { --drift: -10vh; }
.layer--mid { --drift: -25vh; }
.layer--near { --drift: -45vh; }

@supports (animation-timeline: scroll()) {
  .reveal {
    animation-timeline: view();
    animation-range: entry 0% cover 30%;
  }

  .layer {
    animation: drift linear both;
    animation-timeline: scroll(root);
  }
}

@keyframes drift {
  to { transform: translateY(var(--drift, -20vh)); }
}

.float {
  display: inline-block;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  50% { transform: translateY(-20px); }
}

/* Large headings only; inline-block + padding stop background-clip from cutting off descenders */
.gradient-text {
  display: inline-block;
  padding-bottom: 0.12em;
  background: linear-gradient(90deg, #F472B6, #FDE047);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.card {
  border-radius: 1rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  transition: transform 400ms var(--md-ease-out);
}

.card:hover {
  transform: scale(1.05);
}

a:focus-visible,
.button:focus-visible,
.card:focus-visible {
  outline: 3px solid var(--md-yellow);
  outline-offset: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .reveal,
  .float,
  .layer {
    animation: none;
    opacity: 1;
    transform: none;
  }

  .card {
    transition: none;
  }

  .card:hover {
    transform: none;
  }
}
```

Works best for: Portfolio sites, Storytelling platforms, Interactive experiences, Entertainment.
Avoid it for: Data dashboards, Critical accessibility, Low-power devices, Motion-sensitive. If this product falls into one of those, say so before restyling.

Keep the existing content and layout. Restyle it with the colors and CSS above, and add the interactions described.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Micro-interactions

- slug: `micro-interactions`
- source: https://www.uistyleguide.com/style/micro-interactions
- category: Motion & Interactive

````text
Apply the Micro-interactions style to this interface.

What it is: Focuses on small, delightful animations that provide feedback and guide users. Every tap, swipe, and hover has a response.
Look and feel: Small animations, Gesture-based, Tactile feedback, Subtle animations, Contextual.
Colors: primary #6366F1, #8B5CF6; secondary #22C55E, #EF4444, #F59E0B.
Effects and motion: Quick hover feedback (100-150ms), a pop when toggled on, loading spinners, success/error animations.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --mi-indigo: #6366F1;
  --mi-violet: #8B5CF6;
  --mi-success: #22C55E;
  --mi-error: #EF4444;
  --mi-warning: #F59E0B;
  --mi-indigo-strong: #4F46E5;
  --mi-error-strong: #DC2626;
  --mi-fast: 100ms;
  --mi-medium: 150ms;
}

.button {
  padding: 0.5rem 1.5rem;
  border: none;
  border-radius: 9999px;
  background: var(--mi-indigo-strong);
  color: #FFFFFF;
  font-weight: 600;
  transition: transform var(--mi-fast) ease, box-shadow var(--mi-fast) ease;
}

.button:hover { transform: scale(1.05); box-shadow: 0 10px 30px rgba(99, 102, 241, 0.3); }
.button:active { transform: scale(0.95); }

.button:focus-visible,
.icon-button:focus-visible { outline: 3px solid var(--mi-violet); outline-offset: 3px; }

.card {
  border-radius: 1rem;
  background: #FFFFFF;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: transform var(--mi-medium) ease, box-shadow var(--mi-medium) ease;
}

.card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1); }

/* Hover is a quick nudge; the bigger pop is reserved for toggling on (e.g. aria-pressed) */
.icon-button { transition: transform var(--mi-fast) ease; }
.icon-button:hover { transform: scale(1.1); }
.icon-button[aria-pressed="true"] { color: var(--mi-error-strong); animation: pop 300ms ease; }

/* Feedback after an action: add the class, remove it on animationend */
.is-success { animation: pop 300ms ease; color: #15803D; }
.is-error { animation: shake 300ms ease; color: var(--mi-error-strong); }

.spinner {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid rgba(99, 102, 241, 0.25);
  border-top-color: var(--mi-indigo);
  border-radius: 50%;
  animation: spin 700ms linear infinite;
}

@keyframes pop { 50% { transform: scale(1.3); } }
@keyframes shake { 25%, 75% { transform: translateX(-4px); } 50% { transform: translateX(4px); } }
@keyframes spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .card,
  .button,
  .icon-button { transition: none; }
  .card:hover,
  .icon-button:hover { transform: none; }
  .icon-button[aria-pressed="true"],
  .is-success,
  .is-error { animation: none; }
  .spinner { animation-duration: 2s; }
}
```

Works best for: Mobile apps, Touchscreen UIs, Productivity tools, Consumer apps.
Avoid it for: Critical performance, Formal or somber contexts, Motion-sensitive audiences. If this product falls into one of those, say so before restyling.

Keep the existing content and layout. Restyle it with the colors and CSS above, and add the interactions described.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Kinetic Typography

- slug: `kinetic-typography`
- source: https://www.uistyleguide.com/style/kinetic-typography
- category: Motion & Interactive

````text
Apply the Kinetic Typography style to this interface.

What it is: Uses animated typography as the primary visual element. Text moves, morphs, and transforms to tell stories.
Look and feel: Motion text, Animated type, Moving letters, Dynamic, Typing effect, Morphing.
Colors: primary #1A1A1A, #FFFFFF; secondary #FF6B6B, #4ECDC4.
Effects and motion: Looping text marquees, typewriter reveals on short single lines, gradient-filled text, hover slides and scroll-triggered letter animations (IntersectionObserver or GSAP ScrollTrigger).

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --kt-ink: #1A1A1A;
  --kt-paper: #FFFFFF;
  --kt-coral: #FF6B6B;
  --kt-teal: #4ECDC4;
}

body {
  background: var(--kt-ink);
  color: var(--kt-paper);
  font-family: "Inter", "Helvetica Neue", sans-serif;
}

/* Put the text in .marquee-track twice (aria-hidden="true" on the copy) so the -50% loop is seamless */
.marquee { overflow: hidden; white-space: nowrap; }

.marquee-track {
  display: inline-block;
  font-size: 15vw;
  font-weight: 900;
  animation: marquee 20s linear infinite;
}

/* Typewriter: short single-line strings only (about 40 characters max), never paragraphs.
   Set --chars to the string's character count. */
.typewriter {
  display: inline-block;
  width: calc(var(--chars, 20) * 1ch);
  overflow: hidden;
  white-space: nowrap;
  border-right: 0.08em solid var(--kt-coral);
  animation: typewriter calc(var(--chars, 20) * 80ms) steps(var(--chars, 20)) forwards;
}

.gradient-text {
  background: linear-gradient(90deg, var(--kt-coral), var(--kt-teal));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* Letters split into .char spans rise in when JS adds .is-visible (IntersectionObserver or GSAP).
   Set --i (letter index) on each; inside .gradient-text also set --w (word width) and --x (letter offset)
   so every letter shows its slice of one continuous gradient instead of repeating it. */
.char {
  display: inline-block;
  opacity: 0;
  transform: translateY(0.6em);
  transition: opacity 500ms ease, transform 500ms ease;
  transition-delay: calc(var(--i, 0) * 30ms);
}

.is-visible .char { opacity: 1; transform: none; }

.gradient-text .char {
  background-image: inherit;
  background-size: var(--w, 100%) 100%;
  background-position: calc(-1 * var(--x, 0px)) 0;
  -webkit-background-clip: text;
  background-clip: text;
}

.card { padding: 2rem; border: 1px solid #27272A; transition: border-color 150ms ease; }
.card h3 { transition: transform 300ms ease; }
.card:hover h3 { transform: translateX(1rem); }

/* Focus styles only for cards that are links or buttons; don't add tabindex to static cards */
.card:hover,
a.card:focus-visible { border-color: var(--kt-paper); }
a.card:focus-visible { outline: 2px solid var(--kt-teal); outline-offset: 4px; }

@keyframes marquee { to { transform: translateX(-50%); } }
@keyframes typewriter { from { width: 0; } }

@media (prefers-reduced-motion: reduce) {
  .marquee-track,
  .typewriter { animation: none; }
  .char { opacity: 1; transform: none; transition: none; }
  .card h3 { transition: none; }
}
```

Works best for: Hero sections, Marketing sites, Video platforms, Storytelling, Creative portfolios.
Avoid it for: Long-form content, Accessibility-critical, Data interfaces, Forms, Elderly users. If this product falls into one of those, say so before restyling.

Keep the existing content and layout. Restyle it with the colors and CSS above, and add the interactions described.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Parallax Storytelling

- slug: `parallax-storytelling`
- source: https://www.uistyleguide.com/style/parallax-storytelling
- category: Motion & Interactive

````text
Apply the Parallax Storytelling style to this interface.

What it is: Uses scroll as a narrative device with parallax layers and progressive content reveal. Creates cinematic web experiences.
Look and feel: Scroll-driven, Narrative, Layered scrolling, Immersive, Progressive disclosure.
Colors: primary #1A1A2E, #16213E, #0F3460; secondary #E94560, #F39C12.
Effects and motion: Background layers scrolling slower than the foreground, fixed or sticky layers, full-screen chapter sections, scroll-triggered content reveals.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --night: #1A1A2E;
  --navy: #16213E;
  --deep-blue: #0F3460;
  --rose: #E94560;
  --amber: #F39C12;
  --text: #FFFFFF;
  --text-muted: #9CA3AF; /* on the navy and chapter gradients only */
}

body {
  background: var(--night);
  color: var(--text);
}

/* Depth layers behind the chapters: the far backdrop drifts least, the mid layer more */
.backdrop,
.midground {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.backdrop {
  --drift: -10vh;
  display: grid;
  place-items: center;
  font-size: 30vw;
  font-weight: 900;
  color: rgb(255 255 255 / 0.05);
}

.midground {
  --drift: -30vh;
  background: radial-gradient(circle at 80% 30%, rgb(233 69 96 / 0.18), transparent 40%);
}

.chapter {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 0 2rem;
  background: linear-gradient(180deg, transparent, rgb(233 69 96 / 0.2));
}

.chapter + .chapter {
  background: linear-gradient(180deg, rgb(233 69 96 / 0.2), rgb(15 52 96 / 0.5));
}

.chapter-number {
  font-size: 8rem;
  font-weight: 900;
  line-height: 1;
  color: var(--rose);
}

/* Gradient title: inline-block + padding keep descenders from being clipped */
.title {
  display: inline-block;
  padding-bottom: 0.12em;
  line-height: 1.1;
  background: linear-gradient(90deg, var(--rose), var(--amber));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.chapter p {
  max-width: 36rem;
  font-size: 1.125rem;
  color: var(--text-muted);
}

/* Dark text: white fails AA on the amber end of the gradient */
.button {
  padding: 1.25rem 3rem;
  border: 0;
  border-radius: 9999px;
  background: linear-gradient(90deg, var(--rose), var(--amber));
  color: var(--night);
  font-size: 1.25rem;
  font-weight: 700;
}

.button:focus-visible {
  outline: 3px solid var(--text);
  outline-offset: 4px;
}

/* Reveals start dimmed, never invisible, so content still reads in static captures */
@keyframes reveal {
  from { opacity: 0.4; transform: translateY(4rem); }
}

@keyframes drift {
  to { transform: translateY(var(--drift)); }
}

@supports (animation-timeline: view()) {
  .backdrop,
  .midground {
    animation: drift linear both;
    animation-timeline: scroll();
  }

  .reveal {
    animation: reveal linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 60%;
  }
}

@media print, (prefers-reduced-motion: reduce) {
  .backdrop,
  .midground,
  .reveal {
    animation: none;
  }
}
```

Works best for: Brand storytelling, Product launches, Case studies, Portfolios, Marketing campaigns.
Avoid it for: E-commerce, Dashboards, Mobile-first, SEO-critical, Motion-sensitive audiences. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Tactile Digital / Deformable UI

- slug: `tactile-digital-deformable-ui`
- source: https://www.uistyleguide.com/style/tactile-digital-deformable-ui
- category: Motion & Interactive

````text
Apply the Tactile Digital / Deformable UI style to this interface.

What it is: Creates tactile, touchable interfaces with squishy buttons, bounce physics, and material-like responses.
Look and feel: Jelly buttons, Clay, Squishy, Deformable, Bouncy, Physical.
Colors: primary #FF6B6B, #FFE66D, #87CEEB; secondary #4ECDC4, #FF9ECD.
Effects and motion: Press deformation (scale + squish), bounce-back (cubic-bezier), material response.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --coral: #FF6B6B;
  --sunshine: #FFE66D;
  --sky: #87CEEB;
  --teal: #4ECDC4;
  --bubblegum: #FF9ECD;
  --ink: #1F2937;
  --muted: #4B5563;
  --spring: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

body {
  background: linear-gradient(180deg, #E8F4F8 0%, #FFF5F5 100%);
  color: var(--ink);
  font-family: system-ui, sans-serif;
}

.card {
  background: #FFFFFF;
  border-radius: 1.5rem;
  padding: 1.5rem;
  /* Inset bottom shadow gives the soft, pressable "clay" thickness */
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1), inset 0 -4px 0 rgba(0, 0, 0, 0.05);
  transition: transform 0.15s var(--spring);
}

.card:active {
  transform: scale(0.97);
}

.button {
  border: 0;
  border-radius: 9999px;
  padding: 0.75rem 1.5rem;
  background: #FFFFFF;
  color: #C81E1E;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3), inset 0 -3px 0 rgba(0, 0, 0, 0.06);
  transition: transform 0.15s var(--spring);
}

.button:hover {
  animation: squish-bounce 0.5s var(--spring);
}

.button:active {
  transform: scale(0.95);
}

.button:focus-visible {
  outline: 3px solid var(--ink);
  outline-offset: 3px;
}

/* Jelly: glossy top sheen and a soft radial highlight over the candy gradient */
.button--primary {
  background:
    radial-gradient(ellipse 60% 45% at 35% 20%, rgba(255, 255, 255, 0.65), transparent 70%),
    linear-gradient(135deg, var(--coral), var(--sunshine));
  color: var(--ink);
  box-shadow: 0 6px 16px rgba(255, 107, 107, 0.4), inset 0 6px 8px rgba(255, 255, 255, 0.6), inset 0 -4px 0 rgba(0, 0, 0, 0.08);
}

@keyframes squish-bounce {
  0%, 100% { transform: scale(1, 1); }
  30% { transform: scale(1.1, 0.9); }
  60% { transform: scale(0.95, 1.05); }
}

@media (prefers-reduced-motion: reduce) {
  .button:hover {
    animation: none;
  }
}
```

Works best for: Modern mobile apps, Playful brands, Entertainment, Gaming UI, Consumer products.
Avoid it for: Enterprise software, Data dashboards, Accessibility-critical, Professional tools. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Interactive Cursor Design

- slug: `interactive-cursor-design`
- source: https://www.uistyleguide.com/style/interactive-cursor-design
- category: Motion & Interactive

````text
Apply the Interactive Cursor Design style to this interface.

What it is: Makes the cursor a primary interaction element with morphing, trails, and magnetic effects.
Look and feel: Custom cursor, Cursor as tool, Hover effects, Pointer transformation, Magnetic cursor.
Colors: primary #000000, #FFFFFF; secondary #EC4899, #111827.
Effects and motion: Cursor scale on hover, magnetic pull to elements, cursor morphing, trail effects.

How to build it:
- Hide the native pointer with cursor: none only inside @media (hover: hover) and (pointer: fine)
- Render a position: fixed cursor moved with requestAnimationFrame and translate3d; stop the loop once it catches up with the pointer
- Give the cursor mix-blend-mode: difference so it inverts cleanly over light and dark content
- Morph the cursor over real links and buttons only, via attributes like data-cursor="view"; never over static cards or text
- Pull hovered buttons toward the pointer by about 25% of the offset, easing back on pointerleave
- Disable trails and magnetic motion under prefers-reduced-motion and keep native focus outlines for keyboard users

Works best for: Creative portfolios, Interactive experiences, Agency sites, Product showcases.
Avoid it for: Mobile-first (no cursor), Accessibility-critical, Data-heavy dashboards, Forms. If this product falls into one of those, say so before restyling.

Keep the existing content and layout. Restyle it with the colors above, and add the interactions described.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

---

# Futuristic & Tech

## Zero Interface

- slug: `zero-interface`
- source: https://www.uistyleguide.com/style/zero-interface
- category: Futuristic & Tech

````text
Apply the Zero Interface style to this interface.

What it is: The interface disappears, leaving only content and context-aware interactions. Uses AI, voice, and gestures to anticipate user needs.
Look and feel: Minimal visible UI, Voice-first, Gesture-based, AI-driven, Predictive.
Colors: primary #FAFAFA, #F0F0F0, #F5F1E8; secondary #3B82F6, #9333EA.
Effects and motion: Voice recognition UI, gesture detection, AI predictions, progressive disclosure.

How to build it:
- Keep every existing control, but tuck secondary ones (mode toolbars, nav) behind a disclosure button or reveal them on focus
- Add voice input with the Web Speech API SpeechRecognition, and always keep a typed input fallback
- Show listening and thinking states with an animated orb or waveform and aria-live text; start idle until recognition actually runs
- Offer two or three suggested commands as chips so users know what they can say
- Reveal query, answer and suggestions progressively, keeping one centered prompt or result in focus at a time
- Pre-fill next actions from real context or the existing chips, labelled neutrally ("Suggested"); never claim user history, and allow undo

Works best for: Voice assistants, AI platforms, Smart home, Contextual computing, Ambient.
Avoid it for: Complex workflows, Data-entry heavy, Legacy support, Explicit control. If this product falls into one of those, say so before restyling.

Keep the existing content and layout. Restyle it with the colors above, and add the interactions described.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## AI-Native UI

- slug: `ai-native-ui`
- source: https://www.uistyleguide.com/style/ai-native-ui
- category: Futuristic & Tech

````text
Apply the AI-Native UI style to this interface.

What it is: Designed specifically for AI interactions. Features conversational layouts, streaming text, and minimal interface chrome.
Look and feel: Chatbot, Conversational, Voice, Assistant, Minimal chrome, Streaming text.
Colors: primary #6366F1, #10B981, #F5F5F5; secondary #8B5CF6, #3B82F6.
Effects and motion: Typing indicators (3-dot pulse), streaming text animations, pulse animations, context cards.

How to build it:
- Center a single conversation column around 48rem wide with the message composer docked at the bottom
- Render the thread in an element with role="log" and aria-live="polite"; assistant replies in white rounded cards
- Stream replies token by token via fetch ReadableStream or Server-Sent Events; with no backend, reveal the existing reply word by word on load
- Show a three-dot typing indicator (gray dots pulsing opacity 0.4 to 1, staggered) only while a reply is pending; hide it once rendered
- Put reply actions such as Copy, Regenerate and Make shorter as small pill buttons under each answer
- Reserve the indigo-to-violet gradient for the assistant avatar and send button; keep other chrome light gray

Works best for: AI products, Chatbots, Voice assistants, Copilots, AI-powered tools.
Avoid it for: Traditional forms, Data-heavy dashboards, Print-first content. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## HUD / Sci-Fi FUI

- slug: `hud-scifi-fui`
- source: https://www.uistyleguide.com/style/hud-scifi-fui
- category: Futuristic & Tech

````text
Apply the HUD / Sci-Fi FUI style to this interface.

What it is: Inspired by movie FUI (Fantasy User Interfaces). Features thin lines, neon colors, and technical data visualization.
Look and feel: Futuristic, Technical, Wireframe, Neon, Transparent, Iron Man, Sci-fi.
Colors: primary #00FFFF, #0080FF, #FF0000; secondary #0A0F1C, #00FF00.
Effects and motion: Glow effects, scanning animations, ticker text, blinking markers, fine line drawing.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --cyan: #00FFFF;
  --blue: #0080FF;
  --alert: #FF0000;
  --bg: #0A0F1C;
  --ok: #00FF00;
  --line: rgb(0 255 255 / 0.3);
}

body {
  background-color: var(--bg);
  background-image:
    linear-gradient(rgb(0 255 255 / 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgb(0 255 255 / 0.04) 1px, transparent 1px);
  background-size: 50px 50px;
  color: var(--cyan);
  font-family: "JetBrains Mono", ui-monospace, monospace;
}

.panel {
  position: relative;
  padding: 1.5rem;
  border: 1px solid var(--line);
  background: rgb(0 255 255 / 0.05);
}

/* One pair of corner brackets per panel; don't stack extra corner decorations */
.panel::before,
.panel::after {
  content: "";
  position: absolute;
  width: 1rem;
  height: 1rem;
  border: 0 solid var(--cyan);
}

.panel::before { top: 0.5rem; left: 0.5rem; border-width: 1px 0 0 1px; }
.panel::after { right: 0.5rem; bottom: 0.5rem; border-width: 0 1px 1px 0; }

.label {
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(0 255 255 / 0.7);
}

.readout {
  font-size: 1.875rem;
  text-shadow: 0 0 10px rgb(0 255 255 / 0.5);
}

/* Blink only decorative markers like this dot, never readable text */
.status-dot {
  display: inline-block;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: var(--cyan);
  box-shadow: 0 0 10px var(--cyan);
  animation: blink 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.button {
  padding: 0.75rem 2rem;
  border: 1px solid rgb(0 255 255 / 0.5);
  background: rgb(0 255 255 / 0.1);
  color: var(--cyan);
  font-family: inherit;
  text-transform: uppercase;
}

.button:hover,
.button--primary {
  background: var(--cyan);
  color: var(--bg);
  box-shadow: 0 0 16px rgb(0 255 255 / 0.6);
}

.button--danger { border-color: var(--alert); color: #FF4D4D; }
.button:focus-visible { outline: 2px solid var(--cyan); outline-offset: 4px; }

/* Ticker: one copy of the text scrolls in from the right edge, no duplicates needed */
.ticker { overflow: hidden; white-space: nowrap; border-block: 1px solid var(--line); }
.ticker-track { display: inline-block; padding-left: 100%; animation: ticker 30s linear infinite; }

/* Fine line drawing: give each SVG path pathLength="1" */
.line-draw path {
  fill: none;
  stroke: var(--cyan);
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: draw 2s ease-out forwards;
}

@keyframes ticker { to { transform: translateX(-100%); } }
@keyframes draw { to { stroke-dashoffset: 0; } }
@keyframes blink { 50% { opacity: 0.4; } }

@media (prefers-reduced-motion: reduce) {
  .status-dot,
  .ticker-track,
  .line-draw path { animation: none; }
  .ticker-track { padding-left: 0; }
  .line-draw path { stroke-dashoffset: 0; }
}
```

Works best for: Sci-fi games, Space tech, Cybersecurity, Movie props, Immersive dashboards.
Avoid it for: Standard corporate, Reading heavy content, Accessible public services. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Spatial UI (VisionOS)

- slug: `spatial-ui-visionos`
- source: https://www.uistyleguide.com/style/spatial-ui-visionos
- category: Futuristic & Tech

````text
Apply the Spatial UI (VisionOS) style to this interface.

What it is: Designed for spatial computing with floating glass panels, depth effects, and gaze-based interactions.
Look and feel: Glass, Depth, Immersion, Spatial, Translucent, Gesture, Apple, Vision Pro.
Colors: primary rgba(255,255,255,0.2), #FFFFFF; secondary #007AFF, #30D158, #FF9F0A.
Effects and motion: Pointer-tracked lighting highlight, gaze-hover lift and subtle scale on small cards, brighter glass edge on focus, layered depth shadows.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --glass: rgba(255,255,255,0.2);
  --white: #FFFFFF;
  --blue: #007AFF;
  --green: #30D158;
  --orange: #FF9F0A;
  --text-muted: rgb(255 255 255 / 0.8);
}

/* Deep backdrop with blurred colour orbs for the glass to refract */
body {
  min-height: 100vh;
  background:
    radial-gradient(circle at 25% 25%, rgb(168 85 247 / 0.25), transparent 35%),
    radial-gradient(circle at 75% 75%, rgb(59 130 246 / 0.25), transparent 35%),
    linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%);
  color: var(--white);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif;
}

h1 { font-size: clamp(2rem, 5vw, 3rem); }

/* Lighting response: set --mx/--my (px) from pointermove on the panel; the highlight follows the pointer */
.panel {
  position: relative;
  padding: 1.5rem;
  border: 1px solid var(--glass);
  border-radius: 1.5rem;
  background:
    radial-gradient(18rem circle at var(--mx, 30%) var(--my, 0%), rgb(255 255 255 / 0.12), transparent 70%),
    rgb(255 255 255 / 0.1);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  backdrop-filter: blur(40px) saturate(180%);
  box-shadow: 0 24px 48px rgb(0 0 0 / 0.25);
  transition: transform 300ms ease, box-shadow 300ms ease, border-color 200ms ease;
}

/* Large panels: brighten the edge instead of scaling */
.panel:focus-within { border-color: rgb(255 255 255 / 0.5); }

/* Gaze-hover depth: only small cards lift and scale */
.card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 32px 64px rgb(0 0 0 / 0.35);
}

.panel p { color: var(--text-muted); }

.button {
  padding: 1rem 2rem;
  border: 1px solid rgb(255 255 255 / 0.3);
  border-radius: 9999px;
  background: var(--glass);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  color: var(--white);
  font-weight: 500;
  transition: background 200ms ease, transform 200ms ease;
}

.button:hover {
  background: rgb(255 255 255 / 0.3);
  transform: scale(1.04);
}

.button:focus-visible {
  outline: 3px solid var(--white);
  outline-offset: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .panel,
  .button { transition: none; }

  .card:hover,
  .button:hover { transform: none; }
}
```

Works best for: Spatial computing apps, VR/AR interfaces, Immersive media, Futuristic dashboards.
Avoid it for: Text-heavy documents, High-contrast requirements, Low-powered devices. If this product falls into one of those, say so before restyling.

Change the visual design only: keep the existing layout, content and behaviour.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Voice-First Multimodal

- slug: `voice-first-multimodal`
- source: https://www.uistyleguide.com/style/voice-first-multimodal
- category: Futuristic & Tech

````text
Apply the Voice-First Multimodal style to this interface.

What it is: Designed for voice-first interactions with visual feedback for speaking, listening, and processing states.
Look and feel: Voice UI, Multimodal, Audio feedback, Conversational, Hands-free, Ambient.
Colors: primary #FAFAFA, #6366F1, #9333EA; secondary #22C55E, #3B82F6.
Effects and motion: Voice waveform visualization, listening pulse, processing spinner, speak animation.

How to build it:
- Capture speech with SpeechRecognition or a cloud speech-to-text service; always keep a text input
- Make the central orb or waveform the main mic button (96px+), carrying idle, listening, processing and speaking states; any footer mic mirrors it
- Start idle and announce each state in aria-live status text; show listening only while recognition is actually running
- Fill the mic with the indigo-to-purple gradient in every state; use green only for the listening ring and blue for the processing spinner
- Draw the live waveform from a Web Audio AnalyserNode on a canvas, or animate CSS bars as a fallback
- Speak replies with speechSynthesis, mirror them as transcript bubbles, and give every voice action a tap equivalent; static ring under reduced motion

Works best for: Voice assistants, Accessibility apps, Hands-free tools, Smart home, Automotive UI.
Avoid it for: Visual-heavy content, Data entry, Complex forms, Noisy environments. If this product falls into one of those, say so before restyling.

Keep the existing content and layout. Restyle it with the colors above, and add the interactions described.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

---

# Landing Page Styles

## Hero-Centric Design

- slug: `hero-centric-design`
- source: https://www.uistyleguide.com/style/hero-centric-design
- category: Landing Page Styles

````text
Apply the Hero-Centric Design style to this interface.

What it is: Puts the hero section front and center with dramatic visuals and minimal distractions. Perfect for products that sell themselves visually.
Look and feel: Hero section, Bold imagery, Full-screen, Visual impact, Product showcase, Brand statement.
Colors: primary #1A1A1A, #FFFFFF, #FF6B35; secondary #F5F5F5, #333333.
Effects and motion: Full-viewport hero, parallax backgrounds, scroll-triggered reveals, dramatic typography.

How to build it:
- Open with a full-viewport <section> using min-height: 100svh, centered content and one product visual
- Stack a small uppercase eyebrow, an oversized <h1> headline with clamp(), one short sentence and the existing CTAs
- Make any product image or video the focal point with object-fit: cover; without one, scale up the existing visual. Add a subtle radial glow
- If the page has a nav, keep it minimal and transparent over the hero; don't add one. Add a scroll cue at the bottom
- If the page has features, follow the hero with a short three-column feature row, then repeat the primary CTA
- Reveal sections on scroll with IntersectionObserver, hiding them only once JS runs; skip parallax and reveals under prefers-reduced-motion

Works best for: Products with strong visual identity, Brand launches, Fashion, Automotive, Luxury goods.
Avoid it for: Complex products, B2B software, Information-heavy sites, Multi-product catalogs. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Conversion-Optimized

- slug: `conversion-optimized`
- source: https://www.uistyleguide.com/style/conversion-optimized
- category: Landing Page Styles

````text
Apply the Conversion-Optimized style to this interface.

What it is: Every element designed to drive conversions. Strategic CTA placement, urgency triggers, and social proof elements work together.
Look and feel: CTA focused, Lead capture, Urgency, Social proof, Benefits-driven, Trust signals.
Colors: primary #2563EB, #FFFFFF, #10B981; secondary #F59E0B, #EF4444, #F3F4F6.
Effects and motion: Sticky mobile CTA bar, inline form validation states, subtle CTA hover and press feedback, step progress on multi-step forms.

How to build it:
- Reorder existing sections into: hero with offer, inline signup form, logo strip, benefits, testimonials, FAQ, final CTA; skip sections the page lacks
- Turn existing trust claims such as free trial or no credit card into chips directly beside the primary form
- Use one primary CTA label and filled color everywhere, final CTA included; secondary actions use outline buttons
- Repeat the primary CTA after the benefits and at the end only; add a position: sticky CTA bar on mobile
- Validate form fields inline with aria-invalid and aria-describedby error messages
- Keep existing claims and counts as written and add no countdowns or urgency; raise doubts in your reply, not on the page

Works best for: Lead generation, Sales pages, SaaS trials, Course launches, Webinar signups.
Avoid it for: Brand awareness, Content marketing, Portfolio sites, Informational pages. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Feature-Rich Showcase

- slug: `feature-rich-showcase`
- source: https://www.uistyleguide.com/style/feature-rich-showcase
- category: Landing Page Styles

````text
Apply the Feature-Rich Showcase style to this interface.

What it is: Comprehensive feature presentation for complex products. Organized sections help users understand capabilities at a glance.
Look and feel: Feature grid, Comparison tables, Interactive demos, Pricing tiers, Documentation links.
Colors: primary #4F46E5, #FFFFFF, #1F2937; secondary #10B981, #F59E0B, #E5E7EB.
Effects and motion: Tabbed content, accordion sections, feature card hover states, pricing toggle animations.

How to build it:
- Follow the hero with tabbed features (role="tablist", role="tab", aria-selected); if features lack categories, keep the full grid visible by default
- Lay features out in a three-column CSS grid of bordered cards with an icon, title and one-line description
- If the page has pricing, show three tiers with a highlighted middle plan; add a monthly/annual toggle only when annual prices exist
- If the page has comparison data, use a <table> with a sticky header row and check/cross cells with text labels
- If the page has FAQs, use <details> accordions; link features to docs only where documentation URLs exist

Works best for: SaaS products, Complex software, Enterprise tools, API platforms, Developer tools.
Avoid it for: Simple products, Emotional purchases, Lifestyle brands, Quick conversions. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Minimal & Direct

- slug: `minimal-direct`
- source: https://www.uistyleguide.com/style/minimal-direct
- category: Landing Page Styles

````text
Apply the Minimal & Direct style to this interface.

What it is: Strips away everything unnecessary. One message, one action, maximum clarity. Perfect for products that speak for themselves.
Look and feel: Single focus, Clean, Fast loading, One CTA, Whitespace, Typography-led.
Colors: primary #000000, #FFFFFF; secondary #6B7280, #3B82F6.
Effects and motion: Subtle hover states, smooth scroll, minimal transitions, focus on readability.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --color-ink: #000000;
  --color-paper: #FFFFFF;
  --color-muted: #6B7280;
  --color-link: #3B82F6;
  --color-border: #E5E7EB;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: var(--color-paper);
  color: var(--color-ink);
  font-family: Inter, system-ui, sans-serif;
  line-height: 1.75;
}

.hero {
  max-width: 640px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}

/* Make the headline a real <h1> */
.hero h1 {
  font-size: clamp(2.5rem, 6vw, 3.75rem);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.025em;
  margin: 0 0 1.5rem;
}

.hero p {
  font-size: 1.25rem;
  color: var(--color-muted);
  margin: 0 0 3rem;
}

.input {
  padding: 1rem 1.5rem;
  font-size: 1.125rem;
  border: 2px solid var(--color-border);
  border-radius: 0.75rem;
}

.input:focus-visible {
  outline: 2px solid var(--color-link);
  outline-offset: 2px;
  border-color: var(--color-ink);
}

.button {
  padding: 1rem 2rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-paper);
  background: var(--color-ink);
  border: 0;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: background-color 150ms ease;
}

.button:hover {
  background: #1F2937;
}

.button:focus-visible {
  outline: 2px solid var(--color-link);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  .button {
    transition: none;
  }
}
```

Works best for: Simple products, Apps, Waitlists, Coming soon pages, Single-feature tools.
Avoid it for: Complex products, Multiple offerings, E-commerce, Information-heavy sites. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Social Proof-Focused

- slug: `social-proof-focused`
- source: https://www.uistyleguide.com/style/social-proof-focused
- category: Landing Page Styles

````text
Apply the Social Proof-Focused style to this interface.

What it is: Lets your customers do the selling. Testimonials, case studies, and trust signals take center stage to build credibility.
Look and feel: Testimonials, Reviews, Case studies, Logos, User counts, Trust building.
Colors: primary #FFFFFF, #1F2937, #2563EB; secondary #FCD34D, #10B981, #F9FAFB.
Effects and motion: Testimonial carousels, star rating animations, logo marquees, counter animations.

How to build it:
- Lead the hero with the strongest testimonial: pull quote, star rating, name and role, then one CTA
- Follow with any customer logos as a strip, then a row of headline stats with labels
- Show testimonials in a two-column card grid; mark up each with <figure>, <blockquote> and <figcaption>
- If the page has ratings, render stars as SVG with an aria-label such as "5 out of 5 stars"
- Animate logo marquees and stat counters only when prefers-reduced-motion is not set
- If the page has case studies, link them from testimonial cards; repeat the CTA after the testimonial grid

Works best for: Services, B2C products, Consulting, Agencies, SaaS with strong user base.
Avoid it for: New products without users, Technical tools, Privacy-sensitive services where clients expect discretion, Niche markets. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Interactive Product Demo

- slug: `interactive-product-demo`
- source: https://www.uistyleguide.com/style/interactive-product-demo
- category: Landing Page Styles

````text
Apply the Interactive Product Demo style to this interface.

What it is: Show, don't tell. Embeds working demos directly in the landing page so visitors can experience the product firsthand.
Look and feel: Live demo, Interactive preview, Try before buy, Sandbox, Playground, Hands-on.
Colors: primary #6366F1, #FFFFFF, #1E1E1E; secondary #22C55E, #F59E0B, #F3F4F6.
Effects and motion: Embedded demos, interactive tooltips, guided tours, code playgrounds, live previews.

How to build it:
- Place a working demo directly below a short headline; no signup needed to try it
- Embed the demo in a sandboxed <iframe> or a real component instance, never a static screenshot
- For code tools, set an editor beside a live preview: CodeMirror or Monaco, or a textarea over a highlighted <pre> keeping existing token colors
- Group the demo's existing actions such as run, reset and share in a clear toolbar, and keep a meaningful example preloaded
- If the page has onboarding copy, add a guided tour started from a visible button, never auto-opening; Escape dismisses it
- Put the existing signup CTA directly after the demo

Works best for: Software products, Developer tools, Design tools, No-code platforms, APIs.
Avoid it for: Physical products, Services, Simple apps, Privacy-sensitive tools. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Trust & Authority

- slug: `trust-authority`
- source: https://www.uistyleguide.com/style/trust-authority
- category: Landing Page Styles

````text
Apply the Trust & Authority style to this interface.

What it is: Establishes credibility through professional design and trust signals. Perfect for industries where reputation matters.
Look and feel: Professional, Credentials, Certifications, Awards, Media mentions, Expert positioning.
Colors: primary #1E3A5F, #FFFFFF, #C9A227; secondary #2563EB, #059669, #F3F4F6.
Effects and motion: Subtle animations, professional hover states, credential badges, award showcases.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --color-navy: #1E3A5F;
  --color-white: #FFFFFF;
  --color-gold: #C9A227;      /* text only on navy; borders and fills elsewhere */
  --color-gold-text: #7F6410; /* gold text on white or grey */
  --color-link: #2563EB;      /* links only, never plain text */
  --color-verified: #059669;  /* icons and borders; text uses #047857 */
  --color-muted-bg: #F3F4F6;
  --color-text: #1F2937;
  --color-border: #E5E7EB;
}

body {
  color: var(--color-text);
  font-family: Inter, system-ui, sans-serif;
  line-height: 1.6;
}

h1,
h2,
.stat-value {
  font-family: Georgia, "Times New Roman", serif;
  font-weight: 400;
  color: var(--color-navy);
}

.hero {
  background: var(--color-navy);
  color: var(--color-white);
  padding: 6rem 2rem;
}

.hero h1 {
  color: var(--color-white);
  font-size: clamp(2.25rem, 4vw, 3rem);
}

.eyebrow {
  color: var(--color-gold-text);
  font-weight: 600;
}

.hero .eyebrow {
  color: var(--color-gold);
}

a {
  color: var(--color-link);
}

/* Roles, titles and captions: muted, never link-coloured */
.meta {
  color: #4B5563;
}

.button {
  padding: 1rem 2rem;
  background: var(--color-gold);
  color: var(--color-navy);
  font-weight: 600;
  border: 0;
  border-radius: 0;
  transition: filter 150ms ease;
}

.button:hover {
  filter: brightness(1.1);
}

.button:focus-visible {
  outline: 2px solid transparent;
  box-shadow: 0 0 0 2px var(--color-white), 0 0 0 4px var(--color-link);
}

.card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  padding: 1.5rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--color-muted-bg);
  border-left: 3px solid var(--color-gold);
  border-radius: 0;
}

@media (prefers-reduced-motion: reduce) {
  .button { transition: none; }
}
```

Works best for: B2B services, Enterprise software, Consulting firms, Legal/financial services, Healthcare.
Avoid it for: Casual products, Youth brands, Entertainment, Startup MVPs. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Storytelling-Driven

- slug: `storytelling-driven`
- source: https://www.uistyleguide.com/style/storytelling-driven
- category: Landing Page Styles

````text
Apply the Storytelling-Driven style to this interface.

What it is: Takes visitors on a journey. Uses narrative structure and emotional design to connect with audiences on a deeper level.
Look and feel: Narrative flow, Scroll story, Emotional journey, Brand story, Mission-driven, Impact focus.
Colors: primary #0F172A, #FFFFFF, #059669; secondary #064E3B, #34D399, #F5F5F5.
Effects and motion: Scroll-triggered reveals, parallax storytelling, chapter navigation, background video where the page has one.

How to build it:
- Split the page into full-height chapter <section> elements, each with a small uppercase "Chapter N" eyebrow and a large clamp() headline
- Order chapters as problem, solution with proof numbers, a personal story, then a closing call to action
- Alternate dark #0F172A and light #F5F5F5 chapters; eyebrows #34D399 on dark, #064E3B on light, #059669 for rules and fills
- Use scroll-snap-type: y proximity and an optional sticky chapter nav for orientation
- Reveal text with IntersectionObserver or animation-timeline: view(); keep it visible without JS and under prefers-reduced-motion
- Keep parallax layers absolutely positioned behind content; if the page has background video, give it a poster, muted autoplay and pause control

Works best for: Brands with stories, Nonprofits, Mission-driven companies, Agencies, Personal brands.
Avoid it for: Quick conversions, E-commerce, Technical products, Impatient audiences. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

---

# BI & Analytics

## Data-Dense Dashboard

- slug: `data-dense-dashboard`
- source: https://www.uistyleguide.com/style/data-dense-dashboard
- category: BI & Analytics

````text
Apply the Data-Dense Dashboard style to this interface.

What it is: Maximizes information density for power users who need to see everything at once. Every pixel serves a purpose.
Look and feel: Information density, Multi-panel, Compact tables, Small multiples, Data grids, Power user.
Colors: primary #1F2937, #FFFFFF, #3B82F6; secondary #10B981, #EF4444, #F59E0B, #E5E7EB.
Effects and motion: Compact spacing, inline sparklines where series data exists (otherwise show the label and current value, no empty chart frames), sortable data tables, collapsible panels, tooltip details.

Reference CSS (put these class names on the matching elements, or map them onto existing components and class names; avoid long structural selectors):
```css
:root {
  --color-text: #1F2937;
  --color-panel: #FFFFFF;
  --color-accent: #3B82F6;
  --color-up: #10B981;
  --color-down: #EF4444;
  --color-warn: #F59E0B;
  --color-border: #E5E7EB;
  --color-canvas: #F3F4F6;
  --color-muted: #6B7280;
}

body {
  background: var(--color-canvas);
  color: var(--color-text);
  font: 13px/1.4 Inter, system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  grid-auto-flow: dense;
  gap: 0.5rem;
  padding: 0.5rem;
}

.card {
  background: var(--color-panel);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  padding: 0.5rem;
}

.card-label { font-size: 0.75rem; color: var(--color-muted); }
.card-value { font-size: 1.125rem; font-weight: 700; }

/* Good / bad / warning values, darkened for text contrast */
.delta-up { color: #047857; }
.delta-down { color: #DC2626; }
.value-warn { color: #B45309; }

/* Every panel header: title left, toggle and meta right */
.panel-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.panel-header > :is(h2, h3) {
  order: -1;
  margin: 0 auto 0 0;
  font-size: 0.8125rem;
}

.table { width: 100%; border-collapse: collapse; }

.table th {
  background: #F9FAFB;
  color: var(--color-muted);
  font-size: 0.75rem;
  font-weight: 500;
}

.table th,
.table td {
  padding: 0.375rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  text-align: right;
}

.table th:first-child,
.table td:first-child {
  text-align: left;
}

.table tbody tr:hover {
  background: #F9FAFB;
}

.table tbody tr:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}
```

Works best for: Complex data analysis, Financial trading, Operations monitoring, Research tools, Power users.
Avoid it for: Executive summaries, Public dashboards, Mobile-first, Casual users. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Heatmap Dashboard

- slug: `heatmap-dashboard`
- source: https://www.uistyleguide.com/style/heatmap-dashboard
- category: BI & Analytics

````text
Apply the Heatmap Dashboard style to this interface.

What it is: Uses color intensity to reveal patterns in large datasets. Perfect for geographic, behavioral, or time-series data.
Look and feel: Color intensity, Geographic data, Behavior patterns, Activity maps, Density visualization, Gradient scales.
Colors: primary #1E293B, #FFFFFF, #440154, #3B528B, #21918C, #5EC962, #FDE725; secondary #22C55E, #F59E0B, #3B82F6, #8B5CF6.
Effects and motion: Color gradient legends, interactive hover states, zoom controls, time-based animation.

How to build it:
- Lead with a full-width day-by-hour matrix: a 24-column by 7-row CSS Grid, with hour labels placed on the same columns
- Color cells with the five-step viridis ramp from the palette and a Low-to-High legend beside the title; never encode with red versus green alone
- Keep cell values already in the UI; if none exist, show a neutral "No data" matrix instead of inventing sample values
- Show exact values in a tooltip on hover and keyboard focus, and outline the active cell
- If the page has regional data, pair a choropleth (the stack's map library, or an inline SVG tile map) with ranked region bars in the heat scale
- Put Today / Week / Month range toggles in the header; dark slate cards make the color scale stand out

Works best for: Geographic data, User behavior analysis, Website analytics, Resource allocation, Performance monitoring.
Avoid it for: Precise values needed, Small datasets, Colorblind-critical, Print-first. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Executive Dashboard

- slug: `executive-dashboard`
- source: https://www.uistyleguide.com/style/executive-dashboard
- category: BI & Analytics

````text
Apply the Executive Dashboard style to this interface.

What it is: Distills complex data into key metrics. Large numbers, clear trends, and minimal noise for busy executives.
Look and feel: KPI cards, High-level metrics, Clean layout, At-a-glance, Strategic view, Summary focused.
Colors: primary #FFFFFF, #1F2937, #2563EB; secondary #10B981, #EF4444, #F59E0B, #F3F4F6.
Effects and motion: Large KPI numbers, trend indicators, simple charts, drill-down on existing rows and cards, refresh animations.

How to build it:
- Open with four KPI cards: large bold value, label and one colored ▲/▼ change, replacing any existing arrow characters
- Keep it to roughly one screen: KPI row, a simple bar or line trend plus a donut for mix, one compact table
- Build charts and status colors from values already in the UI, such as existing bar heights and dot colors
- If chart or status values are missing, draw one neutral skeleton chart with a single "Data pending" note, not per-item labels
- Right-align table figures, abbreviate raw numbers with Intl.NumberFormat compact notation and color growth figures like the KPI deltas
- Mark status with green, amber or red dots plus a text label; put the period and one Export action in the header

Works best for: C-suite summaries, Board reports, High-level monitoring, Status dashboards, Weekly reviews.
Avoid it for: Detailed analysis, Technical users, Real-time monitoring, Complex workflows. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Real-Time Monitoring

- slug: `realtime-monitoring`
- source: https://www.uistyleguide.com/style/realtime-monitoring
- category: BI & Analytics

````text
Apply the Real-Time Monitoring style to this interface.

What it is: Built for operations centers with live-updating metrics, streaming charts, and instant alert visibility.
Look and feel: Live data, Streaming, Alerts, Status indicators, Time-series, Operations center.
Colors: primary #0F172A, #FFFFFF, #22C55E; secondary #EF4444, #F59E0B, #3B82F6, #8B5CF6.
Effects and motion: Live updating numbers, streaming charts, alert animations, status pulse, auto-refresh.

How to build it:
- Show a LIVE badge and the refresh interval in the header; update at that interval, with a marked stub where a WebSocket/SSE feed connects
- If there is an active incident, pin an alert banner above everything with an Investigate link
- Run a dense strip of 4–6 metric tiles; colour each status dot from thresholds in the content, or keep it neutral
- Render rolling time-series with uPlot or ECharts, or an inline SVG/canvas sparkline from existing values; append points without full re-renders
- If the page lists services, finish with a grid of cards showing a health badge and uptime
- Announce each new alert once via aria-live; under prefers-reduced-motion stop pulses and transitions but keep values updating in place

Works best for: DevOps monitoring, Server health, IoT dashboards, Trading floors, Security operations.
Avoid it for: Historical analysis, Report generation, Offline use, Mobile viewing. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Drill-Down Analytics

- slug: `drill-down-analytics`
- source: https://www.uistyleguide.com/style/drill-down-analytics
- category: BI & Analytics

````text
Apply the Drill-Down Analytics style to this interface.

What it is: Start with the big picture, drill into details. Perfect for analysts who need to explore data at multiple levels.
Look and feel: Hierarchical, Expandable, Detail on demand, Progressive disclosure, Nested views, Exploration.
Colors: primary #FFFFFF, #1F2937, #6366F1; secondary #10B981, #F59E0B, #E5E7EB, #C7D2FE.
Effects and motion: Expandable rows, breadcrumb navigation, zoom transitions, linked highlighting, filter animations.

How to build it:
- Open with a full-width top bar holding a breadcrumb trail (nav with an ordered list); every ancestor level is clickable
- Follow with a filter bar of select menus and a Reset filters link
- Show three summary cards for the current scope, adding context such as share of the parent level when the data provides it
- Make table rows drillable with a whole-row link, hover highlight and trailing chevron; right-align numeric columns with tabular-nums
- Keep the drill path in URL query params so each level is shareable and the back button works
- Reveal child levels inline with aria-expanded disclosure rows; without child data, show a short No breakdown available state, never placeholder figures

Works best for: Detailed data exploration, Hierarchical data, Root cause analysis, Audit trails, Research.
Avoid it for: Single-level KPI summaries with no breakdown, Flat data with no hierarchy, Mobile-first. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Comparative Analysis Dashboard

- slug: `comparative-analysis-dashboard`
- source: https://www.uistyleguide.com/style/comparative-analysis-dashboard
- category: BI & Analytics

````text
Apply the Comparative Analysis Dashboard style to this interface.

What it is: Designed for comparing two or more datasets side by side. Highlights differences and makes patterns obvious.
Look and feel: Side-by-side, Benchmarking, A/B comparison, Period over period, Variance analysis, Ranking.
Colors: primary #FFFFFF, #1E293B, #2563EB; secondary #10B981, #EF4444, #F59E0B, #E5E7EB.
Effects and motion: Split-view layouts, synchronized scrolling, difference highlighting, comparison sliders.

How to build it:
- Title the page with what is being compared; add a result badge such as Winner: Variant B when the data names one
- Lay variants out in equal side-by-side columns with identical metric order; ring-highlight the winner
- Give each variant one color and reuse it in column headers, legends and charts
- Add a difference section of horizontal bars scaled to the largest delta; green when better, red when worse, inverting for lower-is-better metrics
- Offer a side-by-side / overlay toggle with aria-pressed and a clear selected style; on small screens stack variants with sticky labels
- Show sample size and significance next to deltas when the data provides them

Works best for: A/B test results, Competitor analysis, Period comparisons, Benchmark reports, Performance reviews.
Avoid it for: Single metric focus, Time-series only, Real-time data, Simple dashboards. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Predictive Analytics

- slug: `predictive-analytics`
- source: https://www.uistyleguide.com/style/predictive-analytics
- category: BI & Analytics

````text
Apply the Predictive Analytics style to this interface.

What it is: Visualizes predictions and forecasts with confidence intervals. Shows what the data says about the future.
Look and feel: Forecasting, ML insights, Confidence intervals, Trend projection, Scenario modeling, What-if.
Colors: primary #1E1B4B, #FFFFFF, #8B5CF6; secondary #A78BFA, #22C55E, #F59E0B, #EC4899, #E5E7EB.
Effects and motion: Animated forecast lines, confidence bands, scenario toggles, prediction indicators.

How to build it:
- Open with forecast cards: projected value, a confidence badge and the low–high range beneath
- Chart history solid and the forecast dashed or translucent, split by a labelled today marker
- Shade the confidence band around the forecast line; without a chart library, draw both as inline SVG paths clipped to the plot area
- If the page has scenarios, show conservative / base / optimistic cards as a radio group and highlight the selected one
- If the model version and accuracy are on the page, show them in the header so users know where numbers come from
- Use a deep indigo background; violet #8B5CF6 for forecast fills and bands, #A78BFA for predicted values as text

Works best for: Sales forecasting, Demand planning, Risk assessment, Capacity planning, ML model outputs.
Avoid it for: Historical reporting, Exact measurements, Regulatory compliance, Simple tracking. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## User Behavior Analytics

- slug: `user-behavior-analytics`
- source: https://www.uistyleguide.com/style/user-behavior-analytics
- category: BI & Analytics

````text
Apply the User Behavior Analytics style to this interface.

What it is: Visualizes how users interact with products. Funnels, flows, and click maps reveal the user journey.
Look and feel: Funnels, User flows, Session replay, Click maps, Journey mapping, Conversion paths.
Colors: primary #FFFFFF, #0F172A, #EC4899; secondary #3B82F6, #22C55E, #F59E0B, #E5E7EB, #B91C1C.
Effects and motion: Funnel animations, flow diagrams, click overlay visualizations, path highlighting.

How to build it:
- Lead with a horizontal conversion funnel: one bar per step, width as percent of entrants, user count inside in #0F172A
- Call out the biggest drop-off beneath the funnel in a tinted insight box
- Pair a list of top user paths (step → step, users, conversion) with a ranked list of drop-off points
- If the page has step-to-step flow or click data, show it as a Sankey (d3-sankey or inline SVG) or click-map overlay; otherwise skip both
- Add a flow selector (checkout, onboarding, feature discovery) in the header; flows without data show an empty state, never invented numbers
- Draw funnel bars in the pink accent and show drop-off values in red #B91C1C

Works best for: UX research, Product analytics, Conversion optimization, Customer journey, A/B testing.
Avoid it for: Financial data, Operations monitoring, Technical metrics, Executive summaries. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Financial Dashboard

- slug: `financial-dashboard`
- source: https://www.uistyleguide.com/style/financial-dashboard
- category: BI & Analytics

````text
Apply the Financial Dashboard style to this interface.

What it is: Purpose-built for financial data with proper number formatting, accounting conventions, and financial visualizations.
Look and feel: P&L, Balance sheet, Cash flow, Budgets, Variance, Financial statements.
Colors: primary #FFFFFF, #1F2937, #059669; secondary #DC2626, #2563EB, #F59E0B, #E5E7EB.
Effects and motion: Number formatting, red/green indicators, waterfall charts, drill-through tables.

How to build it:
- Center the page on a statement table with Account, Actual, Budget and Variance columns, figures right-aligned
- Set font-variant-numeric: tabular-nums or a monospace face so digits line up down each column
- Format raw numbers with Intl.NumberFormat and currencySign: 'accounting' for parenthesised negatives; keep figures that are already formatted
- Indent sub-accounts and tint section and subtotal rows (revenue, costs, gross profit)
- Color variance green when favorable, red when unfavorable (higher costs are unfavorable), plus an F/U label; never use arrows that contradict the sign
- Below the table, show cash flow as a waterfall or signed bar chart (inline SVG or CSS bars) beside a grid of key ratios

Works best for: Finance teams, Accounting, Budget tracking, Investor reporting, CFO dashboards.
Avoid it for: Non-financial metrics, Marketing analytics, Technical dashboards, Consumer products. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

## Sales Intelligence Dashboard

- slug: `sales-intelligence-dashboard`
- source: https://www.uistyleguide.com/style/sales-intelligence-dashboard
- category: BI & Analytics

````text
Apply the Sales Intelligence Dashboard style to this interface.

What it is: Tracks the sales pipeline with quota progress, deal stages, activity metrics, and team leaderboards.
Look and feel: Pipeline, Quota tracking, Lead scoring, Activity metrics, Leaderboards, CRM analytics.
Colors: primary #FFFFFF, #1E293B, #2563EB; secondary #10B981, #F59E0B, #EF4444, #E5E7EB.
Effects and motion: Horizontal pipeline and quota bars, status colors for attainment and win probability, rank badges, compact deal rows.

How to build it:
- Start with a full-width quota bar: closed amount against quota with percent-to-goal in large text
- Show pipeline stages as horizontal bars in one aligned grid, each with stage color, total value and deal count
- Put a team leaderboard beside the pipeline: rank badge, rep name, closed amount and percent of quota
- End with deals closing soon: company, value, stage, win probability and owner
- Color status as bar fills and badge dots: #10B981 at or above quota, #F59E0B at risk, #EF4444 below 50% or stalled
- If values are raw numbers, format them with Intl.NumberFormat compact notation; keep existing labels and controls as they are

Works best for: Sales teams, CRM dashboards, Revenue operations, Sales managers, SDR teams.
Avoid it for: Product analytics, Technical dashboards, Finance reporting, Operations. If this product falls into one of those, say so before restyling.

Restructure the layout where this style calls for it, keeping the existing content and behaviour. Use only content already on the page: if a step needs testimonials, pricing, data, images or media that don't exist, skip that step instead of adding placeholders or inventing it.
Meet WCAG AA contrast: where a palette color is too light or bright for text, keep it for backgrounds, borders and large display type and use a darker text color, rather than darkening the whole design. Keep visible focus states, give icon-only controls an accessible name (aria-label) and respect prefers-reduced-motion.
````

