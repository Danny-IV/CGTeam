import * as THREE from 'three';
import * as util from './util.js';

const scene = new THREE.Scene();

const stats = util.initStats();
const renderer = util.initRenderer();
const camera = util.initCamera();
scene.add(camera);

util.initDefaultDirectionalLighting(scene);

util.addGroundPlane(scene);
util.addDefaultCubeAndSphere(scene);

// add controls
const orbitControls = util.initOrbitControls(camera, renderer);

// call the render function
render();

function render() {
  stats.update();
  orbitControls.update();
  requestAnimationFrame(render);
  renderer.render(scene, camera);
}