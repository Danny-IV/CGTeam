import * as THREE from 'three';
import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
import * as util from './util.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import TWEEN from 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.esm.js';
import * as check from './checkBlock.js';
import * as card from './cardAnimation.js';

// gridCells -> controls : 
// 랜덤으로 선택 된 카드 : card.randomTargetBlock
// let target = '2x2';
let scene, renderer, camera;
let stats;
let physicsWorld;
let boxMesh;
const spheres = [];
const cameraOffset = new THREE.Vector3(0, 2, -5);
let targetPosition = new THREE.Vector3();
let orbitControls;
const cameraPosition = new THREE.Vector3(-15, 10, 0);
let isTargetFin = false;

// grid
const gridSize = 5;
const gridCells = [];
const gridHelpers = [];


main().catch(error => {
    console.error("Failed to initialize:", error);
})

async function main() {
    initThree();
    await initPhysics();
    util.initDefaultDirectionalLighting(scene);
    orbitControls = util.initOrbitControls(camera, renderer);
    orbitControls.target.set(0, 0, 0);

    createSphere(scene, physicsWorld, 1, new THREE.Vector3(0, 5, 0));
    createSphere(scene, physicsWorld, 1, new THREE.Vector3(2, 5, 0));
    createSphere(scene, physicsWorld, 1, new THREE.Vector3(0, 5, 2));
    createSphere(scene, physicsWorld, 1, new THREE.Vector3(2, 5, 2));

    // createSphere(scene, physicsWorld, 1, new THREE.Vector3(6, 5, 2));
    // createSphere(scene, physicsWorld, 1, new THREE.Vector3(2, 5, 4));
    // createSphere(scene, physicsWorld, 1, new THREE.Vector3(2, 5, -2));

    // createBox(scene)
    // createGround(scene, physicsWorld);
    createGridHelper(scene);
    const axesHelper = new THREE.AxesHelper(20); // 10 unit 길이의 축을 보여줌
    scene.add(axesHelper);

    // set map
    const map = await loadGLTFModel(scene, "./models/map.glb");
    createCollider(map, physicsWorld);

    initGrid();
    card.setTargetGUI();
    // card.setTarget();

    render();
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

function initGrid() {
    const cellSize = 1;
    const cellHeight = 1;
    const cellGap = 2;
    for (let i = 0; i < gridSize; i++) {
        gridCells[i] = [];
        gridHelpers[i] = [];
        for (let j = 0; j < gridSize; j++) {
            const x = (cellSize + cellGap) * (i - ((gridSize - 1) / 2));
            const z = (cellSize + cellGap) * (j - ((gridSize - 1) / 2));
            const box = new THREE.Box3();
            box.setFromCenterAndSize(
                new THREE.Vector3(x, 0, z),
                new THREE.Vector3(cellSize, cellHeight, cellSize)
            );
            gridCells[i].push({ cell: box, indicator: false });

            // Box3Helper 생성 (노란색)
            const helper = new THREE.Box3Helper(box, 0xffff00);

            // 씬에 추가
            scene.add(helper);

            gridHelpers[i].push(helper);
        }
    }
    // console.log(gridCells);
    // console.log(check.convertGridToControls(gridCells));
}

function updateGridHelper() {
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (gridCells[i][j].indicator) {
                gridHelpers[i][j].material.color.set(0xff0000);
            }
            else {
                gridHelpers[i][j].material.color.set(0xffff00);
            }
        }
    }
}

function checkIntersection() {
    // update checkSpere location
    spheres.forEach(obj => {
        obj.checkSphere.center.set(obj.mesh.position.x, obj.mesh.position.y, obj.mesh.position.z);
    });

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const box = gridCells[i][j].cell;
            gridCells[i][j].indicator = spheres.map(sphere => sphere.checkSphere).some(element => {
                return box.intersectsSphere(element);
            })
        }
    }
}

function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbfd1e5);

    stats = util.initStats();
    renderer = util.initRenderer();
    camera = util.initCamera(cameraPosition);

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
    // three.js mesh
    const sphereGeometry = new THREE.SphereGeometry(radius);
    const sphereMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
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
    TWEEN.update();
    physicsWorld.step();

    // 메시 위치 동기화
    spheres.forEach(obj => {
        const pos = obj.body.translation();
        const rot = obj.body.rotation();
        obj.mesh.position.set(pos.x, pos.y, pos.z);
        obj.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    });

    // 카메라 위치 보간
    // targetPosition.set(
    //     position.x + cameraOffset.x,
    //     position.y + cameraOffset.y,
    //     position.z + cameraOffset.z
    // );
    // camera.position.lerp(targetPosition, 0.1);
    // camera.lookAt(position.x, position.y, position.z);

    // collision check
    checkIntersection();

    updateGridHelper();

    let controls = check.convertGridToControls(gridCells);
    isTargetFin = check.checkTarget(controls, card.randomTargetBlock);
    console.log(isTargetFin);


    renderer.render(scene, camera);
}
