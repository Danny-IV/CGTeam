import * as THREE from 'three';
import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
import TWEEN from 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.esm.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import * as util from './util.js';
import * as check from './checkBlock.js';
import * as card from './cardAnimation.js';
import * as ball from './shootBall.js';
import { loadGLTFModel, createCollider, createSphere, createGridHelper } from './createObject.js';
import { Grid } from './grid.js';

// gridCells -> controls : convertGridToControls(gridCells)
// 모양 랜덤 선택 : card.checkTarget(controls, target)
// 랜덤으로 선택 된 모양 변수 : card.randomTargetBlock
// 모양 만족 여부 확인하기 : check.checkTarget(controls, target)

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

    card.setTarget();  

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

    const grid = new Grid(5);
    grid.createBox3Helpers(scene);

    const globals = { snapshot: world.takeSnapshot(), spheres: spheres, grid: grid };
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
    spheres.push(createSphere(scene, world, 1, new THREE.Vector3(5, 5, 3)));
    // spheres.push(createSphere(scene, world, 1, new THREE.Vector3(3, 5, 3)));
    // spheres.push(createSphere(scene, world, 1, new THREE.Vector3(5, 5, 3)));

    ball.createFixedSphere(scene, world, spheres, 1, new THREE.Vector3(0, 5, 0));

    // 이벤트
    window.addEventListener('pointerdown', (event) => ball.onPowerStart(event, spheres, camera, world));
    window.addEventListener('pointerup', (event) =>
        ball.onPowerRelease(event, spheres, camera, world, (obj) => { lastShotBall = obj; })
    );

    createGridHelper(scene);
    const axesHelper = new THREE.AxesHelper(20); // 10 unit 길이의 축을 보여줌
    scene.add(axesHelper);

    const grid = new Grid(5);
    grid.createBox3Helpers(scene);

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

    const globals = { snapshot: world.takeSnapshot(), spheres: spheres, grid: grid };
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
    TWEEN.update();
    currentLevel.world.step();

    // camera control
    orbitControls.update();

    // 메시 위치 동기화
    if (currentLevel.globals.spheres) {
        currentLevel.globals.spheres.forEach(obj => {
            const pos = obj.body.translation();
            const rot = obj.body.rotation();
            obj.mesh.position.set(pos.x, pos.y, pos.z);
            obj.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
        });
        // collision check
        currentLevel.globals.grid.checkIntersection(currentLevel);
        currentLevel.globals.grid.updateCellHelper();
    }

    if (currentLevel.globals.grid) {
        let controls = check.convertGridToControls(currentLevel.globals.grid.cells);
        isTargetFin = check.checkTarget(controls, card.randomTargetBlock);
    }

    if (isTargetFin) {
        console.log("game end!");
        loadLevel(levels[2]); // Load endLevel
        isTargetFin = false;
        requestAnimationFrame(render);
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
