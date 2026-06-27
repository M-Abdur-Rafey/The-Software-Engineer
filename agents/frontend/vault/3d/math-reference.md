# 3D Math Reference

## Easing functions

```js
// Ease out cubic
const easeOut = t => 1 - Math.pow(1 - t, 3)

// Ease in-out sine
const easeInOutSine = t => -(Math.cos(Math.PI * t) - 1) / 2

// Spring (critically damped) — call each frame
function spring(current, target, velocity, stiffness = 150, damping = 20, dt = 1/60) {
  const force = -stiffness * (current - target) - damping * velocity
  velocity += force * dt
  current  += velocity * dt
  return { current, velocity }
}
```

## Quaternion interpolation (smooth camera rotation)

```js
const qA = new THREE.Quaternion()
const qB = new THREE.Quaternion()
camera.quaternion.slerp(qB, 0.05)  // 0.05 = smooth factor (lower = smoother)

// Look-at as quaternion
const dummy = new THREE.Object3D()
dummy.position.copy(camera.position)
dummy.lookAt(targetPosition)
camera.quaternion.slerp(dummy.quaternion, lerpFactor)
```

## Lerp / Damp (smooth position follow)

```js
// Linear lerp — not frame-rate independent
pos.lerp(target, 0.1)

// Frame-rate independent damp (prefer this)
import { damp } from 'maath/easing'
damp(camera.position, 'y', targetY, 0.3, delta)  // 0.3 = smoothing time
```

## Raycaster (mouse picking)

```js
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth)  * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
})

// In animation loop
raycaster.setFromCamera(mouse, camera)
const hits = raycaster.intersectObjects(scene.children, true)
if (hits.length > 0) {
  const first = hits[0].object
  // highlight first
}
```

## CatmullRom camera path

```js
const path = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-10, 2, 10),
  new THREE.Vector3(0, 5, 0),
  new THREE.Vector3(10, 2, -10),
], false, 'catmullrom', 0.5)

// Get point at scroll progress t ∈ [0,1]
const t = scrollProgress
const point = path.getPoint(t)
const tangent = path.getTangent(t)
camera.position.copy(point)
camera.lookAt(point.clone().add(tangent.multiplyScalar(3)))
```
