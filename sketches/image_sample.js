export function setup(scene) {
  // 1. TextureLoaderを使って画像を読み込む
  const loader = new THREE.TextureLoader();
  const texture = loader.load(Shekere.convertFileSrc(Shekere.SKETCH_DIR + 'assets/handpan.jpg'));

  // 2. 画像を表示するための板（Plane）を作成
  const geometry = new THREE.PlaneGeometry(4, 4);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide // 裏側から見ても画像が表示されるようにする
  });

  this.mesh = new THREE.Mesh(geometry, material);
  scene.add(this.mesh);
}

// スムーズな変位のための状態変数
let smoothRotationY = 0;
let smoothRotationZ = 0;
let smoothScale = 0;

export function update({ time, audio, midi }) {
  const lerp = (a, b, t) => a + (b - a) * t;

  // MIDI CC 1 (Mod Wheel) で Y軸回転の速度/角度を制御
  const targetRY = (midi.cc[1] ?? 0) * Math.PI * 2;
  smoothRotationY = lerp(smoothRotationY, targetRY, 0.1);

  // MIDI CC 10 (Pan) で Z軸の傾きを制御
  const targetRZ = ((midi.cc[10] ?? 0.5) - 0.5) * 2; // -1.0 to 1.0
  smoothRotationZ = lerp(smoothRotationZ, targetRZ, 0.1);

  // MIDI CC 11 (Expression) で追加のスケール制御
  const targetS = (midi.cc[11] ?? 0);
  smoothScale = lerp(smoothScale, targetS, 0.1);

  // ベースの回転にMIDIの値を加算
  this.mesh.rotation.y = (time * 0.3) + smoothRotationY;
  this.mesh.rotation.z = (Math.sin(time * 0.5) * 0.1) + (smoothRotationZ * 0.5);

  // オーディオ(bass) + MIDI CC 11 でスケールを計算
  const scale = 1 + (audio.bass * 0.5) + (smoothScale * 1.5);
  this.mesh.scale.set(scale, scale, scale);
}

export function cleanup(scene) {
  Shekere.clearScene(scene);
}
