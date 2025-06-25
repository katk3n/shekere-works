# tsuki (月)

An interactive lunar-inspired visualization that responds to real-time music events via OSC (Open Sound Control).

## Description

"tsuki" creates a mystical moonlit scene with glowing orbs that dance and pulse in response to musical triggers. The artwork transforms sound events into ethereal visual poetry, with each drum hit, melody, or rhythmic element manifesting as luminous effects across a dark, celestial canvas.

## Features

- **OSC Integration**: Real-time response to music production software via OSC protocol
- **Sound-Reactive Orbs**: Multiple glowing spheres that respond to different sound types
- **Dynamic Light Effects**: Pulsing, breathing light patterns synchronized to audio
- **Interactive Mouse Control**: Mouse position influences the central orb behavior
- **Multi-Sound Mapping**: Different sounds (bass drum, snare, hi-hat) trigger unique visual responses
- **Decay Animation**: Natural fade-out effects using TTL (Time To Live) values

## Technical Implementation

- **Input**: OSC messages on port 2020 with "/dirt/play" address pattern
- **Sound Mapping**: 
  - Bass drum (bd, ID: 1) - Creates pulsing background effects
  - Snare drum (sd, ID: 2) - Triggers bright flashes and orb intensity
  - Hi-hat (hc, ID: 3) - Influences mouse orb size and glow
- **Visual Effects**: Procedural orb generation with power-based intensity curves
- **Color Palette**: Ethereal whites and blues against deep night sky background

## Sound Interaction

The visualization listens for OSC sound events and maps them to visual elements:

- **Truck System**: Up to 16 simultaneous sound events can be tracked
- **Gain Response**: Sound volume directly affects visual intensity
- **TTL Decay**: Visual effects naturally fade as sound events age
- **Note Mapping**: Pitch information can influence effect characteristics

## Visual Elements

- **Central Orb**: Large interactive element controlled by mouse and hi-hat sounds
- **Scattered Orbs**: 20 randomly positioned orbs that pulse with bass and snare
- **Corner Orb**: Fixed position orb in bottom-left that responds to bass drum
- **Background**: Deep blue nocturnal atmosphere
- **Glow Effects**: Soft, ethereal lighting with gamma-corrected output

## Running

```bash
kchfgt tsuki/tsuki.toml
```

Best experienced with live music software that sends OSC messages, such as:
- SuperCollider with Dirt
- Ableton Live with OSC output
- Max/MSP with OSC routing
- Pure Data with networking objects