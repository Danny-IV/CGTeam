import * as THREE from 'three';
import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
import TWEEN from 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.esm.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import * as util from './util.js';
import * as check from './checkBlock.js';
import * as card from './cardAnimation.js';
import * as ball from './shootBall.js';
import { loadGLTFModel, createCollider, createSphere, createGridHelper } from './createObject.js';

// gridCells -> controls : 
// 랜덤으로 선택 된 카드 : card.randomTargetBlock
// let target = '2x2';

// 레벨은 스테이지를 의미
let currentLevel = { scene: null, world: null, globals: null };
const levels = [];

// three.js 공용 변수
let renderer, camera;
let stats;
let orbitControls;

//  게임 종료 변수
let isTargetFin = false;

// TODO: 아래 변수들 모두 levels의 변수로 만들기
let ballcounter = 1;
let spawnTimeout = null;
let lastShotBall = null; // 최근에 날아간 공

// grid
const gridSize = 5;
const gridCells = [];
const gridCellHelpers = [];

main().catch(error => {
    console.error("Failed to initialize:", error);
})

async function main() {
    initThree();
    await RAPIER.init();

    const startLevel = await setupStartScene();
    const ingameLevel = await setupIngameScene();
    const endLevel = setupEndScene();
    levels.push(startLevel, ingameLevel, endLevel);

    // 처음 시작하는 scene
    loadLevel(ingameLevel);
    camera.position.set(0, 20, 20);

    card.setTargetGUI();   // GUI 대신 setTarget 호출하면 GUI없이 카드가 선택됨
    // card.setTarget();  

    const gui = new GUI();
    const levelFolder = gui.addFolder('Level');
    levelFolder.add(levels, 'currentIndex', [0, 1, 2]).name('Change Level').onChange((value) => {
        loadLevel(levels[value]);
    }).listen();

    render();
}

async function setupStartScene() {
    const scene = initScene();
    const world = initWorld();
    const spheres = [];

    // TODO: start scene, button, text
    const map = await loadGLTFModel(scene, "./models/map.glb");
    createCollider(map, world);

    const positions = [
        new THREE.Vector3(-5, 5, 0),
        new THREE.Vector3(0, 5, 0),
        new THREE.Vector3(5, 5, 0),
        new THREE.Vector3(-5, 5, 5),
        new THREE.Vector3(0, 5, 5),
        new THREE.Vector3(5, 5, 5)
    ];
    positions.forEach(pos => {
        spheres.push(createSphere(scene, world, 1, pos));
    });

    const globals = { snapshot: world.takeSnapshot(), spheres: spheres };
    return { scene: scene, world: world, globals: globals };
}

async function setupIngameScene() {
    const scene = initScene();
    const world = initWorld();
    const spheres = [];

    const textureLoader = new THREE.TextureLoader();
    const bgTexture = textureLoader.load('./images/space.png');
    bgTexture.encoding = THREE.sRGBEncoding;
    scene.background = bgTexture;

    spheres.push(createSphere(scene, world, 1, new THREE.Vector3(5, 5, 0)));
    spheres.push(createSphere(scene, world, 1, new THREE.Vector3(-5, 5, 0)));

    ball.createFixedSphere(scene, world, spheres, 1, new THREE.Vector3(0, 5, 0));

    // 이벤트
    window.addEventListener('pointerdown', (event) => ball.onPowerStart(event, spheres, camera, world));
    window.addEventListener('pointerup', (event) =>
        ball.onPowerRelease(event, spheres, camera, world, (obj) => { lastShotBall = obj; })
    );

    createGridHelper(scene);
    const axesHelper = new THREE.AxesHelper(20); // 10 unit 길이의 축을 보여줌
    scene.add(axesHelper);

    // gridCells
    initGridCells(scene);

    // set map
    const map = await loadGLTFModel(scene, "./models/map.glb", new THREE.Vector3(0, 0, 0));
    createCollider(map, world);

    const wall = await loadGLTFModel(scene, "./models/mapWall_H.glb", new THREE.Vector3(0, -1, 0));
    createCollider(wall, world);

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

    const globals = { snapshot: world.takeSnapshot(), spheres: spheres };
    return { scene: scene, world: world, globals: globals };
}

function setupEndScene() {
    const scene = initScene();
    const world = initWorld();

    // TODO: end scene
    const loader = new THREE.TextureLoader();
    const texture = loader.load('./images/congratulation.png');
    const geometry = new THREE.PlaneGeometry(10, 5);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const sprite = new THREE.Mesh(geometry, material);
    scene.add(sprite);

    const globals = { snapshot: world.takeSnapshot() };
    return { scene: scene, world: world, globals: globals };
}

function loadLevel(level) {
    // reset world
    if (!level.globals.snapshot || !(level.globals.snapshot instanceof Uint8Array)) {
        throw new Error("올바른 스냅샷 데이터가 필요합니다.");
    }

    currentLevel.scene = level.scene;
    currentLevel.world = level.world;
    currentLevel.globals = level.globals;

    console.log("Level Loaded");
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

function checkIntersection(level) {
    // update checkSpere location
    level.globals.spheres.forEach(obj => {
        obj.checkSphere.center.set(obj.mesh.position.x, obj.mesh.position.y, obj.mesh.position.z);
    });

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const box = gridCells[i][j].cell;
            gridCells[i][j].indicator = level.globals.spheres.map(sphere => sphere.checkSphere).some(element => {
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

function initWorld() {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    return world;
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

function render() {
    stats.update();
    orbitControls.update();
    TWEEN.update();
    currentLevel.world.step();

    // 메시 위치 동기화
    if (currentLevel.globals.spheres) {
        currentLevel.globals.spheres.forEach(obj => {
            const pos = obj.body.translation();
            const rot = obj.body.rotation();
            obj.mesh.position.set(pos.x, pos.y, pos.z);
            obj.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
        });
        // collision check
        checkIntersection(currentLevel);
        updateGridCellHelper();
    }

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
        ball.createFixedSphere(levels[1].scene, levels[1].world, levels[1].globals.spheres, 1, new THREE.Vector3(0, 5, -5));
        ballcounter += 1;
        lastShotBall = null; // 새 공 생성 후 더 이상 중복 생성을 막기 위해 null
    }

    // render current Scene
    renderer.render(currentLevel.scene, camera);
}
