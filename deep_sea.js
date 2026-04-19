/**
 * Features drifting particles (marine snow) and an organic central entity.
 */

const vertexShader = `
  attribute float size;
  attribute vec3 customColor;
  varying vec3 vColor;
  void main() {
    vColor = customColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    // Distance-based size calculation
    gl_PointSize = size * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    float strength = exp(-d * 8.0);
    strength *= (1.0 - smoothstep(0.4, 0.5, d));
    gl_FragColor = vec4(vColor, strength);
  }
`;

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

  // Define 12 variations of blue for each chroma bin
  this.chromaColors = [];
  for (let i = 0; i < 12; i++) {
    const c = new THREE.Color();
    const hue = 0.5 + (i / 12) * 0.25; 
    c.setHSL(hue, 0.8, 0.5);
    this.chromaColors.push(c);
  }

  // Base particle color
  const baseColor = new THREE.Color(0x224488);

  for (let i = 0; i < particleCount; i++) {
    // Spread particles in a wide area
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

    // Assign to a chroma bin (0-11)
    this.chromaIndices[i] = Math.floor(Math.random() * 12);

    // Initial color
    colors[i * 3] = baseColor.r;
    colors[i * 3 + 1] = baseColor.g;
    colors[i * 3 + 2] = baseColor.b;

    // Initial size - Set even smaller for near-invisibility when silent
    const bSize = 0.1 + Math.random() * 0.2;
    sizes[i] = bSize;
    this.baseSizes[i] = bSize;

    // Slow drifting velocity
    this.velocities[i * 3] = (Math.random() - 0.5) * 0.01;
    this.velocities[i * 3 + 1] = -Math.random() * 0.02; // Sinking slowly
    this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
  particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const particleMat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true
  });

  this.particles = new THREE.Points(particleGeo, particleMat);
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
  this.smoothCentroid = 0.5;

  return {};
}

export function update({ time, audio, bloom, vignette }) {
  const features = audio.features || {};
  let rms = features.rms || 0;
  let centroid = features.spectralCentroid || 0;
  const chroma = features.chroma || new Array(12).fill(0);
  
  // Noise floor gate - Lowered for more sensitivity
  const noiseFloor = 0.002;
  rms = Math.max(0, rms - noiseFloor) * 2.5; // Increased gain

  // --- 1. Particles Movement & Chroma Reactivity ---
  const positions = this.particles.geometry.attributes.position.array;
  const colors = this.particles.geometry.attributes.customColor.array;
  const sizes = this.particles.geometry.attributes.size.array;
  
  for (let i = 0; i < positions.length / 3; i++) {
    // A. Movement
    positions[i * 3] += this.velocities[i * 3] + Math.sin(time + i) * 0.001 * rms;
    positions[i * 3 + 1] += this.velocities[i * 3 + 1] - 0.002 * (1 + rms * 5);
    positions[i * 3 + 2] += this.velocities[i * 3 + 2] + Math.cos(time + i) * 0.001 * rms;

    if (positions[i * 3 + 1] < -10) {
      positions[i * 3 + 1] = 10;
    }

    // B. Chroma Reactivity (Color & Size)
    const chromaIdx = this.chromaIndices[i];
    
    // Implement Chroma Gating: Subtract noise floor and scale back up
    const chromaNoiseFloor = 0.15; 
    let chromaVal = Math.max(0, (chroma[chromaIdx] || 0) - chromaNoiseFloor) * 1.2;
    
    // Couple with global RMS for total silence protection
    const rmsGate = Math.min(1.0, rms * 10.0); 
    chromaVal *= rmsGate;

    // Re-balanced intensity with gating
    let intensity = Math.pow(chromaVal, 1.2) * 12.0; 
    intensity = Math.min(intensity, 1.5); // Prevent white-out
    
    // Target Color - Set to zero for total darkness in silence
    const targetColor = this.chromaColors[chromaIdx];
    const baseR = 0.0;
    const baseG = 0.0;
    const baseB = 0.0;
    
    const r = baseR + targetColor.r * intensity;
    const g = baseG + targetColor.g * intensity;
    const b = baseB + targetColor.b * intensity;
    
    colors[i * 3] = THREE.MathUtils.lerp(colors[i * 3], r, 0.15);
    colors[i * 3 + 1] = THREE.MathUtils.lerp(colors[i * 3 + 1], g, 0.15);
    colors[i * 3 + 2] = THREE.MathUtils.lerp(colors[i * 3 + 2], b, 0.15);

    // Target Size - Increased relative growth for more contrast
    const targetSize = this.baseSizes[i] * (1.0 + intensity * 3.5); 
    sizes[i] = THREE.MathUtils.lerp(sizes[i], targetSize, 0.1);
  }
  this.particles.geometry.attributes.position.needsUpdate = true;
  this.particles.geometry.attributes.customColor.needsUpdate = true;
  this.particles.geometry.attributes.size.needsUpdate = true;

  // --- 2. Central Entity Animation ---
  const scale = 1.0 + rms * 2.0;
  this.jelly.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
  
  // Organic swaying
  this.jelly.rotation.x = Math.sin(time * 0.5) * 0.2;
  this.jelly.rotation.y = time * 0.1;
  this.jelly.rotation.z = Math.cos(time * 0.3) * 0.2;

  // Color shift based on Centroid
  this.smoothCentroid = THREE.MathUtils.lerp(this.smoothCentroid, centroid / 2000, 0.05);
  const hue = 0.5 + Math.min(0.2, this.smoothCentroid * 0.2); // Blue range
  // Reduced sensitivity for the central entity
  this.jelly.material.color.setHSL(hue, 0.8, 0.4);
  this.jelly.material.emissive.setHSL(hue, 1.0, 0.1 + rms * 0.5);
  this.jelly.material.emissiveIntensity = 0.2 + rms * 1.5;

  // --- 3. Effects ---
  bloom.strength = 0.2 + rms * 1.5;
  bloom.threshold = 0.1;
  bloom.radius = 1.2;

  vignette.offset = 1.0;
  vignette.darkness = 1.5;

  // Gentle scene pulse
  const pulse = Math.sin(time * 0.2) * 0.05;
  this.group.position.y = pulse;
}

export function cleanup(scene) {
  Shekere.clearScene(scene);
}
