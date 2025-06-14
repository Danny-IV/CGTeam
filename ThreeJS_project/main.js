import * as THREE from 'three';
import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
import * as util from './util.js';
import TWEEN from 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.esm.js';
import * as check from './checkBlock.js';
import * as card from './cardAnimation.js';
import * as ball from './shootBall.js';
import { loadGLTFModel, createCollider, createSphere, createGridHelper } from './createObject.js';

// gridCells -> controls : 
// 랜덤으로 선택 된 카드 : card.randomTargetBlock
// let target = '2x2';

let currentScene;
const scenes = [];

let renderer, camera;
let stats;
let physicsWorld;
const spheres = [];
let orbitControls;
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
const gridCellHelpers = [];

main().catch(error => {
    console.error("Failed to initialize:", error);
})

async function main() {
    initThree();
    await initPhysics();

    const startScene = setupStartScene();
    const ingameScene = await setupIngameScene();
    const endScene = setupEndScene();
    // scenes array [startScene, ingameScene, endScene]
    currentScene = scenes[1];


    initGridCells(ingameScene);
    card.setTargetGUI();   // GUI 대신 setTarget 호출하면 GUI없이 카드가 선택됨
    // card.setTarget();  

    render();
}

async function setupStartScene() {
    const scene = initScene();

    // TODO: start scene, button, text
    const map = await loadGLTFModel(scene, "./models/map.glb");

    // camera set
    camera.position.set(0, 10, 10);

    scenes.push(scene);
    return scene;
}

async function setupIngameScene() {
    const scene = initScene();

    const textureLoader = new THREE.TextureLoader();
    const bgTexture = textureLoader.load('./images/space.png');
    bgTexture.encoding = THREE.sRGBEncoding;
    scene.background = bgTexture;

    ball.createFixedSphere(scene, physicsWorld, spheres, 1, new THREE.Vector3(0, 5, -5));

    createGridHelper(scene);
    const axesHelper = new THREE.AxesHelper(20); // 10 unit 길이의 축을 보여줌
    scene.add(axesHelper);

    // set map
    const map = await loadGLTFModel(scene, "./models/map.glb", new THREE.Vector3(0, 2, 0));
    createCollider(map, physicsWorld);

    const wall = await loadGLTFModel(scene, "./models/mapWall_H.glb", new THREE.Vector3(0, 0, 0));
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

    // camera set
    camera.position.set(0, 40, 40);

    scenes.push(scene);
    return scene;
}

function setupEndScene() {
    const scene = initScene();

    scenes.push(scene);
    return scene;
}

function initGridCells(scene) {
    const cellSize = 1;
    const cellHeight = 1;
    const cellGap = 2;
    for (let i = 0; i < gridSize; i++) {
        gridCells[i] = [];
        gridCellHelpers[i] = [];
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

            // ingame Scene에 추가
            scene.add(helper);

            gridCellHelpers[i].push(helper);
        }
    }
    // console.log(gridCells);
    // console.log(check.convertGridToControls(gridCells));
}

function updateGridCellHelper() {
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (gridCells[i][j].indicator) {
                gridCellHelpers[i][j].material.color.set(0xff0000);
            }
            else {
                gridCellHelpers[i][j].material.color.set(0xffff00);
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
    camera = util.initCamera();

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
    updateGridCellHelper();

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
        ball.createFixedSphere(scenes[0], physicsWorld, spheres, 1, new THREE.Vector3(0, 5, -5));
        ballcounter += 1;
        lastShotBall = null; // 새 공 생성 후 더 이상 중복 생성을 막기 위해 null
    }

    // render current Scene
    renderer.render(currentScene, camera);
}
