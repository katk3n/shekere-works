# Shekere Creative Coding Skill: Writing TSL (Three.js Shading Language)

## 🎯 Objective
This Skill is an instruction set for AI agents to write TSL (Three.js Node Materials) safely and correctly. TSL translates JavaScript node graphs into WebGPU/WebGL shaders. Because TSL is written in JavaScript, **AI agents often output code that contains fatal JavaScript Syntax Errors by mistakenly applying GLSL syntax concepts directly to JS.**

When writing or modifying a sketch that uses TSL, **you must strictly follow these rules to avoid silent compilation failures or black screens.**

> [!NOTE]
> **Global `TSL` Object & Destructuring**
> In Shekere, the `TSL` object is injected globally. However, individual functions like `vec3` or `Loop` are NOT global. To write clean, GLSL-like code without prefixing everything with `TSL.` (e.g., `TSL.vec3`), you should destructure the required functions at the top of your sketch:
> `const { vec3, float, Loop, Fn /* ... */ } = TSL;`

---

## 🚨 1. FATAL JAVASCRIPT ERRORS (Never do these)

### ❌ Rule 1: NEVER call methods directly on Float Literals
In JavaScript, `1.0.sub()` or `0.5.add()` will throw a **SyntaxError** because the parser cannot distinguish the decimal point from the method accessor. This prevents the entire file from loading.
- **BAD**: `const x = 1.0.sub(y);`
- **BAD**: `const x = 0.2.mul(y);`
- **GOOD**: `const x = float(1.0).sub(y);`
- **GOOD**: `const x = float(0.2).mul(y);`

### ❌ Rule 2: NEVER use `TSL.var()`
In modern Three.js (r165+), `TSL.var()` does not exist and will throw `undefined is not a function`.
- **BAD**: `const t = TSL.var(0.0);`
- **GOOD**: `const t = float(0.0).toVar();`

### ❌ Rule 3: Avoid mixing JS implicit type coercion in complex functions
Functions like `max`, `min`, and `mix` can fail internally if passed raw JavaScript numbers alongside TSL Nodes.
- **BAD**: `max(dot(n, l), 0.0)`
- **GOOD**: `max(dot(n, l), float(0.0))`

---

## 🏗️ 2. TSL Control Flow & State Mutations

### A. Mutable Variables (toVar)
When you need a variable that changes value inside a `Loop` or `Fn`, you must declare it with `.toVar()` and update it using `.assign()` or `.addAssign()`. Standard JavaScript `+=` will only reassign the JS reference, breaking the shader graph.
- **Setup**: `const t = float(0.0).toVar();`
- **Update**: `t.addAssign(d);`
- **Overwrite**: `t.assign(float(1.0));`

### B. Swizzling & Proxy Getters
In TSL, accessing a component (e.g., `uvNode.x`) returns a **new Swizzle Node**, not a mutable reference to the original vector's component.
- **BAD (Fails silently)**: `uvNode.x.mulAssign(aspect);`
- **GOOD (Reassign full vector)**: `uvNode.assign(vec2(uvNode.x.mul(aspect), uvNode.y));`

### C. Loops
Use the standard positional argument format for fixed iterations, which is robust across all compilers.
- **GOOD**: `Loop(80, () => { ... Break(); });`

---

## 🎨 3. Patterns for Raymarching & Fullscreen Quads

If you are writing a Raymarching visualizer, you usually want a perfect fullscreen quad that bypasses standard camera perspective projection.

### Safe Fullscreen Quad Override
To render a perfect fullscreen quad that works on both WebGL and WebGPU without clipping at the near plane, override the `vertexNode` and use a Z value of `0.5` (WebGPU clip space Z is 0 to 1).

```javascript
import { vec4, positionLocal } from 'three/nodes'; // or TSL destructured

const material = new THREE.MeshBasicNodeMaterial({
    colorNode: mainColor(),
    depthWrite: false,
    depthTest: false,
});

// CRITICAL: Z=0.5 prevents near/far plane clipping
material.vertexNode = vec4(positionLocal.x, positionLocal.y, 0.5, 1.0);

const geometry = new THREE.PlaneGeometry(2, 2);
const mesh = new THREE.Mesh(geometry, material);
mesh.frustumCulled = false; // Never cull this quad
scene.add(mesh);
```

---

## 📚 4. Reference Official Documentation
For a complete list of available math functions, node types, and advanced usage, always refer to the official Three.js Shading Language (TSL) documentation.

**Official Three.js TSL Docs:**
https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language

When in doubt about a specific math function or node availability, consult the official source rather than guessing GLSL equivalents.
