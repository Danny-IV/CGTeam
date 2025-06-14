import * as THREE from 'three';
import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
import * as util from './util.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import TWEEN from 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.esm.js';
import * as check from './checkBlock.js';
import * as card from './cardAnimation.js';
import * as ball from './shootBall.js';

// gridCells -> controls : 
// 랜덤으로 선택 된 카드 : card.randomTargetBlock
// let target = '2x2';

let currentScene;
// scenes
let ingameScene;

let renderer, camera;
let stats;
let physicsWorld;
let boxMesh;
const spheres = [];
const cameraOffset = new THREE.Vector3(0, 2, -5);
let targetPosition = new THREE.Vector3();
let orbitControls;
const cameraPosition = new THREE.Vector3(0, 40, 70);
let isTargetFin = false;

let ballcounter = 1;
let spawnTimeout = null;
let lastShotBall = null; // 최근에 날아간 공

// 이벤트
window.addEventListener('pointerdown', (event) => ball.onPowerStart(event, spheres, camera, physicsWorld));
window.addEventListener('pointerup', (event) =>
    ball.onPowerRelease(event, spheres, camera, physicsWorld, (obj) => { lastShotBall = obj; })
);


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

    await setupIngameScene();
    currentScene = ingameScene;

    initGrid();
    card.setTargetGUI();   // GUI 대신 setTarget 호출하면 GUI없이 카드가 선택됨
    // card.setTarget();  

    render();
}

async function setupIngameScene() {
    ingameScene = initScene();

    const textureLoader = new THREE.TextureLoader();
    const bgTexture = textureLoader.load('./images/space.png');
    bgTexture.encoding = THREE.sRGBEncoding;
    ingameScene.background = bgTexture;

    ball.createFixedSphere(ingameScene, physicsWorld, spheres, 1, new THREE.Vector3(0, 5, -5));

    createGridHelper(ingameScene);
    const axesHelper = new THREE.AxesHelper(20); // 10 unit 길이의 축을 보여줌
    ingameScene.add(axesHelper);

    // set map
    const map = await loadGLTFModel(ingameScene, "./models/map.glb", new THREE.Vector3(0, 0, 0));
    createCollider(map, physicsWorld);

    const wall = await loadGLTFModel(ingameScene, "./models/mapWall_H.glb", new THREE.Vector3(0, 0, 0));
    createCollider(wall, physicsWorld);

    // wall, map 색상 설정
    map.traverse((child) => {
        if (child.isMesh && child.material) {
            child.material.color.set(0xffffff);
            child.material.emissive = new THREE.Color(0xffffff);        // 발광 색상
            child.material.emissiveIntensity = 0.5;
        }
    });

    wall.traverse((child) => {
        if (child.isMesh && child.material) {
            child.material.color.set(0x444444);
        }
    });

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

/**
 * Create a collider for the given model and add it to the given physics world.
 * @param {THREE.Object3D} model
 * @param {RAPIER.World} world
 */
function createCollider(model, world) {
    model.traverse((child) => {
        if (child.isMesh && child.geometry) {
            child.updateMatrixWorld(true);

            const geometry = child.geometry.clone();
            geometry.applyMatrix4(child.matrixWorld);

            const vertices = geometry.attributes.position.array;
            const indices = geometry.index ? geometry.index.array : null;

            if (!vertices || !indices) {
                console.warn(`Skipping ${child.name} - invalid geometry for trimesh`);
                return;
            }
            const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
            const rigidBody = world.createRigidBody(rigidBodyDesc);

            const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices);
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
            ingameScene.add(helper);

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

function initScene() {
    const scene = new THREE.Scene();

    // light
    util.initDefaultDirectionalLighting(scene);

    return scene;
}

function initThree() {
    renderer = util.initRenderer();
    camera = util.initCamera(cameraPosition);

    stats = util.initStats();
    orbitControls = util.initOrbitControls(camera, renderer);
    orbitControls.target.set(0, 0, 0);

    window.addEventListener(
        "resize",
        () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        },
        false
    );
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

function createGridHelper(scene) {
    const size = 15;
    const division = 15;
    const gridHelper = new THREE.GridHelper(size, division, 0x000000, 0x000000);
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
}

/**
 * Scene을 전환
 * @param {THREE.Scene} targetScene 전환할 Scene
 */
function switchScene(targetScene) {
    currentScene = targetScene;
}

function render() {
    stats.update();
    orbitControls.update();
    TWEEN.update();
    physicsWorld.step();

    // 메시 위치 동기화
    spheres.forEach(obj => {
        const pos = obj.body.translation();
        const rot = obj.body.rotation();
        obj.mesh.position.set(pos.x, pos.y, pos.z);
        obj.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    });

    // collision check
    checkIntersection();
    updateGridHelper();

    let controls = check.convertGridToControls(gridCells);
    isTargetFin = check.checkTarget(controls, card.randomTargetBlock);

    if (isTargetFin) {
        console.log("game end!");
    }
    else {
        requestAnimationFrame(render);
    }

    // 친 공이 멈추면 새로운 공을 생성
    if (
        lastShotBall &&                 // 최근에 친 공이 있고
        !lastShotBall.isFixed &&        // 그 공이 날아간 상태(isFixed=false)
        ball.isBallStopped(lastShotBall) // 그리고 충분히 멈췄으면
    ) {
        ball.createFixedSphere(ingameScene, physicsWorld, spheres, 1, new THREE.Vector3(0, 5, -5));
        ballcounter += 1;
        lastShotBall = null; // 새 공 생성 후 더 이상 중복 생성을 막기 위해 null
    }

    // render current Scene
    renderer.render(currentScene, camera);
}
