# UI style guide: helping the user choose a style

Source of the style data: https://www.uistyleguide.com (collected 2026-11-02); the sections marked "from the site" are taken from it, the sections marked "our guidance" are this project's own.
The ready-to-paste prompt for every style is in [[ui-style-prompts]] (same order, one section per style, keyed by slug).

## How to use this (our guidance)

The frontend designer uses this when the user has not named a style, or asks "what style should it be?". Do not dump the catalog on them; narrow it.

1. **Ask at most four things**, in plain language, skipping what the task or project map already answers:
   - What is it, and who uses it? (product type, industry, audience)
   - What should it feel like? (calm and trustworthy / premium / playful / bold and raw / futuristic / warm and natural)
   - Hard constraints: must it be highly accessible (government, health, education)? Low-power or older devices? Must it match an existing brand or design system?
   - How much motion, 3D or visual effect is welcome?
2. **Shortlist 2 or 3 styles** using the tables below (goal, industry, avoid-when). Name each in one line with the trade-off, e.g. "Glassmorphism: premium and layered, but weak contrast on busy backgrounds".
3. **Show, don't describe**, when the user hesitates: give the palette and key characteristics from the catalog, or offer to restyle one real screen in two candidates.
4. **Confirm one style** (or a primary plus a restrained secondary), record it as a design decision, then pass that style's prompt from [[ui-style-prompts]] to the designer and author.
5. If the project already has a strong design language, say so and prefer a style that extends it; the designer's rule is to elevate what exists, not impose a clash.

## Precedence (our guidance)

A style sets the look. It never overrides the frontend checklist or the security rules:
- WCAG AA contrast (4.5:1 text, 3:1 large text and UI) and visible focus states hold in every style. Styles that lean on transparency, neon, low-contrast layering or chromatic effects (Glassmorphism, Aurora, Cyberpunk, Vaporwave, Chromatic Aberration, Neumorphism) need a contrast check on every text/background pair, and a solid fallback.
- Respect `prefers-reduced-motion`, and `prefers-reduced-transparency` for glass effects. Motion-heavy styles must still work without motion.
- The style prompts say "change the visual design only: keep the existing layout, content and behaviour". Keep that; a restyle must not change routes, API calls or token handling.
- If the user's constraints hit a style's "avoid when" list (below), say so before applying it.

## Starting points by goal (our guidance)

These are shortlists to start the conversation, chosen by us from the catalog data; they are not a ranking from the site.

| If the user wants | Consider | Why |
|---|---|---|
| Trust, safety, authority (finance, health, legal, B2B) | Trust & Authority, Minimalism & Swiss Style, Flat Design, Executive Dashboard | Clear hierarchy, restrained colour, credibility cues |
| Maximum accessibility (government, health, education, public services) | Accessible & Ethical, Inclusive Design, E-Ink / Paper, Minimalism & Swiss Style | High contrast, large targets, simple structure |
| Premium, modern, layered SaaS | Glassmorphism, Liquid Glass, Dark Mode (OLED), Dimensional Layering, Aurora UI | Depth and polish; check contrast and performance |
| Clean product UI that scales | Swiss Modernism 2.0, Bento Grids, Soft UI Evolution, Flat Design | Grid discipline, predictable components |
| Playful, friendly consumer product | Claymorphism, Neubrutalism, Memphis Design, Y2K Aesthetic | Colour, character, tactile shapes |
| Bold, raw, memorable (creative, indie, Gen Z) | Brutalism, Neubrutalism, Gen Z Chaos / Maximalism, Anti-Polish / Raw Aesthetic | Strong identity; usability needs care |
| Nostalgic or themed | Retro-Futurism, Vaporwave, Pixel Art, Vintage Analog / Retro Film, Skeuomorphism | Strong era mood; keep readability |
| Gaming, entertainment, futuristic | Cyberpunk UI, HUD / Sci-Fi FUI, 3D & Hyperrealism, Spatial UI (VisionOS) | Immersive; heavy on effects and performance |
| Warm, natural, wellness | Organic Biophilic, Nature Distilled, Biomimetic / Organic 2.0 | Soft shapes, earthy palettes |
| Storytelling and expressive motion | Motion-Driven, Parallax Storytelling, Kinetic Typography, Micro-interactions | Motion carries the experience; needs reduced-motion fallbacks |
| A marketing or landing page | Hero-Centric Design, Conversion-Optimized, Social Proof-Focused, Storytelling-Driven, Minimal & Direct | Page-level layout patterns (see the Landing Page Styles category) |
| Dashboards and analytics | Data-Dense Dashboard, Executive Dashboard, Real-Time Monitoring, Financial Dashboard, Drill-Down Analytics | Pick by who reads it and how fast (see the BI & Analytics category) |
| AI-first or hands-free products | AI-Native UI, Zero Interface, Voice-First Multimodal | Interface recedes; conversation or voice leads |

## Be careful when (from the site)

Styles whose "when to avoid it" list names the same situation. If the user's product is in one of these, raise it before applying the style.

| Situation | Styles that list it as a poor fit |
|---|---|
| Healthcare | Vibrant & Block-based, Retro-Futurism, Y2K Aesthetic, Vaporwave, Vintage Analog / Retro Film, Cyberpunk UI, Chromatic Aberration / RGB Split, Neubrutalism, Memphis Design, Gen Z Chaos / Maximalism, Anti-Polish / Raw Aesthetic |
| Accessibility-critical | 3D Product Preview, Chromatic Aberration / RGB Split, Gradient Mesh / Aurora Evolved, Kinetic Typography, Tactile Digital / Deformable UI, Interactive Cursor Design |
| Elderly users | Y2K Aesthetic, Cyberpunk UI, Chromatic Aberration / RGB Split, Memphis Design, Exaggerated Minimalism, Kinetic Typography |
| Critical accessibility | Glassmorphism, Aurora UI, Skeuomorphism, Liquid Glass, Motion-Driven |
| Dashboards | Editorial Grid / Magazine, 3D Product Preview, Exaggerated Minimalism, Parallax Storytelling |
| Data-heavy dashboards | Neumorphism, Aurora UI, Interactive Cursor Design, AI-Native UI |
| E-commerce | Vaporwave, Parallax Storytelling, Minimal & Direct, Storytelling-Driven |
| Finance | Claymorphism, Y2K Aesthetic, Chromatic Aberration / RGB Split, Neubrutalism |
| Gaming | Swiss Modernism 2.0, E-Ink / Paper, Organic Biophilic, Nature Distilled |
| Conservative industries | Retro-Futurism, Brutalism, Neubrutalism |
| Corporate enterprise | Vintage Analog / Retro Film, Cyberpunk UI, Anti-Polish / Raw Aesthetic |
| Entertainment | Minimalism & Swiss Style, Swiss Modernism 2.0, Trust & Authority |
| Forms | Exaggerated Minimalism, Kinetic Typography, Interactive Cursor Design |
| Government | Vibrant & Block-based, Gen Z Chaos / Maximalism, Anti-Polish / Raw Aesthetic |
| Mobile-first | Parallax Storytelling, Data-Dense Dashboard, Drill-Down Analytics |
| Performance-limited | Glassmorphism, 3D & Hyperrealism, Liquid Glass |

## Styles by industry (from the site)

Each style's own "common industries" list, inverted.

| Industry | Styles |
|---|---|
| Corporate & B2B | Minimalism & Swiss Style, Glassmorphism, Flat Design, Soft UI Evolution, Dimensional Layering, Swiss Modernism 2.0, Feature-Rich Showcase, Social Proof-Focused, Trust & Authority, Data-Dense Dashboard, Executive Dashboard, Real-Time Monitoring, Drill-Down Analytics, Comparative Analysis Dashboard, Predictive Analytics, Financial Dashboard, Sales Intelligence Dashboard |
| Creative & Portfolio | Vibrant & Block-based, Aurora UI, Bento Box Grid, Bento Grids, Retro-Futurism, Y2K Aesthetic, Vaporwave, Pixel Art, Vintage Analog / Retro Film, Chromatic Aberration / RGB Split, Brutalism, Liquid Glass, Neubrutalism, Memphis Design, Exaggerated Minimalism, Gen Z Chaos / Maximalism, Anti-Polish / Raw Aesthetic, Gradient Mesh / Aurora Evolved, Biomimetic / Organic 2.0, Motion-Driven, Kinetic Typography, Parallax Storytelling, Interactive Cursor Design, Hero-Centric Design, Storytelling-Driven |
| E-commerce | Flat Design, Bento Box Grid, Dimensional Layering, Bento Grids, Y2K Aesthetic, 3D & Hyperrealism, 3D Product Preview, Liquid Glass, Gen Z Chaos / Maximalism, Anti-Polish / Raw Aesthetic, Micro-interactions, Tactile Digital / Deformable UI, Hero-Centric Design, Conversion-Optimized, Social Proof-Focused, Heatmap Dashboard, Comparative Analysis Dashboard, Predictive Analytics, User Behavior Analytics |
| Education | Claymorphism, Editorial Grid / Magazine, Accessible & Ethical, Inclusive Design, E-Ink / Paper, Conversion-Optimized |
| Entertainment & Media | Vibrant & Block-based, Dark Mode (OLED), Aurora UI, Editorial Grid / Magazine, Retro-Futurism, Skeuomorphism, Y2K Aesthetic, Vaporwave, Pixel Art, Vintage Analog / Retro Film, 3D & Hyperrealism, Chromatic Aberration / RGB Split, Memphis Design, Gen Z Chaos / Maximalism, Gradient Mesh / Aurora Evolved, Motion-Driven, Kinetic Typography, Tactile Digital / Deformable UI, Spatial UI (VisionOS) |
| Fintech & Banking | Minimalism & Swiss Style, Glassmorphism, Dark Mode (OLED), Dimensional Layering, Cyberpunk UI, Inclusive Design, HUD / Sci-Fi FUI, Trust & Authority, Data-Dense Dashboard, Executive Dashboard, Real-Time Monitoring, Drill-Down Analytics, Comparative Analysis Dashboard, Predictive Analytics, Financial Dashboard |
| Fitness & Wellness | Neumorphism, Soft UI Evolution, Organic Biophilic, Biomimetic / Organic 2.0, Nature Distilled |
| Food & Restaurant | Vintage Analog / Retro Film, Anti-Polish / Raw Aesthetic, Organic Biophilic, Nature Distilled |
| Gaming | Vibrant & Block-based, Dark Mode (OLED), Retro-Futurism, Skeuomorphism, Vaporwave, Pixel Art, 3D & Hyperrealism, Cyberpunk UI, Chromatic Aberration / RGB Split, Tactile Digital / Deformable UI, HUD / Sci-Fi FUI, Spatial UI (VisionOS) |
| Healthcare | Neumorphism, Soft UI Evolution, Accessible & Ethical, Inclusive Design, E-Ink / Paper, Organic Biophilic, Biomimetic / Organic 2.0, Nature Distilled, Voice-First Multimodal, Trust & Authority, Drill-Down Analytics |
| Kids & Family | Claymorphism, Memphis Design, Tactile Digital / Deformable UI |
| Legal & Professional | Minimalism & Swiss Style, Swiss Modernism 2.0, Accessible & Ethical, Trust & Authority |
| Luxury & Premium | Glassmorphism, Aurora UI, Skeuomorphism, 3D Product Preview, Liquid Glass, Exaggerated Minimalism, Gradient Mesh / Aurora Evolved, Nature Distilled, Interactive Cursor Design, Hero-Centric Design |
| Nonprofit & Government | Editorial Grid / Magazine, Accessible & Ethical, Inclusive Design, E-Ink / Paper, Organic Biophilic, Biomimetic / Organic 2.0, Parallax Storytelling, Voice-First Multimodal, Storytelling-Driven |
| Real Estate | Glassmorphism, Swiss Modernism 2.0, 3D & Hyperrealism, 3D Product Preview, Exaggerated Minimalism, Heatmap Dashboard |
| SaaS | Minimalism & Swiss Style, Glassmorphism, Dark Mode (OLED), Claymorphism, Aurora UI, Flat Design, Soft UI Evolution, Bento Box Grid, Dimensional Layering, Swiss Modernism 2.0, Bento Grids, Liquid Glass, Neubrutalism, Micro-interactions, Zero Interface, AI-Native UI, Spatial UI (VisionOS), Voice-First Multimodal, Conversion-Optimized, Feature-Rich Showcase, Minimal & Direct, Social Proof-Focused, Interactive Product Demo, Data-Dense Dashboard, Heatmap Dashboard, Executive Dashboard, Real-Time Monitoring, Drill-Down Analytics, Comparative Analysis Dashboard, Predictive Analytics, User Behavior Analytics, Sales Intelligence Dashboard |
| Startup & Tech | Vibrant & Block-based, Claymorphism, Flat Design, Bento Box Grid, Bento Grids, Cyberpunk UI, Neubrutalism, Gradient Mesh / Aurora Evolved, Motion-Driven, Micro-interactions, Kinetic Typography, Parallax Storytelling, Interactive Cursor Design, Zero Interface, AI-Native UI, Hero-Centric Design, Conversion-Optimized, Feature-Rich Showcase, Minimal & Direct, Social Proof-Focused, Interactive Product Demo, User Behavior Analytics, Sales Intelligence Dashboard |
| Travel & Tourism | Aurora UI, Motion-Driven, Parallax Storytelling, Storytelling-Driven |

## Catalog (from the site)

One entry per style: what it is, what it looks like, where it fits, where it does not, and its palette. Slugs match [[ui-style-prompts]].

### Modern SaaS

#### Minimalism & Swiss Style

Rooted in the Swiss International Style of the 1950s, this approach emphasizes clarity, readability, and objectivity.

- slug: `minimalism-swiss-style` · era/origin: 1950s Swiss
- looks like: Clean, Simple, Spacious, Functional, White space, Grid-based
- use for: Enterprise apps, Dashboards, Documentation sites, SaaS platforms
- avoid when: Creative portfolios, Entertainment, Playful brands
- common industries: SaaS, Fintech & Banking, Corporate & B2B, Legal & Professional
- palette: #000000 #FFFFFF #F5F1E8 #808080 #B38B6D

#### Neumorphism

A modern evolution of skeuomorphism that creates soft, extruded plastic-like interfaces. Live demo, color palette, CSS and an AI prompt.

- slug: `neumorphism` · era/origin: 2020s Modern
- looks like: Soft UI, Embossed, Debossed, Subtle depth, Rounded, Monochromatic
- use for: Health/wellness apps, Meditation platforms, Fitness trackers
- avoid when: Complex apps, Data-heavy dashboards, High-contrast required
- common industries: Healthcare, Fitness & Wellness
- palette: #C8E0F4 #F5E0E8 #E8E8E8 #FFFFFF #D0D0D0

#### Glassmorphism

Inspired by frosted glass, this style creates depth through transparency and blur effects. Perfect for layered interfaces where content hierarchy is important.

- slug: `glassmorphism` · era/origin: 2020s Modern
- looks like: Frosted glass, Transparent, Blurred background, Layered, Vibrant
- use for: Modern SaaS, Financial dashboards, High-end corporate, Modal overlays
- avoid when: Low-contrast backgrounds, Critical accessibility, Performance-limited
- common industries: SaaS, Fintech & Banking, Corporate & B2B, Real Estate, Luxury & Premium
- palette: rgba(255,255,255,0.15) #0080FF #8B00FF #FF1493 #20B2AA

#### Vibrant & Block-based

High-energy design with bold color blocks, geometric shapes, and vibrant palettes. Creates excitement and draws attention through visual contrast.

- slug: `vibrant-block-based` · era/origin: 2020s Modern
- looks like: Bold, Energetic, Playful, Block layout, Geometric shapes, High color contrast
- use for: Startups, Creative agencies, Gaming, Youth-focused, Entertainment
- avoid when: Financial institutions, Healthcare, Government, Elderly audiences
- common industries: Entertainment & Media, Gaming, Creative & Portfolio, Startup & Tech
- palette: #39FF14 #BF00FF #FF1493 #00FFFF #FFAA00 #FF7F00 #FF006E #CCFF00

#### Dark Mode (OLED)

Optimized for OLED displays and low-light environments. Uses true blacks to save battery and reduce eye strain while maintaining vibrant accent colors.

- slug: `dark-mode-oled` · era/origin: 2020s Modern
- looks like: Dark theme, Low light, High contrast, Deep black, Eye-friendly, OLED
- use for: Night-mode apps, Coding platforms, Entertainment, OLED devices
- avoid when: Print-first content, High-brightness outdoor, Color-accuracy-critical
- common industries: SaaS, Fintech & Banking, Entertainment & Media, Gaming
- palette: #000000 #121212 #0A0E27 #39FF14 #0080FF #FFD700 #BF00FF

#### Claymorphism

A playful evolution of neumorphism that looks like soft clay or plasticine. Features chunky rounded elements with thick borders and soft shadows.

- slug: `claymorphism` · era/origin: 2020s Modern
- looks like: Soft 3D, Chunky, Playful, Toy-like, Bubbly, Thick borders
- use for: Educational apps, Children's apps, SaaS platforms, Creative tools, Onboarding
- avoid when: Formal corporate, Professional services, Medical, Finance
- common industries: SaaS, Education, Startup & Tech, Kids & Family
- palette: #FDBCB4 #ADD8E6 #98FF98 #E6E6FA #FFD1DC #B5EAD7

#### Aurora UI

Inspired by the Northern Lights, featuring flowing gradients and smooth color transitions. Creates a premium, modern feel with dynamic backgrounds.

- slug: `aurora-ui` · era/origin: 2020s Modern
- looks like: Vibrant gradients, Smooth blend, Northern Lights effect, Mesh gradient, Luminous
- use for: Modern SaaS, Creative agencies, Music platforms, Premium products, Hero sections
- avoid when: Data-heavy dashboards, Critical accessibility, Content-heavy sites
- common industries: SaaS, Entertainment & Media, Creative & Portfolio, Travel & Tourism, Luxury & Premium
- palette: #0080FF #FF1493 #00FFFF #8B00FF #20B2AA

#### Flat Design

Emerged in the early 2010s as a reaction to skeuomorphism. Uses simple 2D elements, bold colors, and no shadows or gradients.

- slug: `flat-design` · era/origin: 2010s Modern
- looks like: 2D, Minimalist, Bold colors, No shadows, Clean lines, Icon-heavy
- use for: Web apps, Mobile apps, Cross-platform, Startup MVPs, SaaS, Dashboards
- avoid when: Complex 3D, Premium/luxury, Artistic portfolios, Immersive experiences
- common industries: SaaS, E-commerce, Corporate & B2B, Startup & Tech
- palette: #FF5722 #2196F3 #4CAF50 #FFC107 #9C27B0 #00BCD4

#### Soft UI Evolution

The next evolution of neumorphism with improved accessibility and contrast. Maintains the soft aesthetic while meeting WCAG standards.

- slug: `soft-ui-evolution` · era/origin: 2020s Modern
- looks like: Evolved soft UI, Better contrast, Modern aesthetics, Subtle depth, Accessibility-focused
- use for: Modern enterprise apps, SaaS platforms, Health/wellness, Modern business tools
- avoid when: Extreme minimalism, Critical performance, Bold, high-energy brands
- common industries: SaaS, Healthcare, Corporate & B2B, Fitness & Wellness
- palette: #F0F4F8 #D1D9E6 #FFFFFF #2563EB #22C55E #EA580C

#### Bento Box Grid

Inspired by Japanese bento boxes, this layout uses modular cards of varying sizes to create visual hierarchy and interest.

- slug: `bento-box-grid` · era/origin: 2020s Apple
- looks like: Modular cards, Asymmetric grid, Varied sizes, Apple-style, Dashboard tiles
- use for: Dashboards, Product pages, Portfolios, Apple-style marketing, Feature showcases
- avoid when: Dense data tables, Text-heavy content, Real-time monitoring
- common industries: SaaS, E-commerce, Creative & Portfolio, Startup & Tech
- palette: #FFFFFF #F5F5F5 #007AFF #34C759

#### Dimensional Layering

Creates visual hierarchy through overlapping elements and elevation shadows. Gives interfaces a 3D paper-stack feel.

- slug: `dimensional-layering` · era/origin: 2020s Modern
- looks like: Depth, Overlapping, Z-index, Layers, 3D, Shadows, Elevation, Floating
- use for: Dashboards, Card layouts, Modals, Navigation, Product showcases, SaaS
- avoid when: Print-style layouts, Simple blogs, Low-end devices, Flat design requirements
- common industries: SaaS, E-commerce, Fintech & Banking, Corporate & B2B
- palette: #FFFFFF #F5F5F5 #E0E0E0 #6366F1 #3B82F6

#### Swiss Modernism 2.0

A modern interpretation of the Swiss International Style with strict grid systems and mathematical spacing. Live demo, color palette, CSS and an AI prompt.

- slug: `swiss-modernism-2` · era/origin: 1950s Swiss + 2020s
- looks like: Grid system, Helvetica, Modular, Asymmetric, International style, Rational
- use for: Corporate sites, Architecture, Editorial, SaaS, Museums, Professional services
- avoid when: Playful brands, Children's sites, Entertainment, Gaming, Emotional storytelling
- common industries: SaaS, Corporate & B2B, Real Estate, Legal & Professional
- palette: #000000 #FFFFFF #F5F5F5 #DC2626

#### Bento Grids

Apple-inspired modular grid of rounded cards in mixed sizes, with soft shadows, bold accent tiles and clean typography.

- slug: `bento-grids` · era/origin: 2020s Apple/Linear
- looks like: Apple-style, Modular, Cards, Organized, Clean, Hierarchy, Rounded, Soft
- use for: Product features, Dashboards, Personal sites, Marketing summaries, Galleries
- avoid when: Long-form reading, Data tables, Complex forms
- common industries: SaaS, E-commerce, Creative & Portfolio, Startup & Tech
- palette: #F5F5F7 #FFFFFF #1D1D1F #007AFF #34C759

#### Editorial Grid / Magazine

Brings print magazine aesthetics to the web with asymmetric grids, pull quotes, and editorial typography. Live demo, color palette, CSS and an AI prompt.

- slug: `editorial-grid-magazine` · era/origin: 2020s Editorial Digital
- looks like: Magazine layout, Asymmetric grid, Editorial typography, Pull quotes, Drop caps, Column layout
- use for: News sites, Blogs, Magazines, Editorial content, Long-form articles, Publishing
- avoid when: Dashboards, Apps, E-commerce catalogs, Real-time data, Short-form content
- common industries: Education, Entertainment & Media, Nonprofit & Government
- palette: #000000 #FFFFFF #DC2626 #6B7280

### Retro & Nostalgia

#### Retro-Futurism

Combines 1980s retrofuturistic aesthetics with modern web technology. Features neon colors, synthwave vibes, and CRT-style effects.

- slug: `retro-futurism` · era/origin: 1980s Retro
- looks like: Vintage sci-fi, 80s aesthetic, Neon glow, CRT scanlines, Synthwave
- use for: Gaming, Entertainment, Music platforms, Tech brands, Cyberpunk themes
- avoid when: Conservative industries, Healthcare, Professional/corporate, Elderly
- common industries: Entertainment & Media, Gaming, Creative & Portfolio
- palette: #0080FF #FF006E #00FFFF #1A1A2E #C0C0C0 #FFD700 #FF10F0

#### Skeuomorphism

Uses real-world textures and metaphors to make digital interfaces feel familiar. Think leather textures, wood grain, and realistic shadows.

- slug: `skeuomorphism` · era/origin: 2007-2012 iOS
- looks like: Realistic, Texture, Depth, 3D appearance, Real-world metaphors, Tactile
- use for: Legacy apps, Gaming, Immersive storytelling, Premium products, Luxury
- avoid when: Modern enterprise, Critical accessibility, Data-dense dashboards
- common industries: Entertainment & Media, Gaming, Luxury & Premium
- palette: #8B4513 #CD853F #A0522D #D2691E #DEB887

#### Y2K Aesthetic

Celebrates early 2000s digital optimism with chrome textures, bubblegum colors, and futuristic-retro aesthetics.

- slug: `y2k-aesthetic` · era/origin: Y2K 2000s
- looks like: Neon pink, Chrome, Metallic, Bubblegum, Iridescent, Glossy, 2000s
- use for: Fashion brands, Music platforms, Gen Z brands, Nostalgia marketing, Entertainment
- avoid when: B2B enterprise, Healthcare, Finance, Elderly users
- common industries: E-commerce, Entertainment & Media, Creative & Portfolio
- palette: #FF69B4 #00FFFF #C0C0C0 #9400D3 #FFD700 #FF1493

#### Vaporwave

A visual celebration of 80s-90s computer aesthetics with sunset gradients, glitch effects, and dreamy atmospheres.

- slug: `vaporwave` · era/origin: 1980s-90s Retro
- looks like: Synthwave, Retro-futuristic, 80s-90s, Neon, Glitch, Nostalgic, Sunset gradient
- use for: Music platforms, Gaming, Creative portfolios, Tech startups, Entertainment
- avoid when: Business apps, E-commerce, Education, Healthcare, Enterprise
- common industries: Entertainment & Media, Gaming, Creative & Portfolio
- palette: #FF71CE #01CDFE #05FFA1 #B967FF #FFFB96 #00FFC6

#### Pixel Art

Celebrates the aesthetics of early video games with pixelated graphics, limited palettes, and 8-bit charm. Live demo, color palette, CSS and an AI prompt.

- slug: `pixel-art` · era/origin: 1980s Arcade
- looks like: Retro, 8-bit, 16-bit, Gaming, Blocky, Nostalgic, Pixelated, Arcade
- use for: Indie games, Retro tools, Creative portfolios, Nostalgia marketing, Web3/NFT
- avoid when: Professional corporate, Modern SaaS, High-res photography sites
- common industries: Entertainment & Media, Gaming, Creative & Portfolio
- palette: #FF0000 #00FF00 #0000FF #FFFF00 #0F0F23 #FFFFFF

#### Vintage Analog / Retro Film

Celebrates the imperfect beauty of analog media with film grain, faded colors, and light leaks. Live demo, color palette, CSS and an AI prompt.

- slug: `vintage-analog-retro-film` · era/origin: 1970s-90s Analog Revival
- looks like: Film grain, VHS, Cassette tape, Polaroid, Analog warmth, Faded colors, Light leaks
- use for: Photography portfolios, Music/vinyl brands, Vintage fashion, Nostalgia marketing, Film industry
- avoid when: Modern tech, SaaS, Healthcare, Children's apps, Corporate enterprise
- common industries: Entertainment & Media, Creative & Portfolio, Food & Restaurant
- palette: #F5E6C8 #D4A574 #4A7B7C #E8B4B8 #8B4513 #6B7280

### Gaming & Entertainment

#### 3D & Hyperrealism

Creates immersive experiences through realistic 3D rendering, complex textures, and spatial depth. Live demo, color palette, build notes and an AI prompt.

- slug: `3d-hyperrealism` · era/origin: 2020s Modern
- looks like: Depth, Realistic textures, 3D models, Spatial navigation, Immersive
- use for: Gaming, Product showcase, Immersive experiences, Architectural viz
- avoid when: Low-end mobile, Performance-limited, Data tables/forms
- common industries: E-commerce, Entertainment & Media, Gaming, Real Estate
- palette: #001F3F #0A1628 #F59E0B #EA580C #FFD700 #C0C0C0

#### Cyberpunk UI

Dark, neon-lit interfaces inspired by cyberpunk fiction. Features terminal aesthetics, glitch effects, and dystopian vibes.

- slug: `cyberpunk-ui` · era/origin: 2020s Cyberpunk
- looks like: Neon, Dark mode, Terminal, HUD, Sci-fi, Glitch, Dystopian, Matrix
- use for: Gaming platforms, Tech products, Crypto apps, Sci-fi applications, Developer tools
- avoid when: Corporate enterprise, Healthcare, Family apps, Elderly users
- common industries: Fintech & Banking, Gaming, Startup & Tech
- palette: #00FF00 #FF00FF #00FFFF #0D0D0D #FFD700 #FF0000

#### 3D Product Preview

Interactive 3D product visualization with rotation, zoom, and AR capabilities. Live demo, color palette, build notes and an AI prompt.

- slug: `3d-product-preview` · era/origin: 2025+ E-commerce 3D
- looks like: 360 product view, Rotatable, Zoomable, Touch-to-spin, AR preview, Product configurator
- use for: E-commerce, Furniture, Fashion, Automotive, Electronics, Jewelry
- avoid when: Content-heavy sites, Blogs, Dashboards, Low-bandwidth, Accessibility-critical
- common industries: E-commerce, Real Estate, Luxury & Premium
- palette: #E8E8E8 #FFFFFF #3B82F6 #10B981 #1D4ED8 #047857

#### Chromatic Aberration / RGB Split

Recreates the chromatic aberration effect from cameras and VHS tapes with RGB channel splitting. Live demo, color palette, CSS and an AI prompt.

- slug: `chromatic-aberration-rgb-split` · era/origin: 2020s Retro-Tech
- looks like: RGB split, Color fringing, Glitch, Retro tech, VHS, Analog error, Distortion
- use for: Music platforms, Gaming, Tech brands, Creative portfolios, Nightlife, Video
- avoid when: Corporate, Healthcare, Finance, Accessibility-critical, Elderly users
- common industries: Entertainment & Media, Gaming, Creative & Portfolio
- palette: #FF0000 #00FF00 #0000FF #000000 #00FFFF #FF00FF

### Accessibility & Ethical

#### Accessible & Ethical

Prioritizes accessibility and ethical considerations above all else. Ensures everyone can use the interface regardless of ability or device.

- slug: `accessible-ethical` · era/origin: Universal
- looks like: High contrast, Large text, Keyboard navigation, Screen reader friendly, WCAG compliant
- use for: Government, Healthcare, Education, Inclusive products, Public services
- avoid when: (the site lists none)
- common industries: Healthcare, Education, Nonprofit & Government, Legal & Professional
- palette: #000000 #FFFFFF #1E40AF #166534

#### Inclusive Design

Goes beyond basic accessibility to create truly universal experiences. Live demo, color palette, CSS and an AI prompt.

- slug: `inclusive-design` · era/origin: Universal
- looks like: Accessible, Color-blind friendly, High contrast, Large touch targets, Universal
- use for: Public services, Education, Healthcare, Finance, Government
- avoid when: (the site lists none)
- common industries: Healthcare, Fintech & Banking, Education, Nonprofit & Government
- palette: #1E3A8A #166534 #DC2626 #F59E0B

#### E-Ink / Paper

Mimics the experience of reading on paper or e-ink displays. High contrast, no animations, and distraction-free.

- slug: `e-ink-paper` · era/origin: 2020s Digital Well-being
- looks like: Paper-like, Matte, High contrast, Texture, Reading, Calm, Monochrome
- use for: Reading apps, Digital newspapers, Minimal journals, Distraction-free writing
- avoid when: Gaming, Video platforms, High-energy marketing, Dark mode dependent
- common industries: Healthcare, Education, Nonprofit & Government
- palette: #FDFBF7 #F5F5F5 #1A1A1A #4A4A4A #FFFF00

### Experimental & Artistic

#### Brutalism

Inspired by Brutalist architecture, this style embraces raw, honest aesthetics. Live demo, color palette, CSS and an AI prompt.

- slug: `brutalism` · era/origin: 1950s Brutalist
- looks like: Raw, Unpolished, Stark, High contrast, Plain text, Anti-design
- use for: Design portfolios, Artistic projects, Counter-culture brands, Tech blogs
- avoid when: Corporate environments, Conservative industries, Customer-facing professional
- common industries: Creative & Portfolio
- palette: #FF0000 #0000FF #FFFF00 #000000 #FFFFFF #00FF00 #FF00FF

#### Liquid Glass

Advanced glassmorphism with flowing, morphing animations. Creates a liquid-like feel with chromatic aberration and iridescent effects.

- slug: `liquid-glass` · era/origin: 2020s Modern
- looks like: Flowing glass, Morphing, Smooth transitions, Fluid effects, Iridescent
- use for: Premium SaaS, High-end e-commerce, Creative platforms, Luxury portfolios
- avoid when: Performance-limited, Critical accessibility, Complex data, Budget projects
- common industries: SaaS, E-commerce, Creative & Portfolio, Luxury & Premium
- palette: #667EEA #764BA2 #F093FB #FF6B6B #4ECDC4 #95E1D3

#### Neubrutalism

A modern, playful take on brutalism. Combines raw aesthetics with bright colors and bold shadows. Think Gumroad and Figma's marketing pages.

- slug: `neubrutalism` · era/origin: 2020s Modern
- looks like: Bold borders, Black outlines, Primary colors, Thick shadows, Flat colors, Playful
- use for: Gen Z brands, Startups, Creative agencies, Figma-style apps, Tech blogs
- avoid when: Luxury brands, Finance, Healthcare, Conservative industries
- common industries: SaaS, Creative & Portfolio, Startup & Tech
- palette: #FFEB3B #FF5252 #2196F3 #000000 #4CAF50 #FF9800

#### Memphis Design

Inspired by the 1980s Memphis Group, featuring bold geometric shapes, clashing colors, and playful patterns. Live demo, color palette, CSS and an AI prompt.

- slug: `memphis-design` · era/origin: 1980s Postmodern
- looks like: 80s, Geometric, Playful, Postmodern, Shapes, Patterns, Squiggles, Bold
- use for: Creative agencies, Music sites, Youth brands, Event promotion, Artistic portfolios
- avoid when: Corporate finance, Healthcare, Legal, Elderly users
- common industries: Entertainment & Media, Creative & Portfolio, Kids & Family
- palette: #FF71CE #FFCE5C #86CCCA #6A7BB4 #FF6B6B #4ECDC4

#### Exaggerated Minimalism

Takes minimalism to the extreme with oversized typography, dramatic white space, and bold statements. Live demo, color palette, CSS and an AI prompt.

- slug: `exaggerated-minimalism` · era/origin: 2020s Modern
- looks like: Bold minimalism, Oversized typography, High contrast, Negative space, Statement design
- use for: Fashion, Architecture, Portfolios, Agency landing pages, Luxury brands
- avoid when: E-commerce catalogs, Dashboards, Forms, Data-heavy, Elderly users
- common industries: Creative & Portfolio, Real Estate, Luxury & Premium
- palette: #000000 #FFFFFF #FF0000

#### Gen Z Chaos / Maximalism

Embraces chaos and maximalism with sticker overlays, collage aesthetics, and internet culture references. Live demo, color palette, CSS and an AI prompt.

- slug: `gen-z-chaos-maximalism` · era/origin: 2023+ Internet Core
- looks like: Chaos, Clutter, Stickers, Raw, Collage, Mixed media, Loud, Internet culture
- use for: Gen Z lifestyle brands, Music artists, Creative portfolios, Viral marketing, Fashion
- avoid when: Corporate, Government, Healthcare, Banking, Serious tools
- common industries: E-commerce, Entertainment & Media, Creative & Portfolio
- palette: #FF00FF #00FF00 #FFFF00 #0000FF #FF6B6B #4ECDC4

#### Anti-Polish / Raw Aesthetic

Celebrates imperfection and human touch with hand-drawn elements, scanned textures, and an unfinished aesthetic.

- slug: `anti-polish-raw-aesthetic` · era/origin: 2025+ Anti-Digital
- looks like: Hand-drawn, Collage, Scanned textures, Unfinished, Imperfect, Authentic, Sketch
- use for: Creative portfolios, Artist sites, Indie brands, Handmade products, Editorial
- avoid when: Corporate enterprise, Fintech, Healthcare, Government, Polished SaaS
- common industries: E-commerce, Creative & Portfolio, Food & Restaurant
- palette: #FAFAF8 #4A4A4A #1A1A1A #C4A77D #D4C4A8 #8B4513

#### Gradient Mesh / Aurora Evolved

Advanced gradient techniques creating flowing, aurora-like color transitions with holographic effects. Live demo, color palette, CSS and an AI prompt.

- slug: `gradient-mesh-aurora-evolved` · era/origin: 2025+ Gradient Evolution
- looks like: Complex gradients, Mesh gradients, Multi-color blend, Aurora effect, Iridescent, Holographic
- use for: Hero sections, Backgrounds, Creative brands, Music platforms, Fashion
- avoid when: Data interfaces, Text-heavy content, Accessibility-critical, Conservative brands
- common industries: Entertainment & Media, Creative & Portfolio, Startup & Tech, Luxury & Premium
- palette: #00FFFF #FF00FF #FFFF00 #0066FF #00FF66 #FF6B6B #4ECDC4

### Nature & Organic

#### Organic Biophilic

Brings nature indoors through organic shapes, natural colors, and flowing elements. Creates a calming, sustainable aesthetic.

- slug: `organic-biophilic` · era/origin: 2020s Sustainable
- looks like: Nature, Organic shapes, Green, Sustainable, Rounded, Flowing, Earthy
- use for: Wellness apps, Sustainability brands, Eco products, Health apps, Meditation
- avoid when: Tech-focused products, Gaming, Industrial, Urban brands
- common industries: Healthcare, Food & Restaurant, Fitness & Wellness, Nonprofit & Government
- palette: #228B22 #8B4513 #87CEEB #F5F5DC #6B8E23 #DAA520

#### Biomimetic / Organic 2.0

Takes organic design further with growing cells, breathing animations, and bio-inspired patterns. Live demo, color palette, CSS and an AI prompt.

- slug: `biomimetic-organic-2` · era/origin: 2024+ Generative
- looks like: Nature-inspired, Cellular, Fluid, Breathing, Growing, Life-like
- use for: Sustainability tech, Biotech, Advanced health, Meditation, Generative art
- avoid when: Standard SaaS, Data grids, Strict corporate, Accounting
- common industries: Healthcare, Creative & Portfolio, Fitness & Wellness, Nonprofit & Government
- palette: #00FF41 #00FFFF #001E3C #0A2540 #FF9999

#### Nature Distilled

Distills nature into its essence with earthy colors, organic materials, and handmade warmth. Live demo, color palette, CSS and an AI prompt.

- slug: `nature-distilled` · era/origin: 2025+ Handmade Warmth
- looks like: Muted earthy, Skin tones, Wood, Soil, Sand, Terracotta, Warmth, Handmade
- use for: Wellness brands, Sustainable products, Artisan goods, Organic food, Spa/beauty
- avoid when: Tech startups, Gaming, Nightlife, Corporate finance, High-energy brands
- common industries: Healthcare, Food & Restaurant, Fitness & Wellness, Luxury & Premium
- palette: #C67B5C #D4C4A8 #B5651D #F5F0E1 #8B4513 #6B7B3C #9C8B7A

### Motion & Interactive

#### Motion-Driven

Design where animation is the primary mode of communication. Every interaction has purposeful motion that guides users through the experience.

- slug: `motion-driven` · era/origin: 2020s Modern
- looks like: Animation-heavy, Microinteractions, Smooth transitions, Scroll effects, Parallax
- use for: Portfolio sites, Storytelling platforms, Interactive experiences, Entertainment
- avoid when: Data dashboards, Critical accessibility, Low-power devices, Motion-sensitive
- common industries: Entertainment & Media, Creative & Portfolio, Startup & Tech, Travel & Tourism
- palette: #667EEA #764BA2 #EC4899 #EAB308 #06B6D4

#### Micro-interactions

Focuses on small, delightful animations that provide feedback and guide users. Every tap, swipe, and hover has a response.

- slug: `micro-interactions` · era/origin: 2020s Modern
- looks like: Small animations, Gesture-based, Tactile feedback, Subtle animations, Contextual
- use for: Mobile apps, Touchscreen UIs, Productivity tools, Consumer apps
- avoid when: Critical performance, Formal or somber contexts, Motion-sensitive audiences
- common industries: SaaS, E-commerce, Startup & Tech
- palette: #6366F1 #8B5CF6 #22C55E #EF4444 #F59E0B

#### Kinetic Typography

Uses animated typography as the primary visual element. Text moves, morphs, and transforms to tell stories. Live demo, color palette, CSS and an AI prompt.

- slug: `kinetic-typography` · era/origin: 2020s Modern
- looks like: Motion text, Animated type, Moving letters, Dynamic, Typing effect, Morphing
- use for: Hero sections, Marketing sites, Video platforms, Storytelling, Creative portfolios
- avoid when: Long-form content, Accessibility-critical, Data interfaces, Forms, Elderly users
- common industries: Entertainment & Media, Creative & Portfolio, Startup & Tech
- palette: #1A1A1A #FFFFFF #FF6B6B #4ECDC4

#### Parallax Storytelling

Uses scroll as a narrative device with parallax layers and progressive content reveal. Creates cinematic web experiences.

- slug: `parallax-storytelling` · era/origin: 2020s Modern
- looks like: Scroll-driven, Narrative, Layered scrolling, Immersive, Progressive disclosure
- use for: Brand storytelling, Product launches, Case studies, Portfolios, Marketing campaigns
- avoid when: E-commerce, Dashboards, Mobile-first, SEO-critical, Motion-sensitive audiences
- common industries: Creative & Portfolio, Startup & Tech, Travel & Tourism, Nonprofit & Government
- palette: #1A1A2E #16213E #0F3460 #E94560 #F39C12

#### Tactile Digital / Deformable UI

Creates tactile, touchable interfaces with squishy buttons, bounce physics, and material-like responses. Live demo, color palette, CSS and an AI prompt.

- slug: `tactile-digital-deformable-ui` · era/origin: 2025+ Tactile Era
- looks like: Jelly buttons, Clay, Squishy, Deformable, Bouncy, Physical
- use for: Modern mobile apps, Playful brands, Entertainment, Gaming UI, Consumer products
- avoid when: Enterprise software, Data dashboards, Accessibility-critical, Professional tools
- common industries: E-commerce, Entertainment & Media, Gaming, Kids & Family
- palette: #FF6B6B #FFE66D #87CEEB #4ECDC4 #FF9ECD

#### Interactive Cursor Design

Makes the cursor a primary interaction element with morphing, trails, and magnetic effects. Live demo, color palette, build notes and an AI prompt.

- slug: `interactive-cursor-design` · era/origin: 2025+ Interactive
- looks like: Custom cursor, Cursor as tool, Hover effects, Pointer transformation, Magnetic cursor
- use for: Creative portfolios, Interactive experiences, Agency sites, Product showcases
- avoid when: Mobile-first (no cursor), Accessibility-critical, Data-heavy dashboards, Forms
- common industries: Creative & Portfolio, Startup & Tech, Luxury & Premium
- palette: #000000 #FFFFFF #EC4899 #111827

### Futuristic & Tech

#### Zero Interface

The interface disappears, leaving only content and context-aware interactions. Uses AI, voice, and gestures to anticipate user needs.

- slug: `zero-interface` · era/origin: 2020s AI-Era
- looks like: Minimal visible UI, Voice-first, Gesture-based, AI-driven, Predictive
- use for: Voice assistants, AI platforms, Smart home, Contextual computing, Ambient
- avoid when: Complex workflows, Data-entry heavy, Legacy support, Explicit control
- common industries: SaaS, Startup & Tech
- palette: #FAFAFA #F0F0F0 #F5F1E8 #3B82F6 #9333EA

#### AI-Native UI

Designed specifically for AI interactions. Features conversational layouts, streaming text, and minimal interface chrome.

- slug: `ai-native-ui` · era/origin: 2020s AI-Era
- looks like: Chatbot, Conversational, Voice, Assistant, Minimal chrome, Streaming text
- use for: AI products, Chatbots, Voice assistants, Copilots, AI-powered tools
- avoid when: Traditional forms, Data-heavy dashboards, Print-first content
- common industries: SaaS, Startup & Tech
- palette: #6366F1 #10B981 #F5F5F5 #8B5CF6 #3B82F6

#### HUD / Sci-Fi FUI

Inspired by movie FUI (Fantasy User Interfaces). Features thin lines, neon colors, and technical data visualization.

- slug: `hud-scifi-fui` · era/origin: 2010s Sci-Fi
- looks like: Futuristic, Technical, Wireframe, Neon, Transparent, Iron Man, Sci-fi
- use for: Sci-fi games, Space tech, Cybersecurity, Movie props, Immersive dashboards
- avoid when: Standard corporate, Reading heavy content, Accessible public services
- common industries: Fintech & Banking, Gaming
- palette: #00FFFF #0080FF #FF0000 #0A0F1C #00FF00

#### Spatial UI (VisionOS)

Designed for spatial computing with floating glass panels, depth effects, and gaze-based interactions. Live demo, color palette, CSS and an AI prompt.

- slug: `spatial-ui-visionos` · era/origin: 2024 Spatial Era
- looks like: Glass, Depth, Immersion, Spatial, Translucent, Gesture, Apple, Vision Pro
- use for: Spatial computing apps, VR/AR interfaces, Immersive media, Futuristic dashboards
- avoid when: Text-heavy documents, High-contrast requirements, Low-powered devices
- common industries: SaaS, Entertainment & Media, Gaming
- palette: rgba(255,255,255,0.2) #FFFFFF #007AFF #30D158 #FF9F0A

#### Voice-First Multimodal

Designed for voice-first interactions with visual feedback for speaking, listening, and processing states.

- slug: `voice-first-multimodal` · era/origin: 2025+ Voice Era
- looks like: Voice UI, Multimodal, Audio feedback, Conversational, Hands-free, Ambient
- use for: Voice assistants, Accessibility apps, Hands-free tools, Smart home, Automotive UI
- avoid when: Visual-heavy content, Data entry, Complex forms, Noisy environments
- common industries: SaaS, Healthcare, Nonprofit & Government
- palette: #FAFAFA #6366F1 #9333EA #22C55E #3B82F6

### Landing Page Styles

#### Hero-Centric Design

Puts the hero section front and center with dramatic visuals and minimal distractions. Perfect for products that sell themselves visually.

- slug: `hero-centric-design` · era/origin: 2020s Marketing
- looks like: Hero section, Bold imagery, Full-screen, Visual impact, Product showcase, Brand statement
- use for: Products with strong visual identity, Brand launches, Fashion, Automotive, Luxury goods
- avoid when: Complex products, B2B software, Information-heavy sites, Multi-product catalogs
- common industries: E-commerce, Creative & Portfolio, Startup & Tech, Luxury & Premium
- palette: #1A1A1A #FFFFFF #FF6B35 #F5F5F5 #333333

#### Conversion-Optimized

Every element designed to drive conversions. Strategic CTA placement, urgency triggers, and social proof elements work together.

- slug: `conversion-optimized` · era/origin: 2020s Growth Marketing
- looks like: CTA focused, Lead capture, Urgency, Social proof, Benefits-driven, Trust signals
- use for: Lead generation, Sales pages, SaaS trials, Course launches, Webinar signups
- avoid when: Brand awareness, Content marketing, Portfolio sites, Informational pages
- common industries: SaaS, E-commerce, Education, Startup & Tech
- palette: #2563EB #FFFFFF #10B981 #F59E0B #EF4444 #F3F4F6

#### Feature-Rich Showcase

Comprehensive feature presentation for complex products. Organized sections help users understand capabilities at a glance.

- slug: `feature-rich-showcase` · era/origin: 2020s SaaS
- looks like: Feature grid, Comparison tables, Interactive demos, Pricing tiers, Documentation links
- use for: SaaS products, Complex software, Enterprise tools, API platforms, Developer tools
- avoid when: Simple products, Emotional purchases, Lifestyle brands, Quick conversions
- common industries: SaaS, Corporate & B2B, Startup & Tech
- palette: #4F46E5 #FFFFFF #1F2937 #10B981 #F59E0B #E5E7EB

#### Minimal & Direct

Strips away everything unnecessary. One message, one action, maximum clarity. Perfect for products that speak for themselves.

- slug: `minimal-direct` · era/origin: 2020s Minimalist
- looks like: Single focus, Clean, Fast loading, One CTA, Whitespace, Typography-led
- use for: Simple products, Apps, Waitlists, Coming soon pages, Single-feature tools
- avoid when: Complex products, Multiple offerings, E-commerce, Information-heavy sites
- common industries: SaaS, Startup & Tech
- palette: #000000 #FFFFFF #6B7280 #3B82F6

#### Social Proof-Focused

Lets your customers do the selling. Testimonials, case studies, and trust signals take center stage to build credibility.

- slug: `social-proof-focused` · era/origin: 2020s Trust Marketing
- looks like: Testimonials, Reviews, Case studies, Logos, User counts, Trust building
- use for: Services, B2C products, Consulting, Agencies, SaaS with strong user base
- avoid when: New products without users, Technical tools, Privacy-sensitive services where clients expect discretion, Niche markets
- common industries: SaaS, E-commerce, Corporate & B2B, Startup & Tech
- palette: #FFFFFF #1F2937 #2563EB #FCD34D #10B981 #F9FAFB

#### Interactive Product Demo

Show, don't tell. Embeds working demos directly in the landing page so visitors can experience the product firsthand.

- slug: `interactive-product-demo` · era/origin: 2020s Product-Led Growth
- looks like: Live demo, Interactive preview, Try before buy, Sandbox, Playground, Hands-on
- use for: Software products, Developer tools, Design tools, No-code platforms, APIs
- avoid when: Physical products, Services, Simple apps, Privacy-sensitive tools
- common industries: SaaS, Startup & Tech
- palette: #6366F1 #FFFFFF #1E1E1E #22C55E #F59E0B #F3F4F6

#### Trust & Authority

Establishes credibility through professional design and trust signals. Perfect for industries where reputation matters.

- slug: `trust-authority` · era/origin: 2020s Enterprise
- looks like: Professional, Credentials, Certifications, Awards, Media mentions, Expert positioning
- use for: B2B services, Enterprise software, Consulting firms, Legal/financial services, Healthcare
- avoid when: Casual products, Youth brands, Entertainment, Startup MVPs
- common industries: Healthcare, Fintech & Banking, Corporate & B2B, Legal & Professional
- palette: #1E3A5F #FFFFFF #C9A227 #2563EB #059669 #F3F4F6

#### Storytelling-Driven

Takes visitors on a journey. Uses narrative structure and emotional design to connect with audiences on a deeper level.

- slug: `storytelling-driven` · era/origin: 2020s Brand Marketing
- looks like: Narrative flow, Scroll story, Emotional journey, Brand story, Mission-driven, Impact focus
- use for: Brands with stories, Nonprofits, Mission-driven companies, Agencies, Personal brands
- avoid when: Quick conversions, E-commerce, Technical products, Impatient audiences
- common industries: Creative & Portfolio, Travel & Tourism, Nonprofit & Government
- palette: #0F172A #FFFFFF #059669 #064E3B #34D399 #F5F5F5

### BI & Analytics

#### Data-Dense Dashboard

Maximizes information density for power users who need to see everything at once. Every pixel serves a purpose.

- slug: `data-dense-dashboard` · era/origin: 2020s Data Tools
- looks like: Information density, Multi-panel, Compact tables, Small multiples, Data grids, Power user
- use for: Complex data analysis, Financial trading, Operations monitoring, Research tools, Power users
- avoid when: Executive summaries, Public dashboards, Mobile-first, Casual users
- common industries: SaaS, Fintech & Banking, Corporate & B2B
- palette: #1F2937 #FFFFFF #3B82F6 #10B981 #EF4444 #F59E0B #E5E7EB

#### Heatmap Dashboard

Uses color intensity to reveal patterns in large datasets. Perfect for geographic, behavioral, or time-series data.

- slug: `heatmap-dashboard` · era/origin: 2020s Data Viz
- looks like: Color intensity, Geographic data, Behavior patterns, Activity maps, Density visualization, Gradient scales
- use for: Geographic data, User behavior analysis, Website analytics, Resource allocation, Performance monitoring
- avoid when: Precise values needed, Small datasets, Colorblind-critical, Print-first
- common industries: SaaS, E-commerce, Real Estate
- palette: #1E293B #FFFFFF #440154 #3B528B #21918C #5EC962 #FDE725 #22C55E #F59E0B #3B82F6 #8B5CF6

#### Executive Dashboard

Distills complex data into key metrics. Large numbers, clear trends, and minimal noise for busy executives.

- slug: `executive-dashboard` · era/origin: 2020s Executive Tools
- looks like: KPI cards, High-level metrics, Clean layout, At-a-glance, Strategic view, Summary focused
- use for: C-suite summaries, Board reports, High-level monitoring, Status dashboards, Weekly reviews
- avoid when: Detailed analysis, Technical users, Real-time monitoring, Complex workflows
- common industries: SaaS, Fintech & Banking, Corporate & B2B
- palette: #FFFFFF #1F2937 #2563EB #10B981 #EF4444 #F59E0B #F3F4F6

#### Real-Time Monitoring

Built for operations centers with live-updating metrics, streaming charts, and instant alert visibility. Live demo, color palette, build notes and an AI prompt.

- slug: `realtime-monitoring` · era/origin: 2020s DevOps
- looks like: Live data, Streaming, Alerts, Status indicators, Time-series, Operations center
- use for: DevOps monitoring, Server health, IoT dashboards, Trading floors, Security operations
- avoid when: Historical analysis, Report generation, Offline use, Mobile viewing
- common industries: SaaS, Fintech & Banking, Corporate & B2B
- palette: #0F172A #FFFFFF #22C55E #EF4444 #F59E0B #3B82F6 #8B5CF6

#### Drill-Down Analytics

Start with the big picture, drill into details. Perfect for analysts who need to explore data at multiple levels.

- slug: `drill-down-analytics` · era/origin: 2020s Analytics
- looks like: Hierarchical, Expandable, Detail on demand, Progressive disclosure, Nested views, Exploration
- use for: Detailed data exploration, Hierarchical data, Root cause analysis, Audit trails, Research
- avoid when: Single-level KPI summaries with no breakdown, Flat data with no hierarchy, Mobile-first
- common industries: SaaS, Healthcare, Fintech & Banking, Corporate & B2B
- palette: #FFFFFF #1F2937 #6366F1 #10B981 #F59E0B #E5E7EB #C7D2FE

#### Comparative Analysis Dashboard

Designed for comparing two or more datasets side by side. Highlights differences and makes patterns obvious.

- slug: `comparative-analysis-dashboard` · era/origin: 2020s Business Intelligence
- looks like: Side-by-side, Benchmarking, A/B comparison, Period over period, Variance analysis, Ranking
- use for: A/B test results, Competitor analysis, Period comparisons, Benchmark reports, Performance reviews
- avoid when: Single metric focus, Time-series only, Real-time data, Simple dashboards
- common industries: SaaS, E-commerce, Fintech & Banking, Corporate & B2B
- palette: #FFFFFF #1E293B #2563EB #10B981 #EF4444 #F59E0B #E5E7EB

#### Predictive Analytics

Visualizes predictions and forecasts with confidence intervals. Shows what the data says about the future.

- slug: `predictive-analytics` · era/origin: 2020s ML/AI
- looks like: Forecasting, ML insights, Confidence intervals, Trend projection, Scenario modeling, What-if
- use for: Sales forecasting, Demand planning, Risk assessment, Capacity planning, ML model outputs
- avoid when: Historical reporting, Exact measurements, Regulatory compliance, Simple tracking
- common industries: SaaS, E-commerce, Fintech & Banking, Corporate & B2B
- palette: #1E1B4B #FFFFFF #8B5CF6 #A78BFA #22C55E #F59E0B #EC4899 #E5E7EB

#### User Behavior Analytics

Visualizes how users interact with products. Funnels, flows, and click maps reveal the user journey. Live demo, color palette, build notes and an AI prompt.

- slug: `user-behavior-analytics` · era/origin: 2020s Product Analytics
- looks like: Funnels, User flows, Session replay, Click maps, Journey mapping, Conversion paths
- use for: UX research, Product analytics, Conversion optimization, Customer journey, A/B testing
- avoid when: Financial data, Operations monitoring, Technical metrics, Executive summaries
- common industries: SaaS, E-commerce, Startup & Tech
- palette: #FFFFFF #0F172A #EC4899 #3B82F6 #22C55E #F59E0B #E5E7EB #B91C1C

#### Financial Dashboard

Purpose-built for financial data with proper number formatting, accounting conventions, and financial visualizations.

- slug: `financial-dashboard` · era/origin: 2020s Finance
- looks like: P&L, Balance sheet, Cash flow, Budgets, Variance, Financial statements
- use for: Finance teams, Accounting, Budget tracking, Investor reporting, CFO dashboards
- avoid when: Non-financial metrics, Marketing analytics, Technical dashboards, Consumer products
- common industries: Fintech & Banking, Corporate & B2B
- palette: #FFFFFF #1F2937 #059669 #DC2626 #2563EB #F59E0B #E5E7EB

#### Sales Intelligence Dashboard

Tracks the sales pipeline with quota progress, deal stages, activity metrics, and team leaderboards. Live demo, color palette, build notes and an AI prompt.

- slug: `sales-intelligence-dashboard` · era/origin: 2020s Sales Tech
- looks like: Pipeline, Quota tracking, Lead scoring, Activity metrics, Leaderboards, CRM analytics
- use for: Sales teams, CRM dashboards, Revenue operations, Sales managers, SDR teams
- avoid when: Product analytics, Technical dashboards, Finance reporting, Operations
- common industries: SaaS, Corporate & B2B, Startup & Tech
- palette: #FFFFFF #1E293B #2563EB #10B981 #F59E0B #EF4444 #E5E7EB

