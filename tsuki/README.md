# tsuki (月)

A serene night sky visualization featuring a luminous moon and twinkling stars that respond to real-time music events via OSC (Open Sound Control).

## Description

"tsuki" transforms your screen into a tranquil moonlit night, where a gentle moon illuminates countless stars dancing across the dark sky. Each musical event awakens different celestial elements, creating a living astronomical canvas where sound becomes starlight and rhythm becomes the pulse of the cosmos.

## Features

- **OSC Integration**: Real-time response to music production software via OSC protocol
- **Celestial Bodies**: Realistic moon with soft glow and field of twinkling stars
- **Astronomical Realism**: Natural celestial arrangement with stars scattered across the night sky
- **Interactive Lunar Glow**: Mouse position enhances the moon's radiance
- **Multi-Sound Mapping**: Different sounds trigger unique celestial responses
- **Natural Star Behavior**: Stars twinkle at varying speeds with realistic intensity variations

## Technical Implementation

- **Input**: OSC messages on port 2020 with "/dirt/play" address pattern
- **Sound Mapping**: 
  - Bass drum (bd, ID: 1) - Increases overall star brightness and intensity
  - Snare drum (sd, ID: 2) - Enhances constellation brightness and star prominence
  - Hi-hat (hc, ID: 3) - Affects moon size and radiance
- **Visual Effects**: Realistic moon rendering with distance-based glow and star twinkling algorithms
- **Color Palette**: Warm moonlight tones and cool starlight against deep night sky

## Sound Interaction

The visualization listens for OSC sound events and maps them to visual elements:

- **Truck System**: Up to 16 simultaneous sound events can be tracked
- **Gain Response**: Sound volume directly affects visual intensity
- **TTL Decay**: Visual effects naturally fade as sound events age
- **Note Mapping**: Pitch information can influence effect characteristics

## Visual Elements

- **Moon**: Luminous celestial body with realistic surface and soft glow
- **Star Field**: 30 regular stars scattered across the night sky with natural twinkling
- **Bright Stars**: 8 prominent stars that form constellation-like patterns
- **Night Sky**: Deep blue to dark gradient creating atmospheric depth
- **Interactive Glow**: Mouse-controlled lunar radiance enhancement
- **Astronomical Positioning**: Stars positioned to avoid overlapping with the moon

## Running

```bash
kchfgt tsuki/tsuki.toml
```

Best experienced with live music software that sends OSC messages, such as:
- SuperCollider with Dirt
- Ableton Live with OSC output
- Max/MSP with OSC routing
- Pure Data with networking objects