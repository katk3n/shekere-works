// Singapore Light Spectacular
// An audio-reactive light-and-water performance inspired by Marina Bay.

const IMAGE_ASPECT = 1024 / 572;
const BACKGROUND_Z = -4.8;
const BACKGROUND_Y = 1.8;
const WATERLINE_Y = -3.65;
const WATER_SURFACE_Y = WATERLINE_Y - 2.4;
const SHEKERE_CAMERA_Z = 5;
const SHEKERE_CAMERA_FOV = 75;
const FOUNTAIN_SPAN = 9.2;
const FOUNTAIN_COUNT = 64;
const DROPLET_COUNT = 3072;
const LASER_COUNT = 8;
const RIPPLE_COUNT = 10;
const ACT_DURATION = 16;

const ACTS = [
  { hue: 0.53, accentHue: 0.60, atmosphere: 0.16, laser: 0.12, fountain: 0.42 },
  { hue: 0.84, accentHue: 0.075, atmosphere: 0.42, laser: 0.30, fountain: 0.70 },
  { hue: 0.56, accentHue: 0.76, atmosphere: 0.30, laser: 0.66, fountain: 0.78 },
  { hue: 0.105, accentHue: 0.52, atmosphere: 0.54, laser: 0.90, fountain: 1.00 },
];

let state;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0, edge1, value) {
  const x = clamp01((value - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
}

function fitBackgroundToViewport() {
  const distance = SHEKERE_CAMERA_Z - BACKGROUND_Z;
  const viewHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(SHEKERE_CAMERA_FOV * 0.5));
  const viewWidth = viewHeight * (window.innerWidth / window.innerHeight);
  state.skyline.scale.set(viewWidth, viewWidth / IMAGE_ASPECT, 1);
  state.veil.scale.copy(state.skyline.scale);
}

function createSoftBeamTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const vertical = ctx.createLinearGradient(0, 0, 0, canvas.height);
  vertical.addColorStop(0, 'rgba(255,255,255,0.95)');
  vertical.addColorStop(0.55, 'rgba(255,255,255,0.58)');
  vertical.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalCompositeOperation = 'destination-in';
  const horizontal = ctx.createLinearGradient(0, 0, canvas.width, 0);
  horizontal.addColorStop(0, 'rgba(255,255,255,0)');
  horizontal.addColorStop(0.36, 'rgba(255,255,255,0.3)');
  horizontal.addColorStop(0.5, 'rgba(255,255,255,1)');
  horizontal.addColorStop(0.64, 'rgba(255,255,255,0.3)');
  horizontal.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = horizontal;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return new THREE.CanvasTexture(canvas);
}

function createWaterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(4,14,27,0.88)');
  gradient.addColorStop(0.32, 'rgba(1,8,20,0.96)');
  gradient.addColorStop(1, 'rgba(0,3,10,0.995)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Broad, blurred patches give the surface depth without drawing literal
  // wave lines. Copies are painted across the horizontal edges for tiling.
  let seed = 1977;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 44; i++) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radius = 28 + random() * 78;
    const light = random() > 0.44;
    for (const offsetX of [-canvas.width, 0, canvas.width]) {
      const patch = ctx.createRadialGradient(
        x + offsetX,
        y,
        0,
        x + offsetX,
        y,
        radius
      );
      patch.addColorStop(
        0,
        light ? 'rgba(25,55,74,0.032)' : 'rgba(0,2,8,0.19)'
      );
      patch.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = patch;
      ctx.fillRect(x + offsetX - radius, y - radius, radius * 2, radius * 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(1.35, 1);
  texture.center.set(0.5, 0.5);
  return texture;
}

function measureWaveformPeak(waveform) {
  let peak = 0;
  for (let i = 0; i < waveform.length; i += 4) {
    peak = Math.max(peak, Math.abs(waveform[i]));
  }
  return peak;
}

function dominantChromaHue(chroma) {
  if (!chroma?.length) return 0;
  let strongest = 0;
  let strongestValue = 0;
  for (let i = 0; i < 12; i++) {
    const value = chroma[i] ?? 0;
    if (value > strongestValue) {
      strongestValue = value;
      strongest = i;
    }
  }
  return strongestValue > 0.08 ? strongest / 12 : 0;
}

function fountainPattern(actIndex, normalizedX, time, index) {
  const center = 1 - Math.abs(normalizedX);
  const wave = 0.5 + 0.5 * Math.sin(time * 1.45 - Math.abs(normalizedX) * 7.5);

  if (actIndex === 0) {
    return 0.24 + center * 0.24 + wave * 0.12;
  }
  if (actIndex === 1) {
    const traveling = 0.5 + 0.5 * Math.sin(time * 2.1 - normalizedX * 8.5);
    return 0.26 + center * 0.35 + traveling * 0.32;
  }
  if (actIndex === 2) {
    const steps = index % 6 < 3 ? 1 : 0.48;
    const cityPulse = 0.5 + 0.5 * Math.sin(time * 3.2 + Math.floor(index / 3) * 0.75);
    return 0.25 + steps * 0.28 + cityPulse * 0.35;
  }

  const crown = Math.pow(center, 0.55);
  const finaleWave = 0.5 + 0.5 * Math.sin(time * 2.8 - Math.abs(normalizedX) * 5.0);
  return 0.42 + crown * 0.42 + finaleWave * 0.24;
}

function fountainAngle(actIndex, normalizedX, time) {
  if (actIndex === 0) return normalizedX * -0.035;
  if (actIndex === 1) return normalizedX * -0.22 + Math.sin(time * 0.8) * 0.025;
  if (actIndex === 2) return Math.sin(normalizedX * 11 + time * 1.4) * 0.07;
  return normalizedX * -0.31 + Math.sin(time * 0.65) * 0.035;
}

export function setup(scene) {
  state = {
    previousBackground: scene.background,
    lastTime: 0,
    smoothBass: 0,
    smoothMid: 0,
    smoothHigh: 0,
    smoothRms: 0,
    smoothCentroid: 0,
    smoothWavePeak: 0,
    previousEnergy: 0,
    accent: 0,
    rippleCursor: 0,
    tempMatrix: new THREE.Matrix4(),
    tempColor: new THREE.Color(),
    textures: [],
  };

  scene.background = new THREE.Color(0x010714);

  const loader = new THREE.TextureLoader();
  state.skylineTexture = loader.load(
    Shekere.convertFileSrc(`${Shekere.SKETCH_DIR}assets/singapore.png`)
  );
  state.skylineTexture.colorSpace = THREE.SRGBColorSpace;
  state.textures.push(state.skylineTexture);

  state.skyline = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: state.skylineTexture,
      color: 0x6f8cbd,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  state.skyline.position.set(0, BACKGROUND_Y, BACKGROUND_Z);
  state.skyline.renderOrder = 0;
  scene.add(state.skyline);

  state.veil = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: 0x02091b,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    })
  );
  state.veil.position.set(0, BACKGROUND_Y, BACKGROUND_Z + 0.08);
  state.veil.renderOrder = 1;
  scene.add(state.veil);
  fitBackgroundToViewport();

  state.waterTexture = createWaterTexture();
  state.textures.push(state.waterTexture);
  state.water = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 5.8),
    new THREE.MeshBasicMaterial({
      map: state.waterTexture,
      color: 0x111d2b,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    })
  );
  state.water.position.set(0, WATER_SURFACE_Y, -4.15);
  state.water.renderOrder = 3;
  scene.add(state.water);

  state.fountains = [];
  for (let i = 0; i < FOUNTAIN_COUNT; i++) {
    const normalizedX = (i / (FOUNTAIN_COUNT - 1)) * 2 - 1;
    state.fountains.push({
      normalizedX,
      x: normalizedX * FOUNTAIN_SPAN,
      phase: i * 0.41,
      height: 1,
      angle: 0,
      hue: 0.53,
    });
  }

  // Every fountain is made only from independently moving water particles.
  // Staggered lifetimes keep each jet continuous without forming rigid segments.
  const dropletGeometry = new THREE.IcosahedronGeometry(1, 0);
  const dropletMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.48,
    blending: THREE.NormalBlending,
    depthWrite: false,
  });
  state.droplets = new THREE.InstancedMesh(dropletGeometry, dropletMaterial, DROPLET_COUNT);
  state.droplets.frustumCulled = false;
  state.droplets.renderOrder = 6;
  state.dropletData = [];
  const particlesPerFountain = DROPLET_COUNT / FOUNTAIN_COUNT;
  for (let i = 0; i < DROPLET_COUNT; i++) {
    const nozzle = i % FOUNTAIN_COUNT;
    const sequence = Math.floor(i / FOUNTAIN_COUNT);
    const normalizedX = (nozzle / (FOUNTAIN_COUNT - 1)) * 2 - 1;
    state.dropletData.push({
      nozzle,
      cycle: (sequence / particlesPerFountain + Math.random() * 0.012) % 1,
      speed: 0.24 + Math.random() * 0.08,
      drift: (Math.random() - 0.5) * (0.08 + Math.abs(normalizedX) * 0.08),
      depth: (Math.random() - 0.5) * 0.11,
      phase: Math.random() * Math.PI * 2,
      scale: 0.014 + Math.random() * 0.018,
    });
    state.tempMatrix.makeScale(0, 0, 0);
    state.droplets.setMatrixAt(i, state.tempMatrix);
    state.droplets.setColorAt(i, state.tempColor.setHSL(0.54, 0.82, 0.74));
  }
  state.droplets.instanceMatrix.needsUpdate = true;
  state.droplets.instanceColor.needsUpdate = true;
  scene.add(state.droplets);

  const dropletReflectionMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.11,
    blending: THREE.NormalBlending,
    depthWrite: false,
  });
  state.dropletReflections = new THREE.InstancedMesh(
    dropletGeometry,
    dropletReflectionMaterial,
    DROPLET_COUNT
  );
  state.dropletReflections.frustumCulled = false;
  state.dropletReflections.renderOrder = 4;
  for (let i = 0; i < DROPLET_COUNT; i++) {
    state.tempMatrix.makeScale(0, 0, 0);
    state.dropletReflections.setMatrixAt(i, state.tempMatrix);
    state.dropletReflections.setColorAt(i, state.tempColor.setHSL(0.55, 0.28, 0.48));
  }
  state.dropletReflections.instanceMatrix.needsUpdate = true;
  state.dropletReflections.instanceColor.needsUpdate = true;
  scene.add(state.dropletReflections);

  state.ripples = [];
  const rippleGeometry = new THREE.RingGeometry(0.96, 1, 96);
  for (let i = 0; i < RIPPLE_COUNT; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: 0x6de9ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ripple = new THREE.Mesh(rippleGeometry, material);
    ripple.position.set(0, WATERLINE_Y - 0.12, -3.78);
    ripple.scale.set(0, 0, 0);
    ripple.userData.age = 2;
    ripple.userData.speed = 1;
    ripple.renderOrder = 7;
    scene.add(ripple);
    state.ripples.push(ripple);
  }

  state.beamTexture = createSoftBeamTexture();
  state.textures.push(state.beamTexture);
  const laserGeometry = new THREE.PlaneGeometry(0.28, 11);
  laserGeometry.translate(0, 5.5, 0);
  state.lasers = [];
  state.laserReflections = [];
  for (let i = 0; i < LASER_COUNT; i++) {
    const side = i < LASER_COUNT / 2 ? -1 : 1;
    const localIndex = i % (LASER_COUNT / 2);
    const originX = side * (0.55 + localIndex * 0.72);
    const material = new THREE.MeshBasicMaterial({
      map: state.beamTexture,
      color: new THREE.Color().setHSL(0.42 + localIndex * 0.025, 0.96, 0.66),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const laser = new THREE.Mesh(laserGeometry, material);
    laser.position.set(originX, WATERLINE_Y, -3.92);
    laser.userData.side = side;
    laser.userData.localIndex = localIndex;
    laser.userData.phase = i * 0.83;
    laser.renderOrder = 8;
    scene.add(laser);
    state.lasers.push(laser);

    const reflectionMaterial = material.clone();
    reflectionMaterial.opacity = 0;
    const reflection = new THREE.Mesh(laserGeometry, reflectionMaterial);
    reflection.position.set(originX, WATERLINE_Y - 0.04, -4.08);
    reflection.scale.y = -0.22;
    reflection.userData.source = laser;
    reflection.renderOrder = 4;
    scene.add(reflection);
    state.laserReflections.push(reflection);
  }

  return { audio: { minFreqHz: 35, maxFreqHz: 10000 } };
}

export function update({ time, audio, bloom, rgbShift, film, vignette }) {
  if (!state) return;
  fitBackgroundToViewport();

  const dt = Math.min(Math.max(time - state.lastTime, 0), 0.05);
  state.lastTime = time;

  const volume = audio?.volume ?? 0;
  const bass = audio?.bass ?? 0;
  const mid = audio?.mid ?? 0;
  const high = audio?.high ?? 0;
  const features = audio?.features ?? {};
  const rms = features.rms ?? 0;
  const centroid = features.spectralCentroid ?? 0;
  const chroma = features.chroma;

  state.smoothBass = THREE.MathUtils.lerp(state.smoothBass, bass, bass > state.smoothBass ? 0.16 : 0.055);
  state.smoothMid = THREE.MathUtils.lerp(state.smoothMid, mid, 0.09);
  state.smoothHigh = THREE.MathUtils.lerp(state.smoothHigh, high, high > state.smoothHigh ? 0.18 : 0.06);
  state.smoothRms = THREE.MathUtils.lerp(state.smoothRms, rms, 0.10);
  state.smoothCentroid = THREE.MathUtils.lerp(state.smoothCentroid, centroid, 0.08);

  const waveformPeak = audio?.waveform?.mono ? measureWaveformPeak(audio.waveform.mono) : 0;
  const waveformRise = waveformPeak - state.smoothWavePeak;
  state.smoothWavePeak = THREE.MathUtils.lerp(
    state.smoothWavePeak,
    waveformPeak,
    waveformPeak > state.smoothWavePeak ? 0.20 : 0.045
  );

  const energy = Math.max(volume, state.smoothBass, state.smoothMid, state.smoothHigh, state.smoothRms * 3);
  const hit = (waveformPeak > 0.05 && waveformRise > 0.016)
    || (energy > 0.025 && energy - state.previousEnergy > 0.016);
  if (hit) {
    state.accent = Math.max(state.accent, clamp01(0.55 + energy * 2.2));
    const ripple = state.ripples[state.rippleCursor++ % RIPPLE_COUNT];
    ripple.userData.age = 0;
    ripple.userData.speed = 0.85 + energy * 1.4;
    ripple.position.x = (Math.sin(time * 1.71) * 0.5) * 7.5;
  }
  state.accent = THREE.MathUtils.lerp(state.accent, 0, 0.075);
  state.previousEnergy = energy;

  const showTime = time % (ACT_DURATION * ACTS.length);
  const actIndex = Math.floor(showTime / ACT_DURATION);
  const actTime = showTime - actIndex * ACT_DURATION;
  const act = ACTS[actIndex];
  const transition = smoothstep(0, 2.4, actTime);
  const finaleLift = actIndex === 3 ? smoothstep(7, 15, actTime) : 0;
  const chromaHue = dominantChromaHue(chroma);
  const centroidHue = clamp01(state.smoothCentroid / 5200);
  const paletteHue = (act.hue + chromaHue * 0.05 + centroidHue * 0.035) % 1;
  const idlePulse = 0.5 + 0.5 * Math.sin(time * 0.72);

  for (let i = 0; i < FOUNTAIN_COUNT; i++) {
    const fountain = state.fountains[i];
    const normalizedX = fountain.normalizedX;
    const pattern = fountainPattern(actIndex, normalizedX, time, i);
    const localBand = audio?.bands?.length
      ? audio.bands[Math.min(audio.bands.length - 1, Math.floor((i / FOUNTAIN_COUNT) * 150))] ?? 0
      : 0;
    const edgeHeight = THREE.MathUtils.lerp(1, 0.68, Math.pow(Math.abs(normalizedX), 2.4));
    const height = (0.55 + pattern * (2.35 + act.fountain * 2.25)
      + state.smoothBass * (1.35 + (1 - Math.abs(normalizedX)) * 2.2)
      + state.smoothMid * 1.25
      + localBand * 0.95
      + state.accent * (0.45 + (1 - Math.abs(normalizedX)) * 1.5)
      + finaleLift * 1.15) * edgeHeight;
    const angle = fountainAngle(actIndex, normalizedX, time);
    fountain.height = height;
    fountain.angle = angle;

    const hueBlend = Math.abs(normalizedX) * 0.075 + Math.sin(time * 0.12 + i * 0.08) * 0.012;
    const warmMix = actIndex === 1
      ? smoothstep(3, 11, actTime) * (1 - Math.abs(normalizedX) * 0.7)
      : 0;
    fountain.hue = THREE.MathUtils.lerp(paletteHue + hueBlend, act.accentHue, warmMix) % 1;
  }

  for (let i = 0; i < DROPLET_COUNT; i++) {
    const data = state.dropletData[i];
    const cycle = (time * data.speed + data.cycle) % 1;
    const source = state.fountains[data.nozzle];
    const arc = 4 * cycle * (1 - cycle);
    const breakup = smoothstep(0.38, 1, cycle);
    const spread = Math.tan(source.angle) * source.height * 1.55;
    const turbulence = Math.sin(data.phase + cycle * 18 + time * 3.4)
      * data.drift * breakup * (1 + state.smoothHigh * 0.9);
    const x = source.x + spread * cycle + turbulence;
    const y = WATERLINE_Y + source.height * arc;
    const z = -3.82 + data.depth
      + Math.cos(data.phase * 1.7 + cycle * 15) * 0.025 * breakup;
    const velocityStretch = 0.9 + Math.abs(1 - cycle * 2) * 0.9;
    const scale = data.scale * (
      0.82
      + state.smoothHigh * 0.55
      + state.accent * 0.28
      + breakup * 0.22
    );
    state.tempMatrix.makeScale(scale, scale * velocityStretch, scale);
    state.tempMatrix.setPosition(x, y, z);
    state.droplets.setMatrixAt(i, state.tempMatrix);
    const whiteMix = 0.76 + arc * 0.16;
    state.tempColor.setHSL(source.hue, 0.20, whiteMix);
    state.droplets.setColorAt(i, state.tempColor);

    const reflectionX = x + Math.sin(time * 1.8 + x * 2.1 + cycle * 8) * 0.035 * breakup;
    const reflectionY = WATERLINE_Y - (y - WATERLINE_Y) * 0.38;
    state.tempMatrix.makeScale(scale * 0.82, scale * velocityStretch * 0.34, scale * 0.82);
    state.tempMatrix.setPosition(reflectionX, reflectionY, -4.04);
    state.dropletReflections.setMatrixAt(i, state.tempMatrix);
    state.tempColor.setHSL(source.hue, 0.30, 0.44 + arc * 0.08);
    state.dropletReflections.setColorAt(i, state.tempColor);
  }
  state.droplets.instanceMatrix.needsUpdate = true;
  state.droplets.instanceColor.needsUpdate = true;
  state.dropletReflections.instanceMatrix.needsUpdate = true;
  state.dropletReflections.instanceColor.needsUpdate = true;

  state.ripples.forEach((ripple, index) => {
    ripple.userData.age += dt * ripple.userData.speed;
    const age = ripple.userData.age;
    if (age > 1.35) {
      ripple.material.opacity = 0;
      ripple.scale.set(0, 0, 0);
      return;
    }
    const scale = 0.18 + age * (2.4 + state.smoothBass * 1.6);
    ripple.scale.set(scale, scale * 0.12, 1);
    ripple.material.opacity = (1 - age / 1.35) * (0.22 + state.accent * 0.34);
    ripple.material.color.setHSL((paletteHue + index * 0.018) % 1, 0.82, 0.66);
  });

  state.lasers.forEach((laser, i) => {
    const side = laser.userData.side;
    const localIndex = laser.userData.localIndex;
    let angle;
    if (actIndex === 0) {
      angle = side * (0.10 + localIndex * 0.045) + Math.sin(time * 0.35 + i) * 0.015;
    } else if (actIndex === 1) {
      angle = side * (0.13 + localIndex * 0.085)
        + Math.sin(time * 0.65 + laser.userData.phase) * 0.035;
    } else if (actIndex === 2) {
      angle = side * (0.08 + localIndex * 0.12)
        + Math.sin(time * 1.15 + localIndex * 0.7) * 0.08;
    } else {
      angle = side * (0.16 + localIndex * 0.13)
        + Math.sin(time * 0.48 + laser.userData.phase) * 0.025;
    }
    laser.rotation.z = angle;
    laser.scale.y = 0.72 + state.smoothHigh * 0.28 + finaleLift * 0.22;
    laser.material.opacity = Math.min(
      0.88,
      act.laser * transition * (0.38 + idlePulse * 0.10)
        + state.smoothHigh * 0.52
        + state.accent * 0.26
        + finaleLift * 0.20
    );
    const laserHue = actIndex === 1 && localIndex > 1
      ? act.accentHue
      : (0.43 + centroidHue * 0.12 + localIndex * 0.018) % 1;
    laser.material.color.setHSL(laserHue, 0.96, 0.62 + state.accent * 0.16);

    const reflection = state.laserReflections[i];
    reflection.rotation.z = -angle * 0.42;
    reflection.material.color.copy(laser.material.color);
    reflection.material.opacity = laser.material.opacity * 0.16;
  });

  // The water drifts continuously on its own, independent of audio input.
  state.waterTexture.offset.x = (
    time * 0.006
    + Math.sin(time * 0.19) * 0.018
    + Math.sin(time * 0.071) * 0.011
  ) % 1;
  state.waterTexture.offset.y = Math.sin(time * 0.13) * 0.012
    + Math.sin(time * 0.047 + 1.8) * 0.007;
  state.waterTexture.rotation = Math.sin(time * 0.09) * 0.006;
  state.water.position.y = WATER_SURFACE_Y
    + Math.sin(time * 0.43) * 0.020
    + Math.sin(time * 0.17 + 1.4) * 0.011;
  state.water.scale.x = 1 + Math.sin(time * 0.23) * 0.009;
  state.water.scale.y = 1 + Math.sin(time * 0.31 + 0.8) * 0.014;
  state.water.material.color.setHSL(
    0.59 + Math.sin(time * 0.055) * 0.004,
    0.18,
    0.095 + Math.sin(time * 0.27) * 0.007
  );
  state.water.material.opacity = 0.68 + Math.sin(time * 0.36) * 0.016;
  state.skyline.material.opacity = 0.58 + (1 - act.atmosphere) * 0.16;
  state.veil.material.opacity = 0.25 + act.atmosphere * 0.16;

  bloom.strength = Math.min(
    3,
    0.72 + state.smoothBass * 1.25 + state.smoothHigh * 0.70
      + state.accent * 0.72 + finaleLift * 0.48
  );
  bloom.radius = 0.72 + act.atmosphere * 0.18;
  bloom.threshold = 0.18;
  rgbShift.amount = Math.min(
    0.018,
    0.0008 + state.smoothHigh * 0.006 + state.accent * 0.004 + finaleLift * 0.003
  );
  film.intensity = 0.045 + state.smoothRms * 0.11 + act.atmosphere * 0.04;
  vignette.offset = 0;
  vignette.darkness = 0;
}

export function cleanup(scene) {
  state?.textures?.forEach((texture) => texture.dispose());
  Shekere.clearScene(scene);
  scene.background = state?.previousBackground ?? null;
  state = null;
}
