import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// main scene
const scene = new THREE.Scene();

// Camera를 perspective와 orthographic 두 가지로 switching 해야 해서 const가 아닌 let으로 선언
let camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(120, 60, 180);
camera.lookAt(scene.position);
scene.add(camera);

// setup the renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
// attach renderer to the body of the html page
document.body.appendChild(renderer.domElement);

// add Stats
const stats = new Stats();
document.body.appendChild(stats.dom);

// add OrbitControls
let orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true; // 관성효과, 바로 멈추지 않고 부드럽게 멈춤
orbitControls.dampingFactor = 0.05; // 감속 정도, 크면 더 빨리 감속, default = 0.05

// planet datas
const planetData = [
    { name: 'Mercury', rotationSpeed: 0.02, orbitSpeed: 0.02, radius: 1.5, distance: 20 },
    { name: 'Venus', rotationSpeed: 0.015, orbitSpeed: 0.015, radius: 3, distance: 35 },
    { name: 'Earth', rotationSpeed: 0.01, orbitSpeed: 0.01, radius: 3.5, distance: 50 },
    { name: 'Mars', rotationSpeed: 0.008, orbitSpeed: 0.008, radius: 2.5, distance: 65 }
];

// add GUI
const gui = new GUI();

const folder1 = gui.addFolder('Camera');
const controls = new function () {
    this.perspective = "Perspective";
    this.switchCamera = function () {
        if (camera instanceof THREE.PerspectiveCamera) {
            scene.remove(camera);
            camera = null; // 기존의 camera 제거    
            // OrthographicCamera(left, right, top, bottom, near, far)
            camera = new THREE.OrthographicCamera(window.innerWidth / -16,
                window.innerWidth / 16, window.innerHeight / 16, window.innerHeight / -16, -200, 500);
            camera.position.x = 120;
            camera.position.y = 60;
            camera.position.z = 180;
            camera.lookAt(scene.position);
            orbitControls.dispose(); // 기존의 orbitControls 제거
            orbitControls = null;
            orbitControls = new OrbitControls(camera, renderer.domElement);
            orbitControls.enableDamping = true;
            this.perspective = "Orthographic";
        } else {
            scene.remove(camera);
            camera = null;
            camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.x = 120;
            camera.position.y = 60;
            camera.position.z = 180;
            camera.lookAt(scene.position);
            orbitControls.dispose(); // 기존의 orbitControls 제거
            orbitControls = null;
            orbitControls = new OrbitControls(camera, renderer.domElement);
            orbitControls.enableDamping = true;
            this.perspective = "Perspective";
        }
    };
};
folder1.add(controls, 'switchCamera').name('Switch Camera Type');
folder1.add(controls, 'perspective').listen().name('Current Camera');

planetData.forEach(data => {
    const folder = gui.addFolder(data.name);
    folder.add(data, 'rotationSpeed', 0, 0.1).name('Rotation Speed');
    folder.add(data, 'orbitSpeed', 0, 0.1).name('Orbit Speed');
});

// listen to the resize events
window.addEventListener('resize', onResize, false);
function onResize() { // resize handler
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// add ambient light
const ambientLight = new THREE.AmbientLight(0x333333);
scene.add(ambientLight);

// add directional light
const dirLight = new THREE.DirectionalLight(0xffffff);
dirLight.position.set(5, 12, 8); // 여기서 부터 (0, 0, 0) 방향으로 light ray 방향
dirLight.castShadow = true;  // 이 light가 shadow를 만들어 낼 것임
scene.add(dirLight);

// create Sun
const sunGeo = new THREE.SphereGeometry(10, 32, 16);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// texture Loader
const textureLoader = new THREE.TextureLoader();

// create planet function
function createPlanet(radius, textureFilePath) {
    const geometry = new THREE.SphereGeometry(radius, 32, 16);
    const texture = textureLoader.load(textureFilePath);
    const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.8,
        metalness: 0.2
    });
    return new THREE.Mesh(geometry, material);
}

planetData.forEach(data => {
    const planet = createPlanet(data.radius, `${data.name}.jpg`)
    const rootObj = new THREE.Object3D(); // root object for orbit rotate 
    planet.position.set(data.distance, 0, 0);
    rootObj.add(planet);
    scene.add(rootObj);
    data.rootObj = rootObj;
    data.planetObj = planet;
})

let step = 0;

function animate() {

    // stats와 orbitControls는 매 frame마다 update 해줘야 함
    stats.update();
    orbitControls.update();

    step += 1;
    // rotation
    planetData.forEach(data => {
        data.rootObj.rotateY(data.orbitSpeed);
        data.planetObj.rotateY(data.rotationSpeed);
        // data.planetObj.position.set(data.distance * Math.sin(step * data.orbitSpeed), 0, data.distance * Math.cos(step * data.orbitSpeed));
        // data.planetObj.rotation.y += data.rotationSpeed;
    });

    // 모든 transformation 적용 후, renderer에 렌더링을 한번 해 줘야 함
    renderer.render(scene, camera);

    // 다음 frame을 위해 requestAnimationFrame 호출 
    requestAnimationFrame(animate);
}

animate();
