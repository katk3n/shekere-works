# shekere-works - AI Agent Guide

This workspace is a collection of creative coding sketches for **Shekere**, a macOS live-coding environment for interactive audio-visual art built around JavaScript and Three.js.

Use this file as the primary project guidance for AI agents. `GEMINI.md` may exist as a compatibility symlink to this file for tools that still look for the older Gemini entry point.

## Project Shape

- `sketches/**/*.js` files are Shekere sketches. Treat one file as one complete work.
- `assets/` contains local media for sketches.
- `.agents/skills/` contains reusable agent skills. `SKILL.md` is the primary source for each skill, and `instructions.md` may exist as a compatibility symlink.
- `external/shekere/` is the Shekere application source and documentation submodule.

## Default Creative Behavior

When the user gives a short concept, mood, visual phrase, or musical feeling, treat it as a request to create a new Shekere sketch unless they clearly ask only to discuss ideas.

For a new sketch:

1. Read `.agents/skills/create-sketch/SKILL.md`.
2. Read the relevant Shekere docs under `external/shekere/docs/guide/`, especially `writing-sketches.md`, `audio.md`, and `effects.md`.
3. Skim relevant examples under `external/shekere/examples/` for the requested interaction style.
4. Choose a descriptive snake_case filename in the `sketches/` directory.
5. Write one self-contained `.js` sketch that exports `setup(scene)`, `update(context)`, and `cleanup(scene)`.
6. Tell the user which file is ready to load in the Shekere Visualizer.

If the sketch uses Three.js Shading Language (TSL), also read `.agents/skills/write-tsl/SKILL.md` before editing.

## Shekere Sketch Rules

- Do not import `THREE` or `TSL`; Shekere exposes them globally.
- Create geometries, materials, meshes, lights, render targets, and loaders in `setup`, not in `update`.
- Use `update(context)` only for animation, parameter changes, audio/MIDI/OSC response, and post-processing controls.
- Always provide `cleanup(scene)` and call `Shekere.clearScene(scene)` unless there is a deliberate reason not to.
- Store shared sketch state in module scope or on `this`, following the existing sketches and skill instructions.
- Provide default values for optional inputs, especially MIDI/OSC values, using `?? 0` or similarly safe fallbacks.
- Smooth abrupt audio/MIDI/OSC changes with `THREE.MathUtils.lerp()` or equivalent easing.
- Include an idle state so visuals remain intentional with no audio input.
- Avoid pure primary color palettes; prefer expressive HSL palettes, gradients, emissive materials, bloom, film, vignette, and RGB shift where appropriate.

## Useful Context

Read these files as needed:

- `external/shekere/docs/guide/writing-sketches.md` for lifecycle and context objects.
- `external/shekere/docs/guide/audio.md` for audio features.
- `external/shekere/docs/guide/effects.md` for post-processing controls.
- `external/shekere/examples/advanced_audio.js` for Meyda/audio mappings.
- `external/shekere/examples/effects_showcase.js` for effect control.
- `external/shekere/examples/shader_stars.js` for custom shader patterns.
- `external/shekere/examples/midi_reactive.js` and `tidal_reactive.js` when MIDI or OSC is involved.

## TSL Safety

When writing TSL:

- Destructure required functions from global `TSL`, such as `const { vec3, float, Fn, Loop } = TSL;`.
- Never call methods directly on numeric literals, such as `1.0.sub(x)`; wrap them with `float(1.0)`.
- Never use `TSL.var()`; use `float(0.0).toVar()` and update with `.assign()` or `.addAssign()`.
- Do not use GLSL syntax in JavaScript node graphs.
- For fullscreen raymarching quads, follow the rules in `.agents/skills/write-tsl/SKILL.md`.

## Working With `external/shekere`

Only edit `external/shekere/` when the user asks to change the Shekere app itself. In that case:

- Read `external/shekere/GEMINI.md`.
- Check the ADRs in `external/shekere/adr/`, especially `0001-initial-architecture-and-tech-stack.md`.
- Keep implementation small and incremental.
- Run the relevant TypeScript or app checks when feasible.
- Do not run `git push` without explicit user approval.

## Git And Existing Work

- The working tree may contain in-progress or untracked sketches from the user. Do not delete, rename, or rewrite unrelated works.
- Keep new sketches and environment files narrowly scoped.
- Do not update the `external/shekere` submodule unless the user requests it or it is clearly necessary for the task.
