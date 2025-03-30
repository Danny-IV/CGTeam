import { resizeAspectRatio, setupText, updateText, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

// Global variables
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let isInitialized = false;  // main이 실행되는 순간 true로 change
let shader;
let vao;
let positionBuffer; // 2D position을 위한 VBO (Vertex Buffer Object)
let isDrawing = false; // mouse button을 누르고 있는 동안 true로 change
let startPoint = null;  // mouse button을 누른 위치
let tempEndPoint = null; // mouse를 움직이는 동안의 위치
let lines = []; // 그려진 선분들을 저장하는 array
let textOverlay; // Circle 정보 표시
let textOverlay2; // line segment 정보 표시
let textOverlay3; // intersection 정보 표시
let axes = new Axes(gl, 0.85); // x, y axes 그려주는 object (see util.js)
const numSegments = 100;
let radius;       // 원의 반지름 저장
let center = [];  // 원의 중심 좌표 저장
let intersection = [];  // 교점 좌표 저장 [x1, y1, x2, y2]

// lines의 구조 | lines[0] : 원 그리기용 점 좌표 | lines[1] : 선의 좌표
// intersection 구조 | 교점 2개 : [x1, y1, x2, y2] | 교점 1개 : [x1, y1] | 교점 0개 : []


document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) { // true인 경우는 main이 이미 실행되었다는 뜻이므로 다시 실행하지 않음
        console.log("Already initialized");
        return;
    }

    main().then(success => { // call main function
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }
        isInitialized = true;
    }).catch(error => {
        console.error('프로그램 실행 중 오류 발생:', error);
    });
});

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 700;
    canvas.height = 700;

    resizeAspectRatio(gl, canvas);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.2, 0.3, 1.0);

    return true;
}

function setupBuffers() {
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    shader.setAttribPointer('a_position', 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
}

function convertToWebGLCoordinates(x, y) {
    return [
        (x / canvas.width) * 2 - 1,  // x/canvas.width 는 0 ~ 1 사이의 값, 이것을 * 2 - 1 하면 -1 ~ 1 사이의 값
        -((y / canvas.height) * 2 - 1) // y canvas 좌표는 상하를 뒤집어 주어야 하므로 -1을 곱함
    ];
}

function setupMouseEvents() {
    function handleMouseDown(event) {
        event.preventDefault(); // 이미 존재할 수 있는 기본 동작을 방지
        event.stopPropagation(); // event가 상위 요소 (div, body, html 등)으로 전파되지 않도록 방지

        const rect = canvas.getBoundingClientRect(); // canvas를 나타내는 rect 객체를 반환
        const x = event.clientX - rect.left;  // canvas 내 x 좌표
        const y = event.clientY - rect.top;   // canvas 내 y 좌표

        if (!isDrawing && lines.length < 2) {
            // 1번 또는 2번 선분을 그리고 있는 도중이 아닌 경우 (즉, mouse down 상태가 아닌 경우)
            // 캔버스 좌표를 WebGL 좌표로 변환하여 선분의 시작점을 설정
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            startPoint = [glX, glY];
            isDrawing = true; // 이제 mouse button을 놓을 때까지 계속 true로 둠. 즉, mouse down 상태가 됨
        }
    }

    function handleMouseMove(event) {
        if (isDrawing) { // 1번 또는 2번 선분을 그리고 있는 도중인 경우
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            let [glX, glY] = convertToWebGLCoordinates(x, y);
            tempEndPoint = [glX, glY];
            render();
        }
    }

    function handleMouseUp() {
        if (isDrawing && tempEndPoint) {
            if (lines.length == 0) {
                lines.push(generateCircle());
                center.push(...startPoint);
            }
            else if (lines.length == 1) {
                lines.push([...startPoint, ...tempEndPoint]);
            }

            // circle, line segment의 정보 업데이트
            if (lines.length == 1) {
                updateText(textOverlay, "Circle: center(" + center[0].toFixed(2) + ", " + center[1].toFixed(2) +
                    ") radius = " + radius.toFixed(2));
            }
            else { // lines.length == 2
                updateText(textOverlay2, "Second line segment: (" + lines[1][0].toFixed(2) + ", " + lines[1][1].toFixed(2) +
                    ") ~ (" + lines[1][2].toFixed(2) + ", " + lines[1][3].toFixed(2) + ")");
                updateIntersection();
            }

            isDrawing = false;
            startPoint = null;
            tempEndPoint = null;
            render();
        }
    }

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
}

function generateCircle() {
    let cirlce_line = [];

    radius = Math.sqrt(Math.pow(startPoint[0] - tempEndPoint[0], 2) + Math.pow(startPoint[1] - tempEndPoint[1], 2));
    for (let i = 0; i < numSegments; i++) {
        let angle = (i / numSegments) * 2 * Math.PI;
        // console.log(startPoint[0] + radius * Math.cos(angle), startPoint[1] + radius * Math.sin(angle));
        cirlce_line.push(startPoint[0] + radius * Math.cos(angle), startPoint[1] + radius * Math.sin(angle));
    }
    return cirlce_line;
}

function updateIntersection() {
    let a = lines[1][2] - lines[1][0];
    let b = lines[1][0]; 
    let c = lines[1][3] - lines[1][1]; 
    let d = lines[1][1];

    let A = Math.pow(a, 2) + Math.pow(c, 2);
    let B = 2 * ( a*b - a*center[0] + c*d - c*center[1] );
    let C = Math.pow(b, 2) + Math.pow(d, 2) + Math.pow(center[0], 2) + Math.pow(center[1], 2) - Math.pow(radius, 2) - 2 * ( b*center[0] + d*center[1] );
    let D = Math.pow(B, 2) - 4*A*C; 

    let x;
    let y;

    if (D >= 0) {
        let sqrtD = Math.sqrt(D);
        let t1 = (-B + sqrtD) / (2*A);
        let t2 = (-B - sqrtD) / (2*A);
        console.log("t1: " + t1.toFixed(2) + " | t2:" + t2.toFixed(2))
        console.log(D == 0)
        console.log((0 <= t1 && t1 <= 1) || (0 <= t2 && t2 <= 1))

        if (D > 0 && (0 <= t1 && t1 <= 1) && (0 <= t2 && t2 <= 1)) {
            let x1 = b + t1 * a;
            let y1 = d + t1 * c;
            let x2 = b + t2 * a;
            let y2 = d + t2 * c;

            intersection = [x1, y1, x2, y2];
            updateText(
                textOverlay3,
                `Intersection Points: 2 | Point 1: (${x1.toFixed(2)}, ${y1.toFixed(2)}) | Point 2: (${x2.toFixed(2)}, ${y2.toFixed(2)})`
            );
        } else if (D == 0 || ((0 <= t1 && t1 <= 1) || (0 <= t2 && t2 <= 1))) { 
            if (0 <= t1 && t1 <= 1){
                x = b + t1 * a;
                y = d + t1 * c;
            }else{
                x = b + t2 * a;
                y = d + t2 * c;
            }
            intersection = [x, y];

            updateText(
                textOverlay3,
                `Intersection Points: 1 | Point 1: (${x.toFixed(2)}, ${y.toFixed(2)})`
            );
        } else {
            updateText(textOverlay3, "No intersection");

        }
    } else {
        updateText(textOverlay3, "No intersection");
    }
    
}



function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    shader.use();

    // 저장된 선들 그리기
    let num = 0;
    for (let line of lines) {
        if (num == 0) { // 첫 번째 선분인 경우, yellow
            shader.setVec4("u_color", [1.0, 0.0, 1.0, 1.0]);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(line), gl.STATIC_DRAW);
            gl.bindVertexArray(vao);
            gl.drawArrays(gl.LINE_LOOP, 0, numSegments);
        }
        else { // num == 1 (2번째 선분인 경우), red
            shader.setVec4("u_color", [0.0, 0.5, 0.5, 1.0]);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(line), gl.STATIC_DRAW);
            gl.bindVertexArray(vao);
            gl.drawArrays(gl.LINES, 0, 2);
        }
        num++;
    }

    // 임시 선 그리기
    if (isDrawing && startPoint && tempEndPoint) {
        shader.setVec4("u_color", [0.5, 0.5, 0.5, 1.0]);
        if (lines.length == 0) {
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(generateCircle()), gl.STATIC_DRAW);
            gl.bindVertexArray(vao);
            gl.drawArrays(gl.LINE_LOOP, 0, numSegments);
        }
        else if (lines.length == 1) {
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...startPoint, ...tempEndPoint]), gl.STATIC_DRAW);
            gl.bindVertexArray(vao);
            gl.drawArrays(gl.LINES, 0, 2);
        }
    }

    // 교차점 그리기
    if (intersection.length > 0) {
        shader.setVec4("u_color", [1.0, 1.0, 0.0, 1.0]); 
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(intersection), gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        const numPoints = intersection.length / 2;
        gl.drawArrays(gl.POINTS, 0, numPoints);
    }
    

    // axes 그리기
    axes.draw(mat4.create(), mat4.create()); // 두 개의 identity matrix를 parameter로 전달
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
            return false;
        }

        // 셰이더 초기화
        await initShader();

        // 나머지 초기화
        setupBuffers();
        shader.use();

        // 텍스트 초기화
        textOverlay = setupText(canvas, "", 1);
        textOverlay2 = setupText(canvas, "", 2);
        textOverlay3 = setupText(canvas, "", 3);

        // 마우스 이벤트 설정
        setupMouseEvents();

        // 초기 렌더링
        render();

        return true;

    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}