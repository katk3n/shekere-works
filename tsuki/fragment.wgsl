

fn moon(p: vec2<f32>, center: vec2<f32>, radius: f32, glow: f32) -> vec3<f32> {
    let dist = length(p - center);
    let moon_surface = smoothstep(radius + 0.02, radius - 0.02, dist);
    let moon_glow = exp(-dist * glow) * 0.3;
    let moon_color = vec3(0.95, 0.95, 0.8);
    return moon_color * (moon_surface + moon_glow);
}

fn star(p: vec2<f32>, center: vec2<f32>, intensity: f32, twinkle: f32) -> vec3<f32> {
    let dist = length(p - center);
    let star_core = exp(-dist * 80.0) * intensity;
    let star_glow = exp(-dist * 20.0) * intensity * 0.3;
    let twinkle_factor = 0.5 + 0.5 * sin(Time.duration * twinkle + center.x * 100.0 + center.y * 80.0);
    let star_color = vec3(0.9, 0.95, 1.0);
    return star_color * (star_core + star_glow) * twinkle_factor;
}

fn rand(seed: f32) -> f32 {
    return (fract(sin(seed) * 43758.5453) - 0.5) * 2.0;
}

fn rand_position(x: f32) -> vec2<f32> {
    return vec2(rand(x), rand(x * 1.1)) * 0.9;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let m = MouseCoords();
    let p = NormalizedCoords(in.position.xy);

    let night_sky = vec3(0.02, 0.05, 0.15);
    
    var star_intensity = 0.0;
    var moon_size_boost = 0.0;
    var constellation_brightness = 0.0;

    for (var i = 0; i < 16; i++) {
        if Osc.trucks[i].sound == 1 {
            star_intensity += Osc.trucks[i].gain * Osc.trucks[i].ttl * 0.3;
        }
        if Osc.trucks[i].sound == 2 {
            constellation_brightness += Osc.trucks[i].gain * Osc.trucks[i].ttl * 0.5;
        }
        if Osc.trucks[i].sound == 3 {
            moon_size_boost += Osc.trucks[i].gain * Osc.trucks[i].ttl * 0.2;
        }
    }

    var scene = night_sky;
    
    let moon_pos = vec2(-0.6, -0.6);
    let moon_radius = 0.15 + moon_size_boost * 0.1;
    let moon_glow = 3.0 + moon_size_boost * 2.0;
    scene += moon(p, moon_pos, moon_radius, moon_glow);

    let mouse_influence = length(p - m) * 0.5;
    let moon_mouse_glow = exp(-mouse_influence * 2.0) * 0.1;
    scene += vec3(0.9, 0.9, 0.7) * moon_mouse_glow;

    for (var i = 0; i < 30; i++) {
        var star_pos = rand_position(f32(i) * 2.5);
        star_pos.x = star_pos.x * 1.8 - 0.4;
        star_pos.y = star_pos.y * 1.8 - 0.4;
        
        if length(star_pos - moon_pos) > 0.25 {
            let base_intensity = 0.3 + rand(f32(i) * 3.7) * 0.4;
            let sound_boost = star_intensity * (0.5 + rand(f32(i) * 4.2) * 0.5);
            let constellation_boost = constellation_brightness * (0.3 + rand(f32(i) * 5.1) * 0.7);
            let total_intensity = base_intensity + sound_boost + constellation_boost;
            
            let twinkle_speed = 2.0 + rand(f32(i) * 6.3) * 3.0;
            scene += star(p, star_pos, total_intensity, twinkle_speed);
        }
    }

    for (var i = 0; i < 8; i++) {
        let bright_star_pos = vec2(
            rand(f32(i) * 7.8) * 1.6 - 0.8,
            rand(f32(i) * 8.9) * 1.6 - 0.8
        );
        
        if length(bright_star_pos - moon_pos) > 0.3 {
            let bright_intensity = 0.8 + constellation_brightness * 1.5;
            let bright_twinkle = 1.5 + constellation_brightness * 2.0;
            scene += star(p, bright_star_pos, bright_intensity, bright_twinkle);
        }
    }

    return vec4(ToLinearRgb(scene), 1.0);
}
