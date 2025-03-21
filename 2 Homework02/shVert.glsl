#version 300 es

in vec3 aPos;
uniform vec2 movement;

void main() {
    gl_Position = vec4(aPos[0] + movement[0], aPos[1] + movement[1], aPos[2], 1.0);
}