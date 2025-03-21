import { resizeAspectRatio, setupText } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let vao;
let colorTag = "red";
let Move = [0.00,0.00];
let textOverlay1; // for text output third line (see util.js)

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
        if (event.key == 'ArrowUp') {
            if(Move[1]+0.1 < 1.0){
                Move[1] += 0.01;
            }
        }
        else if (event.key == 'ArrowDown') {
            if(Move[1]-0.1 > -1.0){
                Move[1] -= 0.01;
            }
        }
        else if (event.key == 'ArrowLeft') {
            if(Move[0]-0.1 > -1.0){
                Move[0] -= 0.01;
            }
        }
        else if (event.key == 'ArrowRight') {
           if(Move[0]+0.1 < 1.0){
                Move[0] += 0.01;
            }
        }
    });       // NDC기준 [-1,1]이므로 그 사이에서만 move가 작동
}

function setupBuffers(shader) {
    const vertices = new Float32Array([
         0.1, -0.1, 0.0,  // 정점 v0
        -0.1, -0.1, 0.0,  // v1
        -0.1,  0.1, 0.0,  // v2
         0.1,  0.1, 0.0   // v3       정점을 중심으로 triangle fan을 그림
    ]);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    shader.setAttribPointer('aPos', 3, gl.FLOAT, false, 0, 0);

    return vao;
}

function render(vao, shader) {
    gl.clear(gl.COLOR_BUFFER_BIT);

    let color;
    if (colorTag == "red") {
        color = [1.0, 0.0, 0.0, 1.0];
    }
    else if (colorTag == "green") {
        color = [0.0, 1.0, 0.0, 1.0];
    }
    else if (colorTag == "blue") {
        color = [0.0, 0.0, 1.0, 1.0];
    }

    shader.setVec4("uColor", color);
    shader.setVec2("move", Move);

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    requestAnimationFrame(() => render(vao, shader));
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
        textOverlay1 = setupText(canvas, "Use arrow keys to move the rectangle", 1); // 텍스트 바꿈
        

        // 키보드 이벤트 설정
        setupKeyboardEvents();
        
        // 나머지 초기화
        vao = setupBuffers(shader);
        shader.use();
        
        // 렌더링 시작
        render(vao, shader);
        

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
