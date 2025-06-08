import * as THREE from 'https://unpkg.com/three@0.159.0/build/three.module.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 텍스처 준비
const frontTex = new THREE.TextureLoader().load('https://dummyimage.com/200x300/007acc/ffffff&text=Front');
const backTex = new THREE.TextureLoader().load('https://dummyimage.com/200x300/cc0000/ffffff&text=Back');
const sideMat = new THREE.MeshBasicMaterial({ color: 0x444444 });

// 재질 (6면)
const materials = [
  sideMat, sideMat, sideMat, sideMat,
  new THREE.MeshBasicMaterial({ map: frontTex }), // front
  new THREE.MeshBasicMaterial({ map: backTex })   // back
];

// 카드 덱 생성
const deck = [];
const CARD_COUNT = 10;
for (let i = 0; i < CARD_COUNT; i++) {
  const card = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 0.05), materials);
  card.position.z = -i * 0.01; // 약간씩 뒤로 쌓기
  deck.push(card);
  scene.add(card);
}

let selectedCard = null;
let state = 'idle';
let flipProgress = 0;

// 애니메이션 루프
function animate() {
  requestAnimationFrame(animate);

  if (state === 'pull') {
    if (selectedCard.position.z < 2) {
      selectedCard.position.z += 0.1;
    } else {
      state = 'flip';
    }
  }

  if (state === 'flip') {
    if (flipProgress < Math.PI) {
      flipProgress += 0.05;
      selectedCard.rotation.y = flipProgress;
    } else {
      state = 'done';
    }
  }

  renderer.render(scene, camera);
}

animate();

// 클릭 시 한 장 뽑고 뒤집기
window.addEventListener('click', () => {
  if (state === 'idle') {
    selectedCard = deck.pop(); // 가장 위 카드 선택
    state = 'pull';
    flipProgress = 0;
  }
});
