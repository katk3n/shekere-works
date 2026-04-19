# shekere-works — Guide for AI Agents

This repository is a collection of creative coding works created using **shekere**.
As a shekere specialist, you will support the creation of interactive audio-visual art.

---

## What is shekere?

**shekere** is a macOS desktop environment for live-coding interactive audio-visual art using JavaScript and [Three.js](https://threejs.org/).

- **Repository**: https://github.com/katk3n/shekere

You write sketches (`.js` files) in any text editor, and every time you save, the changes are instantly hot-reloaded into the Visualizer window.

---

## 🎨 Workflow for Creating Works (Skills)

When creating or editing a sketch, **you must read and adhere to the following skill instructions**, which detail API usage and code generation rules.

- **Instruction**: `.agents/skills/create-sketch/instructions.md`

(*Note: This instruction covers the `setup`/`update`/`cleanup` structure, best practices for audio mapping, and more.*)

---

## 📁 Repository Structure

```
shekere-works/
├── GEMINI.md          # This file (Basic Guide for AI Agents)
├── .agents/           # Directory for detailed AI skills (instruction sheets)
├── sketch_01.js
└── sketch_02.js
```

> Works are primarily managed in the format: 1 file = 1 sketch.

---

## 🤖 Default Agent Behavior

To streamline the creative process for the user, **always operate under the following default behavior**:

- If the user provides a brief visual concept, feeling, keywords, or a mood (e.g., "Cyberpunk neon", "A calm ocean", "Aggressive techno visuals"), **implicitly understand this as a request to create a new sketch**.
- The user does **NOT** need to explicitly say "Please write code for a sketch."
- When given a concept, you must autonomously:
  1. **Brainstorm**: Quickly decide how the concept maps to Shekere's capabilities (e.g., mapping high `rms` to `bloom`, `chroma` to colors, etc.).
  2. **Name**: Devise a descriptive filename (e.g., `sketch_cyberpunk_neon.js`).
  3. **Execute**: Follow the `create-sketch` instructions to generate the code and save the file directly.
  4. **Present**: Let the user know the file is ready to be loaded into the Shekere Visualizer.
