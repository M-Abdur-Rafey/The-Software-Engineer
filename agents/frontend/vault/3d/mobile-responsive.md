# Mobile-Responsive 3D (4 Mandatory Rules)

Translating a 3D desktop experience to mobile is not just CSS media queries.
A heavy 3D scene throttles a phone's GPU. Touch UX on a WebGL canvas is notoriously difficult.
All four rules below are non-negotiable when `mobile: true`.

---

## Rule 1 — HTML UI overlays

**Never build user interface elements inside the WebGL canvas.**

The `<canvas>` lives in the background. All chat boxes, buttons, navigation, and controls
are HTML/CSS in an overlay layer on top.

```css
/* canvas — background layer */
canvas {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0;
}

/* UI — overlay layer */
.ui-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 10;
  pointer-events: none;  /* let clicks fall through to canvas by default */
}
.ui-overlay button,
.ui-overlay .chat {
  pointer-events: auto;  /* re-enable only for interactive elements */
}
```

Why:
- Text rendered as HTML is crisp on retina screens; Three.js text sprites are blurry
- Screen readers can parse HTML; they cannot read WebGL
- Responsive layout via CSS flexbox/grid is trivial; 3D layout is not

---

## Rule 2 — Dynamic pixel ratio clamping

High-end phones have 3× retina screens. Rendering 1-to-1 on a 3× screen pushes 9× the pixels
vs a 1× desktop — drains battery rapidly and throttles the GPU.

```js
// Raw Three.js
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
// Desktop-only scenes: cap at 2. Mobile-first scenes: cap at 1.5.
```

```jsx
// React Three Fiber
<Canvas dpr={[1, 1.5]}>
  {/* NEVER dpr={[1, 2]} for mobile-first scenes */}
```

The visual difference at 1.5 vs 3 is imperceptible at normal handheld viewing distance.
The performance difference is dramatic.

---

## Rule 3 — Touch-safe camera controls

Mouse-wheel zoom and click-drag rotation "scroll-jack" a phone — the user's thumb gets
trapped on the canvas and cannot scroll the page.

```js
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const controls = new OrbitControls(camera, renderer.domElement)
const isMobile = window.innerWidth < 768

if (isMobile) {
  controls.enableZoom = false   // no pinch-zoom (conflicts with page zoom)
  controls.enablePan  = false   // no two-finger pan
  // rotation-only is acceptable if the 3D object is the focus
}
```

If the canvas sits inside a scrollable page and the user must scroll past it:

```js
// Pass touch events through to the document on mobile
renderer.domElement.style.pointerEvents = isMobile ? 'none' : 'auto'
```

Or use a hit-zone approach: only capture touches that intersect the 3D object (raycaster),
pass all others to `document`.

---

## Rule 4 — Responsive field of view

A camera FOV that frames a subject correctly on 16:9 widescreen crops the subject
on a 9:16 phone screen.

```js
// Resize handler — raw Three.js
const BASE_FOV = 75     // desktop baseline
const BASE_Z   = 5      // desktop camera Z

function onResize() {
  const aspect = window.innerWidth / window.innerHeight
  camera.aspect = aspect
  // Push camera back on narrow viewports so subject stays in frame
  if (aspect < 1) {
    camera.fov = BASE_FOV * (1 / aspect) * 0.85
    camera.position.z = BASE_Z * 1.4
  } else {
    camera.fov = BASE_FOV
    camera.position.z = BASE_Z
  }
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}
window.addEventListener('resize', onResize)
onResize()  // run on mount
```

```jsx
// React Three Fiber hook
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

function useResponsiveFOV(baseFOV = 75, baseZ = 5) {
  const { camera, size } = useThree()
  useEffect(() => {
    const aspect = size.width / size.height
    if (aspect < 1) {
      camera.fov = baseFOV * (1 / aspect) * 0.85
      camera.position.z = baseZ * 1.4
    } else {
      camera.fov = baseFOV
      camera.position.z = baseZ
    }
    camera.updateProjectionMatrix()
  }, [size.width, size.height])
}
```

---

## Quick checklist

- [ ] Canvas is `z-index: 0`; all UI is `z-index ≥ 10` in HTML
- [ ] Pixel ratio capped at 1.5 (mobile-first) or 2 (desktop-first)
- [ ] OrbitControls zoom + pan disabled on `window.innerWidth < 768`
- [ ] Resize handler adjusts FOV or camera Z based on aspect ratio
- [ ] Tested on 390×844 (iPhone 14) and 412×915 (Pixel 7) viewports
