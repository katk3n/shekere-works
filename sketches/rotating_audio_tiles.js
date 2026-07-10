/**
 * Rotating Audio Tiles
 *
 * A tiled field where each square listens to a different slice of the spectrum.
 * Bass rolls through the whole wall, mids flip individual tiles, and highs add
 * a small glittering tremble along their edges.
 */

const COLUMNS = 16;
const ROWS = 10;
const TILE_COUNT = COLUMNS * ROWS;
const PALETTE_HUES = [0.03, 0.10, 0.48, 0.58, 0.70, 0.84];

let tiles;
let tileData = [];
let tileEnergy = [];
let dummy;
let color;

export function setup(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const geometry = new THREE.BoxGeometry(0.53, 0.53, 0.095);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.62,
    roughness: 0.28,
    emissive: 0x13091f,
    emissiveIntensity: 0.35
  });

  tiles = new THREE.InstancedMesh(geometry, material, TILE_COUNT);
  tiles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  tiles.castShadow = true;
  tiles.receiveShadow = true;
  group.add(tiles);

  dummy = new THREE.Object3D();
  color = new THREE.Color();
  const spacing = 0.59;
  const offsetX = (COLUMNS - 1) * spacing * 0.5;
  const offsetY = (ROWS - 1) * spacing * 0.5;

  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      const index = row * COLUMNS + column;
      const x = column * spacing - offsetX;
      const y = offsetY - row * spacing;
      const phase = column * 0.48 + row * 0.71;

      const paletteIndex = (column * 2 + row * 3 + Math.floor(row / 2)) % PALETTE_HUES.length;
      tileData.push({
        x,
        y,
        phase,
        band: 5 + Math.floor((index / TILE_COUNT) * 190),
        hue: PALETTE_HUES[paletteIndex]
      });
      tileEnergy.push(0);
      dummy.position.set(x, y, 0);
      dummy.updateMatrix();
      tiles.setMatrixAt(index, dummy.matrix);

      color.setHSL(PALETTE_HUES[paletteIndex], 0.58, 0.27);
      tiles.setColorAt(index, color);
    }
  }

  // A dark backplate makes the hairline grout between each tile read clearly.
  const backplate = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 10),
    new THREE.MeshStandardMaterial({ color: 0x070611, roughness: 0.9, metalness: 0.05 })
  );
  backplate.position.z = -0.34;
  scene.add(backplate);

  const key = new THREE.PointLight(0xa989ff, 24, 18);
  key.position.set(-2.5, 3.5, 4.5);
  scene.add(key);
  const rim = new THREE.PointLight(0x25e6cc, 15, 16);
  rim.position.set(4, -2, 3);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0x34234b, 1.1));

  return { audio: { minFreqHz: 35, maxFreqHz: 10000 } };
}

export function update({ time, audio, rgbShift, film }) {
  const volume = audio?.volume ?? 0;
  const bass = audio?.bass ?? 0;
  const mid = audio?.mid ?? 0;
  const high = audio?.high ?? 0;
  const bands = audio?.bands ?? [];
  const pulse = Math.max(0, volume - 0.025) * 1.6;

  for (let index = 0; index < TILE_COUNT; index++) {
    const data = tileData[index];
    const spectrum = bands[data.band] ?? 0;
    const targetEnergy = Math.max(0, spectrum - 0.035) * 1.75;
    tileEnergy[index] = THREE.MathUtils.lerp(tileEnergy[index], targetEnergy, 0.16);

    const energy = tileEnergy[index];
    const idleWave = Math.sin(time * 0.7 + data.phase) * 0.11;
    const roll = Math.sin(time * 1.9 + data.phase) * (0.045 + bass * 0.18);

    dummy.position.set(data.x, data.y, energy * 0.13 + bass * 0.06);
    dummy.rotation.set(
      idleWave + roll + energy * (0.72 + mid * 0.8),
      Math.cos(time * 0.55 + data.phase) * 0.08 + energy * (0.92 + bass * 0.7),
      Math.sin(time * 1.6 + data.phase * 1.7) * high * 0.16
    );
    const scale = 1 + energy * 0.075 + pulse * 0.025;
    dummy.scale.set(scale, scale, 1);
    dummy.updateMatrix();
    tiles.setMatrixAt(index, dummy.matrix);

    // Each tile starts from a distinct amber, teal, blue, or violet family.
    // Audio gently shifts that family instead of collapsing the wall to one color.
    const hue = (data.hue + Math.sin(time * 0.36 + data.phase) * 0.025 + energy * 0.10 + high * 0.045) % 1;
    const lightness = 0.24 + energy * 0.37 + pulse * 0.12;
    color.setHSL(hue, 0.68 + mid * 0.2, lightness);
    tiles.setColorAt(index, color);
  }

  tiles.instanceMatrix.needsUpdate = true;
  if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;

  rgbShift.amount = high * 0.009;
  film.intensity = 0.12 + high * 0.14;
}

export function cleanup(scene) {
  tileData = [];
  tileEnergy = [];
  tiles = null;
  dummy = null;
  color = null;
  Shekere.clearScene(scene);
}
