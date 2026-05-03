/**
 * handpan_orbs.js — Handpan Audio-Reactive Sketch (Shader Edition)
 * 
 * Features:
 * - Central Orb & 13 Satellite Orbs using custom Glow Shaders.
 * - Ethereal particles reacting to frequency.
 * - No wireframes, no wave planes.
 */

// --- Global State ---
let centralOrb, glowRing, particles;
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

export function setup(scene) {
    // --- TSL Functions ---
    const getGlow = TSL.Fn(([colorNode, intensityNode, timeNode]) => {
        // Soft Fresnel glow
        const dotNL = TSL.abs(TSL.dot(TSL.normalView, TSL.vec3(0, 0, 1.0)));
        const glow = TSL.sub(1.0, dotNL);
        
        // Gentler pulse
        const pulse = TSL.add(0.85, TSL.mul(0.15, TSL.sin(TSL.mul(timeNode, 2.5))));
        
        // Reduced core density
        const core = TSL.mul(TSL.pow(dotNL, 5.0), 0.15);
        
        // finalColor = color * (glow + core + 0.2) * (intensity + 0.3) * pulse;
        const glowFactor = TSL.add(glow, core, 0.2);
        const intensityFactor = TSL.add(intensityNode, 0.3);
        const finalColor = TSL.mul(colorNode, glowFactor, intensityFactor, pulse);
        
        // gl_FragColor.a = (glow + 0.1) * min(intensity, 1.0);
        const finalAlpha = TSL.mul(TSL.add(glow, 0.1), TSL.min(intensityNode, 1.0));
        
        return TSL.vec4(finalColor, finalAlpha);
    });

    // 1. Central Orb (Shader)
    const orbGeo = new THREE.SphereGeometry(1.2, 64, 64);
    
    const centralColorNode = TSL.uniform(new THREE.Color(0xffaa00));
    const centralIntensityNode = TSL.uniform(1.0);
    const centralTimeNode = TSL.uniform(0.0);

    const orbMat = new THREE.MeshBasicNodeMaterial({
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const centralGlowColor = getGlow([centralColorNode, centralIntensityNode, centralTimeNode]);
    orbMat.colorNode = centralGlowColor.rgb;
    orbMat.opacityNode = centralGlowColor.a;

    centralOrb = new THREE.Mesh(orbGeo, orbMat);
    centralOrb.userData = { colorNode: centralColorNode, intensityNode: centralIntensityNode, timeNode: centralTimeNode };
    scene.add(centralOrb);

    // 2. Satellite Orbs (13)
    const satGeo = new THREE.SphereGeometry(0.25, 32, 32);
    for (let i = 0; i < SATELLITE_COUNT; i++) {
        const isInner = i < INNER_RING_COUNT;
        const radius = isInner ? 2.5 : 4.2;
        const angle = isInner
            ? (i / INNER_RING_COUNT) * Math.PI * 2
            : ((i - INNER_RING_COUNT) / OUTER_RING_COUNT) * Math.PI * 2;

        const satColorNode = TSL.uniform(new THREE.Color().setHSL(i / SATELLITE_COUNT, 0.8, 0.5));
        const satIntensityNode = TSL.uniform(0.0);
        const satTimeNode = TSL.uniform(Math.random() * 10);

        const satMat = new THREE.MeshBasicNodeMaterial({
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const satGlowColor = getGlow([satColorNode, satIntensityNode, satTimeNode]);
        satMat.colorNode = satGlowColor.rgb;
        satMat.opacityNode = satGlowColor.a;

        const satMesh = new THREE.Mesh(satGeo, satMat);
        satMesh.userData = { colorNode: satColorNode, intensityNode: satIntensityNode, timeNode: satTimeNode };
        satMesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
        scene.add(satMesh);

        satelliteOrbs.push({ mesh: satMesh, radius, angleOffset: angle, isInner });
        satelliteStates.push(0);
    }

    // 3. Ambient Particles (Round)
    const partCount = 500;
    const partGeo = new THREE.PlaneGeometry(0.2, 0.2);
    const posArray = new Float32Array(partCount * 3);
    for (let i = 0; i < partCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 25;
    }
    partGeo.setAttribute('instanceOffset', new THREE.InstancedBufferAttribute(posArray, 3));
    
    const partMat = new THREE.MeshBasicNodeMaterial({
        color: 0xffeeaa,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const instanceOffset = TSL.attribute('instanceOffset', 'vec3');
    const viewOffset = TSL.cameraViewMatrix.mul(TSL.modelWorldMatrix).mul(TSL.vec4(instanceOffset, 1.0));
    const finalViewPos = viewOffset.add(TSL.vec4(TSL.positionLocal.xy, 0.0, 0.0));
    partMat.vertexNode = TSL.cameraProjectionMatrix.mul(finalViewPos);

    const getSoftCircle = TSL.Fn(() => {
        const d = TSL.distance(TSL.uv(), TSL.vec2(0.5));
        return TSL.smoothstep(0.5, 0.2, d);
    });
    
    // Opacity 0.5 combined with soft circle mask
    partMat.opacityNode = TSL.mul(getSoftCircle(), 0.5);

    particles = new THREE.InstancedMesh(partGeo, partMat, partCount);
    particles.frustumCulled = false;
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
    centralOrb.userData.timeNode.value = time;
    centralOrb.userData.intensityNode.value = 1.0 + smoothedVolume * 4.0;

    // Color transition orange -> cyan based on mid energy
    const hue = 0.08 + smoothedMid * 0.45;
    centralOrb.userData.colorNode.value.setHSL(hue, 0.9, 0.5);

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
        sat.mesh.userData.timeNode.value = time + i;
        sat.mesh.userData.intensityNode.value = 0.3 + satelliteStates[i] * 6.0;
    }

    // --- Ambient Updates ---
    glowRing.material.opacity = smoothedBass * 0.8;
    glowRing.scale.setScalar(1 + smoothedBass * 0.7);
    glowRing.rotation.z = time * 0.1;

    particles.rotation.y = time * 0.02;
    const pPos = particles.geometry.attributes.instanceOffset.array;
    for (let i = 0; i < pPos.length; i++) {
        pPos[i] += (Math.random() - 0.5) * smoothedHigh * 0.03;
    }
    particles.geometry.attributes.instanceOffset.needsUpdate = true;
}

export function cleanup(scene) {
    Shekere.clearScene(scene);
}
