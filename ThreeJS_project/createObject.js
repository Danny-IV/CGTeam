import * as THREE from 'three';
import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


/**
 * load glTF file, add scene with position
 * @param {THREE.Scene} scene
 * @param {string} filepath
 * @param {Vector3} [position] - optional
 */
export function loadGLTFModel(scene, filepath, position) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load(
            filepath,
            (gltf) => {
                const model = gltf.scene;
                if (position) model.position.copy(position);
                scene.add(model);
                resolve(model); // 로드 완료 시 모델 반환
            },
            undefined,
            (error) => {
                console.error('GLTF load fail:', error);
                reject(error);
            }
        );
    });
}

/**
 * Create a collider for the given model and add it to the given physics world.
 * @param {THREE.Object3D} model
 * @param {RAPIER.World} world
 */
export function createCollider(model, world) {
    model.traverse((child) => {
        if (child.isMesh && child.geometry) {
            // mesh position
            const position = new THREE.Vector3();
            child.getWorldPosition(position);

            // copy geometry
            const geometry = child.geometry.clone();

            const vertices = geometry.attributes.position.array;
            const indices = geometry.index ? geometry.index.array : null;

            if (!vertices || !indices) {
                console.warn(`Skipping ${child.name} - invalid geometry for trimesh`);
                return;
            }

            // rigid body
            const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
                .setTranslation(position.x, position.y, position.z);
            const rigidBody = world.createRigidBody(rigidBodyDesc);

            const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices);
            world.createCollider(colliderDesc, rigidBody);
        }
    });
}


/**
 * @param {THREE.Scene} scene - Three.js 장면 객체
 * @param {RAPIER.World} world - Rapier 물리 월드
 * @param {number} [radius=1] - 구체 반지름
 * @param {THREE.Vector3} [position=new THREE.Vector3(0, 5, 0)] - 초기 위치
 */
export function createSphere(scene, world, radius = 1, position = new THREE.Vector3(0, 5, 0)) {
    // three.js mesh
    const sphereGeometry = new THREE.SphereGeometry(radius);
    const sphereMaterial = new THREE.MeshPhongMaterial({
        color: 0xFFFFFF,
        emissive: 0x0FFFFF,
        emissiveIntensity: 1.0
    });
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphereMesh.position.set(position.x, position.y, position.z);
    scene.add(sphereMesh);

    // rapier body
    const sphereBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y, position.z);
    const sphereBody = world.createRigidBody(sphereBodyDesc);

    const sphereColliderDesc = RAPIER.ColliderDesc.ball(radius)
        .setRestitution(0.8)
        .setFriction(0.3);
    world.createCollider(sphereColliderDesc, sphereBody);

    // for collision check
    const sphere = new THREE.Sphere(position, radius);

    spheres.push({ mesh: sphereMesh, body: sphereBody, checkSphere: sphere });
}

/**
 * Create a grid helper and add it to the scene.
 * @param {THREE.Scene} scene - The scene to add the grid to.
 */
export function createGridHelper(scene) {
    const size = 15;
    const division = 15;
    const gridHelper = new THREE.GridHelper(size, division, 0x000000, 0x000000);
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
}