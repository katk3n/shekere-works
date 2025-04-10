struct WindowUniform {
    // window size in physical size
    resolution: vec2<f32>,
}

struct TimeUniform {
    // time elapsed since the program started
    duration: f32,
}

struct MouseUniform {
    // mouse position in physical size
    position: vec2<f32>,
}

struct SpectrumDataPoint {
    frequency: f32,
    amplitude: f32,
    _padding: vec2<u32>,
}

struct SpectrumUniform {
    // spectrum data points of audio input
    data_points: array<SpectrumDataPoint, 2048>,
    // the number of data points
    num_points: u32,
    // frequency of the data point with the max amplitude
    max_frequency: f32,
    // max amplitude of audio input
    max_amplitude: f32,
}

@group(0) @binding(0) var<uniform> window: WindowUniform;
@group(0) @binding(1) var<uniform> time: TimeUniform;
@group(1) @binding(0) var<uniform> mouse: MouseUniform;
@group(2) @binding(1) var<uniform> spectrum: SpectrumUniform;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
}

fn to_linear_rgb(col: vec3<f32>) -> vec3<f32> {
    let gamma = 2.2;
    let c = clamp(col, vec3(0.0), vec3(1.0));
    return vec3(pow(c, vec3(gamma)));
}

const RADIUS: f32 = 0.2;
const SMOOTH_BORDER: f32 = 0.01;
const PI2: f32 = 6.283185307179586;
const PId2: f32 = 1.5707963267948966;
const NUM_CIRCLES: u32 = 256;

fn random(x: f32, y: f32) -> vec2<f32> {
    let k = vec2(23.14069263277926, 2.66514414269025);
    return abs(fract(vec2(cos(x * k.x), sin(y * k.y + 166.6))));
}

fn generate_random_shift(x_seed: f32, y_seed: f32, time: f32, ratio: vec2<f32>) -> vec2<f32> {
    return (2.0 * random(ceil(time / PI2) + x_seed, ceil(time / PI2) + y_seed) - 1.0) * ratio;
}

fn sin_wave01(time: f32) -> f32 {
    return 0.5 + 0.5 * sin(time - PId2);
}

fn orb(pos: vec2<f32>, r: f32, blur: f32) -> f32 {
    let dist = length(pos);
    let glow = 0.0005 / dist;
    return smoothstep(r + blur, r, dist) + glow;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let min_xy = min(window.resolution.x, window.resolution.y);
    let uv = vec2(in.position.x / min_xy, 1.0 - in.position.y / min_xy);

    let ratio = window.resolution.xy / window.resolution.y;

    var col = 0.0;
    for (var i = 0u; i < NUM_CIRCLES; i++) {
        let time_shift = 2.0 * f32(i);
        let time = time.duration + time_shift;
        let shift = generate_random_shift(2.0 * f32(i), f32(i + 56u), time, ratio);
        let spectrum_index = i % spectrum.num_points;
        let freq_ratio = spectrum.data_points[spectrum_index].frequency * 0.001;
        let radius = clamp(freq_ratio * spectrum.data_points[spectrum_index].amplitude, 0.0, 0.1);
        col += orb(uv - shift, radius, SMOOTH_BORDER) * (1.0 - sin_wave01(time));
    }

    let sin_col = 0.5 + 0.5 * cos(time.duration + vec3(uv.x, uv.y, uv.x) + vec3(0.0, 2.0, 4.0));
    let bg_col = vec3(0.0, 0.1, 0.2);
    let final_col = bg_col + sin_col * (clamp(col, 0.0, 1.0));

    return vec4(to_linear_rgb(final_col), 1.0);
}
