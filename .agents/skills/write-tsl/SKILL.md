---
name: shekere-write-tsl
description: Write or modify Three.js Shading Language (TSL) code for Shekere sketches. Use when a sketch uses TSL, node materials, WebGPU/WebGL shader nodes, raymarching, fullscreen shader quads, or when GLSL-like shader logic must be translated safely into JavaScript TSL.
---

# Shekere Write TSL

Use this skill whenever a Shekere sketch includes TSL or node-material shader logic. TSL is JavaScript node graph code that compiles to WebGPU/WebGL shaders; do not write GLSL syntax directly into JavaScript.

## Required Steps

1. Read `AGENTS.md` at the repository root.
2. Read the relevant Shekere sketch or example before editing.
3. Validate that generated code is JavaScript TSL, not GLSL pasted into JavaScript.

## Global `TSL` Object

In Shekere, the `TSL` object is injected globally. Individual helpers such as `vec3` or `Loop` are not global.

Destructure the required helpers at the top of the sketch:

```javascript
const { vec3, float, Loop, Fn } = TSL;
```

## Fatal JavaScript Errors

### Never call methods directly on float literals

JavaScript parses `1.0.sub()` and `0.5.add()` ambiguously and throws a syntax error.

Bad:

```javascript
const x = 1.0.sub(y);
const y = 0.2.mul(z);
```

Good:

```javascript
const x = float(1.0).sub(y);
const y = float(0.2).mul(z);
```

### Never use `TSL.var()`

Modern Three.js does not provide `TSL.var()`.

Bad:

```javascript
const t = TSL.var(0.0);
```

Good:

```javascript
const t = float(0.0).toVar();
```

### Avoid implicit JavaScript numbers in complex node functions

Some functions can fail if raw JavaScript numbers are mixed with TSL nodes.

Bad:

```javascript
max(dot(n, l), 0.0)
```

Good:

```javascript
max(dot(n, l), float(0.0))
```

## Control Flow And State

### Mutable variables

Use `.toVar()` for values that change inside `Loop` or `Fn`, and update them with `.assign()` or `.addAssign()`.

```javascript
const t = float(0.0).toVar();
t.addAssign(d);
t.assign(float(1.0));
```

Do not use JavaScript `+=` for TSL node mutation.

### Swizzling

Accessing a component such as `uvNode.x` returns a new swizzle node, not a mutable reference.

Bad:

```javascript
uvNode.x.mulAssign(aspect);
```

Good:

```javascript
uvNode.assign(vec2(uvNode.x.mul(aspect), uvNode.y));
```

### Loops

Use the positional fixed-iteration format:

```javascript
Loop(80, () => {
  // ...
  Break();
});
```

## Raymarching And Fullscreen Quads

For raymarching, use a fullscreen quad that bypasses perspective projection. Override `vertexNode` with clip-space-safe Z:

```javascript
const material = new THREE.MeshBasicNodeMaterial({
  colorNode: mainColor(),
  depthWrite: false,
  depthTest: false,
});

material.vertexNode = vec4(positionLocal.x, positionLocal.y, 0.5, 1.0);

const geometry = new THREE.PlaneGeometry(2, 2);
const mesh = new THREE.Mesh(geometry, material);
mesh.frustumCulled = false;
scene.add(mesh);
```

## References

When in doubt about node availability or math functions, consult the official Three.js TSL documentation instead of guessing GLSL equivalents:

https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language

## Finish

Confirm the edited sketch still exports the required Shekere lifecycle functions and avoids TSL syntax traps that can cause black screens.
