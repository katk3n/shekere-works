# nami (波)

A serene ocean wave visualization that responds to audio input through spectrum analysis.

## Description

"nami" creates a peaceful, flowing ocean scene with multiple layers of waves that gently undulate across the screen. The artwork captures the essence of natural wave motion through mathematical functions and procedural noise, creating a meditative visual experience.

## Features

- **Multi-layered Waves**: Five distinct wave layers create depth and visual complexity
- **Audio Responsiveness**: Wave amplitude and movement respond to audio spectrum data
- **Realistic Wave Physics**: Combines sine waves, fractal noise, and audio input for natural motion
- **Dynamic Color Gradient**: Deep ocean blue to foam white with audio-influenced tinting
- **Interactive Elements**: Mouse position creates ripple effects
- **Foam Generation**: Procedural foam appears on wave crests

## Technical Implementation

- **Input**: Spectrum analysis (20Hz - 4000Hz frequency range)
- **Wave Generation**: Multiple sine wave functions with fractal brownian motion
- **Color System**: Depth-based gradient with gamma correction
- **Performance**: Optimized rendering with controlled loop iterations

## Visual Elements

- **Base Wave**: Primary ocean movement with gentle, rolling motion
- **Detail Waves**: Secondary waves adding surface texture
- **Noise Waves**: Fractal noise for organic, irregular wave patterns
- **Audio Waves**: Real-time response to audio frequency data
- **Foam Effects**: Dynamic white foam on wave peaks
- **Mouse Ripples**: Interactive water disturbance effects

## Running

```bash
kchfgt nami/nami.toml
```

The visualization works best with ambient or flowing audio input to drive the wave dynamics.