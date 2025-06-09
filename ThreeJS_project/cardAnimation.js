import TWEEN from 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.esm.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let isFrontVisible = false;
let currentRotationY = 0;
let cardStart = false; 

const imageMap = {
  '3x1_1x3': 'block_3x1.png',
  'T': 'block_T.png',
  '2x2': 'block_2x2.png',
  'K': 'block_K.png'
};


export let randomTargetBlock;

export function flipBlockImage(nextFrontImagePath, onComplete = () => {}) {
  const front = document.getElementById('card-front');
  const inner = document.getElementById('card-inner');
  const duration = 500;

  if (!isFrontVisible) {
    currentRotationY += 180;

    new TWEEN.Tween({ rotY: currentRotationY - 180 })
      .to({ rotY: currentRotationY }, duration)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(obj => {
        inner.style.transform = `rotateY(${obj.rotY}deg)`;
      })
      .onComplete(() => {
        front.src = nextFrontImagePath;
        isFrontVisible = true;
        onComplete();
      })
      .start();
  } else {
    currentRotationY += 360;

    new TWEEN.Tween({ rotY: currentRotationY - 360 })
      .to({ rotY: currentRotationY }, duration * 2)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(obj => {
        inner.style.transform = `rotateY(${obj.rotY}deg)`;
      })
      .onComplete(() => {
        front.src = nextFrontImagePath;
        isFrontVisible = true;
        onComplete();
      })
      .start();
  }
}

export function setTargetGUI() {
  const gui = new GUI();

  function chooseBlock() {
    let is_finished = false;
    const blockTypes = Object.keys(imageMap);
    randomTargetBlock = blockTypes[Math.floor(Math.random() * blockTypes.length)];
    console.log(`목표 블록: ${randomTargetBlock}`);

    const imageFile = imageMap[randomTargetBlock] ?? 'block_None.png';

    if (!cardStart) {
      flipBlockImage(`images/${imageFile}`);
      cardStart = true;
    } else {
      flipBlockImage('images/block_None.png', () => {
        flipBlockImage(`images/${imageFile}`);
      });
    }
  }

  gui.add({ chooseBlock }, 'chooseBlock').name('다음 타겟 블록');

  return {
    getTargetBlock: () => randomTargetBlock,
    isFinished: () => is_finished,
    setFinished: (value) => { is_finished = value; }
  };
}

export function setTarget() {
  const blockTypes = Object.keys(imageMap);
  randomTargetBlock = blockTypes[Math.floor(Math.random() * blockTypes.length)];
  console.log(`목표 블록: ${randomTargetBlock}`);

  const imageFile = imageMap[randomTargetBlock] ?? 'block_None.png';

  if (!cardStart) {
    flipBlockImage(`images/${imageFile}`);
    cardStart = true;
  } else {
    flipBlockImage('images/block_None.png', () => {
      flipBlockImage(`images/${imageFile}`);
    });
  }
}
