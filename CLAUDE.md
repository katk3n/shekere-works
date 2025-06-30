# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains shader art works using the [shekere](https://github.com/katk3n/shekere) framework. Each work is organized in its own directory with a WGSL fragment shader and a TOML configuration file.

## Project Structure

- Each shader work is in its own directory (e.g., `tsuki/`, `yohuke/`)
- Each work contains:
  - `fragment.wgsl` - WGSL fragment shader code
  - `<name>.toml` - Configuration file for shekere

## Configuration Architecture

The TOML configuration files define:
- Window dimensions (typically 800x800)
- Pipeline configuration with fragment shader entry point `fs_main`
- Input bindings for OSC (Open Sound Control) or spectrum analysis
- Sound mappings for interactive audio-visual works
- Hot reload configuration for automatic shader reloading during development

## Shader Architecture

WGSL shaders follow a consistent structure:
- Common structures and uniforms are provided by shekere's `common.wgsl`
- Fragment shader entry point `fs_main()` that outputs to `@location(0)`
- Only work-specific functions and logic need to be implemented

Two main input types:
1. **OSC-based** (tsuki): Uses `Osc` uniform with sound trucks for real-time audio events
2. **Spectrum-based** (yohuke, nami): Uses `Spectrum` uniform with frequency data for audio visualization

## Common Helper Functions

The shekere framework provides these helper functions in `common.wgsl`.

For detailed implementation and usage examples, refer to: https://github.com/katk3n/shekere/blob/main/shaders/common.wgsl

### Coordinate Helpers
- `NormalizedCoords(position: vec2<f32>) -> vec2<f32>` - Converts screen position to normalized coordinates (-1.0 to 1.0)
- `MouseCoords() -> vec2<f32>` - Returns normalized mouse coordinates

### Color Conversion Helpers
- `ToLinearRgb(col: vec3<f32>) -> vec3<f32>` - Applies gamma correction to color
- `ToSrgb(col: vec3<f32>) -> vec3<f32>` - Converts color to sRGB

### MIDI Helpers (when MIDI is configured)
- `MidiNote(note_num: u32) -> f32` - Returns MIDI note velocity (0.0-1.0)
- `MidiControl(cc_num: u32) -> f32` - Returns MIDI control change value (0.0-1.0)

### Available Uniforms (PascalCase)
- `Window` - Window resolution and properties
- `Time` - Program duration and timing
- `Mouse` - Mouse position
- `Osc` - OSC sound trucks (when OSC is configured)
- `Spectrum` - Audio spectrum data (when spectrum analysis is configured)
- `Midi` - MIDI data (when MIDI is configured)

## Working with Shaders

When modifying shaders:
- **DO NOT redefine** structures or uniforms that are in `common.wgsl`
- Use `NormalizedCoords()` for coordinate normalization
- Use `MouseCoords()` for mouse position
- Apply `ToLinearRgb()` for gamma correction on final output
- Use PascalCase for uniform variables (Window, Time, Mouse, etc.)
- Follow the existing pattern for mouse and time-based animations

## Hot Reload Configuration

For development convenience, enable hot reload in TOML configuration files:

```toml
[hot_reload]
enabled = true
```

**Default behavior**: Unless explicitly specified otherwise, always include hot reload configuration in new works for better development experience.