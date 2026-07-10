export function setup(scene) {
    this.rings = [];
    const numRings = 12; // 12 rings for the 12 musical pitch classes (C, C#, D... B)
    
    for (let i = 0; i < numRings; i++) {
        // As i increases, radius gets larger (scaled down to fit 12 rings)
        const radius = 0.5 + i * 0.22;
        const tube = 0.005 + (i * 0.0015); // Made thinner
        const geometry = new THREE.TorusGeometry(radius, tube, 32, 100);
        
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.1,
            transparent: true,
            opacity: 0.9 - (i * 0.08), // Outer rings are slightly more transparent
            roughness: 0.2,
            metalness: 0.8
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Rings lie perfectly flat on the screen (facing camera)
        mesh.rotation.x = 0;
        mesh.rotation.y = 0;
        
        scene.add(mesh);
        
        this.rings.push({
            mesh: mesh,
            index: i,
            speed: (i % 2 === 0 ? 1 : -1) * (0.1 + i * 0.05) // Alternate rotation direction and speed
        });
    }

    // Center Core Light
    const coreGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const coreMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.0,
        wireframe: true,
        transparent: true,
        opacity: 0.0
    });
    this.coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(this.coreMesh);

    // Lighting
    const light = new THREE.PointLight(0xffffff, 50, 100);
    light.position.set(0, 0, 5);
    scene.add(light);
    this.light = light;

    // 2D Flat HUD / Radar Background
    // A large, flat wireframe circular grid
    const bgGeo = new THREE.RingGeometry(0.1, 15, 64, 8); 
    
    this.bgMat = new THREE.MeshBasicMaterial({ 
        color: 0x0066cc, 
        wireframe: true, 
        transparent: true, 
        opacity: 0.3,
        blending: THREE.AdditiveBlending
    });
    
    this.bgMesh = new THREE.Mesh(bgGeo, this.bgMat);
    this.bgMesh.position.z = -5; // Behind the rings
    scene.add(this.bgMesh);
    
    // Expanding circular pulses (radar waves)
    this.bgPulses = [];
    for(let i=0; i<3; i++) {
        // Inner radius 0.99 makes it a very thin line, even when expanded
        const pGeo = new THREE.RingGeometry(0.99, 1.0, 64);
        const pMat = new THREE.MeshBasicMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.0,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.z = -2 - i;
        
        // phase from 0 to 1 determines expansion scale
        pMesh.userData = { phase: i * (1.0 / 3.0) }; 
        this.bgPulses.push(pMesh);
        scene.add(pMesh);
    }

    // Geometric Cyber Tunnel Background

    // Track smoothed values for more fluid animation
    this.smoothedVolume = 0;
    this.smoothedBass = 0;
    
    // Initialize background color so we can animate it later
    scene.background = new THREE.Color(0x000000);
    this.smoothedHigh = 0;

    return {
        // Strictly limit the analyzer to D3 (146Hz) - E5 (660Hz) as requested
        audio: { minFreqHz: 146, maxFreqHz: 660 } 
    };
}

export function update(context) {
    const { time, audio, bloom } = context;

    // Extract audio features with fallbacks
    const rawVolume = audio.volume ?? (audio.features?.rms ?? 0);
    const rawBass = audio.bass ?? 0;
    const rawHigh = audio.high ?? 0;

    // Noise gate - lowered back to 0.02 to allow softer sounds to pass
    const activeVolume = rawVolume > 0.02 ? rawVolume : 0;
    const activeBass = rawBass > 0.02 ? rawBass : 0;
    const activeHigh = rawHigh > 0.02 ? rawHigh : 0;

    // Smooth inputs
    this.smoothedVolume = THREE.MathUtils.lerp(this.smoothedVolume, activeVolume, 0.15);
    this.smoothedBass = THREE.MathUtils.lerp(this.smoothedBass, activeBass, 0.2);
    this.smoothedHigh = THREE.MathUtils.lerp(this.smoothedHigh, activeHigh, 0.2);

    // Detect attack sounds (transients) by checking for sudden spikes in volume
    const attack = Math.max(0, activeVolume - this.smoothedVolume);
    if (this.smoothedAttack === undefined) this.smoothedAttack = 0;
    // Fast rise, smooth fall for visual flashes
    if (attack > this.smoothedAttack) {
        this.smoothedAttack = THREE.MathUtils.lerp(this.smoothedAttack, attack, 0.8); 
    } else {
        this.smoothedAttack = THREE.MathUtils.lerp(this.smoothedAttack, 0, 0.1); 
    }

    // Update Core Mesh
    this.coreMesh.rotation.z = time * 0.5;
    this.coreMesh.rotation.y = 0;
    this.coreMesh.rotation.x = 0;

    // Core sphere remains faintly visible even in silence, but flashes violently ONLY on attack sounds
    this.coreMesh.material.emissiveIntensity = Math.max(0.05, this.smoothedAttack * 350.0);
    this.coreMesh.material.opacity = Math.max(0.15, Math.min(1.0, this.smoothedAttack * 70.0));

    // Base Hue that slowly cycles over time
    const baseHue = (time * 0.1) % 1.0;

    const chroma = audio.features?.chroma || [];
    const numChroma = chroma.length; // Usually 12
    
    const spectrum = audio.features?.spectrum || [];
    const numBands = spectrum.length;
    
    // Calculate energy specifically in the C5-E5 range
    // Since our spectrum is D3 (146Hz) to E5 (660Hz), C5 (523Hz) is in the upper ~25% of the bins.
    let highNoteEnergy = 0;
    if (numBands > 0) {
        const startIndex = Math.floor(numBands * 0.75); // Top 25% of the D3-E5 spectrum
        let sum = 0;
        for (let i = startIndex; i < numBands; i++) {
            sum += spectrum[i];
        }
        highNoteEnergy = sum / (numBands - startIndex);
    }
    
    if (this.smoothedHighNote === undefined) this.smoothedHighNote = 0;
    this.smoothedHighNote = THREE.MathUtils.lerp(this.smoothedHighNote, highNoteEnergy, 0.2);
    
    // Update all rings
    this.rings.forEach((ringData, i) => {
        const { mesh, speed } = ringData;
        
        // Flat Z-axis rotation
        mesh.rotation.z = time * speed;
        mesh.rotation.x = 0;
        mesh.rotation.y = 0;

        // Chroma behavior: map each ring exactly to one of the 12 pitch classes
        let rawChroma = 0;
        if (numChroma === 12) {
            rawChroma = chroma[i];
            
            // Explicitly boost C, C#, D, D#, E (indices 0, 1, 2, 3, 4) if there is energy in the C5-E5 range
            if (i >= 0 && i <= 4) {
                rawChroma += this.smoothedHighNote * 3.0; 
                rawChroma = Math.min(1.0, rawChroma);
            }
        }

        // 1. Isolate dominant pitches using a threshold on the raw chroma (0.0 to 1.0)
        const threshold = 0.6; 
        let activeBand = 0;
        if (rawChroma > threshold) {
            activeBand = (rawChroma - threshold) / (1.0 - threshold);
        }

        // 2. Gate with volume so it disappears in silence
        // Use smoothedHighNote to prevent high melodic notes from being gated out due to low RMS
        const effectiveVolume = Math.max(this.smoothedVolume, this.smoothedHighNote * 2.0);
        
        if (effectiveVolume < 0.02) {
            activeBand = 0;
        } else {
            // Multiply by a boosted volume factor so it fades smoothly
            activeBand *= Math.min(1.0, effectiveVolume * 20.0);
        }
        
        // Smooth the chroma value individually for this ring
        if (mesh.userData.smoothedBand === undefined) mesh.userData.smoothedBand = 0;
        mesh.userData.smoothedBand = THREE.MathUtils.lerp(mesh.userData.smoothedBand, activeBand, 0.25);
        
        const audioFactor = mesh.userData.smoothedBand;
        
        // Dynamic emissive intensity
        // Rings are thinner, so we dramatically increase the intensity multiplier to make them glow powerfully
        mesh.material.emissiveIntensity = audioFactor * (25.0 + i * 3.0);
        
        // Fade out completely when silent
        const maxOpacity = 0.9 - (i * 0.05);
        const currentOpacity = Math.min(maxOpacity, audioFactor * 10.0);
        mesh.material.opacity = currentOpacity;
        
        // Completely disable rendering if opacity is practically zero to prevent black silhouettes
        mesh.visible = (currentOpacity > 0.01);
        
        // Color shift: offset hue by index to make a beautiful spectrum radiating outward
        // The 12 notes map perfectly around the color wheel!
        const hue = (baseHue + (i / 12)) % 1.0;
        mesh.material.color.setHSL(hue, 1.0, 0.5);
        mesh.material.emissive.setHSL(hue, 1.0, 0.5);
    });

    // Update 2D Flat Background
    // Slowly rotate the wireframe radar grid
    this.bgMesh.rotation.z = time * 0.05;
    
    // Shift the color of the pattern slowly through the spectrum
    const patternHue = (time * 0.03) % 1.0;
    this.bgMat.color.setHSL(patternHue, 0.8, 0.3);
    
    // Audio reactivity for opacity
    this.bgMat.opacity = 0.2 + this.smoothedVolume * 0.4;
    
    // Expand radar pulses outward
    this.bgPulses.forEach(pulse => {
        // Sync color with background grid
        pulse.material.color.setHSL(patternHue, 0.8, 0.4);
        
        // Expand outward, speeding up slightly with audio (slower than before)
        pulse.userData.phase += 0.001 + (this.smoothedVolume * 0.004);
        if (pulse.userData.phase > 1.0) pulse.userData.phase -= 1.0; // Reset
        
        const scale = 1.0 + pulse.userData.phase * 15.0; // Expand up to 16x size
        pulse.scale.set(scale, scale, 1);
        
        // Fade in and out smoothly using a sine wave on the phase (0 -> 1 -> 0)
        const fade = Math.sin(pulse.userData.phase * Math.PI);
        pulse.material.opacity = fade * (0.05 + this.smoothedVolume * 0.2);
    });

    // Slowly shift the overall background color of the scene
    // Keep lightness low (below bloom threshold) so the glowing rings stand out with high contrast
    const bgHue = (time * 0.05) % 1.0;
    const bgLightness = 0.02 + this.smoothedVolume * 0.08; 
    scene.background.setHSL(bgHue, 0.8, bgLightness);

    // Post-processing effects (Bloom)
    if (!this.fxInitialized) {
        bloom.radius = 0.75;
        bloom.threshold = 0.2;
        this.fxInitialized = true;
    }
    // Use a strong, constant base bloom strength so rings always glow brightly when visible
    bloom.strength = 1.5 + this.smoothedHigh * 1.5;
}

export function cleanup(scene) {
    Shekere.clearScene(scene);
}
