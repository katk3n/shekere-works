---
name: shekere-preview-sketch
description: Create local, touch-friendly HTML mini-apps that preview the visual intent of a Shekere sketch without requiring the Shekere app. Use when a user wants to inspect a newly created or existing Shekere work on a phone, compare multiple visual directions, asks for a lightweight preview, or asks to create mobile previews alongside a sketch.
---

# Shekere Preview Sketch

Create an intentionally approximate visual preview, not a second Shekere runtime. It must communicate composition, palette, motion, and likely audio response on a phone.

## Runtime Fidelity

Keep every depicted interaction and reaction implementable in the Shekere runtime. Do not add artwork behavior driven by inputs that the target sketch cannot receive, such as tapping or dragging the rendered scene when Shekere does not expose those inputs. Use touch and pointer events only to operate the preview UI controls.

When no target sketch exists yet, limit proposed reactions to documented Shekere inputs and capabilities, such as audio features, MIDI, OSC, time-based animation, and supported post-processing. Treat Energy, Bass, and Sparkle as manual preview stand-ins for those inputs, not as permission to invent additional interaction modes.

## Workflow

1. Read the target sketch and `shekere-create-sketch` when a new sketch is also being created.
2. Identify visual primitives, color system, idle behavior, and audio/MIDI/OSC mappings.
3. Create `previews/<sketch_name>/index.html`, using lowercase snake_case for `<sketch_name>`.
4. Choose the renderer: use the verified Three.js CDN workflow for 3D composition, geometry, lighting, or camera motion; use the standalone Canvas template for lightweight studies or as a fallback.
5. Open the HTML locally for a smoke check. Confirm the idle frame renders and controls work with mouse and touch.

Keep the preview separate. Do not alter `sketches/*.js` just to accommodate it.

## Multiple Directions

When the user asks for alternatives, retain `index.html` as the current or selected direction and create each other direction as `previews/<sketch_name>/<direction_name>.html`. Use concise lowercase snake_case direction names such as `tide.html` or `orbit.html`.

Make every direction independently runnable. Vary the composition, palette, movement, or input mapping enough that the comparison is meaningful, and briefly state the creative distinction between the files.

## Verified Three.js CDN Runtime

Use the jsDelivr URL for the exact Three.js version matching Shekere. Obtain a SHA-512 hash from the matching trusted npm package, add it to a `modulepreload` link, and import that exact same URL:

```html
<link rel="modulepreload" href="https://cdn.jsdelivr.net/npm/three@<version>/build/three.module.min.js"
  integrity="sha512-<trusted-hash>" crossorigin="anonymous">
<script>import('https://cdn.jsdelivr.net/npm/three@<version>/build/three.module.min.js')</script>
```

Never use `latest`; pin the exact version. On an integrity, network, or module-load failure, execute no Three.js code and render the Canvas fallback instead.

Add a `no-referrer` meta tag and a CSP meta tag to every CDN-backed preview. Generate hashes from the browser-parsed contents of its exact inline script and style. Allow only that script, the jsDelivr module origin, inline hashed styles, and `data:` images. Deny network connections, forms, frames, workers, media, fonts, objects, and every other default source.

Keep every preview's own code in its HTML file. Prefer `THREE.WebGLRenderer` and provide a Canvas 2D fallback when WebGL is unavailable.

## Output Requirements

- Produce one HTML file per direction; require no npm, bundler, server, or local asset files. The verified Three.js CDN request is the sole permitted network dependency.
- Use Three.js when it materially improves visual fidelity. Otherwise use Canvas 2D.
- Fit a portrait phone viewport, respect safe-area insets, and keep controls reachable with one hand.
- Provide play/pause plus labelled Energy, Bass, and Sparkle controls. Map them to the sketch's most meaningful reactions.
- Use `requestAnimationFrame` and include deliberate zero-input idle behavior.
- Use native HTML inputs and pointer events for the preview controls only. Do not make the rendered artwork respond to preview-only taps, drags, hover, keyboards, or other inputs unavailable to the target Shekere work. Do not require microphone permission, MIDI, OSC, or absolute local asset paths in the preview.
- Display `Preview — approximate Shekere rendering` in the UI.
- Include no secrets, analytics, tracking, or remote assets other than the verified pinned Three.js CDN module.

## Fidelity Boundaries

Translate effects; do not try to reproduce Shekere internals exactly.

- Convert audio, MIDI, and OSC to the three manual controls or gentle autoplay modulation.
- Convert bloom to glow, additive circles, blurred gradients, or bright strokes.
- Convert TSL and WebGPU effects to visually similar Canvas or WebGL treatment; never paste TSL into the preview.
- Omit, procedurally approximate, or embed local textures, models, and fonts as data URLs.

When exact rendering is impossible on a phone, preserve hierarchy and feeling over implementation fidelity.

## Git Behavior

All preview outputs belong under `previews/`, which is ignored by Git. Do not stage, commit, or add them to the repository unless the user explicitly requests it.

## Validation

- Confirm every generated HTML file opens without console errors and displays a frame before interaction.
- Check play/pause and each range input.
- Confirm every artwork reaction maps to an input or capability available in Shekere; remove preview-only scene interactions.
- Resize to a narrow portrait viewport and ensure controls remain visible.
- Report the local path and state that the output is an approximation, not a rendered Shekere output.
