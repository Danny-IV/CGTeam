import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

let isPerspective = true;
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 100);
camera.lookAt(0, 0, 0);

const orthoSize = 100;
const orthoCamera = new THREE.OrthographicCamera(
    window.innerWidth / -orthoSize,
    window.innerWidth / orthoSize,
    window.innerHeight / orthoSize,
    window.innerHeight / -orthoSize,
    0.1,
    1000
);
orthoCamera.position.set(0, 0, 100);
orthoCamera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.update();

const stats = new Stats();
document.body.appendChild(stats.dom);

const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const pointLight = new THREE.PointLight(0xffffff, 5);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

const gui = new GUI();
const textureLoader = new THREE.TextureLoader();

const cameraFolder = gui.addFolder('Camera');
cameraFolder.open();

const cameraOptions = {
    toggleCamera: () => {
        isPerspective = !isPerspective;
        if (!isPerspective) {
            orthoCamera.position.set(0, 0, 100);
            orthoCamera.lookAt(0, 0, 0);
        }
        controls.object = isPerspective ? camera : orthoCamera;
        controls.update();
        cameraOptions.current = isPerspective ? 'Perspective' : 'Orthographic';
    },
    current: 'Perspective'
};
cameraFolder.add(cameraOptions, 'toggleCamera').name('Switch Camera Type');
cameraFolder.add(cameraOptions, 'current').name('Current Camera').listen();

const planetData = [
    { name: 'Sun', radius: 10, distance: 0, color: '#ffff00'},
    { name: 'Mercury', radius: 1.5, distance: 20, color: '#a6a6a6', texture: 'textures/mercury.jpg', rotationSpeed: 0.02, orbitSpeed: 0.02 },
    { name: 'Venus', radius: 3, distance: 35, color: '#e39e1c', texture: 'textures/venus.jpg', rotationSpeed: 0.015, orbitSpeed: 0.015 },
    { name: 'Earth', radius: 3.5, distance: 50, color: '#3498db', texture: 'textures/earth.jpg', rotationSpeed: 0.01, orbitSpeed: 0.01 },
    { name: 'Mars', radius: 2.5, distance: 65, color: '#c0392b', texture: 'textures/mars.jpg', rotationSpeed: 0.008, orbitSpeed: 0.008 },
];

const planets = [];

planetData.forEach(data => {
    let material;

    if (data.name === 'Sun') {
        material = new THREE.MeshStandardMaterial({ color: data.color });
    } else {
        const texture = textureLoader.load(data.texture);
        material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.8,
            metalness: 0.2
        });
    }

    const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
    const mesh = new THREE.Mesh(geometry, material);
    const pivot = new THREE.Object3D();
    pivot.add(mesh);
    scene.add(pivot);

    mesh.position.x = data.distance;
    data.mesh = mesh;
    data.pivot = pivot;

    if (data.name !== 'Sun') {
        const folder = gui.addFolder(data.name);
        folder.open();
        folder.add(data, 'rotationSpeed', 0, 0.05).name('Rotation Speed');
        folder.add(data, 'orbitSpeed', 0, 0.05).name('Orbit Speed');
    }

    planets.push(data);
});

window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;

    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    orthoCamera.left = window.innerWidth / -orthoSize;
    orthoCamera.right = window.innerWidth / orthoSize;
    orthoCamera.top = window.innerHeight / orthoSize;
    orthoCamera.bottom = window.innerHeight / -orthoSize;
    orthoCamera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);

    planets.forEach(data => {
        if (data.name !== 'Sun') {
            data.pivot.rotation.y += data.orbitSpeed;
            data.mesh.rotation.y += data.rotationSpeed;
        }
    });

    stats.update();
    renderer.render(scene, isPerspective ? camera : orthoCamera);
}

animate();