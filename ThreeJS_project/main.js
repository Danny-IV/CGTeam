import * as THREE from 'three';
import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
import * as util from './util.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, renderer, camera;
let stats;
let physicsWorld;
let sphereMesh, sphereBody;
let boxMesh;
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

    createSphere(scene, physicsWorld, 1, new THREE.Vector3(2, 5, 0));

    createBox(scene)
    // createGround(scene, physicsWorld);
    createGridHelper(scene);

    // set map
    const map = await loadGLTFModel(scene, "./models/map.glb");
    createCollider(map, physicsWorld);

    render();
}

/**
 * @param boxMesh {THREE.Mesh}
 * @param sphereMesh {THREE.Mesh}
 */
function isSphereIntersectingBox(boxMesh, sphereMesh) {
    // 1. Box3 생성 (AABB)
    const box = new THREE.Box3().setFromObject(boxMesh);

    // 2. Sphere의 월드 좌표 중심점 계산
    const sphereWorldPosition = new THREE.Vector3();
    sphereMesh.getWorldPosition(sphereWorldPosition);

    // 3. Sphere의 실제 반지름 계산
    const sphereRadius = sphereMesh.geometry.parameters.radius;

    // 4. Sphere 객체 생성
    const sphere = new THREE.Sphere(sphereWorldPosition, sphereRadius);

    // 5. 교차 여부 반환
    return box.intersectsSphere(sphere);
}

/**
 * load glTF file, add scene with position
 * @param {THREE.Scene} scene
 * @param {string} filepath
 * @param {Vector3} [position] - optional
 */
function loadGLTFModel(scene, filepath, position) {
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

function extractGeometryData(mesh) {
    const geometry = mesh.geometry;
    // 정점 데이터 (Float32Array)
    const vertices = geometry.attributes.position.array;
    // 인덱스 데이터 (Uint16Array 또는 Uint32Array)
    const indices = geometry.index ? geometry.index.array : null;
    return { vertices, indices };
}

function createCollider(model, world) {
    model.traverse((child) => {
        if (child.isMesh) {
            const { vertices, indices } = extractGeometryData(child);

            // rigidbody 생성
            const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
            const rigidBody = physicsWorld.createRigidBody(rigidBodyDesc);

            // Trimesh 예시
            const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices);

            // Rapier 월드에 콜라이더 추가
            world.createCollider(colliderDesc, rigidBody);
        }
    });

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

/**
 * @param {THREE.Scene} scene - Three.js 장면 객체
 * @param {RAPIER.World} world - Rapier 물리 월드
 * @param {number} [radius=1] - 구체 반지름
 * @param {THREE.Vector3} [position=new THREE.Vector3(0, 5, 0)] - 초기 위치
 */
function createSphere(scene, world, radius = 1, position = new THREE.Vector3(0, 5, 0)) {
    const sphereGeometry = new THREE.SphereGeometry(radius);
    const sphereMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphereMesh);

    // 위치 매개변수 적용
    const sphereBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y, position.z);
    sphereBody = world.createRigidBody(sphereBodyDesc);

    const sphereColliderDesc = RAPIER.ColliderDesc.ball(radius)
        .setRestitution(0.8)
        .setFriction(0.3);
    world.createCollider(sphereColliderDesc, sphereBody);
}

function createBox(scene, size = 2) {
    boxMesh = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size),
        new THREE.MeshBasicMaterial()
    );
    scene.add(boxMesh);
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
    const division = 15;
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

    // collision check
    console.log(isSphereIntersectingBox(boxMesh, sphereMesh));

    renderer.render(scene, camera);
}

