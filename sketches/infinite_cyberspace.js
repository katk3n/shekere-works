/**
 * infinite_cyberspace.js - Floating Cyberspace Shards (High-Dynamic Edition)
 * 
 * An infinite field of floating neon shards with dynamic curved motion, 
 * banked turns, and constant slow field rotation for a "旋回 (Turning)" feel.
 */

let timeNode, bassNode, midNode, highNode;
let smoothedBass = 0;
let smoothedMid = 0;
let smoothedHigh = 0;
const LERP_FACTOR = 0.1;

export function setup(scene) {
    timeNode = TSL.uniform(0.0);
    bassNode = TSL.uniform(0.0);
    midNode = TSL.uniform(0.0);
    highNode = TSL.uniform(0.0);

    // --- 1. Floating Shards (InstancedMesh) ---
    const INSTANCE_COUNT = 2500;
    const geometry = new THREE.OctahedronGeometry(1, 0);
    
    const positions = new Float32Array(INSTANCE_COUNT * 3);
    const scales = new Float32Array(INSTANCE_COUNT * 3);
    const colors = new Float32Array(INSTANCE_COUNT * 3);
    const rotations = new Float32Array(INSTANCE_COUNT * 3);
    
    for (let i = 0; i < INSTANCE_COUNT; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
        positions[i * 3 + 2] = -Math.random() * 200;
        
        const size = 0.2 + Math.random() * 1.2;
        scales[i * 3] = size;
        scales[i * 3 + 1] = size * (1.0 + Math.random() * 1.5);
        scales[i * 3 + 2] = size;

        rotations[i * 3] = Math.random() * Math.PI * 2;
        rotations[i * 3 + 1] = Math.random() * Math.PI * 2;
        rotations[i * 3 + 2] = Math.random() * Math.PI * 2;
        
        const color = new THREE.Color();
        const rand = Math.random();
        if (rand < 0.4) color.setHex(0x00ffff); // Cyan
        else if (rand < 0.7) color.setHex(0x7700ff); // Purple
        else color.setHex(0xff00ff); // Magenta
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }
    
    geometry.setAttribute('instanceOffset', new THREE.InstancedBufferAttribute(positions, 3));
    geometry.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(scales, 3));
    geometry.setAttribute('instanceRotation', new THREE.InstancedBufferAttribute(rotations, 3));
    geometry.setAttribute('customColor', new THREE.InstancedBufferAttribute(colors, 3));

    const material = new THREE.MeshBasicNodeMaterial({
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const instanceOffset = TSL.attribute('instanceOffset', 'vec3');
    const instanceScale = TSL.attribute('instanceScale', 'vec3');
    const instanceRotation = TSL.attribute('instanceRotation', 'vec3');
    const customColor = TSL.attribute('customColor', 'vec3');

    // --- Movement & Trajectory Logic ---
    
    // 1. Constant Slow Motion along Z
    const zSpeed = TSL.float(12.0); 
    const zPos = TSL.add(instanceOffset.z, TSL.mul(timeNode, zSpeed));
    const wrappedZ = TSL.sub(TSL.mod(zPos, 200.0), 200.0);

    // 2. Trajectory Curvature (Simulating a curving path)
    const pathX = TSL.mul(TSL.sin(TSL.mul(timeNode, 0.15)), 25.0);
    const pathY = TSL.mul(TSL.cos(TSL.mul(timeNode, 0.12)), 15.0);
    
    // 3. Floating Drift & Jitter
    const driftX = TSL.mul(TSL.sin(TSL.add(TSL.mul(timeNode, 0.2), instanceOffset.x)), 2.0);
    const driftY = TSL.mul(TSL.cos(TSL.add(TSL.mul(timeNode, 0.15), instanceOffset.y)), 3.0);
    const jitter = TSL.mul(highNode, TSL.sin(TSL.mul(timeNode, 30.0)), 0.3);

    const posInPath = TSL.vec3(
        TSL.add(instanceOffset.x, driftX, pathX), 
        TSL.add(instanceOffset.y, driftY, jitter, pathY), 
        wrappedZ
    );

    // --- Dynamic Field Rotation (Turning/Banked Turns) ---
    
    // Rotation Angles based on path velocity
    const rollAngle = TSL.add(
        TSL.mul(TSL.sin(TSL.mul(timeNode, 0.15)), 0.4), // Roll into the turn
        TSL.mul(timeNode, 0.08) // Constant slow spin
    );
    const yawAngle = TSL.mul(TSL.cos(TSL.mul(timeNode, 0.15)), 0.25);
    const pitchAngle = TSL.mul(TSL.sin(TSL.mul(timeNode, 0.12)), 0.15);

    // Z-Rotation (Roll)
    const rc = TSL.cos(rollAngle);
    const rs = TSL.sin(rollAngle);
    const rX = TSL.sub(TSL.mul(posInPath.x, rc), TSL.mul(posInPath.y, rs));
    const rY = TSL.add(TSL.mul(posInPath.x, rs), TSL.mul(posInPath.y, rc));
    let rotatedField = TSL.vec3(rX, rY, posInPath.z);

    // Y-Rotation (Yaw)
    const yc = TSL.cos(yawAngle);
    const ys = TSL.sin(yawAngle);
    const ryX_f = TSL.sub(TSL.mul(rotatedField.x, yc), TSL.mul(rotatedField.z, ys));
    const ryZ_f = TSL.add(TSL.mul(rotatedField.x, ys), TSL.mul(rotatedField.z, yc));
    rotatedField = TSL.vec3(ryX_f, rotatedField.y, ryZ_f);

    // X-Rotation (Pitch)
    const pc = TSL.cos(pitchAngle);
    const ps = TSL.sin(pitchAngle);
    const rpY_f = TSL.sub(TSL.mul(rotatedField.y, pc), TSL.mul(rotatedField.z, ps));
    const rpZ_f = TSL.add(TSL.mul(rotatedField.y, ps), TSL.mul(rotatedField.z, pc));
    rotatedField = TSL.vec3(rotatedField.x, rpY_f, rpZ_f);

    // --- Individual Shard Rotation ---
    const rotSpeed = TSL.add(0.5, TSL.mul(bassNode, 4.0)); // Increased speed
    const rotAngle = TSL.add(instanceRotation, TSL.mul(timeNode, rotSpeed));
    
    const cy = TSL.cos(rotAngle.y);
    const sy = TSL.sin(rotAngle.y);
    const ryX = TSL.sub(TSL.mul(TSL.positionLocal.x, cy), TSL.mul(TSL.positionLocal.z, sy));
    const ryZ = TSL.add(TSL.mul(TSL.positionLocal.x, sy), TSL.mul(TSL.positionLocal.z, cy));
    let rotatedLocal = TSL.vec3(ryX, TSL.positionLocal.y, ryZ);

    const cx = TSL.cos(rotAngle.x);
    const sx = TSL.sin(rotAngle.x);
    const rxY = TSL.sub(TSL.mul(rotatedLocal.y, cx), TSL.mul(rotatedLocal.z, sx));
    const rxZ = TSL.add(TSL.mul(rotatedLocal.y, sx), TSL.mul(rotatedLocal.z, cx));
    rotatedLocal = TSL.vec3(rotatedLocal.x, rxY, rxZ);

    const scaledLocal = TSL.mul(rotatedLocal, instanceScale);
    const finalVertexPos = TSL.add(scaledLocal, rotatedField);

    const worldPos = TSL.modelWorldMatrix.mul(TSL.vec4(finalVertexPos, 1.0));
    const viewPos = TSL.cameraViewMatrix.mul(worldPos);
    material.vertexNode = TSL.cameraProjectionMatrix.mul(viewPos);

    // --- Visuals ---
    const edge = TSL.sub(1.0, TSL.abs(TSL.dot(TSL.normalView, TSL.vec3(0, 0, 1))));
    const intensity = TSL.add(0.4, TSL.mul(TSL.pow(edge, 2.0), 3.0), TSL.mul(midNode, 2.0));
    const dist = TSL.abs(wrappedZ);
    const fade = TSL.exp(TSL.mul(dist, -0.015));

    material.colorNode = TSL.mul(customColor, intensity);
    material.opacityNode = TSL.mul(fade, TSL.add(0.3, TSL.mul(highNode, 0.7)));

    const mesh = new THREE.InstancedMesh(geometry, material, INSTANCE_COUNT);
    mesh.frustumCulled = false;
    scene.add(mesh);
    this.mesh = mesh;
    scene.background = new THREE.Color(0x020005);
}

export function update(context) {
    const { time, audio, bloom, rgbShift } = context;
    if (!this.mesh) return;

    smoothedBass += ((audio.bass ?? 0) - smoothedBass) * LERP_FACTOR;
    smoothedMid += ((audio.mid ?? 0) - smoothedMid) * LERP_FACTOR;
    smoothedHigh += ((audio.high ?? 0) - smoothedHigh) * LERP_FACTOR;

    timeNode.value = time;
    bassNode.value = smoothedBass;
    midNode.value = smoothedMid;
    highNode.value = smoothedHigh;

    if (bloom) {
        bloom.strength.value = 0.8 + smoothedBass * 1.5;
        bloom.radius.value = 0.5 + smoothedMid * 0.5;
    }
    if (rgbShift) {
        rgbShift.amount.value = smoothedHigh * 0.006;
    }
}

export function cleanup(scene) {
    Shekere.clearScene(scene);
}
