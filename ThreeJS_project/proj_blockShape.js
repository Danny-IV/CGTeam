import * as THREE from 'three';  
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { initStats, initRenderer, initCamera, initOrbitControls } from './util.js';

const scene = new THREE.Scene();

const renderer = initRenderer();
const camera = initCamera();
const stats = initStats();
const orbitControls = initOrbitControls(camera, renderer);

// plane and cubes
const cubeSize = 4;
const cubeSpacing = 5;
const gridSize = 5;

const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
const planeGeometry = new THREE.PlaneGeometry(cubeSize, cubeSize);

const cubeArray = [];

for (let j = 0; j < gridSize; j++) {
    cubeArray[j] = [];
    for (let i = 0; i < gridSize; i++) {
        // 바닥 Plane 추가
        const planeMaterial = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -0.5 * Math.PI;
        plane.position.x = -((gridSize * cubeSpacing) / 2) + (i * cubeSpacing) + cubeSize / 2;
        plane.position.z = -((gridSize * cubeSpacing) / 2) + (j * cubeSpacing) + cubeSize / 2;
        plane.position.y = 0; // 바닥
        scene.add(plane);

        // 큐브 추가
        const rnd = Math.random() * 0.75 + 0.25;
        const cubeMaterial = new THREE.MeshLambertMaterial({ color: new THREE.Color(rnd, 0, 0) });
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.position.x = plane.position.x;
        cube.position.z = plane.position.z;
        cube.position.y = cubeSize / 2; // plane 위에 위치

        scene.add(cube);
        cubeArray[j][i] = cube;
    }
}



// add subtle ambient lighting
const ambiColor = "#1c1c1c";
const ambientLight = new THREE.AmbientLight(ambiColor);
scene.add(ambientLight);

// add directional light
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(100, 200, 200);
scene.add(dirLight);

render();

function render() {
    orbitControls.update();
    stats.update();

    // render using requestAnimationFrame
    requestAnimationFrame(render);
    renderer.render(scene, camera);
}

let cubes = [];
const controls = setupControls();
// console.log(controls);



function block_3x1_1x3(controls) {
    // 기능: controls 객체에서 3x1 또는 1x3 모양이 있는지 검사
    // 반환: "3x1", "1x3" 중 하나 또는 false

    // 0 0 0    0 
    //          0
    //          0

  const gridSize = 5;

  // 행 체크 (3x1)
  for (let j = 0; j < gridSize; j++) {
    const row = [];
    for (let i = 0; i < gridSize; i++) {
      const key = `${j}-${i}`;
      row[i] = controls[key] ?? false;
    }
    for (let i = 0; i <= gridSize - 3; i++) {
      if (row[i] && row[i + 1] && row[i + 2]) {
        return "3x1";
      }
    }
  }

  // 열 체크 (1x3)
  for (let i = 0; i < gridSize; i++) {
    const col = [];
    for (let j = 0; j < gridSize; j++) {
      const key = `${j}-${i}`;
      col[j] = controls[key] ?? false;
    }
    for (let j = 0; j <= gridSize - 3; j++) {
      if (col[j] && col[j + 1] && col[j + 2]) {
        return "1x3";
      }
    }
  }

  return false;
}

function block_T(controls) {  
    // 기능: controls 객체에서 T자 모양이 있는지 검사
    // 반환: "up" (ㅜ), "down" (ㅗ), "right" (ㅓ), "left" (ㅏ) 중 하나 또는 false

    // 0 0 0
    //   0
    //   0

    
  const gridSize = 5;

  for (let j = 0; j < gridSize; j++) {
    for (let i = 0; i < gridSize; i++) {
      // ㅜ
      if (
        i >= 1 && i <= gridSize - 2 &&
        j <= gridSize - 3 &&
        controls[`${j}-${i - 1}`] &&
        controls[`${j}-${i}`] &&
        controls[`${j}-${i + 1}`] &&
        controls[`${j + 1}-${i}`] &&
        controls[`${j + 2}-${i}`]
      ) return "up";

      // ㅗ
      if (
        i >= 1 && i <= gridSize - 2 &&
        j <= gridSize - 3 &&
        controls[`${j}-${i}`] &&
        controls[`${j + 1}-${i}`] &&
        controls[`${j + 2}-${i - 1}`] &&
        controls[`${j + 2}-${i}`] &&
        controls[`${j + 2}-${i + 1}`]
      ) return "down";

      // ㅓ
      if (
        i <= gridSize - 2 &&
        j >= 1 && j <= gridSize - 2 &&
        controls[`${j}-${i}`] &&
        controls[`${j - 1}-${i + 1}`] &&
        controls[`${j}-${i + 1}`] &&
        controls[`${j + 1}-${i + 1}`] &&
        controls[`${j}-${i - 1}`]
      ) return "right";

      // ㅏ
      if (
        i >= 1 &&
        j >= 1 && j <= gridSize - 2 &&
        controls[`${j}-${i}`] &&
        controls[`${j - 1}-${i - 1}`] &&
        controls[`${j}-${i - 1}`] &&
        controls[`${j + 1}-${i - 1}`] &&
        controls[`${j}-${i + 1}`]
      ) return "left";
    }
  }

  return false;
}

function block_2x2(controls) {
    // 기능: controls 객체에서 2x2자 모양이 있는지 검사
    // 반환: true 또는 false

    // 0 0 
    // 0 0 

  const gridSize = 5;

  for (let j = 0; j < gridSize - 1; j++) {
    for (let i = 0; i < gridSize - 1; i++) {
      if (
        controls[`${j}-${i}`] &&
        controls[`${j}-${i + 1}`] &&
        controls[`${j + 1}-${i}`] &&
        controls[`${j + 1}-${i + 1}`]
      ) {
        return true;
      }
    }
  }

  return false;
}

function block_K(controls) {
    // 기능: controls 객체에서 ㄱ자 모양이 있는지 검사
    // 반환: "ㄱ", "mirrored-ㄱ", "ㄴ", "mirrored-ㄴ" 중 하나 또는 false

    // 0 0 0
    //     0 
    //     0 

  const gridSize = 5;

  for (let j = 0; j < gridSize; j++) {
    for (let i = 0; i < gridSize; i++) {

      // ㄱ 모양
      if (
        i <= gridSize - 3 && j <= gridSize - 3 &&
        controls[`${j}-${i}`] &&
        controls[`${j}-${i + 1}`] &&
        controls[`${j}-${i + 2}`] &&
        controls[`${j + 1}-${i + 2}`] &&
        controls[`${j + 2}-${i + 2}`]
      ) return "ㄱ";

      // ㄴ 모양
      if (
        i >= 2 && j <= gridSize - 3 &&
        controls[`${j}-${i}`] &&
        controls[`${j}-${i - 1}`] &&
        controls[`${j}-${i - 2}`] &&
        controls[`${j + 1}-${i - 2}`] &&
        controls[`${j + 2}-${i - 2}`]
      ) return "mirrored-ㄱ";

      // mirrored-ㄱ (세로 3칸 + 아래 가로 오른쪽)
      if (
        j <= gridSize - 3 && i <= gridSize - 3 &&
        controls[`${j}-${i}`] &&
        controls[`${j + 1}-${i}`] &&
        controls[`${j + 2}-${i}`] &&
        controls[`${j + 2}-${i + 1}`] &&
        controls[`${j + 2}-${i + 2}`]
      ) return "ㄴ";

      // mirrored-ㄴ (세로 3칸 + 아래 가로 왼쪽)
      if (
        j <= gridSize - 3 && i >= 2 &&
        controls[`${j}-${i}`] &&
        controls[`${j + 1}-${i}`] &&
        controls[`${j + 2}-${i}`] &&
        controls[`${j + 2}-${i - 1}`] &&
        controls[`${j + 2}-${i - 2}`]
      ) return "mirrored-ㄴ";
    }
  }

  return false;
}



function setupControls() {
  const controls = {};
  const gui = new GUI();

  for (let j = 0; j < 5; j++) {
    cubes[j] = [];
    const folder = gui.addFolder(`Row ${j}`);

    for (let i = 0; i < 5; i++) {
      cubes[j][i] = false;
      cubeArray[j][i].visible = false;
 
      const key = `${j}-${i}`;
      controls[key] = cubes[j][i];

      folder.add(controls, key).onChange((value) => {
        cubes[j][i] = value;
        cubeArray[j][i].visible = value;
        // console.log(cubes);
        // console.log(controls);

        // *** controls 모양 확인 - 3x1 and 1x3, T모양 등 ***
        let is_3x1_1x3 = block_3x1_1x3(controls);
        // console.log(is_3x1_1x3);
        
        let is_T = block_T(controls);
        // console.log(is_T);

        let is_2x2 = block_2x2(controls);
        // console.log(is_2x2);

        let is_K = block_K(controls);
        // console.log(is_K);

        console.log(`is_3x1_1x3 : ${is_3x1_1x3}\nis_T : ${is_T}\nis_2x2 : ${is_2x2}\nis_K : ${is_K}`);

      });
    }
  }

  return controls;
}

controls


