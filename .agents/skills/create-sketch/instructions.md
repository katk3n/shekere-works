# Shekere Creative Coding Skill

## 🎯 Objective
This Skill is an instruction set for AI agents to create high-quality, interactive audio-visual sketches (`.js`) for **Shekere** (a live-coding environment). The goal is to generate beautiful, high-performance works that comply with Shekere's specifications and API.

---

## 📚 1. Required Pre-research (Context Gathering)
Before creating a new sketch or modifying an existing one, **always** perform the following context gathering steps:

0. **Update Knowledge Base (Submodule)**:
   - To ensure you are referencing the absolute latest features, if appropriate context permits, update the submodule by running `git submodule update --remote external/shekere`.
1. **Shekere API & General Specifications**:
   - Read the documentation in `external/shekere/docs/guide/` (e.g., `writing-sketches.md`, `audio.md`, `midi.md`, `osc.md`, `effects.md`) to understand the latest lifecycle, input parameters, and post-processing effect specifications.
2. **Shekere Examples & Practical Implementations**:
   - Read the following examples in `external/shekere/examples/` to learn practical mappings:
     - `advanced_audio.js`: High-level Meyda feature mappings (rms, chroma, mfcc).
     - `midi_reactive.js`: MIDI note triggers and continuous CC interpolation.
     - `tidal_reactive.js`: OSC message triggers and string manipulation.
     - `effects_showcase.js`: Dynamic context manipulation of global post-processing effects.
     - `shader_stars.js`: Custom shader material implementation and lifecycle.
3. **Workspace Local Rules**:
   - Review the rules in `GEMINI.md` at the root of this workspace and adhere to the file structure and specific best practices.

---

## 🏗️ 2. Sketch Basic Structure and Rules
A single sketch must be contained within **one `.js` file**.
The following **three lifecycle functions must be exported**:

### A. `setup(scene)`
- **Role**: Initialize geometries, materials, meshes, and lights, and add them to the scene.
- **Implementation Rules**:
  - `scene` is the root `THREE.Scene`. Add objects directly to it using `scene.add()`.
  - To maintain and update state within the sketch, store objects in **module-scoped variables (`this.xxx`)** so they can be shared with subsequent `update` and `cleanup` calls (`this` acts as a shared context).

### B. `update(context)`
- **Role**: Executed every frame (~60fps) to handle animations based on audio or external inputs.
- **`context` Argument Details**:
  - `time`: Elapsed time (seconds).
  - `audio`: FFT analysis data (`volume`, `bass`, `mid`, `high`, `bands`) and Meyda features (`features.rms`, `features.spectralCentroid`, `features.mfcc`, etc.).
  - `midi`: MIDI notes (`midi.notes`) and CC values (`midi.cc`). **Always set default values using `?? 0` to prevent missing data**.
  - `osc` / `oscEvents`: Continuous or trigger-based inputs via OSC.
  - `bloom`, `rgbShift`, `film`, `vignette`: Control parameters for post-processing effects.
- **Implementation Rules**:
  - **Do not use the `new` keyword to create geometries or materials here** (this is a primary cause of memory leaks and performance degradation).
  - Use `THREE.MathUtils.lerp()` or similar methods to **smoothly interpolate (linear interpolation)** changes in MIDI/OSC values or sudden audio transients.

### C. `cleanup(scene)`
- **Role**: Memory cleanup before the sketch ends. **Must be implemented**.
- **Implementation Rules**:
  - Simply calling **`Shekere.clearScene(scene);`** will safely and reliably dispose of objects and free up memory.
  - Unless you have a specific intention to persist objects (e.g., for trail effects), always execute this.

---

## 🌐 3. Global Environment Constraints
The following objects are exposed in the **global scope** in the Shekere environment. No import statements are needed, and they should not be written.
- **`THREE`**: The entire Three.js namespace. **Do not write** `import * as THREE from 'three'`.
- **`Shekere`**: Utility object.
  - `Shekere.clearScene(container)`: Resource release.
  - `Shekere.convertFileSrc(path)`: Converts local absolute paths for images/assets into URLs (used for TextureLoader, etc.).
  - `Shekere.SKETCH_DIR`: The absolute path to the directory where the currently running sketch is located.

---

## 🎨 4. Creative Coding Best Practices
- **Rich Look and Feel**:
  - Avoid monotonous primary colors (pure red, blue, etc.). Use `THREE.Color().setHSL()` or similar to build harmonious color palettes or deep neon tones.
  - Dynamically manipulate post-processing effects like Bloom via the `context` to create visual "Wow" moments, such as flashing the screen in sync with strong audio attacks.
- **Intuitive Responsiveness**:
  - Map volume (`rms`) or specific pitch intensities (`chroma`) clearly to object scale, emissive intensity (`emissiveIntensity`), or rotation speed to match the theme of the work.
- **Practical Protection (Noise Gates, etc.)**:
  - Ensure the visualization doesn't break when there is no audio input. Implement noise floor gating (e.g., `noiseFloor = 0.01`) and minimal idle animations (e.g., slow base rotation).
