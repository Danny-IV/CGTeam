#version 300 es

layout (location = 0) in vec3 aPos;

uniform vec2 move;

void main() {
    gl_Position = vec4(aPos[0]+move[0],aPos[1]+move[1],aPos[2], 1.0);
}
