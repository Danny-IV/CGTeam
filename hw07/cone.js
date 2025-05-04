export class Cone {
    /**
     * @param {WebGLRenderingContext} gl         - WebGL 렌더링 컨텍스트
     * @param {number} segments                  - 옆면 세그먼트 수 (기본 32)
     * @param {object} options
     *        options.color : [r, g, b, a] 형태의 색상 (기본 [0.8, 0.8, 0.8, 1.0])
     */
    constructor(gl, segments = 32, options = {}) {
        this.gl = gl;
        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();
        this.ebo = gl.createBuffer();

        const radius = 0.5;     // 밑면 반지름
        const height = 1.0;     // 높이
        const baseY = -0.5;     // 밑면 y좌표
        const apexY = baseY + height; // 꼭대기 y좌표
        this.segments = segments;
        const angleStep = (2 * Math.PI) / segments;

        const positions = [];
        const normals   = [];
        const colors    = [];
        const texCoords = [];
        const indices   = [];

        const defaultColor = [0.8, 0.8, 0.8, 1.0];
        const colorOption = options.color || defaultColor;

        // 옆면만: apex → rim0 → rim1 으로 삼각형 생성
        for (let i = 0; i < segments; i++) {
            const angle0 = i * angleStep;
            const angle1 = (i + 1) * angleStep;

            // 밑면 원주 위 두 점
            const x0 = radius * Math.cos(angle0);
            const z0 = radius * Math.sin(angle0);
            const x1 = radius * Math.cos(angle1);
            const z1 = radius * Math.sin(angle1);

            // 위치
            positions.push(
                // apex
                0.0, apexY, 0.0,
                // rim0
                x0, baseY, z0,
                // rim1
                x1, baseY, z1
            );

            // flat-shading face normal (slope 반영)
            const midAngle = angle0 + angleStep * 0.5;
            const slope = radius / height;
            const nx0 = Math.cos(midAngle), nz0 = Math.sin(midAngle), ny0 = slope;
            const nlen = Math.hypot(nx0, ny0, nz0);
            const nx = nx0 / nlen, ny = ny0 / nlen, nz = nz0 / nlen;
            for (let k = 0; k < 3; k++) {
                normals.push(nx, ny, nz);
            }

            // 색상
            for (let k = 0; k < 3; k++) {
                colors.push(...colorOption);
            }

            // 텍스처 좌표
            const u0 = i / segments;
            const u1 = (i + 1) / segments;
            const ua = (i + 0.5) / segments;
            texCoords.push(
                ua, 1.0,
                u0, 0.0,
                u1, 0.0
            );

            // 인덱스
            const base = i * 3;
            indices.push(base, base + 1, base + 2);
        }

        // TypedArray 변환
        this.vertices  = new Float32Array(positions);
        this.normals   = new Float32Array(normals);
        this.colors    = new Float32Array(colors);
        this.texCoords = new Float32Array(texCoords);
        this.indices   = new Uint16Array(indices);

        // 스무스/플랫 토글용 백업
        this.faceNormals   = this.normals.slice();
        this.vertexNormals = this.normals.slice();
        this.computeVertexNormals();

        this.initBuffers();
    }

    /** 스무스 셰이딩용 정점별 노말 계산 */
    computeVertexNormals() {
        const vCount = this.vertices.length / 3;
        this.vertexNormals = new Float32Array(this.vertices.length);
        const radius = 0.5, height = 1.0, slope = radius / height;

        for (let i = 0; i < vCount; i++) {
            const x = this.vertices[i*3], y = this.vertices[i*3+1], z = this.vertices[i*3+2];
            let nx, ny, nz;

            // apex
            if (Math.abs(y - 0.5) < 1e-6) {
                nx = 0; ny = 1; nz = 0;
            } else {
                const θ = Math.atan2(z, x);
                const cx = Math.cos(θ), cz = Math.sin(θ);
                const len = Math.hypot(cx, slope, cz);
                nx = cx / len; ny = slope / len; nz = cz / len;
            }

            this.vertexNormals.set([nx, ny, nz], i*3);
        }
    }

    copyFaceNormalsToNormals() {
        this.normals = this.faceNormals.slice();
    }

    copyVertexNormalsToNormals() {
        this.normals = this.vertexNormals.slice();
    }

    initBuffers() {
        const gl = this.gl;
        const vSize = this.vertices.byteLength;
        const nSize = this.normals.byteLength;
        const cSize = this.colors.byteLength;
        const tSize = this.texCoords.byteLength;
        const total = vSize + nSize + cSize + tSize;

        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, total, gl.STATIC_DRAW);

        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize, this.colors);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize + cSize, this.texCoords);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0,            0);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, vSize);
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, vSize+nSize);
        gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, vSize+nSize+cSize);

        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);
        gl.enableVertexAttribArray(3);

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    updateNormals() {
        this.gl.bindVertexArray(this.vao);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);
        const offset = this.vertices.byteLength;
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, offset, this.normals);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindVertexArray(null);
    }

    draw(shader) {
        shader.use();
        this.gl.bindVertexArray(this.vao);
        this.gl.drawElements(this.gl.TRIANGLES, this.indices.length, this.gl.UNSIGNED_SHORT, 0);
        this.gl.bindVertexArray(null);
    }

    delete() {
        this.gl.deleteBuffer(this.vbo);
        this.gl.deleteBuffer(this.ebo);
        this.gl.deleteVertexArray(this.vao);
    }
}
