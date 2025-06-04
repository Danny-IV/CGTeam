import * as THREE from 'three';
import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
import * as util from './util.js';

let scene, renderer, camera;
let stats;
let physicsWorld;
let sphereMesh, sphereBody;
const cameraOffset = new THREE.Vector3(0, 2, -5);
let targetPosition = new THREE.Vector3();

async function init() {
    initThree();
    await initPhysics();
    util.initDefaultDirectionalLighting(scene);
    util.addDefaultCubeAndSphere(scene);

    createSphere();
    createGround();

    render();
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

function createSphere() {
    const sphereRadius = 0.5;

    const sphereGeometry = new THREE.SphereGeometry(sphereRadius);
    const sphereMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphereMesh);

    // 4. 구체 물리 객체 생성
    const sphereBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, 5, 0);
    sphereBody = physicsWorld.createRigidBody(sphereBodyDesc);

    const sphereColliderDesc = RAPIER.ColliderDesc.ball(sphereRadius)
        .setRestitution(0.8)
        .setFriction(0.3);
    physicsWorld.createCollider(sphereColliderDesc, sphereBody);
}

function createGround() {
    // Ground Mesh 생성
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x777777 });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;  // 그림자 받기
    scene.add(groundMesh);

    const groundBodyDesc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(0, 0, 0);
    const groundBody = physicsWorld.createRigidBody(groundBodyDesc);

    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(50, 0.1, 50)
        .setFriction(2.0)
        .setRestitution(0.5);

    // Ground Mesh에 대응하는 RAPIER Collider 생성
    physicsWorld.createCollider(groundColliderDesc, groundBody);
}

function render() {
    stats.update();
    requestAnimationFrame(render);

    physicsWorld.step();

    // 메시 위치 동기화
    const position = sphereBody.translation();
    sphereMesh.position.set(position.x, position.y, position.z);
    sphereMesh.quaternion.copy(sphereBody.rotation());

    // 카메라 위치 보간
    targetPosition.set(
        position.x + cameraOffset.x,
        position.y + cameraOffset.y,
        position.z + cameraOffset.z
    );
    camera.position.lerp(targetPosition, 0.1);
    camera.lookAt(position.x, position.y, position.z);

    renderer.render(scene, camera);
}

init().catch(error => {
    console.error("Failed to initialize:", error);
})
