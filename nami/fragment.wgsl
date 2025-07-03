

fn hash(p: vec2<f32>) -> f32 {
    let h = dot(p, vec2(127.1, 311.7));
    return fract(sin(h) * 43758.5453);
}

fn noise(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    
    return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

fn fbm(p: vec2<f32>) -> f32 {
    var value = 0.0;
    var amplitude = 0.5;
    var frequency = 1.0;
    
    for (var i = 0; i < 6; i++) {
        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    
    return value;
}

fn wave_height(x: f32, t: f32, audio_intensity: f32) -> f32 {
    let base_wave = sin(x * 0.8 + t * 1.4) * 0.3;
    let detail_wave = sin(x * 2.5 + t * 2.4) * 0.15;
    let noise_wave = fbm(vec2(x * 0.5, t * 0.22)) * 0.2;
    let audio_wave = sin(x * 1.5 + t * 2.8) * audio_intensity * 0.4;
    
    return base_wave + detail_wave + noise_wave + audio_wave;
}

fn get_audio_intensity() -> f32 {
    var intensity = 0.0;
    let sample_count = min(Spectrum.num_points, 64u);
    
    for (var i = 0u; i < sample_count; i++) {
        let freq_ratio = SpectrumFrequency(i) / Spectrum.max_frequency;
        let weight = 1.0 - freq_ratio * 0.5;
        intensity += SpectrumAmplitude(i) * weight;
    }
    
    return clamp(intensity / f32(sample_count), 0.0, 1.0);
}

fn get_wave_color(height: f32, depth: f32, audio_intensity: f32) -> vec3<f32> {
    let deep_blue = vec3(0.0, 0.2, 0.4);
    let shallow_blue = vec3(0.2, 0.6, 0.9);
    let foam_white = vec3(0.9, 0.95, 1.0);
    let audio_tint = vec3(0.3, 0.8, 1.0) * audio_intensity;
    
    var color = mix(deep_blue, shallow_blue, clamp(height + 0.5, 0.0, 1.0));
    
    if height > 0.3 {
        let foam_factor = smoothstep(0.3, 0.6, height);
        color = mix(color, foam_white, foam_factor);
    }
    
    color += audio_tint * 0.3;
    
    let depth_fade = exp(-depth * 2.0);
    color *= depth_fade;
    
    return color;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let uv = NormalizedCoords(in.position.xy);
    
    let audio_intensity = get_audio_intensity();
    let t = Time.duration;
    
    let wave_layers = 5;
    var final_color = vec3(0.0, 0.1, 0.2);
    
    for (var layer = 0; layer < wave_layers; layer++) {
        let layer_offset = f32(layer) * 0.3;
        let layer_speed = 0.7 + f32(layer) * 0.15;
        let layer_scale = 1.0 + f32(layer) * 0.1;
        
        let wave_y = wave_height(uv.x * layer_scale, t * layer_speed, audio_intensity) + layer_offset;
        
        if uv.y < wave_y {
            let depth = wave_y - uv.y;
            let wave_color = get_wave_color(wave_y, depth, audio_intensity);
            
            let layer_alpha = 1.0 / (f32(layer) + 1.0);
            final_color = mix(final_color, wave_color, layer_alpha);
        }
    }
    
    let mouse_influence = length(uv - MouseCoords());
    let ripple = sin(mouse_influence * 20.0 - t * 7.0) * exp(-mouse_influence * 3.0) * 0.1;
    final_color += vec3(ripple);
    
    let foam_noise = fbm(uv * 8.0 + vec2(t * 1.4, 0.0));
    if foam_noise > 0.7 && uv.y > wave_height(uv.x, t, audio_intensity) - 0.1 {
        final_color += vec3(0.3, 0.3, 0.3) * (foam_noise - 0.7);
    }
    
    return vec4(ToLinearRgb(final_color), 1.0);
}