/**
 * handpan_orbs.js — Handpan Audio-Reactive Sketch (Shader Edition)
 * 
 * Features:
 * - Central Orb & 13 Satellite Orbs using custom Glow Shaders.
 * - Ethereal particles reacting to frequency.
 * - No wireframes, no wave planes.
 */

// --- Shader Definitions ---
const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = `
    uniform vec3 color;
    uniform float intensity;
    uniform float time;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
        // Softer Fresnel glow (vague/foggy)
        float dotNL = abs(dot(vNormal, vec3(0, 0, 1.0)));
        float glow = pow(1.0 - dotNL, 1.0); // Linear falloff for maximum "softness"
        
        // Gentler pulse
        float pulse = 0.85 + 0.15 * sin(time * 2.5);
        
        // Reduced core density
        float core = pow(dotNL, 5.0) * 0.15;
        
        // Milky, ethereal color blend
        vec3 finalColor = color * (glow + core + 0.2) * (intensity + 0.3) * pulse;
        gl_FragColor = vec4(finalColor, (glow + 0.1) * min(intensity, 1.0));
    }
`;

// --- Global State ---
let centralOrb, glowRing, particles, particleTexture;
let satelliteOrbs = [];
let satelliteStates = []; // Individual brightness/scale for 13 orbs

// Smoothed audio values (lerp)
let smoothedVolume = 0;
let smoothedBass = 0;
let smoothedMid = 0;
let smoothedHigh = 0;

const LERP_FACTOR = 0.07;
const SATELLITE_COUNT = 13;
const INNER_RING_COUNT = 6;
const OUTER_RING_COUNT = 7;

// Helper to create a round particle texture
function createCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

export function setup(scene) {
    // 1. Central Orb (Shader)
    const orbGeo = new THREE.SphereGeometry(1.2, 64, 64);
    const orbMat = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xffaa00) },
            intensity: { value: 1.0 },
            time: { value: 0.0 }
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    centralOrb = new THREE.Mesh(orbGeo, orbMat);
    scene.add(centralOrb);

    // 2. Satellite Orbs (13)
    for (let i = 0; i < SATELLITE_COUNT; i++) {
        const isInner = i < INNER_RING_COUNT;
        const radius = isInner ? 2.5 : 4.2;
        const angle = isInner
            ? (i / INNER_RING_COUNT) * Math.PI * 2
            : ((i - INNER_RING_COUNT) / OUTER_RING_COUNT) * Math.PI * 2;

        const satGeo = new THREE.SphereGeometry(0.25, 32, 32);
        const satMat = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color().setHSL(i / SATELLITE_COUNT, 0.8, 0.5) },
                intensity: { value: 0.0 },
                time: { value: Math.random() * 10 }
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const satMesh = new THREE.Mesh(satGeo, satMat);
        satMesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
        scene.add(satMesh);

        satelliteOrbs.push({ mesh: satMesh, radius, angleOffset: angle, isInner });
        satelliteStates.push(0);
    }

    // 3. Ambient Particles (Round)
    particleTexture = createCircleTexture();
    const partCount = 500;
    const partGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(partCount * 3);
    for (let i = 0; i < partCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 25;
    }
    partGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const partMat = new THREE.PointsMaterial({
        color: 0xffeeaa,
        size: 0.2,
        map: particleTexture,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    particles = new THREE.Points(partGeo, partMat);
    scene.add(particles);

    // 4. Glow Ring
    const ringGeo = new THREE.TorusGeometry(1.8, 0.015, 16, 128);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending
    });
    glowRing = new THREE.Mesh(ringGeo, ringMat);
    scene.add(glowRing);

    // Initial Scene Setup
    scene.background = new THREE.Color(0x000000);
    scene.add(new THREE.AmbientLight(0x222222));
}

export function update(context) {
    const { time, audio } = context;
    if (!centralOrb || !audio.bands) return;

    // --- Audio Smoothing ---
    smoothedVolume += (audio.volume - smoothedVolume) * LERP_FACTOR;
    smoothedBass += (audio.bass - smoothedBass) * LERP_FACTOR;
    smoothedMid += (audio.mid - smoothedMid) * LERP_FACTOR;
    smoothedHigh += (audio.high - smoothedHigh) * LERP_FACTOR;

    // --- Central Orb Update ---
    const scale = 1.0 + smoothedVolume * 1.5;
    centralOrb.scale.set(scale, scale, scale);

    // Shader uniforms
    centralOrb.material.uniforms.time.value = time;
    centralOrb.material.uniforms.intensity.value = 1.0 + smoothedVolume * 4.0;

    // Color transition orange -> cyan based on mid energy
    const hue = 0.08 + smoothedMid * 0.45;
    centralOrb.material.uniforms.color.value.setHSL(hue, 0.9, 0.5);

    // --- Satellite Orbs Update ---
    // Handpan energy is mostly in the lower-mid range, but we expand to capture harmonics.
    const maxRelevantBand = 128;
    const bandsPerSat = Math.floor(maxRelevantBand / SATELLITE_COUNT);

    for (let i = 0; i < SATELLITE_COUNT; i++) {
        const start = i * bandsPerSat;
        const end = start + bandsPerSat;
        let bandEnergy = 0;
        for (let j = start; j < end; j++) {
            bandEnergy += audio.bands[j];
        }
        // Normalize
        bandEnergy = (bandEnergy / bandsPerSat);
        const gain = 1.8;
        const sensitiveEnergy = Math.pow(Math.min(bandEnergy * gain, 1.0), 0.8);

        satelliteStates[i] += (sensitiveEnergy - satelliteStates[i]) * 0.12;

        const sat = satelliteOrbs[i];
        const s = 0.4 + satelliteStates[i] * 2.0;
        sat.mesh.scale.set(s, s, s);

        // Orbital motion
        const speed = sat.isInner ? 0.25 : 0.1;
        const radius = sat.radius + Math.sin(time * 0.3 + i) * 0.2;
        const angle = sat.angleOffset + time * speed;
        sat.mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, Math.sin(time * 0.5 + i) * 0.5);

        // Shader updates
        sat.mesh.material.uniforms.time.value = time + i;
        sat.mesh.material.uniforms.intensity.value = 0.3 + satelliteStates[i] * 6.0;
    }

    // --- Ambient Updates ---
    glowRing.material.opacity = smoothedBass * 0.8;
    glowRing.scale.setScalar(1 + smoothedBass * 0.7);
    glowRing.rotation.z = time * 0.1;

    particles.rotation.y = time * 0.02;
    const pPos = particles.geometry.attributes.position.array;
    for (let i = 0; i < pPos.length; i++) {
        pPos[i] += (Math.random() - 0.5) * smoothedHigh * 0.03;
    }
    particles.geometry.attributes.position.needsUpdate = true;
}

export function cleanup(scene) {
    clearScene(scene);
}
