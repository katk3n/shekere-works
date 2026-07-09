---
name: shekere-create-sketch
description: Create or edit Shekere audio-reactive creative-coding sketches in this repository. Use when the user gives a visual concept, mood, musical feeling, interactive Three.js idea, MIDI/OSC/audio-reactive request, or asks for a new Shekere `.js` work.
---

# Shekere Create Sketch

Use this skill to create high-quality, interactive audio-visual sketches (`.js`) for **Shekere**, a live-coding environment. The goal is to generate beautiful, high-performance works that comply with Shekere's specifications and API.

## Required Pre-Research

Before creating a new sketch or modifying an existing one, always gather this context:

1. Read `AGENTS.md` at the repository root.
2. Read Shekere documentation in `external/shekere/docs/guide/`, especially:
   - `writing-sketches.md`
   - `audio.md`
   - `midi.md`
   - `osc.md`
   - `effects.md`
3. Read relevant examples in `external/shekere/examples/`:
   - `advanced_audio.js` for Meyda feature mappings such as `rms`, `chroma`, and `mfcc`.
   - `midi_reactive.js` for MIDI note triggers and continuous CC interpolation.
   - `tidal_reactive.js` for OSC message triggers and string manipulation.
   - `effects_showcase.js` for dynamic context manipulation of global post-processing effects.
   - `shader_stars.js` for custom shader material implementation and lifecycle.
4. Treat `AGENTS.md` and this `SKILL.md` as the primary instructions. `GEMINI.md` may be a compatibility symlink to `AGENTS.md`.
5. Do not update the `external/shekere` submodule unless the user requests it or it is clearly necessary for the task.

## Sketch Structure

A single sketch must be contained within one `.js` file and must export these lifecycle functions.

### `setup(scene)`

Use `setup` to initialize geometries, materials, meshes, lights, and other persistent resources.

- `scene` is the root `THREE.Scene`; add objects directly with `scene.add()`.
- Store shared state in module-scoped variables or on `this` so `update` and `cleanup` can access it.
- Return optional configuration when needed, such as audio frequency ranges.

### `update(context)`

Use `update` for per-frame animation and input response.

The `context` object may include:

- `time`: elapsed time in seconds.
- `audio`: FFT data (`volume`, `bass`, `mid`, `high`, `bands`) and Meyda features (`features.rms`, `features.spectralCentroid`, `features.mfcc`, etc.).
- `midi`: MIDI notes and CC values. Always provide defaults with `?? 0` or equivalent safe fallbacks.
- `osc` / `oscEvents`: continuous or trigger-based OSC inputs.
- `bloom`, `rgbShift`, `film`, `vignette`: post-processing controls.

Rules:

- Do not create geometries, materials, meshes, loaders, or other persistent objects in `update`.
- Smooth sudden audio, MIDI, or OSC changes with `THREE.MathUtils.lerp()` or similar easing.
- Include an intentional idle state so the sketch remains alive with no audio input.

### `cleanup(scene)`

Always implement cleanup.

```javascript
export function cleanup(scene) {
  Shekere.clearScene(scene);
}
```

Use `Shekere.clearScene(scene)` unless there is a deliberate reason to persist resources.

## Global Environment

- Do not import `THREE`, `TSL`, or `Shekere`; Shekere exposes them globally.
- `Shekere.clearScene(container)` disposes objects and materials.
- `Shekere.convertFileSrc(path)` converts local absolute paths into URLs for assets.
- `Shekere.SKETCH_DIR` points to the current sketch directory.

## Creative Coding Rules

- Avoid monotonous primary colors; prefer harmonious HSL palettes, deep neon tones, or concept-specific color systems.
- Map audio clearly to the visual idea: `rms` to scale or bloom, `chroma` to hue, bass to mass or pulses, high frequencies to sparkle or detail.
- Use post-processing controls for strong musical moments, such as bloom flashes on attacks or subtle RGB shift on high-frequency energy.
- Use noise floors and guards so the visualization does not break or jitter with silence.
- Keep one file as one complete sketch unless the user asks for a larger structure.

## TSL

If the sketch uses TSL, node materials, raymarching, or fullscreen shader quads, also use `shekere-write-tsl`.

## Finish

Tell the user which sketch file is ready to load in the Shekere Visualizer.
