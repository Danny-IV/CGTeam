import { resizeAspectRatio, setupText } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader = null;
let vao = null;
let keyPressed;
let vertexBuffer;
let squarePosition = { x: 0.0, y: 0.0 };

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 600;
    canvas.height = 600;

    resizeAspectRatio(gl, canvas);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
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
            keyPressed = "up";
        }
        else if (event.key == 'ArrowDown') {
            keyPressed = "down";
        }
        else if (event.key == 'ArrowLeft') {
            keyPressed = "left";
        }
        else if (event.key == 'ArrowRight') {
            keyPressed = "right";
        }
    });

    document.addEventListener('keyup', (event) => {
        if (event.key == 'ArrowUp' || event.key == 'ArrowDown' || event.key == 'ArrowLeft' || event.key == 'ArrowRight') {
            keyPressed = null;
        }
    });
}
    
function setupBuffers(shader) {
    const vertices = new Float32Array([
        squarePosition.x - 0.1, squarePosition.y - 0.1, 0.0,  // Bottom left
        squarePosition.x + 0.1, squarePosition.y - 0.1, 0.0,  // Bottom right
        squarePosition.x + 0.1, squarePosition.y + 0.1, 0.0,  // Top center
        squarePosition.x - 0.1, squarePosition.y + 0.1, 0.0   // Top right
    ]);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const position = gl.getAttribLocation(shader.program, "aPos");
    if (position === -1) {
        console.error("Attribute 'aPos' not found in shader program.");
        return;
    }

    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(position);
    
    return vao;
}

function render(vao, shader) {
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Move square position based on the key pressed
    if (keyPressed == "up" && squarePosition.y < 0.8 ) {
        squarePosition.y += 0.1;
    } else if (keyPressed == "down" && squarePosition.y > -0.8 ) {
        squarePosition.y -= 0.1;
    } else if (keyPressed == "left" && squarePosition.x > -0.8 ) {
        squarePosition.x -= 0.1;
    } else if (keyPressed == "right" && squarePosition.x < 0.8 ) {
        squarePosition.x += 0.1;
    }

    // Define updatedVertices based on the new position of the square
    const updatedVertices = new Float32Array([
        squarePosition.x - 0.1, squarePosition.y - 0.1, 0.0,  // Bottom left
        squarePosition.x + 0.1, squarePosition.y - 0.1, 0.0,  // Bottom right
        squarePosition.x + 0.1, squarePosition.y + 0.1, 0.0,  // Top right
        squarePosition.x - 0.1, squarePosition.y + 0.1, 0.0   // Top left
    ]);

    // Update the vertex buffer with the new positions
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, updatedVertices);

    // Draw the updated square
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    // Reset the keyPressed variable
    keyPressed = null;

    // Request next animation frame
    requestAnimationFrame(() => render(vao, shader));
}



async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }
        shader = await initShader();

        setupText(canvas, "Use arrow keys to move the rectangle", 1);
        setupKeyboardEvents();
        vao = setupBuffers(shader);
        shader.use();
        render(vao, shader);

        return true;

    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}

main().then(success => {
    if (!success) {
        console.log('프로그램을 종료합니다.');
        return;
    }
}).catch(error => {
    console.error('프로그램 실행 중 오류 발생:', error);
});


main();