export function setup(scene) {
  // Use a much brighter twilight/night blue so it clearly looks blue, not black
  const skyColor = 0x0a2b5e;
  scene.background = new THREE.Color(skyColor);
  // Reduce fog density slightly so we can see further into the horizon
  scene.fog = new THREE.FogExp2(skyColor, 0.02);

  // Use a much larger PlaneGeometry to ensure the water extends all the way to the aurora (horizon)
  // Reverted segment count to 120x90 to vastly improve CPU performance while maintaining a beautiful low-poly look
  const geometry = new THREE.PlaneGeometry(200, 150, 120, 90);
  
  // Create a color buffer for the water to allow color ripples
  const posAttribute = geometry.attributes.position;
  const waterColors = new Float32Array(posAttribute.count * 3);
  geometry.setAttribute('color', new THREE.BufferAttribute(waterColors, 3));
  
  // Set color to white so vertex colors dictate the exact surface color
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff, 
    vertexColors: true,
    emissive: 0x000000, 
    roughness: 0.2, // Spread the reflection wide
    metalness: 1.0,
    flatShading: true,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2.2;
  mesh.position.y = -2;
  mesh.position.z = -5;
  scene.add(mesh);

  // Directional Light acts like a moon/sky light, creating a massive, wide reflection across the entire water
  const dirLight = new THREE.DirectionalLight(0x0088ff, 8.0);
  dirLight.position.set(0, 10, -20);
  scene.add(dirLight);

  // PointLight for the intense, dynamic localized flashes
  const pointLight = new THREE.PointLight(0x00ffff, 5.0, 100);
  pointLight.position.set(0, 2, -2);
  scene.add(pointLight);

  // --- AURORA SETUP ---
  const auroraGroup = new THREE.Group();
  // Lower the aurora and push it back slightly so its bright bottom edge meets the distant water
  auroraGroup.position.set(0, 20, -70); 
  
  const auroraGeos = [];
  const auroraBasePositions = [];
  
  // Create 4 overlapping light curtains
  for (let i = 0; i < 4; i++) {
    // Make them very wide so the edges are off-screen or faded, and give them plenty of X segments for smooth folding
    const geo = new THREE.PlaneGeometry(240, 50, 120, 6); 
    const posAttr = geo.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);
    
    // We will initialize colors here, but they will be dynamically overwritten in update()
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4, // Base opacity
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false, // Don't let the sky fog hide the aurora
      side: THREE.DoubleSide
    });
    
    const auroraMesh = new THREE.Mesh(geo, mat);
    // Stagger them in depth
    auroraMesh.position.z = i * -10;
    
    auroraGroup.add(auroraMesh);
    auroraGeos.push(geo);
    auroraBasePositions.push(Float32Array.from(posAttr.array));
  }
  scene.add(auroraGroup);
  // --------------------

  this.mesh = mesh;
  this.geometry = geometry;
  this.dirLight = dirLight;
  this.pointLight = pointLight;
  
  this.auroraGroup = auroraGroup;
  this.auroraGeos = auroraGeos;
  this.auroraBasePositions = auroraBasePositions;
  this.auroraFlash = 0;
  
  // State for dynamic color shifting
  this.targetHue = 0.55; // Start at Cyan/Blue
  this.currentHue = 0.55;
  this.tempColor = new THREE.Color();
  
  this.basePositions = Float32Array.from(geometry.attributes.position.array);
  this.ripples = []; // We will use ripples to track color rings!
  this.prevRms = 0;

  return {
    audio: {
      minFreqHz: 20,
      maxFreqHz: 10000
    }
  };
}

export function update(context) {
  const { time, audio } = context;
  if (!this.mesh) return;

  const rms = audio?.features?.rms ?? 0;
  const rmsDelta = rms - this.prevRms;

  // Extremely sensitive trigger for any sound
  if (rms > 0.002 && rmsDelta > 0.002) {
    // Shift the global hue based on the sound!
    this.targetHue += 0.1 + Math.random() * 0.15;
    
    // Spawn a color ripple at the front of the screen
    const spawnX = (Math.random() - 0.5) * 80.0; 
    const spawnY = -20.0 - Math.random() * 20.0; 
    
    this.ripples.push({
      x: spawnX,
      y: spawnY,
      time: time,
      hue: this.targetHue % 1.0,
      strength: 2.0 + rms * 10.0 // Always spawn bright rings
    });
    
    // --- MASSIVE LIGHTING FOR EVERY SOUND ---
    // Make every sound flash intensely.
    this.pointLight.intensity = 200.0 + rms * 800.0; 
    this.pointLight.color.setHex(0xffffff); // Always flash pure white initially
    
    this.dirLight.intensity = 30.0 + rms * 100.0; 
    
    // Extreme Bloom (glow)
    // Any sound will spike the bloom to at least 8.0
    context.bloom = Math.max(context.bloom || 0.3, 8.0 + rms * 20.0);
    
    // Aurora flash
    this.auroraFlash = Math.max(this.auroraFlash, 0.8 + rms * 2.0);
  }
  this.prevRms = rms;

  // Keep color ripples alive long enough to reach the horizon
  this.ripples = this.ripples.filter(r => time - r.time < 15.0);

  // Smoothly lerp current color toward the target hue (for lights and aurora)
  this.currentHue += (this.targetHue - this.currentHue) * 0.05;
  const activeHue = this.currentHue % 1.0; 
  
  // Set the resting light colors to the active hue
  this.tempColor.setHSL(activeHue, 1.0, 0.5);

  // Move the point light in a sweeping motion
  this.pointLight.position.x = Math.sin(time * 0.8) * 10.0;
  this.pointLight.position.z = -5 + Math.cos(time * 0.5) * 8.0;

  // Decay lights to a much darker resting state
  this.pointLight.intensity = THREE.MathUtils.lerp(this.pointLight.intensity, 2.0, 0.1);
  this.pointLight.color.lerp(this.tempColor, 0.05);
  
  this.dirLight.intensity = THREE.MathUtils.lerp(this.dirLight.intensity, 2.0, 0.05);
  // Give dirLight a slightly deeper hue for contrast
  this.tempColor.setHSL((activeHue + 0.05) % 1.0, 1.0, 0.4);
  this.dirLight.color.lerp(this.tempColor, 0.05);
  
  // Maintain lower base bloom for darker resting state
  const safeBloom = isNaN(context.bloom) ? 0.3 : context.bloom;
  context.bloom = THREE.MathUtils.lerp(safeBloom, 0.3, 0.05);

  const positions = this.geometry.attributes.position.array;
  const colors = this.geometry.attributes.color.array;
  // Constant, gentle baseline wave flow (no reaction to volume)
  const flow = 0.8; 
  
  // --- PRECALCULATE RIPPPLES FOR PERFORMANCE ---
  // Computing colors and wavefronts outside the giant vertex loop saves massive CPU time
  const activeRipples = [];
  for (const r of this.ripples) {
    const t = time - r.time;
    if (t <= 0) continue;
    
    this.tempColor.setHSL(r.hue, 1.0, 0.5);
    const wavefront = t * 20.0; // The color wave travels fast across the surface
    
    activeRipples.push({
      x: r.x,
      y: r.y,
      wavefront: wavefront,
      strength: r.strength,
      cR: this.tempColor.r,
      cG: this.tempColor.g,
      cB: this.tempColor.b,
      maxDistSq: Math.pow(wavefront + 12.0, 2), // Precalculate active bounds
      minDistSq: Math.pow(Math.max(0, wavefront - 12.0), 2)
    });
  }

  for (let i = 0, v = 0; i < positions.length; i += 3, v++) {
    const bx = this.basePositions[i];
    const by = this.basePositions[i + 1];
    
    // Calculate static calm shape
    let z = Math.sin(bx * 0.4 + time * 1.5) * 0.6 * flow;
    z += Math.cos(by * 0.5 + time * 1.0) * 0.6 * flow;
    z += Math.sin((bx + by) * 0.3 - time * 0.8) * 0.5 * flow;
    positions[i + 2] = z;
    
    // Calculate propagating COLOR rings!
    let rSum = 0.0, gSum = 0.02, bSum = 0.05; // Base ocean color (darker now)
    
    for (const r of activeRipples) {
      const dx = bx - r.x;
      const dy = by - r.y;
      
      // Early exit using fast square distance bounding box!
      // This prevents running Math.sqrt() and Math.exp() on 95% of vertices
      const distSq = dx * dx + dy * dy;
      if (distSq > r.maxDistSq || distSq < r.minDistSq) continue;
      
      const d = Math.sqrt(distSq);
      
      // Calculate how close we are to the propagating ring
      const distFromFront = Math.abs(d - r.wavefront);
      
      // A glowing band of color (Gaussian pulse)
      const pulse = Math.exp(-distFromFront * distFromFront * 0.08);
      
      if (pulse > 0.01) {
        // Slow energy decay so the color ring reaches the back
        const energy = Math.exp(-d * 0.015);
        const intensity = pulse * energy * r.strength * 5.0; // Multiply to make the rings glow much brighter
        
        // Additively blend the pre-calculated glowing color
        rSum += r.cR * intensity;
        gSum += r.cG * intensity;
        bSum += r.cB * intensity;
      }
    }
    
    // Apply final vertex color
    colors[v*3]     = Math.min(1.0, rSum);
    colors[v*3 + 1] = Math.min(1.0, gSum);
    colors[v*3 + 2] = Math.min(1.0, bSum);
  }

  this.geometry.attributes.position.needsUpdate = true;
  this.geometry.attributes.color.needsUpdate = true;
  this.geometry.computeVertexNormals();

  this.mesh.rotation.z = time * 0.03;

  // --- UPDATE AURORA ---
  this.auroraFlash = THREE.MathUtils.lerp(this.auroraFlash, 0, 0.05);
  const baseAuroraOpacity = 0.15 + (audio?.volume ?? 0) * 0.8; // Lower base opacity for darker resting state
  
  for (let idx = 0; idx < this.auroraGeos.length; idx++) {
    const geo = this.auroraGeos[idx];
    const mesh = this.auroraGroup.children[idx];
    const basePos = this.auroraBasePositions[idx];
    const pos = geo.attributes.position.array;
    const aurColors = geo.attributes.color.array;
    
    // Update opacity based on volume and hit flashes
    mesh.material.opacity = baseAuroraOpacity + this.auroraFlash * 0.6;
    
    // Wave the curtains and update their dynamic colors
    for (let i = 0, v = 0; i < pos.length; i += 3, v++) {
      const bx = basePos[i];
      const by = basePos[i+1];
      
      const speed = time * 0.5 + idx * 2.0;
      let offsetY = Math.sin(bx * 0.04 + speed) * 4.0 + Math.cos(bx * 0.02 - speed) * 3.0;
      let offsetZ = Math.sin(bx * 0.05 - speed * 1.5) * 8.0;
      let offsetX = Math.cos(bx * 0.03 + speed) * 3.0;
      
      const normalizedY = (by + 25) / 50; 
      const waveStr = Math.pow(1.0 - normalizedY, 1.5); 
      
      pos[i] = basePos[i] + offsetX * waveStr;
      pos[i + 1] = basePos[i + 1] + offsetY * waveStr;
      pos[i + 2] = basePos[i + 2] + offsetZ * waveStr;
      
      const vertexHue = (activeHue + normalizedY * 0.15) % 1.0;
      this.tempColor.setHSL(vertexHue, 1.0, 0.6); 
      
      const normalizedX = (bx + 120) / 240; 
      const verticalFade = Math.pow(1.0 - normalizedY, 1.5); 
      const edgeFade = Math.sin(normalizedX * Math.PI);
      const fold = (Math.sin(bx * 0.15 + idx) * 0.5 + 0.5) * 0.6 + 0.4;
      
      const intensity = verticalFade * edgeFade * fold;
      
      aurColors[v*3] = this.tempColor.r * intensity;
      aurColors[v*3+1] = this.tempColor.g * intensity;
      aurColors[v*3+2] = this.tempColor.b * intensity;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }
  // ---------------------
}

export function cleanup(scene) {
  Shekere.clearScene(scene);
}
