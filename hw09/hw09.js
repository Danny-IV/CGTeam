// main.js - Three.js 태양계 시뮬레이터 (카메라 전환 및 텍스트 반영 고침)

import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { initStats, initRenderer, initCamera, initOrbitControls } from './util.js';

const scene = new THREE.Scene();
const textureLoader = new THREE.TextureLoader();

const stats = initStats();
const renderer = initRenderer();
let camera = initCamera();
scene.add(camera);

let orbitControls = initOrbitControls(camera, renderer);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.05;

const ambientLight = new THREE.AmbientLight("#606008", 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 20, 20);
scene.add(directionalLight);

const spotLight = new THREE.SpotLight(0xffffff, 100, 200, Math.PI / 4, 0.1, 1);
spotLight.position.set(-30, 40, -10);
spotLight.target.position.set(0, 0, 0);
spotLight.castShadow = true;
spotLight.shadow.mapSize.set(2048, 2048);
spotLight.shadow.camera.near = 1;
spotLight.shadow.camera.far = 200;
scene.add(spotLight);
scene.add(spotLight.target);

const cameraState = { mode: 'Perspective' };

function switchCamera(toPerspective) {
  const pos = camera.position.clone();
  const aspect = window.innerWidth / window.innerHeight;
  let newCamera;

  if (toPerspective) {
    newCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
  } else {
    newCamera = new THREE.OrthographicCamera(-100 * aspect, 100 * aspect, 100, -100, 0.1, 1000);
  }

  newCamera.position.copy(pos);
  newCamera.lookAt(scene.position);

  scene.remove(camera);
  camera = newCamera;
  scene.add(camera);

  orbitControls.dispose();
  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.05;
}

function createPlanet({ name, radius, distance, color, texturePath, rotationSpeed, orbitSpeed }) {
  const texture = textureLoader.load(texturePath);
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, metalness: 0.2, color });
  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.position.x = distance;

  const pivot = new THREE.Object3D();
  pivot.add(mesh);
  scene.add(pivot);

  return { name, mesh, pivot, rotationSpeed, orbitSpeed };
}

const planets = [
  createPlanet({ name: 'Mercury', radius: 1.5, distance: 20, color: '#a6a6a6', texturePath: './texture/Mercury.jpg', rotationSpeed: 0.02, orbitSpeed: 0.02 }),
  createPlanet({ name: 'Venus', radius: 3, distance: 35, color: '#e39e1c', texturePath: './texture/Venus.jpg', rotationSpeed: 0.015, orbitSpeed: 0.015 }),
  createPlanet({ name: 'Earth', radius: 3.5, distance: 50, color: '#3498db', texturePath: './texture/Earth.jpg', rotationSpeed: 0.01, orbitSpeed: 0.01 }),
  createPlanet({ name: 'Mars', radius: 2.5, distance: 65, color: '#c0392b', texturePath: './texture/Mars.jpg', rotationSpeed: 0.008, orbitSpeed: 0.008 })
];

const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
const sun = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 32), sunMaterial);
sun.castShadow = false;
sun.receiveShadow = false;
scene.add(sun);

setupGUIControls();
render();

function render() {
  stats.update();
  orbitControls.update();

  planets.forEach(p => {
    p.mesh.rotation.y += p.rotationSpeed;
    p.pivot.rotation.y += p.orbitSpeed;
  });

  requestAnimationFrame(render);
  renderer.render(scene, camera);
}

function setupGUIControls() {
  const gui = new GUI();
  const cameraFolder = gui.addFolder('Camera');

  cameraFolder.add({ switch: () => {
    const toPerspective = cameraState.mode !== 'Perspective';
    switchCamera(toPerspective);
    cameraState.mode = toPerspective ? 'Perspective' : 'Orthographic';
  } }, 'switch').name('Switch Camera Type');

  cameraFolder.add(cameraState, 'mode').name('Current Camera').listen();

  planets.forEach(p => {
    const folder = gui.addFolder(p.name);
    folder.add(p, 'rotationSpeed', 0, 0.5).listen();
    folder.add(p, 'orbitSpeed', 0, 0.5).listen();
  });
}
