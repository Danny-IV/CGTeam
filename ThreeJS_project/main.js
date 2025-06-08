import * as THREE from 'three';
import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
import * as util from './util.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, renderer, camera;
let stats;
let physicsWorld;
let sphereMesh, sphereBody;
const cameraOffset = new THREE.Vector3(0, 2, -5);
let targetPosition = new THREE.Vector3();
let orbitControls;

main().catch(error => {
    console.error("Failed to initialize:", error);
})

async function main() {
    initThree();
    await initPhysics();
    util.initDefaultDirectionalLighting(scene);
    orbitControls = util.initOrbitControls(camera, renderer);
    orbitControls.target.set(0, 0, 0);

    createSphere(scene, physicsWorld);
    createGround(scene, physicsWorld);
    createGridHelper(scene);
    loadGLTFModel(scene, "./models/map.glb")

    render();
}

/**
 * load glTF file, add scene with position
 * @param {THREE.Scene} scene
 * @param {string} filepath
 * @param {Vector3} [position] - optional
 */
function loadGLTFModel(scene, filepath, position) {
    const loader = new GLTFLoader();
    loader.load(
        filepath,
        (gltf) => {
            const model = gltf.scene;
            // position set
            if (position) {
                model.position.set(position);
            }
            scene.add(model);
        },
        undefined,
        (error) => {
            console.error('FBX load fail:', error);
        }
    );
}

function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbfd1e5);

    stats = util.initStats();
    renderer = util.initRenderer();
    camera = util.initCamera();

    scene.add(camera);

    window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

async function initPhysics() {
    await RAPIER.init();
    physicsWorld = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });
}

function createSphere(scene, world) {
    const sphereRadius = 1;

    const sphereGeometry = new THREE.SphereGeometry(sphereRadius);
    const sphereMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphereMesh);

    // 4. 구체 물리 객체 생성
    const sphereBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, 5, 0);
    sphereBody = world.createRigidBody(sphereBodyDesc);

    const sphereColliderDesc = RAPIER.ColliderDesc.ball(sphereRadius)
        .setRestitution(0.8)
        .setFriction(0.3);
    world.createCollider(sphereColliderDesc, sphereBody);
}

function createGround(scene, world) {
    // Ground Mesh 생성
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x777777 });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;  // 그림자 받기
    scene.add(groundMesh);

    const groundBodyDesc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(0, 0, 0);
    const groundBody = world.createRigidBody(groundBodyDesc);

    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(50, 0.1, 50)
        .setFriction(2.0)
        .setRestitution(0.5);

    // Ground Mesh에 대응하는 RAPIER Collider 생성
    world.createCollider(groundColliderDesc, groundBody);
}

function createGridHelper(scene) {
    const size = 15;
    const division = 10;
    const gridHelper = new THREE.GridHelper(size, division, 0x000000, 0x000000);
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
}

function render() {
    stats.update();
    orbitControls.update();
    requestAnimationFrame(render);

    physicsWorld.step();

    // 메시 위치 동기화
    const position = sphereBody.translation();
    sphereMesh.position.set(position.x, position.y, position.z);
    sphereMesh.quaternion.copy(sphereBody.rotation());

    // 카메라 위치 보간
    // targetPosition.set(
    //     position.x + cameraOffset.x,
    //     position.y + cameraOffset.y,
    //     position.z + cameraOffset.z
    // );
    // camera.position.lerp(targetPosition, 0.1);
    // camera.lookAt(position.x, position.y, position.z);

    renderer.render(scene, camera);
}

