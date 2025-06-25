# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains shader art works using the [kchfgt](https://github.com/katk3n/kchfgt) framework. Each work is organized in its own directory with a WGSL fragment shader and a TOML configuration file.

## Project Structure

- Each shader work is in its own directory (e.g., `tsuki/`, `yohuke/`)
- Each work contains:
  - `fragment.wgsl` - WGSL fragment shader code
  - `<name>.toml` - Configuration file for kchfgt

## Configuration Architecture

The TOML configuration files define:
- Window dimensions (typically 800x800)
- Pipeline configuration with fragment shader entry point `fs_main`
- Input bindings for OSC (Open Sound Control) or spectrum analysis
- Sound mappings for interactive audio-visual works

## Shader Architecture

WGSL shaders follow a consistent structure:
- Uniform bindings for window, time, mouse, and audio data
- Standard utility functions like `to_linear_rgb()` for color correction
- Fragment shader entry point `fs_main()` that outputs to `@location(0)`

Two main input types:
1. **OSC-based** (tsuki): Uses `OscUniform` with sound trucks for real-time audio events
2. **Spectrum-based** (yohuke): Uses `SpectrumUniform` with frequency data for audio visualization

## Working with Shaders

When modifying shaders:
- Maintain the existing uniform binding structure
- Use consistent coordinate normalization with `min_xy` for aspect ratio handling
- Apply gamma correction with `to_linear_rgb()` for final output
- Follow the existing pattern for mouse and time-based animations