# GLSL Shader Cookbook

## Minimal ShaderMaterial

```js
const material = new THREE.ShaderMaterial({
  uniforms: {
    u_time:       { value: 0 },
    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    u_mouse:      { value: new THREE.Vector2(0, 0) },
  },
  vertexShader:   vertexShaderSource,
  fragmentShader: fragmentShaderSource,
})

// Update in animation loop
material.uniforms.u_time.value = clock.elapsedTime
```

## Wave displacement vertex shader

```glsl
uniform float u_time;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;
  pos.y += sin(pos.x * 3.0 + u_time * 2.0) * 0.1;
  pos.y += sin(pos.z * 2.5 + u_time * 1.5) * 0.08;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

## Rim lighting (Fresnel) fragment shader

```glsl
uniform vec3 u_rimColor;
uniform float u_rimStrength;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  float rim = 1.0 - abs(dot(normal, viewDir));
  rim = pow(rim, 3.0);
  vec3 color = mix(vec3(0.1), u_rimColor, rim * u_rimStrength);
  gl_FragColor = vec4(color, 1.0);
}
```

## Perlin noise (GLSL, paste inline)

```glsl
// Classic Perlin noise — vec3 → float
vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - 0.5;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  vec4 j = p - 49.0 * floor(p * (1.0/49.0));
  vec4 x_ = floor(j * (1.0/7.0));
  vec4 ns = 1.0/7.0 * x_ - 1.0;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m*m, vec4(dot(vec3(x_), vec3(x_)), dot(vec3(x1), vec3(x1)), dot(vec3(x2), vec3(x2)), dot(vec3(x3), vec3(x3))));
}
```

## Post-processing (EffectComposer)

```js
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.3, 0.9))

// Replace renderer.render() in loop with:
composer.render()
```
