import { resizeAspectRatio, setupText, updateText } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let vao;
let displacement = [0.0, 0.0];
let keys = [];
const speed = 0.01;

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 600;
    canvas.height = 600;

    resizeAspectRatio(gl, canvas);

    // Initialize WebGL settings
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.2, 0.3, 1.0);

    return true;
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    return new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

function setupKeyboardEvents() {
    document.addEventListener('keydown', (event) => {
        if (event.key == 'ArrowUp' || event.key == 'ArrowDown' || event.key == 'ArrowLeft' || event.key == 'ArrowRight') {
            // Add event.key to keys (without reptition)
            if (!keys.includes(event.key)) keys.push(event.key);
            // console.log(keys);
        }
    });
    document.addEventListener('keyup', (event) => {
        if (event.key == 'ArrowUp' || event.key == 'ArrowDown' || event.key == 'ArrowLeft' || event.key == 'ArrowRight') {
            // Delete key
            for (let i = 0; i < keys.length; i++) {
                if (keys[i] == event.key) keys.splice(i, 1);
            }
            // console.log(keys);
        }
    });
}

function setupBuffers(shader) {
    const vertices = new Float32Array([
        -0.1, -0.1, 0.0,
        0.1, -0.1, 0.0,
        0.1, 0.1, 0.0,
        -0.1, 0.1, 0.0
    ]);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    shader.setAttribPointer('aPos', 3, gl.FLOAT, false, 0, 0);

    return vao;
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    // move
    if (keys.length > 0) {
        if (keys[keys.length - 1] == 'ArrowUp') displacement[1] += speed;
        else if (keys[keys.length - 1] == 'ArrowDown') displacement[1] -= speed;
        else if (keys[keys.length - 1] == 'ArrowLeft') displacement[0] -= speed;
        else if (keys[keys.length - 1] == 'ArrowRight') displacement[0] += speed;
    }

    // constrain
    if (displacement[0] > 0.9) {
        displacement[0] = 0.9;
    }
    else if (displacement[0] < -0.9) {
        displacement[0] = -0.9;
    }
    if (displacement[1] > 0.9) {
        displacement[1] = 0.9;
    }
    else if (displacement[1] < -0.9) {
        displacement[1] = -0.9
    }

    // set
    shader.setVec2("movement", displacement);

    requestAnimationFrame(() => render());
}

async function main() {
    try {

        // WebGL 초기화
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }

        // 셰이더 초기화
        shader = await initShader();

        // setup text overlay (see util.js)
        setupText(canvas, "Use arrow keys to move the rectangle", 1);

        // 키보드 이벤트 설정
        setupKeyboardEvents();

        // 나머지 초기화
        vao = setupBuffers(shader);
        shader.use();

        // 렌더링 시작
        render();

        return true;

    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}

// call main function
main().then(success => {
    if (!success) {
        console.log('프로그램을 종료합니다.');
        return;
    }
}).catch(error => {
    console.error('프로그램 실행 중 오류 발생:', error);
});
