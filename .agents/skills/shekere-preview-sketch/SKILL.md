---
name: shekere-preview-sketch
description: Create local, touch-friendly HTML mini-apps that preview the visual intent of a Shekere sketch without requiring the Shekere app. Use when a user wants to inspect a newly created or existing Shekere work on a phone, compare multiple visual directions, asks for a lightweight preview, or asks to create mobile previews alongside a sketch.
---

# Shekere Preview Sketch

Create an intentionally approximate visual preview, not a second Shekere runtime. It must communicate composition, palette, motion, and likely audio response on a phone.

## Workflow

1. Read the target sketch and `shekere-create-sketch` when a new sketch is also being created.
2. Identify visual primitives, color system, idle behavior, and audio/MIDI/OSC mappings.
3. Create `previews/<sketch_name>/index.html`, using lowercase snake_case for `<sketch_name>`.
4. Start from [the standalone canvas template](assets/preview-template.html), then replace its visual system to reflect the target work.
5. Open the HTML locally for a smoke check. Confirm the idle frame renders and controls work with mouse and touch.

Keep the preview separate. Do not alter `sketches/*.js` just to accommodate it.

## Multiple Directions

When the user asks for alternatives, retain `index.html` as the current or selected direction and create each other direction as `previews/<sketch_name>/<direction_name>.html`. Use concise lowercase snake_case direction names such as `tide.html` or `orbit.html`.

Make every direction independently runnable. Vary the composition, palette, movement, or input mapping enough that the comparison is meaningful, and briefly state the creative distinction between the files.

## Output Requirements

- Produce one self-contained HTML file per direction; require no npm, bundler, server, CDN, or network access.
- Use Canvas 2D by default. Use WebGL only when it materially improves the concept and provide a Canvas 2D fallback.
- Fit a portrait phone viewport, respect safe-area insets, and keep controls reachable with one hand.
- Provide play/pause plus labelled Energy, Bass, and Sparkle controls. Map them to the sketch's most meaningful reactions.
- Use `requestAnimationFrame` and include deliberate zero-input idle behavior.
- Use native HTML inputs and pointer events. Do not rely on hover, keyboards, microphone permission, MIDI, OSC, or absolute local asset paths.
- Display `Preview — approximate Shekere rendering` in the UI.
- Include no secrets, analytics, tracking, or remote assets.

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
- Resize to a narrow portrait viewport and ensure controls remain visible.
- Report the local path and state that the output is an approximation, not a rendered Shekere output.
