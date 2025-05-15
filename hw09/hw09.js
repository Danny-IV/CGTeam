import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// main scene
const scene = new THREE.Scene();

// camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(50, 50, 5);
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
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true; // 관성효과, 바로 멈추지 않고 부드럽게 멈춤
orbitControls.dampingFactor = 0.05; // 감속 정도, 크면 더 빨리 감속, default = 0.05

// add GUI
const gui = new GUI();
const props = {
    cubeRotSpeed: 0.01,
    torusRotSpeed: 0.01,
};
gui.add(props, 'cubeRotSpeed', -0.2, 0.2, 0.01);
gui.add(props, 'torusRotSpeed', -0.2, 0.2, 0.01);

// listen to the resize events
window.addEventListener('resize', onResize, false);
function onResize() { // resize handler
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// axes helper: x, y, z 축을 보여줌 (red, green, blue 순서))
const axesHelper = new THREE.AxesHelper(30);
scene.add(axesHelper);

// add ambient light
const ambientLight = new THREE.AmbientLight(0x333333);
scene.add(ambientLight);

// add directional light
const dirLight = new THREE.DirectionalLight(0xffffff);
dirLight.position.set(5, 12, 8); // 여기서 부터 (0, 0, 0) 방향으로 light ray 방향
dirLight.castShadow = true;  // 이 light가 shadow를 만들어 낼 것임
scene.add(dirLight);

// create a cube and add it to the scene
// BoxGeometry: width, height, depth의 default는 1
//            : default center position = (0, 0, 0)
const cubeGeometry = new THREE.BoxGeometry();

// MeshLambertMaterial: ambient + diffuse
const cubeMaterial = new THREE.MeshLambertMaterial({ color: 0x990000 });

// 하나의 mesh는 geometry와 material로 이루어짐
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.x = -1;
cube.castShadow = true; // light를 받을 떄 shadow를 만들어 냄
scene.add(cube);

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

// create Mercury
const mercury = createPlanet(2, 'Mercury.jpg');
mercury.position.set(20, 0, 0);
scene.add(mercury);

// create Venus
const venus = createPlanet(7, 'Venus.jpg');
venus.position.set(0, 0, 20);
scene.add(venus);

// create Earth
const earth = createPlanet(5, 'Earth.jpg');
earth.position.set(0, 20, 0);
scene.add(earth);

// create Mars
const mars = createPlanet(7, 'Mars.jpg');
mars.position.set(0, 0, -20);
scene.add(mars);

// TorusKnotGeometry(radius, tube, tubularSegment, radialSegments, p, q)
// Threejs.org의 manual 참고 할 것
//                 : radius (default = 1), 전체 torus의 반지름
//                 : tube (default = 0.4), torus tube의 반지름
//                 : tubularSegments (default = 64), 전체 torus를 나누는 horizontal segment의 개수
//                 : radialSegments (default = 8), torus tube를 나누는 vertical segment의 개수
//                 : p (default = 2), torus가 만드는 원 모양의 감긴 개수
//                 : q (default = 3), torus의 큰 circle을 휘감는 개수
const torusKnotGeometry = new THREE.TorusKnotGeometry(0.5, 0.2, 100, 100);

// MeshPhongMaterial: ambient + diffuse + specular
const torusKnotMat = new THREE.MeshPhongMaterial({
    color: 0x00ff88,
});
const torusKnotMesh = new THREE.Mesh(torusKnotGeometry, torusKnotMat);
torusKnotMesh.castShadow = true; // light를 받을 떄 shadow를 만들어 냄
torusKnotMesh.position.x = 2;
scene.add(torusKnotMesh);

// add a plane: 원래 plane은 xy plane 위에 생성됨
const planeGeometry = new THREE.PlaneGeometry(15, 15); // width, height
const planeMaterial = new THREE.MeshLambertMaterial({ color: 0xaaaa00 });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;  // x축 기준으로 -90도 회전 (+y를 up으로 하는 plane이 됨)
plane.position.y = -1;
plane.receiveShadow = true;
scene.add(plane);

let step = 0;

function animate() {

    // stats와 orbitControls는 매 frame마다 update 해줘야 함
    stats.update();
    orbitControls.update();

    step += 0.02;
    // earth
    earth.position.set(20 * Math.cos(step), 20 * Math.sin(step));

    // cube의 rotation transformation (model transformation)
    // 각각 x, y, z 축을 기준으로 하는 rotation angle (radian)
    cube.rotation.x += props.cubeRotSpeed;
    cube.rotation.y += props.cubeRotSpeed;
    cube.rotation.z += props.cubeRotSpeed;

    // torusKnot의 rotation transformation
    // 각각 x, y, z 축을 기준으로 하는 rotation angle (radian)
    torusKnotMesh.rotation.x -= props.torusRotSpeed;
    torusKnotMesh.rotation.y += props.torusRotSpeed;
    torusKnotMesh.rotation.z -= props.torusRotSpeed;

    // 모든 transformation 적용 후, renderer에 렌더링을 한번 해 줘야 함
    renderer.render(scene, camera);

    // 다음 frame을 위해 requestAnimationFrame 호출 
    requestAnimationFrame(animate);
}

animate();
