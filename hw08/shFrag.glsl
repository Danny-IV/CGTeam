#version 300 es
precision highp float;

// VS 에서 넘어오는 값들
in  vec3  fragPos;
in  vec3  normal;
in  vec2  texCoord;
out vec4  FragColor;

// 물질 속성 (Diffuse map 은 struct 밖으로 뺐습니다—WebGL2 호환성)
uniform sampler2D u_diffuse;    // TEXTURE0 에 바인딩
uniform vec3      materialSpec; // 기존 material.specular
uniform float     materialShininess;

// 광원 속성
uniform vec3 lightDirection;
uniform vec3 lightAmbient;
uniform vec3 lightDiffuse;
uniform vec3 lightSpecular;

// 카메라 위치 & Toon 단계
uniform vec3 u_viewPos;
uniform int  toonLevels;

void main() {
    // 1) 텍스처 컬러 읽기
    vec3 objectColor = texture(u_diffuse, texCoord).rgb;

    // 2) Ambient
    vec3 ambient = lightAmbient * objectColor;

    // 3) Diffuse
    vec3 N = normalize(normal);
    vec3 L = normalize(lightDirection);
    float d = max(dot(N, L), 0.0);
    // 계단식 quantization: [0,1]을 toonLevels 단계로 나눔
    float dQ = toonLevels < 2
             ? 1.0
             : floor(d * float(toonLevels)) / float(toonLevels - 1);
    vec3 diffuse = lightDiffuse * dQ * objectColor;

    // 4) Specular
    vec3 V = normalize(u_viewPos - fragPos);
    vec3 R = reflect(-L, N);
    float s = (d > 0.0)
            ? pow(max(dot(V, R), 0.0), materialShininess)
            : 0.0;
    float sQ = toonLevels < 2
             ? s
             : floor(s * float(toonLevels)) / float(toonLevels - 1);
    vec3 specular = lightSpecular * sQ * materialSpec;

    // 5) 합산
    vec3 color = ambient + diffuse + specular;
    FragColor = vec4(color, 1.0);
}
