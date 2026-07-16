/**
 * wave_loom.js — A living textile woven from recent audio waveforms.
 *
 * Each new waveform becomes the front weft of the cloth. Older rows recede
 * into depth, while stereo balance twists the fabric and spectral brightness
 * dyes the threads. The fixed history buffers avoid per-frame allocations.
 */

const COLUMN_COUNT = 160;
const ROW_COUNT = 72;
const CAPTURE_INTERVAL = 1 / 30;
const CLOTH_WIDTH = 8.6;
const CLOTH_DEPTH = 12.5;
const WAVE_HEIGHT = 2.1;
const NEAR_Z = 1.15;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function findRisingTrigger(waveform) {
  if (!waveform || waveform.length < 2) return 0;

  const searchEnd = Math.min(1024, waveform.length - 1);
  let bestIndex = 0;
  let bestSlope = 0;

  for (let i = 1; i < searchEnd; i++) {
    const previous = waveform[i - 1];
    const current = waveform[i];
    const slope = current - previous;

    if (previous <= 0 && current > 0 && slope > bestSlope) {
      bestSlope = slope;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function createWeaveTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  context.fillStyle = '#c8d4e6';
  context.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 4) {
    context.fillStyle = y % 8 === 0 ? 'rgba(15, 26, 58, 0.20)' : 'rgba(255, 241, 220, 0.13)';
    context.fillRect(0, y, size, 1);
  }
  for (let x = 0; x < size; x += 3) {
    context.fillStyle = x % 6 === 0 ? 'rgba(13, 26, 58, 0.16)' : 'rgba(255, 246, 230, 0.10)';
    context.fillRect(x, 0, 1, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 13);
  return texture;
}

function pushWaveformRow(state, audio, time) {
  state.waveHistory.copyWithin(COLUMN_COUNT, 0, (ROW_COUNT - 1) * COLUMN_COUNT);
  state.energyHistory.copyWithin(1, 0, ROW_COUNT - 1);
  state.hueHistory.copyWithin(1, 0, ROW_COUNT - 1);
  state.twistHistory.copyWithin(1, 0, ROW_COUNT - 1);
  state.widthHistory.copyWithin(1, 0, ROW_COUNT - 1);

  const waveform = audio?.waveform?.mono;
  const left = audio?.waveform?.left ?? waveform;
  const right = audio?.waveform?.right ?? waveform;
  const rms = audio?.features?.rms ?? 0;
  const volume = audio?.volume ?? 0;
  const energy = clamp01(Math.max(volume, rms * 4));
  const centroid = audio?.features?.spectralCentroid ?? 0;
  const trigger = findRisingTrigger(waveform);
  const sourceLength = waveform?.length ?? 0;
  const available = Math.max(1, sourceLength - trigger - 1);

  let leftPower = 0;
  let rightPower = 0;
  let differencePower = 0;

  for (let column = 0; column < COLUMN_COUNT; column++) {
    const normalizedX = column / (COLUMN_COUNT - 1);
    const sourceIndex = sourceLength > 0
      ? Math.min(sourceLength - 1, trigger + Math.floor(normalizedX * available))
      : 0;
    const monoSample = waveform?.[sourceIndex] ?? 0;
    const leftSample = left?.[sourceIndex] ?? monoSample;
    const rightSample = right?.[sourceIndex] ?? monoSample;

    leftPower += leftSample * leftSample;
    rightPower += rightSample * rightSample;
    const difference = leftSample - rightSample;
    differencePower += difference * difference;

    const idleWeave =
      Math.sin(normalizedX * Math.PI * 6 + time * 0.72) * 0.028 +
      Math.sin(normalizedX * Math.PI * 14 - time * 0.43) * 0.012;
    const sample = energy > 0.006 ? monoSample : idleWeave;

    // A small horizontal filter keeps the textile fluid without hiding attacks.
    const previousSample = column > 0 ? state.waveHistory[column - 1] : sample;
    state.waveHistory[column] = THREE.MathUtils.lerp(sample, previousSample, 0.18);
  }

  const leftRms = Math.sqrt(leftPower / COLUMN_COUNT);
  const rightRms = Math.sqrt(rightPower / COLUMN_COUNT);
  const stereoWidth = clamp01(Math.sqrt(differencePower / COLUMN_COUNT) * 2.5);
  const balance = (leftRms - rightRms) / Math.max(0.001, leftRms + rightRms);

  state.energyHistory[0] = energy;
  state.hueHistory[0] = (0.52 + clamp01(centroid / 6500) * 0.34) % 1;
  state.twistHistory[0] = balance * 0.72;
  state.widthHistory[0] = stereoWidth;
}

function updateClothGeometry(state, time) {
  const positions = state.positionAttribute.array;
  const colors = state.colorAttribute.array;
  const halfWidth = CLOTH_WIDTH * 0.5;

  for (let row = 0; row < ROW_COUNT; row++) {
    const depthT = row / (ROW_COUNT - 1);
    const historyFade = 1 - depthT;
    const energy = state.energyHistory[row];
    const stereoWidth = state.widthHistory[row];
    const twist = state.twistHistory[row] + Math.sin(time * 0.13 + depthT * 4.5) * 0.025;
    const hue = (state.hueHistory[row] + depthT * 0.055) % 1;
    const idleLift = Math.sin(time * 0.5 - depthT * 5.0) * 0.05;

    state.tempColor.setHSL(hue, 0.72 + energy * 0.2, 0.38 + energy * 0.24);

    for (let column = 0; column < COLUMN_COUNT; column++) {
      const vertex = row * COLUMN_COUNT + column;
      const offset = vertex * 3;
      const xT = column / (COLUMN_COUNT - 1);
      const baseX = (xT * 2 - 1) * halfWidth;
      const edgeEnvelope = Math.sin(xT * Math.PI);
      const wave = state.waveHistory[vertex] * WAVE_HEIGHT * (0.5 + energy * 1.35);
      const crossThread = Math.sin(xT * Math.PI * 18 + depthT * 8 - time * 0.35) * 0.018;
      const unrotatedY = wave * edgeEnvelope + idleLift + crossThread;
      const rotation = twist + stereoWidth * Math.sin(depthT * 7 + time * 0.22) * 0.13;
      const cosine = Math.cos(rotation);
      const sine = Math.sin(rotation);

      positions[offset] = baseX * cosine - unrotatedY * sine;
      positions[offset + 1] = baseX * sine + unrotatedY * cosine;
      positions[offset + 2] = NEAR_Z - depthT * CLOTH_DEPTH;

      const waveformGlow = Math.min(1, Math.abs(state.waveHistory[vertex]) * 2.8);
      const clothSheen = 0.88 + Math.sin(xT * Math.PI * 3 + depthT * 5.5 + time * 0.18) * 0.12;
      const brightness = (0.28 + energy * 0.8 + waveformGlow * 0.42) * clothSheen * (0.32 + historyFade * 0.68);
      colors[offset] = state.tempColor.r * brightness;
      colors[offset + 1] = state.tempColor.g * brightness;
      colors[offset + 2] = state.tempColor.b * brightness;
    }
  }

  state.positionAttribute.needsUpdate = true;
  state.colorAttribute.needsUpdate = true;
  state.geometry.computeVertexNormals();
}

export function setup(scene) {
  const vertexCount = COLUMN_COUNT * ROW_COUNT;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const indices = [];

  for (let row = 0; row < ROW_COUNT; row++) {
    for (let column = 0; column < COLUMN_COUNT; column++) {
      const vertex = row * COLUMN_COUNT + column;
      const offset = vertex * 3;
      const xT = column / (COLUMN_COUNT - 1);
      const depthT = row / (ROW_COUNT - 1);
      positions[offset] = (xT - 0.5) * CLOTH_WIDTH;
      positions[offset + 1] = 0;
      positions[offset + 2] = NEAR_Z - depthT * CLOTH_DEPTH;

      if (column < COLUMN_COUNT - 1 && row < ROW_COUNT - 1) {
        const nextRow = vertex + COLUMN_COUNT;
        indices.push(vertex, nextRow, vertex + 1, vertex + 1, nextRow, nextRow + 1);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  const colorAttribute = new THREE.BufferAttribute(colors, 3);
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('color', colorAttribute);
  geometry.setIndex(indices);

  const weaveTexture = createWeaveTexture();
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    map: weaveTexture,
    bumpMap: weaveTexture,
    bumpScale: 0.12,
    roughness: 0.68,
    metalness: 0.08,
    emissive: new THREE.Color(0x081326),
    emissiveIntensity: 0.24,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.97
  });

  const cloth = new THREE.Mesh(geometry, material);
  cloth.frustumCulled = false;
  const loomGroup = new THREE.Group();
  // Shekere's camera faces forward, so tilt the textile toward it to reveal
  // the time-history depth as if the viewer were looking down from above.
  loomGroup.rotation.x = 0.3;
  loomGroup.position.y = -0.8;
  loomGroup.add(cloth);
  scene.add(loomGroup);

  const framePoints = [
    new THREE.Vector3(-4.55, -2.35, NEAR_Z + 0.05), new THREE.Vector3(-4.55, 2.35, NEAR_Z + 0.05),
    new THREE.Vector3(4.55, -2.35, NEAR_Z + 0.05), new THREE.Vector3(4.55, 2.35, NEAR_Z + 0.05),
    new THREE.Vector3(-4.55, -2.35, NEAR_Z), new THREE.Vector3(-4.55, -1.1, NEAR_Z - CLOTH_DEPTH),
    new THREE.Vector3(4.55, -2.35, NEAR_Z), new THREE.Vector3(4.55, -1.1, NEAR_Z - CLOTH_DEPTH),
    new THREE.Vector3(-4.55, 2.35, NEAR_Z), new THREE.Vector3(4.55, 2.35, NEAR_Z),
    new THREE.Vector3(-4.55, -2.35, NEAR_Z), new THREE.Vector3(4.55, -2.35, NEAR_Z)
  ];
  const frameGeometry = new THREE.BufferGeometry().setFromPoints(framePoints);
  const frameMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color().setHSL(0.09, 0.48, 0.34),
    transparent: true,
    opacity: 0.52
  });
  const frame = new THREE.LineSegments(frameGeometry, frameMaterial);
  loomGroup.add(frame);

  const dustCount = 260;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 13;
    dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 7;
    dustPositions[i * 3 + 2] = 0.5 - Math.random() * 17;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMaterial = new THREE.PointsMaterial({
    color: new THREE.Color().setHSL(0.58, 0.55, 0.72),
    size: 0.025,
    transparent: true,
    opacity: 0.52,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  loomGroup.add(dust);

  const skyLight = new THREE.HemisphereLight(0x8ab8ff, 0x12071f, 1.15);
  scene.add(skyLight);
  const frontLight = new THREE.DirectionalLight(0xffd7b8, 2.1);
  frontLight.position.set(-2.5, 5, 6);
  scene.add(frontLight);
  const sideLight = new THREE.PointLight(0x5f88ff, 1.6, 18);
  sideLight.position.set(4, 1, 3);
  scene.add(sideLight);

  scene.background = new THREE.Color(0x03040c);

  this.waveLoom = {
    loomGroup,
    cloth,
    frame,
    dust,
    geometry,
    frontLight,
    sideLight,
    positionAttribute,
    colorAttribute,
    waveHistory: new Float32Array(vertexCount),
    energyHistory: new Float32Array(ROW_COUNT),
    hueHistory: new Float32Array(ROW_COUNT).fill(0.57),
    twistHistory: new Float32Array(ROW_COUNT),
    widthHistory: new Float32Array(ROW_COUNT),
    tempColor: new THREE.Color(),
    lastCaptureTime: -Infinity,
    smoothBass: 0,
    smoothMid: 0,
    smoothHigh: 0,
    smoothEnergy: 0,
    previousEnergy: 0,
    impact: 0,
    fxInitialized: false
  };

  return {
    audio: {
      minFreqHz: 30,
      maxFreqHz: 12000
    }
  };
}

export function update(context) {
  const state = this.waveLoom;
  if (!state) return;

  const { time = 0, audio = {}, bloom, rgbShift, film, vignette } = context;
  const rms = audio.features?.rms ?? 0;
  const rawEnergy = clamp01(Math.max(audio.volume ?? 0, rms * 4));
  const bass = audio.bass ?? 0;
  const mid = audio.mid ?? 0;
  const high = audio.high ?? 0;

  state.smoothEnergy = THREE.MathUtils.lerp(state.smoothEnergy, rawEnergy, 0.12);
  state.smoothBass = THREE.MathUtils.lerp(state.smoothBass, bass, 0.1);
  state.smoothMid = THREE.MathUtils.lerp(state.smoothMid, mid, 0.1);
  state.smoothHigh = THREE.MathUtils.lerp(state.smoothHigh, high, 0.12);

  const energyRise = rawEnergy - state.previousEnergy;
  if (energyRise > 0.035) state.impact = Math.min(1, state.impact + energyRise * 5);
  state.impact *= 0.9;
  state.previousEnergy = rawEnergy;

  if (time - state.lastCaptureTime >= CAPTURE_INTERVAL) {
    pushWaveformRow(state, audio, time);
    state.lastCaptureTime = time;
  }

  updateClothGeometry(state, time);

  state.loomGroup.position.y = -0.8 - state.smoothBass * 0.14;
  state.cloth.rotation.y = Math.sin(time * 0.11) * 0.045;
  state.cloth.position.y = Math.sin(time * 0.27) * 0.08;
  state.cloth.material.opacity = 0.82 + state.smoothEnergy * 0.18;
  state.frame.rotation.y = state.cloth.rotation.y * 0.35;
  state.dust.rotation.z = time * 0.006;
  state.dust.position.y = Math.sin(time * 0.16) * 0.12;
  state.dust.material.opacity = 0.34 + state.smoothHigh * 0.42 + state.impact * 0.2;
  state.cloth.material.emissiveIntensity = 0.2 + state.smoothHigh * 0.24 + state.impact * 0.16;
  state.frontLight.intensity = 1.65 + state.smoothBass * 1.2 + state.impact * 0.6;
  state.sideLight.intensity = 0.75 + state.smoothHigh * 1.25;

  if (bloom) {
    bloom.strength = 0.72 + state.smoothBass * 1.25 + state.impact * 0.85;
    bloom.radius = 0.58 + state.smoothMid * 0.18;
    bloom.threshold = 0.18;
  }
  if (rgbShift) rgbShift.amount = state.smoothHigh * 0.0035 + state.impact * 0.0015;

  if (!state.fxInitialized) {
    if (film) film.intensity = 0.16;
    if (vignette) {
      vignette.offset = 1.05;
      vignette.darkness = 1.35;
    }
    state.fxInitialized = true;
  }
}

export function cleanup(scene) {
  Shekere.clearScene(scene);
}
