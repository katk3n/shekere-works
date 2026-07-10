/**
 * Features drifting particles (marine snow) and an organic central entity.
 */

export function setup(scene) {
  // --- 1. Scene Setup ---
  this.group = new THREE.Group();
  scene.add(this.group);

  const particleCount = 2000;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  this.velocities = new Float32Array(particleCount * 3);
  this.chromaIndices = new Int8Array(particleCount);
  this.baseSizes = new Float32Array(particleCount);

  // Define 12 fixed colors for chroma (pitch classes)
  this.chromaColors = [];
  for (let i = 0; i < 12; i++) {
    const c = new THREE.Color();
    c.setHSL(i / 12.0, 1.0, 0.5); // Full color wheel for chroma
    this.chromaColors.push(c);
  }

  for (let i = 0; i < particleCount; i++) {
    // Spread particles in a wide area
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

    // Assign to a chroma bin (0-11)
    this.chromaIndices[i] = Math.floor(Math.random() * 12);

    // Initial color is dark/black (they will light up when their note hits)
    colors[i * 3] = 0;
    colors[i * 3 + 1] = 0;
    colors[i * 3 + 2] = 0;

    // Initial size - Set even smaller for near-invisibility when silent
    const bSize = 0.1 + Math.random() * 0.2;
    sizes[i] = bSize;
    this.baseSizes[i] = bSize;

    // Slow drifting velocity
    this.velocities[i * 3] = (Math.random() - 0.5) * 0.01;
    this.velocities[i * 3 + 1] = -Math.random() * 0.02; // Sinking slowly
    this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
  }

  // Use PlaneGeometry for TSL InstancedMesh instead of BufferGeometry points
  const particleGeo = new THREE.PlaneGeometry(1, 1);
  particleGeo.setAttribute('instanceOffset', new THREE.InstancedBufferAttribute(positions, 3));
  particleGeo.setAttribute('customColor', new THREE.InstancedBufferAttribute(colors, 3));
  particleGeo.setAttribute('size', new THREE.InstancedBufferAttribute(sizes, 1));

  const particleMat = new THREE.MeshBasicNodeMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true
  });

  const instanceOffset = TSL.attribute('instanceOffset', 'vec3');
  const sizeAttribute = TSL.attribute('size', 'float');
  const customColorAttribute = TSL.attribute('customColor', 'vec3');

  // Billboarding
  const viewOffset = TSL.cameraViewMatrix.mul(TSL.modelWorldMatrix).mul(TSL.vec4(instanceOffset, 1.0));
  const scaledLocal = TSL.positionLocal.xy.mul(sizeAttribute);
  const finalViewPos = viewOffset.add(TSL.vec4(scaledLocal, 0.0, 0.0));
  particleMat.vertexNode = TSL.cameraProjectionMatrix.mul(finalViewPos);

  const getOpacity = TSL.Fn(() => {
    const d = TSL.distance(TSL.uv(), TSL.vec2(0.5));
    let strength = TSL.exp(d.mul(-8.0));
    strength = strength.mul(TSL.sub(1.0, TSL.smoothstep(0.4, 0.5, d)));
    return strength;
  });

  particleMat.colorNode = customColorAttribute;
  particleMat.opacityNode = getOpacity();

  this.particles = new THREE.InstancedMesh(particleGeo, particleMat, particleCount);
  this.particles.frustumCulled = false;
  this.group.add(this.particles);

  // --- 3. Central Entity (The "Jellyfish") ---
  const torusGeo = new THREE.TorusKnotGeometry(1, 0.3, 100, 16);
  const torusMat = new THREE.MeshStandardMaterial({
    color: 0x004488,
    emissive: 0x001133,
    emissiveIntensity: 0.5,
    metalness: 0.9,
    roughness: 0.1,
    wireframe: true,
    transparent: true,
    opacity: 0.8
  });

  this.jelly = new THREE.Mesh(torusGeo, torusMat);
  this.group.add(this.jelly);

  // --- 4. Lighting ---
  const topLight = new THREE.DirectionalLight(0x4488ff, 1);
  topLight.position.set(0, 10, 0);
  scene.add(topLight);

  const ambientLight = new THREE.AmbientLight(0x001122, 0.5);
  scene.add(ambientLight);

  // --- 5. State ---
  this.prevRms = 0;
  this.attackBurst = 0;
  this.tempColor = new THREE.Color(); // For dynamic hue calculations

  return {};
}

export function update({ time, audio, bloom, vignette }) {
  const features = audio.features || {};
  let rms = features.rms || 0;
  let zcr = features.zcr || 0;
  let centroid = features.spectralCentroid || 0;
  const chroma = features.chroma || new Array(12).fill(0);
  
  // Noise floor gate - Lowered for more sensitivity
  const noiseFloor = 0.002;
  rms = Math.max(0, rms - noiseFloor) * 2.5; // Increased gain

  // --- 0. Calculate Signals: FFT for Jellyfish, Chroma for Particles ---
  const rmsGate = Math.min(1.0, rms * 10.0);
  
  // Detect Transients (Attacks) by looking at the sudden increase in RMS
  const transient = Math.max(0, rms - this.prevRms);
  this.prevRms = rms;
  
  // Create an "Attack Burst" that spikes on transients and decays quickly (0.7 factor)
  this.attackBurst = Math.max(transient * 12.0, this.attackBurst * 0.7);
  
  // Combine Burst with ZCR, but only if ZCR exceeds a threshold (e.g., 150)
  // This ensures that only sharp, high-frequency attacks trigger the flash.
  const zcrThreshold = 150;
  const zcrFactor = Math.max(0, zcr - zcrThreshold) * 0.02;
  const zcrBoost = Math.min(4.0, this.attackBurst * zcrFactor);

  // A. FFT Processing (for Jellyfish)
  let maxFftEnergy = 0;
  let dominantFftBand = 123; // Middle default
  // Band 85 ~= D3 (146Hz), Band 161 ~= E5 (659Hz)
  for (let i = 85; i <= 161; i++) {
    let energy = ((audio.bands[i - 1] || 0) + (audio.bands[i] || 0) + (audio.bands[i + 1] || 0)) / 3;
    if (energy > maxFftEnergy) {
      maxFftEnergy = energy;
      dominantFftBand = i;
    }
  }

  // Map dominant FFT band to Hue (Red to Blue) and Dynamic Size Multiplier
  let t = (dominantFftBand - 85) / (161 - 85);
  t = Math.max(0, Math.min(1, t));
  
  // High frequencies use a larger multiplier (up to 15x) to compensate for fewer active particles.
  // Low frequencies use a smaller multiplier (6x) to avoid over-saturation.
  const dynamicSizeMult = 6.0 + t * 9.0;
  
  const jellyHue = t * 0.66; 
  t = t * t * (3 - 2 * t); // S-curve for hue mapping only

  // B. Chroma Processing (for Particles)
  // Find max chroma to dynamically boost weak signals (e.g. high notes)
  let maxChromaVal = 0;
  for (let i = 0; i < 12; i++) {
    if ((chroma[i] || 0) > maxChromaVal) maxChromaVal = chroma[i];
  }
  // Soft normalization: max boost 3x
  const chromaBoost = maxChromaVal > 0.01 ? Math.min(3.0, 0.6 / maxChromaVal) : 1.0;

  const chromaIntensities = new Float32Array(12);
  for (let i = 0; i < 12; i++) {
    let boostedChroma = (chroma[i] || 0) * chromaBoost;
    // Lowered noise floor (0.1) to catch delicate high notes
    let cv = Math.max(0, boostedChroma - 0.1) * 1.5;
    let intensity = Math.pow(cv, 1.2) * 8.0; 
    chromaIntensities[i] = Math.min(intensity, 2.5) * rmsGate; 
  }

  // --- 1. Particles Movement & Chroma Reactivity ---
  const positions = this.particles.geometry.attributes.instanceOffset.array;
  const colors = this.particles.geometry.attributes.customColor.array;
  const sizes = this.particles.geometry.attributes.size.array;
  
  for (let i = 0; i < positions.length / 3; i++) {
    // A. Movement
    positions[i * 3] += this.velocities[i * 3] + Math.sin(time + i) * 0.001 * rms;
    positions[i * 3 + 1] += this.velocities[i * 3 + 1] - 0.002 * (1 + rms * 5);
    positions[i * 3 + 2] += this.velocities[i * 3 + 2] + Math.cos(time + i) * 0.001 * rms;

    // Keep particles within the original bounds to prevent them from drifting away
    if (positions[i * 3] < -10) positions[i * 3] += 20;
    else if (positions[i * 3] > 10) positions[i * 3] -= 20;

    if (positions[i * 3 + 1] < -10) positions[i * 3 + 1] += 20;
    else if (positions[i * 3 + 1] > 10) positions[i * 3 + 1] -= 20;

    if (positions[i * 3 + 2] < -10) positions[i * 3 + 2] += 20;
    else if (positions[i * 3 + 2] > 10) positions[i * 3 + 2] -= 20;

    // B. Chroma Reactivity (Color & Size)
    const cIdx = this.chromaIndices[i];
    const intensity = chromaIntensities[cIdx];
    
    // Each particle has a FIXED color based on its assigned chroma bin
    const targetColor = this.chromaColors[cIdx];
    
    const r = targetColor.r * intensity;
    const g = targetColor.g * intensity;
    const b = targetColor.b * intensity;
    
    // Decay faster when sound stops (intensity is low)
    const colorDecaySpeed = (intensity < 0.1) ? 0.4 : 0.15;
    
    colors[i * 3] = THREE.MathUtils.lerp(colors[i * 3], r, colorDecaySpeed);
    colors[i * 3 + 1] = THREE.MathUtils.lerp(colors[i * 3 + 1], g, colorDecaySpeed);
    colors[i * 3 + 2] = THREE.MathUtils.lerp(colors[i * 3 + 2], b, colorDecaySpeed);

    // Make particles shrink almost to nothing (0.05x) in silence, grow massively with sound
    // Dynamic growth multiplier ensures balance between low (many particles) and high (few particles) notes
    const targetSize = this.baseSizes[i] * (0.05 + intensity * dynamicSizeMult); 
    const sizeDecaySpeed = (targetSize < sizes[i]) ? 0.4 : 0.15;
    sizes[i] = THREE.MathUtils.lerp(sizes[i], targetSize, sizeDecaySpeed);
  }
  this.particles.geometry.attributes.instanceOffset.needsUpdate = true;
  this.particles.geometry.attributes.customColor.needsUpdate = true;
  this.particles.geometry.attributes.size.needsUpdate = true;

  // --- 2. Central Entity Animation ---
  // Scale bursts on attacks - Toned down for more subtle movement
  const targetScale = 1.0 + rms * 2.0 + zcrBoost * 0.3;
  const scaleLerp = zcrBoost > 0.5 ? 0.2 : 0.1; 
  this.jelly.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), scaleLerp);
  
  // Organic swaying
  this.jelly.rotation.x = Math.sin(time * 0.5) * 0.2;
  this.jelly.rotation.y = time * 0.1;
  this.jelly.rotation.z = Math.cos(time * 0.3) * 0.2;

  // Set jelly color to the dominant FFT frequency (Red=Low, Blue=High)
  if (maxFftEnergy > 0.05) {
    this.tempColor.setHSL(jellyHue, 1.0, 0.5);
    this.jelly.material.color.lerp(this.tempColor, 0.05);
    this.jelly.material.emissive.lerp(this.tempColor, 0.05);
  } else {
    // Dim down emissive color slowly towards dark blue when silent
    this.tempColor.setHSL(0.6, 0.8, 0.1);
    this.jelly.material.emissive.lerp(this.tempColor, 0.02);
  }
  
  // Emphasize attack contrast by "ducking" the base melody brightness when an attack hits
  const melodyIntensity = 0.2 + rms * 1.5;
  const ducking = Math.max(0.1, 1.0 - zcrBoost * 0.4);
  this.jelly.material.emissiveIntensity = (melodyIntensity * ducking) + zcrBoost * 4.0;

  // --- 3. Effects ---
  bloom.strength = 0.2 + rms * 1.5 + zcrBoost * 0.8;
  bloom.threshold = 0.1;
  bloom.radius = 1.2 + zcrBoost * 0.8; // Expand glow on attacks

  vignette.offset = 1.0;
  vignette.darkness = 1.5;

  // Gentle scene pulse
  const pulse = Math.sin(time * 0.2) * 0.05;
  this.group.position.y = pulse;
}

export function cleanup(scene) {
  Shekere.clearScene(scene);
}
