# yohuke (夜更け)

A late-night frequency visualization that transforms audio spectrum data into a mesmerizing field of dancing lights.

## Description

"yohuke" captures the essence of late-night contemplation through a dynamic visualization of audio frequencies. Hundreds of glowing orbs pulse and shimmer in response to real-time audio analysis, creating an intimate and hypnotic visual experience that reflects the quiet energy of nighttime hours.

## Features

- **Real-time Spectrum Analysis**: Live frequency analysis of audio input (400Hz - 2000Hz range)
- **Dynamic Orb Field**: 256 individual orbs responding to frequency data
- **Frequency Mapping**: Each orb corresponds to specific frequency ranges
- **Amplitude Response**: Orb size and intensity reflect audio amplitude
- **Temporal Variation**: Time-based positioning creates flowing, organic movement
- **Color Harmony**: Warm blues and cyans with procedural color variations

## Technical Implementation

- **Input**: Audio spectrum analysis with 2048 data points
- **Frequency Range**: Optimized for mid-range frequencies (400Hz - 2000Hz)
- **Sampling Rate**: 44.1kHz for high-quality audio analysis
- **Visual Mapping**: Frequency amplitude directly controls orb radius
- **Movement**: Pseudo-random positioning with time-based evolution
- **Rendering**: Optimized with smooth distance fields and glow effects

## Visual Elements

- **Orb Grid**: 256 circles distributed across the canvas
- **Frequency Response**: Real-time size modulation based on spectrum data
- **Glow Effects**: Soft halos around each orb with distance-based intensity
- **Color Gradient**: Procedural color generation with time-based cycling
- **Background**: Deep blue nocturnal atmosphere transitioning to lighter tones
- **Smooth Animation**: Continuous movement patterns avoiding jarring transitions

## Audio Processing

The visualization processes audio through several stages:

- **Spectrum Capture**: Real-time FFT analysis of incoming audio
- **Frequency Filtering**: Focus on mid-range frequencies for optimal visual response
- **Amplitude Mapping**: Linear mapping of amplitude to visual properties
- **Temporal Smoothing**: Balanced response between reactivity and stability

## Visual Behavior

- **Responsive Orbs**: Each orb pulses with its corresponding frequency content
- **Organic Movement**: Smooth, flowing motion patterns based on random functions
- **Intensity Variation**: Both size and opacity respond to audio amplitude
- **Color Evolution**: Subtle color shifts create visual interest over time
- **Depth Perception**: Layered effects with distance-based glow falloff

## Running

```bash
kchfgt yohuke/yohuke.toml
```

Works well with various audio sources:
- Ambient and electronic music
- Live microphone input
- Streaming audio
- Music production environments

The visualization is particularly effective during quiet, contemplative moments when subtle frequency changes create gentle, meditative visual responses.