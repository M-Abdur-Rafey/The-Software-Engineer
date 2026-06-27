# 3D Performance Rules

## Draw call budget

Target: < 100 draw calls per frame.

- Merge static geometries: `BufferGeometryUtils.mergeGeometries([geom1, geom2])`
- Instance repeated geometry: `new THREE.InstancedMesh(geometry, material, count)`
- Avoid per-object materials when possible — shared material = one draw call

## Texture rules

| Target | Max size |
|--------|----------|
| Mobile | 1024×1024 |
| Desktop | 2048×2048 |
| Hero asset (desktop-only) | 4096×4096 |

- Always power-of-two dimensions
- Use KTX2 (Basis Universal) for web delivery: `ktx2-encoder` CLI
- Mipmaps: enabled by default — only disable for UI plane textures

## Instancing (InstancedMesh)

```js
const count = 1000
const mesh = new THREE.InstancedMesh(geometry, material, count)
const matrix = new THREE.Matrix4()
for (let i = 0; i < count; i++) {
  matrix.setPosition(Math.random() * 20 - 10, 0, Math.random() * 20 - 10)
  mesh.setMatrixAt(i, matrix)
}
mesh.instanceMatrix.needsUpdate = true
scene.add(mesh)
```

## Memory disposal checklist

- `geometry.dispose()`
- `material.dispose()`
- `texture.dispose()`
- `renderer.dispose()`
- Remove object from scene: `scene.remove(obj)`
- Cancel animation: `cancelAnimationFrame(rafId)`

## Avoid per-frame allocations

```js
// BAD — creates new Vector3 every frame
camera.lookAt(new THREE.Vector3(0, 0, 0))

// GOOD — reuse instance
const _target = new THREE.Vector3(0, 0, 0)
camera.lookAt(_target)
```

## Stats.js (dev only)

```js
import Stats from 'stats.js'
const stats = new Stats()
stats.showPanel(0)  // 0: fps, 1: ms, 2: mb
document.body.appendChild(stats.dom)
// In loop: stats.begin() ... stats.end()
```
