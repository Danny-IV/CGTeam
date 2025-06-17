import * as THREE from 'three';
import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
import TWEEN from 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.esm.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as util from './util.js';
import * as check from './checkBlock.js';
import * as card from './cardAnimation.js';
import * as ball from './shootBall.js';
import { loadGLTFModel, createCollider, createSphere, createGridHelper } from './createObject.js';
import { Grid } from './grid.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

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

let ballcounter = 1;
let spawnTimeout = null;
let lastShotBall = null; // 최근에 날아간 공

// 스톱워치용 Clock 생성
const clock = new THREE.Clock(false); // autoStart: false

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
    clock.start();

    card.setTarget();

    // const gui = new GUI();
    // const endGameFolder = gui.addFolder('End Game');
    // endGameFolder.add({ end: () => { isTargetFin = true; } }, 'end').name('End Game');

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

    ball.createFixedSphere(scene, world, spheres, 1, new THREE.Vector3(0, 10, 20));

    // 이벤트
    window.addEventListener('pointerdown', (event) => {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(spheres.map(s => s.mesh));
        if (intersects.length > 0) {
            ball.onPowerStart(event, spheres, camera, world);
        }
    });
    window.addEventListener('pointerup', (event) =>
        ball.onPowerRelease(event, spheres, camera, world, (obj) => { lastShotBall = obj; })
    );

    // createGridHelper(scene);
    // const axesHelper = new THREE.AxesHelper(20); // 10 unit 길이의 축을 보여줌
    // scene.add(axesHelper);

    const grid = new Grid(5);
    // grid.createBox3Helpers(scene);

    // set map
    const map = await loadGLTFModel(scene, "./models/map.glb", new THREE.Vector3(0, 0, 0));
    createCollider(map, world);
    map.traverse((object) => {
        if (object.isMesh) {
            object.material.color.set(0x555555); // Set color to dark gray
            object.material.needsUpdate = true;
        }
    });

    const wall = await loadGLTFModel(scene, "./models/wall.glb", new THREE.Vector3(0, -1, 0));
    createCollider(wall, world);
    wall.traverse((object) => {
        if (object.isMesh) {
            object.material.color.set(0x555555); // Set color to dark gray
            object.material.needsUpdate = true;
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
    camera = util.initCamera(new THREE.Vector3(0, 15, 35));
    stats = util.initStats();

    // OrbitControls
    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableZoom = false;
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.1;
    orbitControls.minAzimuthAngle = -Math.PI / 6;
    orbitControls.maxAzimuthAngle = Math.PI / 6;
    orbitControls.minPolarAngle = Math.PI / 4;
    orbitControls.maxPolarAngle = Math.PI - Math.PI / 4;

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

function updateStopwatchDisplay() {
    const elapsedTime = clock.getElapsedTime();
    const hours = Math.floor(elapsedTime / 3600);
    const minutes = Math.floor((elapsedTime % 3600) / 60);
    const seconds = Math.floor(elapsedTime % 60);
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('stopwatch').textContent = timeString;
}

function render() {
    stats.update();
    TWEEN.update();
    currentLevel.world.step();

    // camera control
    orbitControls.update();

    // 공이 발사 중이면, 카메라 고정, 공을 lookAt
    if (lastShotBall) {
        orbitControls.enabled = false;
        camera.position.lerp(new THREE.Vector3(0, 15, 35), 0.1);
        camera.lookAt(lastShotBall.mesh.position);
    }
    // 공 발사 중 아니면 OrbitControl
    else {
        orbitControls.enabled = true;
        if (currentLevel.globals.spheres) {
            const sphere = currentLevel.globals.spheres[currentLevel.globals.spheres.length - 1];
            orbitControls.target.set(sphere.mesh.position.x, sphere.mesh.position.y, sphere.mesh.position.z);
        }
    }

    if (currentLevel.globals.spheres) {
        // 메시 위치 동기화
        currentLevel.globals.spheres.forEach(obj => {
            const pos = obj.body.translation();
            const rot = obj.body.rotation();
            obj.mesh.position.set(pos.x, pos.y, pos.z);
            obj.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
        });

        // collision check
        if (currentLevel.globals.grid) {
            currentLevel.globals.grid.checkIntersection(currentLevel);
            currentLevel.globals.grid.updateCellHelper();
        }
    }

    if (currentLevel.globals.grid) {
        let controls = check.convertGridToControls(currentLevel.globals.grid.cells);
        isTargetFin = check.checkTarget(controls, card.randomTargetBlock);
    }

    console.log(isTargetFin);
    if (isTargetFin) {
        console.log("game end!");
        isTargetFin = false;
        currentLevel.globals.grid = null;
        clock.stop();
        const elapsedTime = clock.getElapsedTime();
        const hours = Math.floor(elapsedTime / 3600);
        const minutes = Math.floor((elapsedTime % 3600) / 60);
        const seconds = Math.floor(elapsedTime % 60);
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('stopwatch').textContent = timeString;

        const loader = new FontLoader();
        loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
            const geometry = new TextGeometry(`GAME COMPLETE!\n${timeString}`, {
                font: font,
                size: 80,
                depth: 5,
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 10,
                bevelSize: 8,
                bevelOffset: 0,
                bevelSegments: 5
            });
            const material = new THREE.MeshPhongMaterial({ color: 0x7a306c });
            const textMesh = new THREE.Mesh(geometry, material);
            textMesh.position.set(0, 0, 0);
            currentLevel.scene.add(textMesh);
        });
        camera.position.set(900, 0, 900);
        camera.lookAt(0, 0, 0);

        requestAnimationFrame(justRender);
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
        ball.createFixedSphere(levels[1].scene, levels[1].world, levels[1].globals.spheres, 1, new THREE.Vector3(0, 10, 20));
        ballcounter += 1;
        lastShotBall = null; // 새 공 생성 후 더 이상 중복 생성을 막기 위해 null
        console.log("null로 바뀜");
    }
    if (lastShotBall && lastShotBall.mesh.position.y < -20) {
        lastShotBall.mesh.geometry.dispose();
        lastShotBall.mesh.material.dispose();
        currentLevel.scene.remove(lastShotBall.mesh);
        ball.createFixedSphere(levels[1].scene, levels[1].world, levels[1].globals.spheres, 1, new THREE.Vector3(0, 10, 20));
        lastShotBall = null;
    }

    updateStopwatchDisplay();

    // render current Scene
    renderer.render(currentLevel.scene, camera);
}

function justRender() {
    renderer.render(currentLevel.scene, camera);
    requestAnimationFrame(justRender);
}