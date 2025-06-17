import * as THREE from 'three';
import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';

// 변수 정리
let isCharging = false;
let power = 0;
let powerDirection = 1; // 1: 증가, -1: 감소
let powerInterval = null;
const powerMin = 5;  // 최소 위력
const powerMax = 20; // 최대 위력
const powerSpeed = 30; // 게이지 속도 (높을수록 빠름, ms)


// 공중에 고정된 공 생성
export function createFixedSphere(scene, world, spheres, radius = 1, position = new THREE.Vector3(0, 5, 0)) {
    const sphereGeometry = new THREE.SphereGeometry(radius);
    const textureLoader = new THREE.TextureLoader();
    const textureFiles = [
        '2k_earth_daymap.jpg',
        '2k_jupiter.jpg',
        '2k_mars.jpg',
        '2k_mercury.jpg',
        '2k_neptune.jpg',
        '2k_saturn.jpg',
        '2k_uranus.jpg',
        '2k_venus_surface.jpg'
    ];
    const texture = textureLoader.load(`./images/${textureFiles[Math.floor(Math.random() * textureFiles.length)]}`);
    const sphereMaterial = new THREE.MeshPhongMaterial({ map: texture });

    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphereMesh.position.copy(position);
    scene.add(sphereMesh);

    // fixed body 생성
    const sphereBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);
    const sphereBody = world.createRigidBody(sphereBodyDesc);

    const sphereColliderDesc = RAPIER.ColliderDesc.ball(radius)
        .setRestitution(0.6)
        .setFriction(0.3);
    world.createCollider(sphereColliderDesc, sphereBody);

    // for collision check
    const sphere = new THREE.Sphere(position, radius);

    // 구의 mesh, body, checkSphere, 그리고 상태를 같이 저장
    spheres.push({ mesh: sphereMesh, body: sphereBody, checkSphere: sphere, isFixed: true });
    console.log("새 공 생성됨: ", position);

}

export function onShootBall(event) {
    if (spheres.length === 0) return;
    let obj = spheres[0];
    if (!obj.isFixed) return; // 이미 움직이는 공이면 무시

    // 1. 마우스 좌표 -1~+1 변환
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // 2. 레이캐스터로 구 mesh 클릭 체크
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(obj.mesh);
    if (intersects.length > 0) {
        // 3. 기존 fixed body 제거
        physicsWorld.removeRigidBody(obj.body);

        // 4. 새로운 dynamic body 생성
        const pos = obj.mesh.position;
        const sphereBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z);
        const sphereBody = physicsWorld.createRigidBody(sphereBodyDesc);
        const sphereColliderDesc = RAPIER.ColliderDesc.ball(1).setRestitution(0.8).setFriction(0.3);
        physicsWorld.createCollider(sphereColliderDesc, sphereBody);

        // 5. 방향 및 힘 계산
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        dir.normalize();
        const force = 10;
        // y 방향에 살짝 보정치
        const impulse = { x: dir.x * force, y: dir.y * force + 2, z: dir.z * force };
        sphereBody.applyImpulse(impulse, true);

        // 6. 기존 객체에 새 body 연결, isFixed → false
        obj.body = sphereBody;
        obj.isFixed = false;
    }
}

export function onPowerStart(event, spheres) {
    // 항상 현재 "fixed" 상태인 공을 찾음
    let obj = spheres.find(obj => obj.isFixed);
    if (!obj) return;

    isCharging = true;
    power = powerMin;
    powerDirection = 1;
    updatePowerBar(power);

    powerInterval = setInterval(() => {
        if (!isCharging) return;
        if (power >= powerMax) powerDirection = -1;
        if (power <= powerMin) powerDirection = 1;
        power += powerDirection * 0.3;
        updatePowerBar(power);
    }, powerSpeed);
}


export function updatePowerBar(value) {
    // 게이지바 표시
    const percent = ((value - powerMin) / (powerMax - powerMin)) * 100;
    document.getElementById('power-bar').style.width = `${percent}%`;
}

export function onPowerRelease(event, spheres, camera, physicsWorld, setLastShotBall) {
    if (!isCharging) return;
    isCharging = false;
    clearInterval(powerInterval);

    let obj = spheres.find(obj => obj.isFixed);
    if (!obj) return;

    // 마우스 좌표
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // 1. 화면 클릭 → 3D world로 ray를 쏨
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(obj.mesh);
    if (intersects.length > 0) {
        physicsWorld.removeRigidBody(obj.body);

        const pos = obj.mesh.position;

        // ★ 클릭한 위치(화면)에서 구 중심까지의 방향 벡터로 힘을 가한다!
        const clickPoint = intersects[0].point;
        const direction = new THREE.Vector3()
            .subVectors(pos, clickPoint)
            .normalize();

        // power의 스케일을 좀 키우고 싶으면 *2~*3 해도 됨
        const impulseStrength = power * 2.5; // 나중에 맵과 정지된 공간에 거리가 멀때 조정

        // direction이 정 가운데에서만 나오면 위로 잘 안 뜨므로,
        // 약간의 "위쪽 보정값" 추가
        direction.y += 0.4; // 또는 0.5~1.0 정도로 조절해봐도 됨
        direction.normalize();

        // impulse 적용
        const impulse = {
            x: direction.x * impulseStrength,
            y: direction.y * impulseStrength,
            z: direction.z * impulseStrength
        };

        const sphereBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z);
        const sphereBody = physicsWorld.createRigidBody(sphereBodyDesc);
        const sphereColliderDesc = RAPIER.ColliderDesc.ball(1).setRestitution(0.8).setFriction(0.3);
        physicsWorld.createCollider(sphereColliderDesc, sphereBody);

        sphereBody.applyImpulse(impulse, true);

        obj.body = sphereBody;
        obj.isFixed = false;

        // ★ 발사된 공을 외부에서 추적할 수 있도록 콜백
        if (typeof setLastShotBall === 'function') setLastShotBall(obj);
    }

    // 게이지바 숨기기
    document.getElementById('power-bar').style.width = '0%';
}

// 기존대로 export
export function isBallStopped(obj, threshold = 0.05) {
    if (!obj || !obj.body) return false;
    if (obj.isFixed) return false; // ★ 고정된 공은 멈춘 걸로 취급하지 않는다
    const v = obj.body.linvel();
    const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    return speed < threshold;
}
