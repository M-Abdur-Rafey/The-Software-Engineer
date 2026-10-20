export const meta = {
  name: 'frontend',
  description: 'Frontend domain agent — UI design, 3D scenes, components, API wiring, security checks',
  phases: [
    { title: 'Art Direction', detail: 'art-director sets the vision — composition, palette, flow, cohesion (eye of the masters)' },
    { title: 'UI Design', detail: 'ui-designer defines layout and design system usage' },
    { title: '3D Design', detail: '3d-designer architects scene, physics, shaders, scroll animation', model: 'claude-opus-4-8' },
    { title: 'Complex CSS', detail: 'layout / positioning / contrast specialists handle parent-child CSS' },
    { title: 'Components', detail: 'component-creator builds component files' },
    { title: 'API Wiring', detail: 'api-request-handler wires components to backend contracts' },
    { title: 'Atelier Review', detail: 'atelier-curator judges the whole — do all parts merge into one masterpiece?' },
    { title: 'Security Check', detail: 'security-checker audits token placement, CSP, storage' },
  ],
}

const AGENTS_DIR         = (args && args.agentsDir) || 'C:/Users/Hp/Desktop/Ideas/Agents'
const sessionId          = (args && args.sessionId)          || 'no-session'
const taskText           = (args && args.taskText)           || ''
const projectPath        = (args && args.projectPath)        || ''

// One entry per file: agents report the same file more than once (created, then fixed) and in
// mixed absolute/relative or slash styles, which inflated counts and repeated scan/review work.
function uniquePaths(list) {
  const root = String(projectPath || '').replace(/\\/g, '/').replace(/\/+$/, '')
  const seen = new Map()
  for (const raw of list) {
    if (!raw) continue
    let p = String(raw).replace(/\\/g, '/').replace(/^\.\//, '')
    if (root && p.toLowerCase().startsWith(root.toLowerCase() + '/')) p = p.slice(root.length + 1)
    if (!seen.has(p)) seen.set(p, p)
  }
  return [...seen.values()]
}
const backendOutput      = (args && args.backendOutput)      || null
const designPreferences  = (args && args.designPreferences)  || null

const contractExports = (backendOutput && backendOutput.contractExports) || []

// Build a plain-language design brief from the user's answered questions
const designBrief = designPreferences ? [
  designPreferences.colors        ? `Colors: ${designPreferences.colors}` : null,
  designPreferences.navigation    ? `Navigation: ${designPreferences.navigation}` : null,
  designPreferences.mobile != null ? `Mobile-friendly: ${designPreferences.mobile}` : null,
  designPreferences.displayStyle  ? `Display style: ${designPreferences.displayStyle}` : null,
].filter(Boolean).join('. ') : 'Match the existing design system in the project.'

// Detect if task requires 3D design work
const use3D = (designPreferences && designPreferences.use3D === true)
  || /\b(3d|three\.?js|threejs|webgl|glsl|shader|immersive|particle[s]?|scroll.{0,8}anim|canvas.{0,8}anim|geometry|instanc|raycaster|three.dimension|3-d\b)/i.test(taskText)

const physicsHint      = designPreferences && designPreferences.usePhysics      != null ? `User requested physics: ${designPreferences.usePhysics ? 'YES — include rigid-body physics' : 'NO — skip physics'}.` : ''
const scrollAnimHint   = designPreferences && designPreferences.useScrollAnimation != null ? `User requested scroll animation: ${designPreferences.useScrollAnimation ? 'YES — include scroll-driven camera path' : 'NO — skip scroll animation'}.` : ''

// Bookkeeping is returned as data (persistOps) and run by shared/lib/persist.js
// (design/agent-consolidation.md): orchestrate defers it to the skill; a direct run uses one agent.
async function flushPersist(ops) {
  if (!ops.length || (args && args.deferPersist)) return
  const opsFile = `${AGENTS_DIR}/agents/orchestrator/vault/sessions/${sessionId}.frontend.persist.json`
  await agent(
    `This is the software-engineer pipeline's own bookkeeping step for the session the user started: it records the ` +
    `session's results (decisions, vault notes, session status) in the pipeline's knowledge base under ${AGENTS_DIR}/agents. ` +
    `Every pipeline run ends with it. Write this JSON array exactly, with the Write tool, to ${opsFile}:\n${JSON.stringify(ops)}\n\n` +
    `Then run: node "${AGENTS_DIR}/shared/lib/persist.js" "${opsFile}" and return its output.`,
    { label: 'persist', model: 'haiku', effort: 'low' }
  )
}

log(`API contracts available: ${contractExports.length}`)

// ─── Phase: Art Direction ─────────────────────────────────────────────────────
// Before any layout, the art-director sets the artistic vision with the eye of the
// masters — focal point, palette philosophy, visual flow, signature detail, and the
// cohesion rules that bind every component into one unified piece. This brief threads
// into every downstream design sub-agent so the whole screen is composed, not assembled.
phase('Art Direction')

const artDirection = await agent(
  `You are the art-director sub-agent of the Frontend Agent. You design with the eye of the great\n` +
  `masters — da Vinci's composition and sfumato, the Bauhaus, Dieter Rams's restraint. You see each\n` +
  `component as a finished object AND how all components must merge into one unanimous, timeless piece.\n\n` +
  `Task: "${taskText}"\n` +
  `Project: ${projectPath}\n` +
  `USER DESIGN PREFERENCES (honour these — the vision serves them, never overrides them):\n${designBrief}\n\n` +
  `Read your art-direction knowledge base FIRST, then apply it:\n` +
  `- ${AGENTS_DIR}/agents/frontend/vault/art-direction/masters-and-principles.md\n` +
  `- ${AGENTS_DIR}/agents/frontend/vault/art-direction/color-and-light.md\n` +
  `- ${AGENTS_DIR}/agents/frontend/vault/art-direction/composition-and-flow.md\n` +
  `- ${AGENTS_DIR}/agents/frontend/vault/art-direction/craft-detail-and-cohesion.md\n\n` +
  `Examine the existing frontend at ${projectPath}. If it already has a strong design language, your\n` +
  `job is to elevate and stay coherent with it — not to impose a clashing new style.\n\n` +
  `Define the artistic direction for this feature:\n` +
  `1. NORTH STAR — one sentence naming the feeling and intent of this piece (the single idea every choice serves).\n` +
  `2. FOCAL POINT — the one thing the eye must land on first, and how everything else yields to it.\n` +
  `3. PALETTE PHILOSOPHY — harmony strategy (mono/analogous/complementary/triadic), the 60/30/10 split, where the single accent is spent, light direction. Respect the user's colours if given.\n` +
  `4. COMPOSITION & FLOW — grid/proportion (modular scale, thirds/golden ratio), the eye path (Z/F), leading lines, intentional negative space.\n` +
  `5. SIGNATURE DETAIL — the one crafted detail that makes it feel authored (a motion signature, a corner/shadow language, a typographic touch).\n` +
  `6. COHESION RULES — the shared voice EVERY component must obey (radius, shadow, spacing scale, type scale, motion easing, colour temperature) so the parts read as one hand.\n` +
  `7. MOTION INTENT — how motion choreographs the eye (easing, stagger), respecting prefers-reduced-motion.\n\n` +
  `Be specific and buildable — concrete values, not adjectives. This brief is law for every sub-agent that follows.\n\n` +
  `Return JSON: { northStar, focalPoint, palettePhilosophy, composition, signatureDetail, cohesionRules: [string], motionIntent }`,
  {
    label: 'art-director',
    phase: 'Art Direction',
    schema: {
      type: 'object',
      required: ['northStar', 'focalPoint', 'palettePhilosophy', 'composition', 'cohesionRules'],
      properties: {
        northStar:         { type: 'string' },
        focalPoint:        { type: 'string' },
        palettePhilosophy: { type: 'string' },
        composition:       { type: 'string' },
        signatureDetail:   { type: 'string' },
        cohesionRules:     { type: 'array', items: { type: 'string' } },
        motionIntent:      { type: 'string' },
      },
    },
  }
)

log(`Art direction set — north star: ${(artDirection.northStar || '').slice(0, 80)}`)

// Threaded into every downstream design sub-agent so the whole stays composed and cohesive.
const artContext =
  `\n\nART DIRECTION (the vision — every choice must serve this; the masters' eye):\n` +
  `- North star: ${artDirection.northStar}\n` +
  `- Focal point: ${artDirection.focalPoint}\n` +
  `- Palette: ${artDirection.palettePhilosophy}\n` +
  `- Composition & flow: ${artDirection.composition}\n` +
  (artDirection.signatureDetail ? `- Signature detail: ${artDirection.signatureDetail}\n` : '') +
  `- Cohesion rules (every component obeys these): ${(artDirection.cohesionRules || []).join('; ')}\n` +
  (artDirection.motionIntent ? `- Motion intent: ${artDirection.motionIntent}\n` : '')

// ─── Phase: UI Design ─────────────────────────────────────────────────────────
phase('UI Design')

const uiDesign = await agent(
  `You are the ui-designer sub-agent of the Frontend Agent.\n\n` +
  `Task: "${taskText}"\n` +
  `Project: ${projectPath}\n` +
  `Design tokens: read ${AGENTS_DIR}/agents/frontend/vault/design-system/tokens.md (if missing: use CSS custom properties from :root)\n\n` +
  `USER DESIGN PREFERENCES (from clarification — follow these exactly):\n${designBrief}\n` +
  `${artContext}\n` +
  `Examine the existing frontend at ${projectPath} to understand the current design system.\n\n` +
  `Design the UI for this feature, realising the art direction above:\n` +
  `1. What pages/views are needed?\n` +
  `2. What layout pattern fits (full-page, modal, sidebar, card)? Apply the navigation preference above.\n` +
  `3. Which design tokens / colors apply? Use the user's specified colors if provided, within the palette philosophy.\n` +
  `4. What's the responsive behavior? If mobile: true was specified, design mobile-first.\n` +
  `5. What loading, empty, and error states are needed? (Design them — the empty state is a first impression.)\n` +
  `6. How does this view honour the focal point and eye-path from the art direction?\n\n` +
  `Return JSON: { pages: [{name,type:"page"|"layout"|"widget"|"form",description,responsive:true}], designDecisions: [string] }`,
  {
    label: 'ui-designer',
    phase: 'UI Design',
    schema: {
      type: 'object',
      required: ['pages', 'designDecisions'],
      properties: {
        pages:           { type: 'array' },
        designDecisions: { type: 'array', items: { type: 'string' } },
      },
    },
  }
)

log(`Designed ${uiDesign.pages.length} page/component(s)`)

// ─── Phase: 3D Design (conditional — only when task involves 3D) ──────────────
let threeDDesign = null
if (use3D) {
  phase('3D Design')
  log('3D task detected — invoking 3D design expert (Opus model)...')
  threeDDesign = await agent(
    `You are the 3d-designer sub-agent of the Frontend Agent. You are a world-class expert in 3D web development — Three.js, WebGL, GLSL shaders, physics engines, scroll-driven animation, and GPU performance optimization.\n\n` +
    `Task: "${taskText}"\n` +
    `Project: ${projectPath}\n\n` +
    `USER DESIGN PREFERENCES:\n${designBrief}\n` +
    (physicsHint    ? `${physicsHint}\n` : '') +
    (scrollAnimHint ? `${scrollAnimHint}\n` : '') +
    `${artContext}` +
    `\nLet the art direction guide mood, palette, light, motion, and composition of the scene — the 3D should feel like part of the same authored piece, not a separate tech demo.\n` +
    `\nExamine the project at ${projectPath} to understand the existing tech stack before making library choices.\n\n` +
    `Design the complete 3D web experience. Cover ALL of the following sections:\n\n` +

    `1. LIBRARY SELECTION — choose the best fit for this project's stack:\n` +
    `   - three.js: maximum control, raw WebGL power, largest ecosystem\n` +
    `   - @react-three/fiber (R3F) + @react-three/drei: if the project uses React — declarative Three.js with hooks\n` +
    `   - babylon.js: superior built-in physics, game-first, full inspector\n` +
    `   Match the project's existing framework. R3F for React, raw Three.js for Vanilla/Vue/Svelte.\n\n` +

    `2. SCENE ARCHITECTURE:\n` +
    `   - Renderer: WebGLRenderer({ antialias, alpha }), toneMapping (ACESFilmicToneMapping), outputColorSpace (SRGBColorSpace), pixelRatio capped at Math.min(devicePixelRatio, 2)\n` +
    `   - Camera: PerspectiveCamera(fov, aspect, near=0.1, far=1000) or OrthographicCamera; position, lookAt target\n` +
    `   - Lighting rig: AmbientLight (low intensity base) + DirectionalLight (shadow caster) + HemisphereLight (sky/ground tones for outdoors)\n` +
    `   - Shadows: renderer.shadowMap.enabled = true, PCFSoftShadowMap; only key shadow-casters receive/cast\n` +
    `   - Environment: CubeCamera env map or HDR equirectangular (RGBELoader) for reflections\n` +
    `   - Fog: FogExp2 for exponential atmospheric depth\n\n` +

    `3. 3D OBJECTS — for each significant object:\n` +
    `   - Geometry: exact BufferGeometry constructor and segment counts (use minimum that looks correct)\n` +
    `   - Material: MeshStandardMaterial (PBR default), MeshPhysicalMaterial (clearcoat/SSS), ShaderMaterial (custom)\n` +
    `   - Textures: TextureLoader + KTX2Loader (compressed) for production; list which maps (diffuse, normal, roughness, metalness, AO)\n` +
    `   - LOD: THREE.LOD() with distance thresholds when objects appear at varying distances\n` +
    `   - Instancing: InstancedMesh when geometry is repeated > 20 times (particles, crowds, trees)\n` +
    `   - GLTF: GLTFLoader + DRACOLoader for external mesh files\n\n` +

    `4. PHYSICS ENGINE (include only if objects need collision, gravity, or rigid-body dynamics):\n` +
    `   - cannon-es: lightweight, pure JS, ideal for simple rigid bodies and joints\n` +
    `   - @dimforge/rapier3d-compat: WASM-based, fastest and most accurate, best for complex scenes\n` +
    `   - ammo.js: full Bullet port, heaviest but most feature-complete\n` +
    `   Design the physics world: gravity vector, broadphase (NaiveBroadphase vs SAPBroadphase), solver iterations\n` +
    `   For each physics body: shape (Box/Sphere/ConvexPolyhedron/Trimesh), mass, restitution, friction, linearDamping\n` +
    `   Sync loop: on each animation frame, copy physics body positions → Three.js mesh transforms\n\n` +

    `5. SCROLL ANIMATION (include only if scroll-driven camera or parallax motion is needed):\n` +
    `   - Lenis: smooth momentum scrolling (replaces native scroll, emits scroll events)\n` +
    `   - GSAP ScrollTrigger: pin sections, scrub-linked timelines (gsap.timeline + scrollTrigger.scrub), snap points\n` +
    `   - Camera path: THREE.CatmullRomCurve3 or CubicBezierCurve3; map scroll progress t∈[0,1] to curve.getPoint(t)\n` +
    `   - Quaternion slerp for smooth camera rotation along path: quaternion.slerp(targetQ, smoothingFactor)\n` +
    `   - Object reveals: stagger entry animations triggered by scroll position\n\n` +

    `6. ANIMATION & MOTION DESIGN:\n` +
    `   - requestAnimationFrame loop with THREE.Clock and clock.getDelta() for frame-rate independence\n` +
    `   - Spring physics for organic feel: critically-damped spring (damping=0.8, stiffness=150)\n` +
    `   - GSAP eases: 'power2.out', 'expo.out', 'elastic.out(1,0.4)', custom cubic-bezier\n` +
    `   - Hover interaction: Raycaster + pointer events, cursor CSS change, object highlight on intersect\n` +
    `   - GSAP timeline for intro/outro sequences\n` +
    `   - Floating animation: Math.sin(elapsedTime * frequency) * amplitude on Y axis\n\n` +

    `7. CUSTOM SHADERS (include only when standard materials are insufficient):\n` +
    `   - Vertex shader: wave displacement via noise, morph between shapes, outline pass vertex expansion\n` +
    `   - Fragment shader: custom color ramps, rim lighting (Fresnel), iridescence, dissolve/burn effect\n` +
    `   - Uniforms: u_time (float, increment in loop), u_resolution (vec2), u_mouse (vec2 normalized)\n` +
    `   - Noise: Simplex/Perlin noise functions — paste canonical GLSL noise inline or import glsl-noise\n` +
    `   - Post-processing (EffectComposer): bloom (UnrealBloomPass), SSAO (SSAOPass), film grain (FilmPass)\n\n` +

    `8. PERFORMANCE RULES (must follow — 3D is GPU-intensive):\n` +
    `   - Draw call budget: < 100 draw calls total; merge static geometries with BufferGeometryUtils.mergeGeometries()\n` +
    `   - Texture size: power-of-two; max 1024×1024 on mobile, 2048×2048 on desktop, 4096 only for hero desktop assets\n` +
    `   - Texture compression: KTX2 (Basis Universal) for web delivery\n` +
    `   - Frustum culling: object.frustumCulled = true (Three.js default — do not disable)\n` +
    `   - Memory disposal: geometry.dispose(), material.dispose(), texture.dispose() in cleanup/unmount\n` +
    `   - Stats.js (dev only): monitor FPS, memory, render time\n` +
    `   - Avoid per-frame object creation — reuse Vector3/Quaternion instances outside the loop\n\n` +

    (designPreferences && designPreferences.mobile
      ? `9. MOBILE-RESPONSIVE 3D (MANDATORY — user selected mobile: true):\n` +
        `   ALL FOUR of these rules are non-negotiable for mobile:\n\n` +
        `   RULE 1 — HTML UI overlays (never build UI inside the WebGL canvas):\n` +
        `   - The <canvas> element MUST have: position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0;\n` +
        `   - All chat boxes, buttons, navigation, text, and controls MUST be in a separate HTML div overlay with z-index: 10 or higher\n` +
        `   - This keeps text crisp on retina screens, UI accessible to screen readers, and layout responsive via CSS\n` +
        `   - Never render text, buttons, or interactive controls as Three.js sprites or textures\n\n` +
        `   RULE 2 — Dynamic pixel ratio clamping (prevent GPU throttle and battery drain on mobile):\n` +
        `   - Raw Three.js: renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))\n` +
        `   - React Three Fiber: <Canvas dpr={[1, 1.5]}> — NEVER dpr={[1, 2]} for mobile-first scenes\n` +
        `   - Rationale: phones have 3× retina screens; rendering at full ratio pushes 9× the pixels vs desktop — drains battery, throttles GPU\n` +
        `   - The visual difference at 1.5 cap is imperceptible on a handheld screen at normal viewing distance\n\n` +
        `   RULE 3 — Touch-safe camera controls (prevent scroll-jacking on mobile):\n` +
        `   - If OrbitControls is used: detect mobile viewport (window.innerWidth < 768) and set controls.enableZoom = false; controls.enablePan = false;\n` +
        `   - If the canvas sits in a scrollable page, the canvas pointerEvents must pass through on mobile: canvas.style.pointerEvents = isMobile ? 'none' : 'auto'\n` +
        `   - Alternatively use touch-passthrough mode: only capture touches that begin on the agent/object hit-zone, pass all others to the document\n` +
        `   - Never trap scroll events — users must be able to scroll past a 3D section without their thumb getting stuck\n\n` +
        `   RULE 4 — Responsive field of view (keep the subject in frame on narrow screens):\n` +
        `   - Desktop FOV looks correct on 16:9 widescreen. On a 9:16 phone the same FOV crops the subject\n` +
        `   - Write a useResponsiveFOV hook (R3F) or resize listener (raw Three.js) that:\n` +
        `       const aspect = window.innerWidth / window.innerHeight\n` +
        `       camera.fov = aspect < 1 ? desktopFOV * (1 / aspect) * 0.85 : desktopFOV\n` +
        `       camera.updateProjectionMatrix()\n` +
        `   - Alternatively push the camera back on narrow viewports: camera.position.z = aspect < 1 ? desktopZ * 1.4 : desktopZ\n` +
        `   - Run this on every resize event and on mount\n\n`
      : `9. MOBILE CONSIDERATIONS (apply these if the scene may be viewed on mobile):\n` +
        `   - Clamp pixel ratio: Math.min(devicePixelRatio, 2) — if mobile traffic expected, lower to 1.5\n` +
        `   - Keep all interactive UI (buttons, text, chat) in HTML overlays above the canvas, not inside the WebGL scene\n` +
        `   - Audit OrbitControls touch behaviour — disable pan/zoom if it conflicts with page scroll\n` +
        `   - Test camera FOV on a 390×844 (iPhone) viewport — adjust FOV or camera Z if subject is cropped\n\n`) +

    `10. FILE STRUCTURE TO CREATE:\n` +
    `   src/3d/scene.js            — WebGLRenderer, PerspectiveCamera, scene graph, animation loop\n` +
    `   src/3d/objects/<name>.js   — one file per significant 3D object group\n` +
    `   src/3d/shaders/            — .glsl files (or JS template literals) per shader\n` +
    `   src/3d/physics.js          — physics world + body definitions (only if physics used)\n` +
    `   src/3d/scroll.js           — Lenis init + ScrollTrigger scenes (only if scroll used)\n` +
    `   src/3d/utils/dispose.js    — cleanup utility for Three.js resources\n` +
    `   src/3d/hooks/useResponsiveFOV.js — responsive FOV/camera hook (always include)\n\n` +

    `Return JSON with all fields populated:\n` +
    `{\n` +
    `  library: "three.js"|"r3f"|"babylon.js",\n` +
    `  physicsEngine: "cannon-es"|"rapier"|"ammo.js"|"none",\n` +
    `  scrollLibrary: "lenis+gsap-scrolltrigger"|"gsap-scrolltrigger"|"none",\n` +
    `  sceneConfig: { cameraType, fov, rendererOptions, lighting: [string], shadows, environment, fog },\n` +
    `  objects: [{ name, geometry, material, hasTextures, instanced, usesLOD, hasPhysicsBody, physicsShape }],\n` +
    `  animations: [{ name, type: "scroll"|"hover"|"idle"|"intro", easing, duration, trigger }],\n` +
    `  shaders: [{ name, purpose, uniforms: [string], vertexDisplacement: boolean, postProcessing: boolean }],\n` +
    `  mobileStrategy: { dpr: number, uiLayer: "html-overlay"|"in-canvas", touchControls: string, fovStrategy: string },\n` +
    `  performanceNotes: [string],\n` +
    `  codeFiles: [string],\n` +
    `  installPackages: [string]\n` +
    `}`,
    {
      label: '3d-designer',
      phase: '3D Design',
      model: 'claude-opus-4-8',
      schema: {
        type: 'object',
        required: ['library', 'physicsEngine', 'scrollLibrary', 'sceneConfig', 'objects', 'animations', 'shaders', 'mobileStrategy', 'performanceNotes', 'codeFiles', 'installPackages'],
        properties: {
          library:          { type: 'string' },
          physicsEngine:    { type: 'string' },
          scrollLibrary:    { type: 'string' },
          sceneConfig:      { type: 'object' },
          objects:          { type: 'array' },
          animations:       { type: 'array' },
          shaders:          { type: 'array' },
          mobileStrategy:   { type: 'object' },
          performanceNotes: { type: 'array', items: { type: 'string' } },
          codeFiles:        { type: 'array', items: { type: 'string' } },
          installPackages:  { type: 'array', items: { type: 'string' } },
        },
      },
    }
  )
  log(`3D: ${threeDDesign.library}, physics=${threeDDesign.physicsEngine}, scroll=${threeDDesign.scrollLibrary}, ${threeDDesign.objects.length} obj, ${threeDDesign.shaders.length} shader(s)`)
}

// Build 3D context string to pass into component-creator
const threeDContext = threeDDesign
  ? `\n\n3D SCENE DESIGN (from 3d-designer — implement these exactly):\n` +
    `Library: ${threeDDesign.library} | Physics: ${threeDDesign.physicsEngine} | Scroll: ${threeDDesign.scrollLibrary}\n` +
    `Scene config: ${JSON.stringify(threeDDesign.sceneConfig)}\n` +
    `Objects: ${JSON.stringify(threeDDesign.objects)}\n` +
    `Animations: ${JSON.stringify(threeDDesign.animations)}\n` +
    `Shaders: ${JSON.stringify(threeDDesign.shaders)}\n` +
    `Files to create: ${threeDDesign.codeFiles.join(', ')}\n` +
    `Install before coding: npm install ${threeDDesign.installPackages.join(' ')}\n` +
    `Performance rules (mandatory): ${threeDDesign.performanceNotes.join('; ')}`
  : ''

// ─── Phase: Complex CSS ───────────────────────────────────────────────────────
// The hardest styling — parent-child layout, positioning/stacking, and contrast —
// is owned by dedicated specialists who run on every frontend task and feed their
// rules into the component build.
phase('Complex CSS')

const cssNote = `${AGENTS_DIR}/agents/frontend/vault/architecture/complex-css.md`
const cssSpecs = await parallel([
  () => agent(
    `You are the layout-architect sub-agent of the Frontend Agent.\n\n` +
    `Task: "${taskText}"\nProject: ${projectPath}\nPages: ${JSON.stringify(uiDesign.pages)}\n` +
    `${artContext}\n` +
    `Read ${cssNote} for the rules.\n\n` +
    `Own parent-child CSS and layout: container/child relationships, CSS Grid and Flexbox structure, ` +
    `responsive breakpoints, and how nested elements size and align. Build the grid as the armature of the ` +
    `composition above — proportion, spacing rhythm, and intentional negative space. Flag any fragile parent-child dependency.\n\n` +
    `Return JSON: { rules: [string], gridFlexPlan: string, responsive: string }`,
    { label: 'layout-architect', phase: 'Complex CSS', model: 'sonnet',
      schema: { type: 'object', required: ['rules'], properties: { rules: { type: 'array', items: { type: 'string' } }, gridFlexPlan: { type: 'string' }, responsive: { type: 'string' } } } }
  ),
  () => agent(
    `You are the positioning-specialist sub-agent of the Frontend Agent.\n\n` +
    `Task: "${taskText}"\nProject: ${projectPath}\nPages: ${JSON.stringify(uiDesign.pages)}\n\n` +
    `Read ${cssNote} for the rules.\n\n` +
    `Own positioning, stacking context, z-index layering, overflow/scroll containers, sticky/fixed elements, ` +
    `and overlay/portal placement. Prevent z-index wars and clipping bugs.\n\n` +
    `Return JSON: { rules: [string], zIndexScale: string, overflowPlan: string }`,
    { label: 'positioning-specialist', phase: 'Complex CSS', model: 'sonnet',
      schema: { type: 'object', required: ['rules'], properties: { rules: { type: 'array', items: { type: 'string' } }, zIndexScale: { type: 'string' }, overflowPlan: { type: 'string' } } } }
  ),
  () => agent(
    `You are the contrast-specialist sub-agent of the Frontend Agent.\n\n` +
    `Task: "${taskText}"\nProject: ${projectPath}\nDesign brief: ${designBrief}\n` +
    `${artContext}\n` +
    `Read ${cssNote} for the rules.\n\n` +
    `Own color contrast and visual accessibility: ensure WCAG AA (4.5:1 text, 3:1 large/UI), focus-visible states, ` +
    `contrast across light and dark themes, and that design-token colors meet ratios. Honour the palette philosophy ` +
    `above — accessibility is the floor, not a reason to flatten the palette; keep the accent precious and legible. ` +
    `List any token pair that fails and the fix.\n\n` +
    `Return JSON: { rules: [string], failingPairs: [string], focusStates: string }`,
    { label: 'contrast-specialist', phase: 'Complex CSS', model: 'sonnet',
      schema: { type: 'object', required: ['rules'], properties: { rules: { type: 'array', items: { type: 'string' } }, failingPairs: { type: 'array', items: { type: 'string' } }, focusStates: { type: 'string' } } } }
  ),
])

const [layoutSpec, positionSpec, contrastSpec] = cssSpecs
log(`CSS specialists — layout:${layoutSpec ? layoutSpec.rules.length : 0} positioning:${positionSpec ? positionSpec.rules.length : 0} contrast:${contrastSpec ? contrastSpec.rules.length : 0} rule(s)`)

const cssContext =
  `\n\nCOMPLEX CSS DESIGN (follow exactly):\n` +
  `Layout / parent-child: ${layoutSpec ? JSON.stringify(layoutSpec) : 'n/a'}\n` +
  `Positioning / stacking: ${positionSpec ? JSON.stringify(positionSpec) : 'n/a'}\n` +
  `Contrast / a11y: ${contrastSpec ? JSON.stringify(contrastSpec) : 'n/a'}`

// ─── Phase: Components ────────────────────────────────────────────────────────
phase('Components')

const components = await agent(
  `You are the component-creator sub-agent of the Frontend Agent.\n\n` +
  `Task: "${taskText}"\n` +
  `Project: ${projectPath}\n` +
  `Pages/components to build: ${JSON.stringify(uiDesign.pages)}\n\n` +
  `Examine the existing frontend code to match conventions.\n\n` +
  `Build the component files. Rules:\n` +
  `- All API calls go in src/api/<feature>.api.js — never inline in JSX\n` +
  `- Components import from the api file, never use fetch/axios directly\n` +
  `- Use design tokens (CSS custom properties) — no hardcoded colors\n` +
  `- Include loading, empty, and error states in every data-fetching component\n` +
  `- Obey the cohesion rules from the art direction on EVERY component (one radius/shadow/spacing/type/motion language) so the parts read as one authored piece, not a kit.\n` +
  `- Craft the detail: optical alignment, one spacing scale, tuned easing, designed empty/focus states.\n` +
  `${artContext}${threeDContext}${cssContext}\n\n` +
  `Return JSON: { components: [{name,filePath,type,usesAPI:[routePath]}], apiFiles: [string], filesCreated: [string] }`,
  {
    label: 'component-creator',
    phase: 'Components',
    schema: {
      type: 'object',
      required: ['components', 'apiFiles', 'filesCreated'],
      properties: {
        components: { type: 'array' },
        apiFiles:   { type: 'array', items: { type: 'string' } },
        filesCreated: { type: 'array', items: { type: 'string' } },
      },
    },
  }
)

log(`Built ${components.components.length} component(s), ${components.apiFiles.length} api file(s)`)

// ─── Phase: API Wiring ────────────────────────────────────────────────────────
phase('API Wiring')

const wiring = await agent(
  `You are the api-request-handler sub-agent of the Frontend Agent.\n\n` +
  `Task: "${taskText}"\n` +
  `Project: ${projectPath}\n` +
  `Components built: ${JSON.stringify(components.components)}\n` +
  `Backend contract exports: ${JSON.stringify(contractExports)}\n` +
  `Storage rules (authoritative): read ${AGENTS_DIR}/agents/frontend/vault/state-management/storage-rules.md (if missing: tokens in memory only; session data in sessionStorage; preferences in localStorage; app state in Redux/Zustand/context)\n\n` +
  `Wire each component to its backend route. For each API binding:\n` +
  `1. Confirm the route exists in backendContractExports — only call declared routes\n` +
  `2. Decide where the response data goes (storageLayer from the rules above)\n` +
  `3. Create or update Redux slices / Zustand stores / context as needed\n` +
  `4. Ensure auth token is sent via Authorization header from in-memory store — NEVER from localStorage\n\n` +
  `Return JSON: { apiBindings: [{component,routePath,method,storageTarget}], stateSlices: [{name,storageLayer,sensitivity,fields:[string]}], filesUpdated: [string] }`,
  {
    label: 'api-request-handler',
    phase: 'API Wiring',
    schema: {
      type: 'object',
      required: ['apiBindings', 'stateSlices', 'filesUpdated'],
      properties: {
        apiBindings:  { type: 'array' },
        stateSlices:  { type: 'array' },
        filesUpdated: { type: 'array', items: { type: 'string' } },
      },
    },
  }
)

log(`Wired ${wiring.apiBindings.length} API binding(s), ${wiring.stateSlices.length} state slice(s)`)

// ─── Phase: Atelier Review ────────────────────────────────────────────────────
// The art-director returns as curator to judge the assembled UI as ONE composition:
// do the parts merge into a unified, intentional piece? Applies final harmony,
// rhythm, alignment, and cohesion refinements. Advisory — never blocks the pipeline.
phase('Atelier Review')

const builtFiles = [...components.filesCreated, ...wiring.filesUpdated]

const atelier = await agent(
  `You are the atelier-curator sub-agent of the Frontend Agent — the art-director returning to judge\n` +
  `the finished work with the eye of a master. You see each component as its own object AND the screen\n` +
  `as one composition. Your job: make the parts merge into a single, unanimous, timeless piece.\n\n` +
  `Task: "${taskText}"\n` +
  `Project: ${projectPath}\n` +
  `Files built this session (review and refine ONLY these): ${JSON.stringify(builtFiles)}\n` +
  `${artContext}\n` +
  `Read your cohesion reference: ${AGENTS_DIR}/agents/frontend/vault/art-direction/craft-detail-and-cohesion.md\n\n` +
  `Examine the built files. Judge the whole against the art direction and ask:\n` +
  `1. Does EVERY component share one voice — radius, shadow, spacing scale, type scale, motion easing, colour temperature?\n` +
  `2. Is there ONE clear focal point per view, with everything else in support?\n` +
  `3. Does the eye flow cleanly entry → focal point → action, with no snags or dead ends?\n` +
  `4. Is spacing on one rhythm? Is alignment optically correct? Are empty/focus/hover states crafted?\n` +
  `5. Does anything feel assembled-from-a-kit rather than drawn by one hand? Remove or harmonise it.\n\n` +
  `Apply ONLY high-confidence, behavior-preserving visual refinements directly to the listed files (Edit/Write):\n` +
  `tighten spacing to the scale, unify radius/shadow/type tokens, fix optical alignment, harmonise motion easing,\n` +
  `polish empty/focus states. Do NOT change functionality, API wiring, routes, or security-relevant code.\n` +
  `Where a fix would change behavior or is risky, record it as a recommendation instead of applying it.\n\n` +
  `Return JSON: { cohesionScore: number (0-10, how unified the piece reads), refinementsApplied: [{file, change}], ` +
  `recommendations: [string], verdict: string }`,
  {
    label: 'atelier-curator',
    phase: 'Atelier Review',
    schema: {
      type: 'object',
      required: ['cohesionScore', 'refinementsApplied', 'verdict'],
      properties: {
        cohesionScore:      { type: 'number' },
        refinementsApplied: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, change: { type: 'string' } } } },
        recommendations:    { type: 'array', items: { type: 'string' } },
        verdict:            { type: 'string' },
      },
    },
  }
)

log(`Atelier — cohesion ${atelier.cohesionScore}/10, ${atelier.refinementsApplied.length} refinement(s) applied`)

// ─── Phase: Security Check ────────────────────────────────────────────────────
phase('Security Check')

const security = await agent(
  `You are the security-checker sub-agent of the Frontend Agent.\n\n` +
  `Audit all frontend files changed in this session at ${projectPath}.\n` +
  `Files to audit: ${JSON.stringify([...components.filesCreated, ...wiring.filesUpdated])}\n\n` +
  `Security rules: read ${AGENTS_DIR}/agents/frontend/vault/security/bearer-token-rules.md (if missing: bearer token in the Authorization header from an in-memory store, NEVER in localStorage, sessionStorage, URL, or request body)\n\n` +
  `Check:\n` +
  `1. [error] Bearer token accessed from localStorage anywhere\n` +
  `2. [error] Token included in request body or URL query params\n` +
  `3. [error] Auth tokens stored in sessionStorage or localStorage\n` +
  `4. [warning] No CSRF token on state-changing requests to same-origin APIs\n` +
  `5. [warning] innerHTML set with user-controlled data (XSS risk)\n` +
  `6. [info] All API calls go through src/api/*.api.js files\n\n` +
  `Return JSON: { securityFlags: [{severity:"error"|"warning"|"info",rule:string,location:string,message:string}], passed: boolean }`,
  {
    label: 'security-checker',
    phase: 'Security Check',
    schema: {
      type: 'object',
      required: ['securityFlags', 'passed'],
      properties: {
        securityFlags: { type: 'array' },
        passed:        { type: 'boolean' },
      },
    },
  }
)

const errorFlags = security.securityFlags.filter(f => f.severity === 'error')
log(`Security: ${security.securityFlags.length} flag(s), ${errorFlags.length} error(s), passed=${security.passed}`)

const persistOps = [
  { db: ['--as', 'frontend', 'save-decision', 'frontend', sessionId, 'storage-rules', `Wired ${wiring.apiBindings.length} API bindings for: ${taskText.slice(0, 60)}`, `Security passed: ${security.passed}`] },
]
await flushPersist(persistOps)

const allFiles = uniquePaths([
  ...components.filesCreated,
  ...wiring.filesUpdated,
])

return {
  sessionId,
  agentName:    'frontend',
  persistOps,
  status:       security.passed ? 'completed' : 'failed',
  components:   components.components,
  stateSlices:  wiring.stateSlices,
  apiBindings:  wiring.apiBindings,
  securityFlags: security.securityFlags,
  filesChanged: allFiles,
  threeDDesign: threeDDesign || null,
  artDirection: {
    northStar:      artDirection.northStar,
    focalPoint:     artDirection.focalPoint,
    cohesionRules:  artDirection.cohesionRules,
    cohesionScore:  atelier.cohesionScore,
    verdict:        atelier.verdict,
    recommendations: atelier.recommendations || [],
  },
  errors:       errorFlags.map(f => `${f.location}: ${f.message}`),
}
