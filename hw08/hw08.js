import { resizeAspectRatio, setupText, updateText, Axes } from '../util/util.js';
import { Shader, readShaderFile }      from '../util/shader.js';
import { Arcball }                     from '../util/arcball.js';
import { Cylinder }                    from '../util/cylinder.js';
import { loadTexture }                 from '../util/texture.js';

const canvas = document.getElementById('glCanvas');
const gl     = canvas.getContext('webgl2');

let shader,
    textOverlay2,
    textOverlay3,
    isInitialized = false;

let viewMatrix  = mat4.create(),
    projMatrix  = mat4.create(),
    modelMatrix = mat4.create();

let arcBallMode = 'CAMERA',
    toonLevels  = 3;

const cylinder       = new Cylinder(gl, 32);
const axes           = new Axes(gl, 1.5);
const texture        = loadTexture(gl, true, '../images/textures/sunrise.jpg');

const cameraPos      = vec3.fromValues(0, 0, 3);
const lightDirection = vec3.fromValues(1.0, 0.25, 0.5);
const shininess      = 32.0;

const arcball = new Arcball(canvas, 5.0, { rotation: 2.0, zoom: 0.0005 });

document.addEventListener('DOMContentLoaded', () => {
  if (isInitialized) return;
  main().then(ok => { if (ok) isInitialized = true; });
});

async function initShader() {
  const vs = await readShaderFile('shVert.glsl');
  const fs = await readShaderFile('shFrag.glsl');
  shader = new Shader(gl, vs, fs);

  shader.use();
  // ─── 한 번만 세팅해도 되는 static uniform ────────────────────
  shader.setMat4 ("u_projection",     projMatrix);
  shader.setInt  ("u_diffuse",        0);                // TEXTURE0 바인딩
  shader.setVec3 ("materialSpec",     [0.8, 0.8, 0.8]);
  shader.setFloat("materialShininess", shininess);

  shader.setVec3 ("lightDirection", lightDirection);
  shader.setVec3 ("lightAmbient",   [0.2, 0.2, 0.2]);
  shader.setVec3 ("lightDiffuse",   [0.7, 0.7, 0.7]);
  shader.setVec3 ("lightSpecular",  [1.0, 1.0, 1.0]);

  shader.setVec3 ("u_viewPos", cameraPos);
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  // ArcBall 모드에 따라 view/model 행렬 설정
  if (arcBallMode === 'CAMERA') {
    viewMatrix = arcball.getViewMatrix();
  } else {
    modelMatrix = arcball.getModelRotMatrix();
    viewMatrix  = arcball.getViewCamDistanceMatrix();
  }

  // 텍스처 유닛 0에 바인딩
  gl.activeTexture (gl.TEXTURE0);
  gl.bindTexture   (gl.TEXTURE_2D, texture);

  shader.use();
  // ─── 매 프레임마다 바뀌는 uniform ────────────────────────────
  shader.setInt  ("toonLevels", toonLevels);
  shader.setMat4 ("u_model",    modelMatrix);
  shader.setMat4 ("u_view",     viewMatrix);

  // 그리기
  cylinder.draw(shader);
  axes.draw(viewMatrix, projMatrix);

  requestAnimationFrame(render);
}

async function main() {
  if (!gl) throw new Error("WebGL2 not supported");
  // 캔버스 & 뷰포트 설정
  canvas.width  = 700;
  canvas.height = 700;
  resizeAspectRatio(gl, canvas);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.1, 0.1, 0.1, 1.0);

  // 카메라 & 투영행렬
  mat4.lookAt   (viewMatrix, cameraPos, [0,0,0], [0,1,0]);
  mat4.perspective(projMatrix, glMatrix.toRadian(60),
                  canvas.width/canvas.height, 0.1, 100.0);

  await initShader();

  // 텍스트 오버레이
  setupText(canvas, "TOON SHADING",                       1);
  textOverlay2 = setupText(canvas, "arcball mode: " + arcBallMode, 2);
  textOverlay3 = setupText(canvas, "toon levels: "  + toonLevels,   3);
  setupText(canvas, "press a/r to change/reset arcball mode",       4);
  setupText(canvas, "press 1–5 to change toon shading levels",      5);

  // 키보드 이벤트
  document.addEventListener('keydown', e => {
    if (e.key === 'a' || e.key === 'r') {
      // ‘a’, ‘r’ 토글/리셋 처리 (기존 코드 재사용)
    }
    if (e.key >= '1' && e.key <= '5') {
      toonLevels = +e.key;
      updateText(textOverlay3, "toon levels: " + toonLevels);
    }
  });

  requestAnimationFrame(render);
  return true;
}
