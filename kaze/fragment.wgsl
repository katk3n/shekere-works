

fn noise(p: vec2<f32>) -> f32 {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

fn smooth_noise(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    
    return mix(
        mix(noise(i + vec2(0.0, 0.0)), noise(i + vec2(1.0, 0.0)), u.x),
        mix(noise(i + vec2(0.0, 1.0)), noise(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

fn fbm(p: vec2<f32>) -> f32 {
    var value = 0.0;
    var amplitude = 0.5;
    var frequency = 1.0;
    
    for (var i = 0; i < 3; i++) {
        value += amplitude * smooth_noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    
    return value;
}

fn wind_field(p: vec2<f32>, t: f32) -> vec2<f32> {
    let flow_speed = 0.3;
    let flow_pos = p + vec2(t * flow_speed, 0.0);
    
    let noise_scale = 2.0;
    let wind_x = smooth_noise(flow_pos * noise_scale + vec2(0.0, t * 0.2)) - 0.5;
    let wind_y = smooth_noise(flow_pos * noise_scale + vec2(100.0, t * 0.15)) - 0.5;
    
    return vec2(wind_x, wind_y) * 2.0;
}

fn wind_particle(p: vec2<f32>, center: vec2<f32>, t: f32, seed: f32) -> f32 {
    let wind = wind_field(center, t);
    let offset_pos = center + wind * 0.1;
    
    let dist = length(p - offset_pos);
    let particle_size = 0.003 + noise(vec2(seed)) * 0.002;
    
    let intensity = 1.0 / (1.0 + dist * 800.0);
    let streak_length = length(wind) * 0.05;
    let streak = max(0.0, 1.0 - abs(dot(normalize(p - offset_pos), normalize(wind))) * 3.0);
    
    return intensity + streak * streak_length;
}

fn wind_trails(p: vec2<f32>, t: f32) -> f32 {
    var trails = 0.0;
    let num_particles = 80;
    
    for (var i = 0; i < num_particles; i++) {
        let seed = f32(i) * 0.1;
        let start_x = noise(vec2(seed, 0.0)) * 2.4 - 1.2;
        let start_y = noise(vec2(seed, 1.0)) * 2.4 - 1.2;
        
        let flow_offset = t * (0.2 + noise(vec2(seed, 2.0)) * 0.3);
        let base_pos = vec2(start_x + flow_offset, start_y);
        
        let wrapped_pos = vec2(
            base_pos.x - floor((base_pos.x + 1.2) / 2.4) * 2.4,
            base_pos.y
        );
        
        trails += wind_particle(p, wrapped_pos, t, seed);
    }
    
    return trails;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let p = NormalizedCoords(in.position.xy);
    
    let t = Time.duration;
    
    let autumn_sky = vec3(0.8, 0.6, 0.4);
    let autumn_horizon = vec3(0.9, 0.7, 0.5);
    let sky_gradient = mix(autumn_sky, autumn_horizon, smoothstep(-1.0, 1.0, p.y));
    
    let wind_intensity = wind_trails(p, t);
    let wind_color = vec3(1.0, 0.8, 0.6);
    
    let mouse_pos = MouseCoords();
    let mouse_dist = length(p - mouse_pos);
    let mouse_wind = exp(-mouse_dist * 2.0) * 0.3;
    let mouse_effect = wind_field(p + mouse_pos * 0.1, t + mouse_dist * 10.0);
    let mouse_particles = length(mouse_effect) * mouse_wind;
    
    let background_flow = smooth_noise(p * 1.0 + vec2(t * 0.1, 0.0)) * 0.03;
    let enhanced_sky = sky_gradient + vec3(background_flow);
    
    var final_color = enhanced_sky;
    final_color += wind_color * wind_intensity * 0.4;
    final_color += vec3(1.0, 0.7, 0.4) * mouse_particles;
    
    return vec4(ToLinearRgb(final_color), 1.0);
}