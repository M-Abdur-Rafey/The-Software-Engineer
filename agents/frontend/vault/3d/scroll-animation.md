# Scroll-Driven 3D Animation

## Lenis (smooth scroll)

```js
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

const lenis = new Lenis()
lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add((time) => { lenis.raf(time * 1000) })
gsap.ticker.lagSmoothing(0)
```

## Camera path along a curve

```js
import { CatmullRomCurve3, Vector3, QuaternionKeyframeTrack } from 'three'

const cameraPath = new CatmullRomCurve3([
  new Vector3(0, 2, 10),
  new Vector3(5, 3, 5),
  new Vector3(10, 1, 0),
], false, 'catmullrom', 0.5)  // tension 0.5 = smooth

// In ScrollTrigger scrub
ScrollTrigger.create({
  trigger: '#scroll-container',
  start: 'top top',
  end: 'bottom bottom',
  scrub: 1.5,  // seconds lag for smoothness
  onUpdate: (self) => {
    const t = self.progress
    const point = cameraPath.getPoint(t)
    const tangent = cameraPath.getTangent(t)
    camera.position.copy(point)
    camera.lookAt(point.clone().add(tangent))
  }
})
```

## Pinned section with 3D reveal

```js
gsap.timeline({
  scrollTrigger: {
    trigger: '#hero-3d',
    start: 'top top',
    end: '+=200%',
    pin: true,
    scrub: true,
  }
})
.from(mesh.position, { y: -10, duration: 1 })
.from(mesh.rotation, { y: Math.PI * 2, duration: 1 }, '<')
```

## Object floating animation (idle loop)

```js
// In animation loop
mesh.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.15
mesh.rotation.y += delta * 0.3
```
