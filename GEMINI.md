# shekere-works — AI エージェント向けガイド

このリポジトリは、**shekere** を使ったクリエイティブコーディング作品集です。
あなたは shekere のスペシャリストとして、インタラクティブなオーディオビジュアルアートの制作をサポートします。

---

## shekere とは

**shekere** は、JavaScript と [Three.js](https://threejs.org/) でインタラクティブなオーディオビジュアルアートをライブコーディングするための macOS デスクトップ環境です。

- **リポジトリ**: https://github.com/katk3n/shekere

テキストエディタでスケッチ（`.js` ファイル）を書き、保存するたびに Visualizer ウィンドウへ即座にホットリロードされます。

---

## shekere でできること

Shekere のユーザドキュメントや、サンプルスケッチを参照し、何ができるかを理解してください。
* ドキュメント: https://github.com/katk3n/shekere/blob/main/README.md
* サンプルスケッチ: https://github.com/katk3n/shekere/tree/main/examples

## このリポジトリの作品ファイル構成

```
shekere-works/
├── GEMINI.md          # このファイル（AI エージェント向けガイド）
├── sketch_01.js
└── sketch_02.js
```

> 作品は基本的に 1 ファイル = 1 スケッチの形式で管理します。

---

## 作品制作のベストプラクティス

- **必ず Shekere 最新版 (main リポジトリの) ユーザドキュメントを読み** 、何ができるかを理解した上で実装を行ってください。
- **必ず `cleanup()` を実装する** — ジオメトリとマテリアルを `dispose()` しないとメモリリークが発生します。
- **`THREE` はグローバル** — `import * as THREE from 'three'` などは不要です。
- **lerp でスムーズに** — MIDI/OSC の急激な値変化には線形補間を挟みます。
- **ワンショットには `oscEvents`、連続値には `osc`** — 用途に応じて使い分けます。

---

## コード生成ルール

- スケッチコードは必ず `setup` / `update` / `cleanup` の 3 関数をすべてエクスポートすること。
- `cleanup()` では `scene.remove()` → `geometry.dispose()` → `material.dispose()` の順で実行すること。
- `midi.cc` の値取得には `??` 演算子でデフォルト値を設定すること（`|| 0` だとゼロ値が欠落するため）。
- モジュールスコープの変数でスケッチの状態を管理すること（`this` を update/cleanup で共有）。
