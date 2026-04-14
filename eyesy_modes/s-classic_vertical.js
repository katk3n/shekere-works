/**
 * Port of EYESY 'classic_vertical' sketch to Shekere.
 * Optimized for Three.js.
 */

const NUM_LINES = 100;
const lerp = (a, b, t) => a + (b - a) * t;

// Shared geometries and materials
let circleGeo;
let lineGeo;
let group;
let circles = [];
let lineMeshes = [];
let currentScene;

export function setup(scene) {
  currentScene = scene;
  group = new THREE.Group();
  scene.add(group);

  circleGeo = new THREE.CircleGeometry(1, 32);
  lineGeo = new THREE.PlaneGeometry(1, 1);

  for (let i = 0; i < NUM_LINES; i++) {
    // Each mesh needs its own material to have its own color
    // (Alternatively could use vertex colors/InstancedMesh, but keeping it simple for now)
    const circleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const circle = new THREE.Mesh(circleGeo, circleMat);
    const line = new THREE.Mesh(lineGeo, lineMat);

    group.add(circle);
    group.add(line);

    circles.push(circle);
    lineMeshes.push(line);
  }
}

export function update({ time, audio, midi }) {
  // Map MIDI CC (Knobs)
  const knob1 = midi.cc[1] ?? 0.1; // Line Width
  const knob2 = midi.cc[10] ?? 0.2; // Ball Size
  const knob3 = midi.cc[11] ?? 0.5; // Color Mod (Cmod)
  const knob4 = midi.cc[7] ?? 0;   // Color Mode (sel)
  const knob5 = midi.cc[1] ?? 0;   // Background

  const sel = knob4 * 8;
  const Cmod = knob3 * 2;

  // Update Background Color
  if (currentScene) {
    // EYESY often has dark backgrounds. Mapping knob5 to a hue.
    const bgColor = new THREE.Color().setHSL(knob5, 0.4, 0.05); // Very dark HSL
    currentScene.background = bgColor;
  }

  // Update segments
  const vRange = 10; // Vertical range
  const hScale = 15; // Adjusted for audio.bands (0.0 to 1.0 range)

  // shekere supports audio.bands (256 logarithmic bins)
  const bands = audio.bands || [];
  const bandsCount = bands.length;

  for (let i = 0; i < NUM_LINES; i++) {
    const circle = circles[i];
    const line = lineMeshes[i];

    // Vertical position
    const y = ((i / NUM_LINES) - 0.5) * vRange;

    // Audio reactivity using bands
    let bandVal = 0;
    if (bandsCount > 0) {
      // Map 100 lines to the first half of the spectrum (most melodic activity)
      const audioIdx = Math.floor((i / NUM_LINES) * 128);
      bandVal = bands[audioIdx] ?? 0;
    }

    let x1 = bandVal * hScale;
    if (i % 2 === 1) {
      x1 = -x1; // Reverse direction for odd-numbered segments
    }
    const x0 = 0;

    // Line properties
    const lineWidth = knob1 * 0.5 + 0.01;
    const ballSize = knob2 * 0.8 + 0.01;

    // Color Calculation (Ported from Python)
    let color = new THREE.Color();
    const t = time;

    if (sel < 1) {
      const val = 0.5 + 0.5 * Math.sin(i * 1 * Cmod + t);
      color.setRGB(val, val, val);
    } else if (sel < 2) {
      const r = 0.5 + 0.5 * Math.sin(i * 1 * Cmod + t);
      color.setRGB(r, 0, 0.17);
    } else if (sel < 3) {
      const g = 0.6 + 0.4 * Math.sin(i * 1 * Cmod + t);
      color.setRGB(1, g, 0.11);
    } else if (sel < 4) {
      const b = 0.5 + 0.5 * Math.sin(i * 1 * Cmod + t);
      color.setRGB(0, 0.78, b);
    } else if (sel < 5) {
      const rg = (127 * Cmod % 255) / 255;
      const b = 0.5 + 0.5 * Math.sin(i * (Cmod + 0.1) + t);
      color.setRGB(rg, rg, b);
    } else if (sel < 6) {
      const rb = (127 * Cmod % 255) / 255;
      const g = 0.5 + 0.5 * Math.sin(i * (Cmod + 0.1) + t);
      color.setRGB(rb, g, rb);
    } else if (sel < 7) {
      const gb = (127 * Cmod % 255) / 255;
      const r = 0.5 + 0.5 * Math.sin(i * (Cmod + 0.1) + t);
      color.setRGB(r, gb, gb);
    } else {
      const r = 0.5 + 0.5 * Math.sin((i + 30) * (1 * Cmod + 0.01) + t);
      const g = 0.5 + 0.5 * Math.sin((i + 30) * (0.5 * Cmod + 0.005) + t);
      const b = 0.5 + 0.5 * Math.sin((i + 15) * (0.1 * Cmod + 0.001) + t);
      color.setRGB(r, g, b);
    }

    // Update Circle
    circle.position.set(x1, y, 0);
    circle.scale.set(ballSize, ballSize, 1);
    circle.material.color.copy(color);

    // Update Line
    const lineX = (x0 + x1) / 2;
    const lineLength = Math.abs(x1 - x0) + 0.001;
    line.position.set(lineX, y, 0);
    line.scale.set(lineLength, lineWidth, 1);
    line.material.color.copy(color);
  }
}

export function cleanup(scene) {
  clearScene(scene);
}

