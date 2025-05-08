#version 300 es

precision highp float;

out vec4 FragColor;
in vec3 fragPos;  
in vec3 normal;  
in vec2 texCoord;

struct Material {
    sampler2D diffuse; // diffuse map
    vec3 specular;     // 표면의 specular color
    float shininess;   // specular 반짝임 정도
};

struct Light {
    //vec3 position;
    vec3 direction;
    vec3 ambient; // ambient 적용 strength
    vec3 diffuse; // diffuse 적용 strength
    vec3 specular; // specular 적용 strength
};

uniform Material material;
uniform Light light;
uniform vec3 u_viewPos;
uniform int toonLevels;

void main() {
    vec3 objectColor = vec3(1, 0.5, 0);
    // ambient
    // vec3 rgb = texture(material.diffuse, texCoord).rgb;
    vec3 ambient = light.ambient * objectColor;
  	
    // diffuse 
    vec3 norm = normalize(normal);
    //vec3 lightDir = normalize(light.position - fragPos);
    vec3 lightDir = normalize(light.direction);
    float dotNormLight = dot(norm, lightDir);
    float diff = max(dotNormLight, 0.0);
    diff = (floor(diff * float(toonLevels))) / float(toonLevels); // quantize
    vec3 diffuse = light.diffuse * diff * objectColor;  
    
    // specular
    vec3 viewDir = normalize(u_viewPos - fragPos);
    vec3 reflectDir = reflect(-lightDir, norm);
    float spec = 0.0;
    if (dotNormLight > 0.0) {
        spec = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);
        spec = (floor(spec * float(toonLevels))) / float(toonLevels); // quantize
    }
    vec3 specular = light.specular * spec * material.specular;  
        
    vec3 result = ambient + diffuse + specular;
    
    FragColor = vec4(result, 1.0);
} 