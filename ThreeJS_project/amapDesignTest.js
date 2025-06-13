import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, physicsWorld;
let sphereMesh, sphereBody;

init();

async function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0a0a0);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 20, 50);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  new OrbitControls(camera, renderer.domElement);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(10, 20, 10);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x404040));

  await RAPIER.init();
  physicsWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

  // Ground
  const groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x777777 })
  );
  groundMesh.rotation.x = -Math.PI / 2;
  scene.add(groundMesh);

  const groundBody = physicsWorld.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0));
  const groundCollider = RAPIER.ColliderDesc.cuboid(50, 0.1, 50);
  physicsWorld.createCollider(groundCollider, groundBody);

  // Sphere
  const radius = 1;
  const sphereGeo = new THREE.SphereGeometry(radius, 32, 32);
  const sphereMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
  scene.add(sphereMesh);

  const sphereDesc = RAPIER.RigidBodyDesc.dynamic()
  .setTranslation(0, 5, 30)        // z=30에서 시작
  .setLinvel(0, 0, -30)  // z- 방향으로 속도 설정
  .setCcdEnabled(true);            // 터널링 방지

  sphereBody = physicsWorld.createRigidBody(sphereDesc);
  const sphereCollider = RAPIER.ColliderDesc.ball(radius).setRestitution(0.5);
  physicsWorld.createCollider(sphereCollider, sphereBody);

  // Load wall
  const loader = new GLTFLoader();
    loader.load('./models/mapWall.glb', gltf => {
    const wall = gltf.scene;
    wall.scale.set(1, 1, 1);
    scene.add(wall);
    createBoxColliderFromModel(wall, physicsWorld); // 💡 이걸로 교체
    });


  animate();
}

// ➤ Trimesh 기반 collider 생성 함수
function createCollider(model, world) {
  model.traverse((child) => {
    if (child.isMesh) {
      const geometry = child.geometry;
      if (!geometry || !geometry.attributes.position) return;

      const vertices = geometry.attributes.position.array;
      const indices = geometry.index ? geometry.index.array : null;

      const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
      const rigidBody = world.createRigidBody(rigidBodyDesc);

      let colliderDesc = null;

      try {
        colliderDesc = RAPIER.ColliderDesc.convexHull(vertices);
        if (!colliderDesc) throw new Error("convexHull 실패");
      } catch (e) {
        console.warn("⚠️ convexHull 실패, → trimesh로 대체");
        if (indices) {
          colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices);
        } else {
          console.warn("❌ indices 없음 → collider 생성 실패");
          return;
        }
      }

      world.createCollider(colliderDesc, rigidBody);
    }
  });
}

function createBoxColliderFromModel(model, world) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  console.log("Box size:", size, "center:", center);

  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(center.x, center.y, center.z)
  );

  const collider = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);
  world.createCollider(collider, body);
}


function animate() {
  requestAnimationFrame(animate);
  physicsWorld.step();

  const pos = sphereBody.translation();
  const rot = sphereBody.rotation();
  sphereMesh.position.set(pos.x, pos.y, pos.z);
  sphereMesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);

  renderer.render(scene, camera);
}
