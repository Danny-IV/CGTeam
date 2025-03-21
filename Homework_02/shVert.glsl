#version 300 es

in vec2 aPos;
uniform vec2 changePos;

void main() {
    gl_Position = vec4(a_position + changePos, 0.0, 1.0);
}`;