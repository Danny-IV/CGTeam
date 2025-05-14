#version 300 es

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_texCoord;    // cylinder 가 넘겨주는 텍스처 좌표

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

out vec3  fragPos;
out vec3  normal;
out vec2  texCoord;                       // 프래그먼트로 전달

void main() {
    fragPos   = vec3(u_model * vec4(a_position, 1.0));
    normal    = mat3(transpose(inverse(u_model))) * a_normal;
    texCoord  = a_texCoord;  
    gl_Position = u_projection * u_view * vec4(fragPos, 1.0);
}
