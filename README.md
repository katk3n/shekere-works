# kchfgt-works
Shader art works using [kchfgt](https://github.com/katk3n/kchfgt)

## Shader Art Creation Manual with kchfgt Framework

### Overview

kchfgt is a Rust framework for creating real-time shader art on WebGPU. It enables easy creation of interactive visual expressions synchronized with audio input.

### Project Structure

Each shader art work is stored in its own directory with the following files:

```
work_name/
├── fragment.wgsl    # WGSL fragment shader
└── work_name.toml   # kchfgt configuration file
```

### Configuration File (TOML)

#### Basic Configuration

```toml
[window]
width = 800
height = 800

[[pipeline]]
shader_type = "fragment"
label = "Fragment Shader"
entry_point = "fs_main"
file = "fragment.wgsl"
```

#### OSC (Open Sound Control) Input Configuration

Receives real-time audio events from music production software:

```toml
[osc]
port = 2020
addr_pattern = "/dirt/play"

[[osc.sound]]
name = "bd"    # Bass drum
id = 1

[[osc.sound]]
name = "sd"    # Snare drum
id = 2

[[osc.sound]]
name = "hc"    # Hi-hat
id = 3
```

#### Spectrum Analysis Configuration

Real-time visualization through audio frequency analysis:

```toml
[spectrum]
min_frequency = 400.0
max_frequency = 2000.0
sampling_rate = 44100
```

### WGSL Shader Development

#### Basic Structure

```wgsl
struct WindowUniform {
    resolution: vec2<f32>,
};

struct TimeUniform {
    duration: f32,
};

struct MouseUniform {
    position: vec2<f32>,
};

@group(0) @binding(0) var<uniform> window: WindowUniform;
@group(0) @binding(1) var<uniform> time: TimeUniform;
@group(1) @binding(0) var<uniform> mouse: MouseUniform;

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    // Shader logic here
}
```

#### Using OSC Input

```wgsl
struct OscTruck {
    sound: i32,    // Sound ID
    ttl: f32,      // Time To Live (decay time)
    note: f32,     // Pitch
    gain: f32,     // Volume
}

struct OscUniform {
    trucks: array<OscTruck, 16>,
};

@group(2) @binding(0) var<uniform> osc: OscUniform;

// Example: Bass drum detection
if osc.trucks[2].sound == 1 {
    let intensity = osc.trucks[2].gain * osc.trucks[2].ttl;
    // Visual effects responding to bass drum
}
```

#### Using Spectrum Analysis

```wgsl
struct SpectrumDataPoint {
    frequency: f32,
    amplitude: f32,
    _padding: vec2<u32>,
}

struct SpectrumUniform {
    data_points: array<SpectrumDataPoint, 2048>,
    num_points: u32,
    max_frequency: f32,
    max_amplitude: f32,
}

@group(2) @binding(1) var<uniform> spectrum: SpectrumUniform;

// Example: Circle size controlled by frequency data
let spectrum_index = i % spectrum.num_points;
let freq_ratio = spectrum.data_points[spectrum_index].frequency * 0.001;
let radius = clamp(freq_ratio * spectrum.data_points[spectrum_index].amplitude, 0.0, 0.1);
```

#### Utility Functions

```wgsl
// Gamma correction
fn to_linear_rgb(col: vec3<f32>) -> vec3<f32> {
    let gamma = 2.2;
    let c = clamp(col, vec3(0.0), vec3(1.0));
    return vec3(pow(c, vec3(gamma)));
}

// Coordinate normalization (aspect ratio preserving)
let min_xy = min(window.resolution.x, window.resolution.y);
let uv = (in.position.xy * 2.0 - window.resolution) / min_xy;

// Glowing orb effect
fn orb(pos: vec2<f32>, r: f32, blur: f32) -> f32 {
    let dist = length(pos);
    let glow = 0.0005 / dist;
    return smoothstep(r + blur, r, dist) + glow;
}
```

### Development Best Practices

1. **Coordinate System**: Use `min_xy` to maintain aspect ratio
2. **Gamma Correction**: Apply `to_linear_rgb()` to final output
3. **Performance**: Limit loop iterations and minimize heavy computations
4. **Audio Synchronization**: Utilize OSC event TTL values for natural decay expressions
5. **Color Design**: Use HDR values for rich color expressions

### Running Your Shader Art

```bash
# Install kchfgt (required beforehand)
cargo install kchfgt

# Run shader art
kchfgt work_name/work_name.toml
```

## Works in This Repository

- **tsuki**: OSC-based interactive visuals responding to real-time music events
- **yohuke**: Spectrum analysis-driven visualization with frequency-responsive effects
