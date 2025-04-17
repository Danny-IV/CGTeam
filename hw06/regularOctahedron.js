/*
length = 1
v0) 0, length*Math.sqrt(2)/4, 0,
v1) length/2, 0, length/2,
v2) length/2, 0, -length/2,
v3) -length/2, 0, -length/2,
v4) -length/2, 0, length/2,
v5) 0, -length*Math.sqrt(2)/4, 0,
*/

export class RegularOctahedron {
    constructor(gl, options = {}) {
        this.gl = gl;

        // Creating VAO and buffers
        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();
        this.ebo = gl.createBuffer();

        const L = 1;
        const H = L * Math.sqrt(2) / 2;

        // Initializing data
        this.vertices = new Float32Array([
            // v0, v1, v2
            0, H, 0, L / 2, 0, L / 2, L / 2, 0, -L / 2,
            // v0, v2, v3
            0, H, 0, L / 2, 0, -L / 2, -L / 2, 0, -L / 2,
            // v0, v3, v4
            0, H, 0, -L / 2, 0, -L / 2, -L / 2, 0, L / 2,
            // v0, v4, v1
            0, H, 0, -L / 2, 0, L / 2, L / 2, 0, L / 2,
            // v5, v2, v1
            0, -H, 0, L / 2, 0, -L / 2, L / 2, 0, L / 2,
            // v5, v3, v2
            0, -H, 0, -L / 2, 0, -L / 2, L / 2, 0, -L / 2,
            // v5, v4, v3
            0, -H, 0, -L / 2, 0, L / 2, -L / 2, 0, -L / 2,
            // v5, v1, v4
            0, -H, 0, L / 2, 0, L / 2, -L / 2, 0, L / 2,
        ]);

        this.normals = new Float32Array([
            // front face (v0,v1,v2,v3)
            0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
            // right face (v0,v3,v4,v5)
            1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
            // top face (v0,v5,v6,v1)
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
            // left face (v1,v6,v7,v2)
            -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
            // bottom face (v7,v4,v3,v2)
            0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
            // back face (v4,v7,v6,v5)
            0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1
        ]);

        // if color is provided, set all vertices' color to the given color
        if (options.color) {
            for (let i = 0; i < 24 * 4; i += 4) {
                this.colors[i] = options.color[0];
                this.colors[i + 1] = options.color[1];
                this.colors[i + 2] = options.color[2];
                this.colors[i + 3] = options.color[3];
            }
        }
        else {
            this.colors = new Float32Array([
                // front face (v0,v1,v2,v3) - red
                1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1,
                // right face (v0,v3,v4,v5) - yellow
                1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1,
                // top face (v0,v5,v6,v1) - green
                0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1,
                // left face (v1,v6,v7,v2) - cyan
                0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1,
                // bottom face (v7,v4,v3,v2) - blue
                0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1,
                // back face (v4,v7,v6,v5) - magenta
                1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1
            ]);
        }
        // texture
        // v0) 0.5, 1,
        // v1) 0, 0.5,
        // v2) 0.25, 0.5,
        // v3) 0.5, 0.5,
        // v4) 0.75, 0.5,
        // v5) 0.5, 0,
        this.texCoords = new Float32Array([
            // v0, v1, v2
            0.5, 1, 0, 0.5, 0.25, 0.5,
            // v0, v2, v3
            0.5, 1, 0.25, 0.5, 0.5, 0.5,
            // v0, v3, v4
            0.5, 1, 0.5, 0.5, 0.75, 0.5,
            // v0, v4, v1
            0.5, 1, 0.75, 0.5, 1, 0.5,

            // v5, v2, v1
            0.5, 0, 0.25, 0.5, 0, 0.5,
            // v5, v3, v2
            0.5, 0, 0.5, 0.5, 0.25, 0.5,
            // v5, v4, v3
            0.5, 0, 0.75, 0.5, 0.5, 0.5,
            // v5, v1, v4
            0.5, 0, 1, 0.5, 0.75, 0.5
        ]);

        this.sameVertices = new Uint16Array([
            0, 4, 8,    // indices of the same vertices as v0
            1, 11, 12,  // indices of the same vertices as v1
            2, 15, 19,  // indices of the same vertices as v2
            3, 5, 18,   // indices of the same vertices as v3
            6, 17, 20,  // indices of the same vertices as v4
            7, 9, 23,   // indices of the same vertices as v5
            10, 13, 22, // indices of the same vertices as v6
            14, 16, 21  // indices of the same vertices as v7
        ]);

        this.vertexNormals = new Float32Array(72);
        this.faceNormals = new Float32Array(72);
        this.faceNormals.set(this.normals);

        // compute vertex normals 
        for (let i = 0; i < 24; i += 3) {

            let vn_x = (this.normals[this.sameVertices[i] * 3] +
                this.normals[this.sameVertices[i + 1] * 3] +
                this.normals[this.sameVertices[i + 2] * 3]) / 3;
            let vn_y = (this.normals[this.sameVertices[i] * 3 + 1] +
                this.normals[this.sameVertices[i + 1] * 3 + 1] +
                this.normals[this.sameVertices[i + 2] * 3 + 1]) / 3;
            let vn_z = (this.normals[this.sameVertices[i] * 3 + 2] +
                this.normals[this.sameVertices[i + 1] * 3 + 2] +
                this.normals[this.sameVertices[i + 2] * 3 + 2]) / 3;

            this.vertexNormals[this.sameVertices[i] * 3] = vn_x;
            this.vertexNormals[this.sameVertices[i + 1] * 3] = vn_x;
            this.vertexNormals[this.sameVertices[i + 2] * 3] = vn_x;
            this.vertexNormals[this.sameVertices[i] * 3 + 1] = vn_y;
            this.vertexNormals[this.sameVertices[i + 1] * 3 + 1] = vn_y;
            this.vertexNormals[this.sameVertices[i + 2] * 3 + 1] = vn_y;
            this.vertexNormals[this.sameVertices[i] * 3 + 2] = vn_z;
            this.vertexNormals[this.sameVertices[i + 1] * 3 + 2] = vn_z;
            this.vertexNormals[this.sameVertices[i + 2] * 3 + 2] = vn_z;
        }

        this.initBuffers();
    }

    copyVertexNormalsToNormals() {
        this.normals.set(this.vertexNormals);
    }

    copyFaceNormalsToNormals() {
        this.normals.set(this.faceNormals);
    }

    initBuffers() {
        const gl = this.gl;

        // 버퍼 크기 계산
        const vSize = this.vertices.byteLength;
        const nSize = this.normals.byteLength;
        const cSize = this.colors.byteLength;
        const tSize = this.texCoords.byteLength;
        const totalSize = vSize + nSize + cSize + tSize;

        gl.bindVertexArray(this.vao);

        // VBO에 데이터 복사
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, totalSize, gl.STATIC_DRAW);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize, this.colors);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize + cSize, this.texCoords);

        // vertex attributes 설정
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);  // position
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, vSize);  // normal
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, vSize + nSize);  // color
        gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, vSize + nSize + cSize);  // texCoord

        // vertex attributes 활성화
        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);
        gl.enableVertexAttribArray(3);

        // 버퍼 바인딩 해제
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }

    updateNormals() {
        const gl = this.gl;
        const vSize = this.vertices.byteLength;

        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        // normals 데이터만 업데이트
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }

    draw(shader) {
        const gl = this.gl;
        shader.use();
        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.TRIANGLES, 0, 24);
        gl.bindVertexArray(null);
    }

    delete() {
        const gl = this.gl;
        gl.deleteBuffer(this.vbo);
        gl.deleteVertexArray(this.vao);
    }
} 