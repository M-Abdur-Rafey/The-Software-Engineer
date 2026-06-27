# Physics Engine Selection & Setup

## Comparison

| Engine | Size | Accuracy | Best for |
|--------|------|----------|----------|
| cannon-es | ~120KB | Good | Simple rigid bodies, joints, vehicles |
| @dimforge/rapier3d-compat | ~2MB WASM | Excellent | Complex scenes, accurate collisions |
| ammo.js | ~3MB | Excellent | Bullet port — full feature parity |

## cannon-es setup

```js
import * as CANNON from 'cannon-es'

const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0),
  broadphase: new CANNON.SAPBroadphase(),  // faster than NaiveBroadphase for many bodies
})
world.solver.iterations = 10

// Create a box body
const boxBody = new CANNON.Body({
  mass: 1,
  shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
  linearDamping: 0.3,
})
boxBody.position.set(0, 5, 0)
world.addBody(boxBody)

// Sync loop — run before renderer.render()
world.fixedStep()  // or world.step(1/60, delta)
mesh.position.copy(boxBody.position)
mesh.quaternion.copy(boxBody.quaternion)
```

## Rapier setup

```js
import RAPIER from '@dimforge/rapier3d-compat'
await RAPIER.init()

const world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 })
const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 5, 0)
const rigidBody = world.createRigidBody(rigidBodyDesc)
const colliderDesc = RAPIER.ColliderDesc.ball(0.5)
world.createCollider(colliderDesc, rigidBody)

// In animation loop
world.step()
const pos = rigidBody.translation()
mesh.position.set(pos.x, pos.y, pos.z)
```
