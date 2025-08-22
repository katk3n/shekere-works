fn orb(pos: vec2<f32>, center: vec2<f32>, radius: f32, intensity: f32) -> f32 {
    let dist = length(pos - center);
    let core = smoothstep(radius + 0.02, radius - 0.01, dist) * intensity;
    let glow = exp(-dist / (radius * 2.5)) * intensity * 0.5;
    return core + glow;
}

fn note_to_position(note: u32) -> vec2<f32> {
    let center = vec2(0.5, 0.5);
    
    if (note >= 50u && note <= 54u) {
        return center;
    }
    
    var angle: f32;
    var radius = 0.25;
    
    if (note == 63u || note == 64u) {
        angle = 0.0;
        if (note == 63u) {
            radius = 0.23;
        } else {
            radius = 0.27;
        }
    } else if (note == 66u || note == 67u) {
        angle = 3.14159 / 4.0;
        if (note == 66u) {
            radius = 0.23;
        } else {
            radius = 0.27;
        }
    } else if (note >= 68u && note <= 72u) {
        angle = 3.14159 / 2.0;
        if (note == 68u) {
            radius = 0.19;
        } else if (note == 69u) {
            radius = 0.23;
        } else if (note == 70u) {
            radius = 0.27;
        } else if (note == 71u) {
            radius = 0.31;
        } else {
            radius = 0.35;
        }
    } else if (note == 65u) {
        angle = 3.0 * 3.14159 / 4.0;
    } else if (note == 61u || note == 62u) {
        angle = 3.14159;
        if (note == 61u) {
            radius = 0.23;
        } else {
            radius = 0.27;
        }
    } else if (note == 58u) {
        angle = 5.0 * 3.14159 / 4.0;
    } else if (note >= 55u && note <= 57u) {
        angle = 3.0 * 3.14159 / 2.0;
        if (note == 55u) {
            radius = 0.21;
        } else if (note == 56u) {
            radius = 0.25;
        } else {
            radius = 0.29;
        }
    } else if (note == 59u || note == 60u) {
        angle = 7.0 * 3.14159 / 4.0;
        if (note == 59u) {
            radius = 0.23;
        } else {
            radius = 0.27;
        }
    } else {
        angle = 0.0;
    }
    
    let x = center.x + cos(angle) * radius;
    let y = center.y + sin(angle) * radius;
    
    return vec2(x, y);
}

fn screen_flash(pos: vec2<f32>, intensity: f32, color: vec3<f32>) -> vec4<f32> {
    let flash_color = color * intensity;
    return vec4(flash_color, intensity * 0.4);
}

fn hsv_to_rgb(h: f32, s: f32, v: f32) -> vec3<f32> {
    let c = v * s;
    let x = c * (1.0 - abs((h * 6.0) % 2.0 - 1.0));
    let m = v - c;
    
    var rgb = vec3<f32>(0.0);
    
    if (h < 1.0 / 6.0) {
        rgb = vec3(c, x, 0.0);
    } else if (h < 2.0 / 6.0) {
        rgb = vec3(x, c, 0.0);
    } else if (h < 3.0 / 6.0) {
        rgb = vec3(0.0, c, x);
    } else if (h < 4.0 / 6.0) {
        rgb = vec3(0.0, x, c);
    } else if (h < 5.0 / 6.0) {
        rgb = vec3(x, 0.0, c);
    } else {
        rgb = vec3(c, 0.0, x);
    }
    
    return rgb + vec3(m);
}

fn note_to_color(note: u32) -> vec3<f32> {
    let normalized_note = f32(note - 50u) / 20.0;
    let hue = normalized_note;
    let saturation = 0.8;
    let value = 0.9;
    return hsv_to_rgb(hue, saturation, value);
}


@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let uv = in.tex_coords;
    let t = Time.duration;
    
    let previous_frame = SamplePreviousPass(uv);

    var final_color = previous_frame;
    final_color -= vec4(0.01);

    if (final_color[3] < 0.001) {
        final_color = vec4(0.0);
    }

    let pulse = 1.0 + sin(t * 8.0) * 0.1;
    let orb_radius = 0.04;
    
    for (var note = 50u; note <= 72u; note++) {
        if (MidiNoteOn(note) > 0.0) {
            let orb_center = note_to_position(note);
            let intensity = pulse * 0.8;
            let orb_value = orb(uv, orb_center, orb_radius, intensity);
            
            if (orb_value > 0.01) {
                let base_color = note_to_color(note);
                let orb_color = base_color * orb_value;
                final_color += vec4(orb_color, orb_value);
            }
        }
    }
    
    if (MidiNoteOn(93u) > 0.0) {
        let flash_intensity = pulse * 0.3;
        let bright_blue_white = vec3(0.7, 0.85, 1.0);
        let flash_effect = screen_flash(uv, flash_intensity, bright_blue_white);
        final_color += flash_effect;
    }
    
    if (MidiNoteOn(95u) > 0.0) {
        let flash_intensity = pulse * 0.3;
        let bright_blue_white = vec3(0.7, 0.85, 1.0);
        let flash_effect = screen_flash(uv, flash_intensity, bright_blue_white);
        final_color += flash_effect;
    }
    
    return final_color;
}