precision mediump float;
uniform sampler2D physicsData;
uniform vec2 bounds;
const vec3 TARGET = vec3(0, 0, 0.01);
const int POSITION_SLOT = 0;
const int VELOCITY_SLOT = 1;
vec4 texel(vec2 offset) {
  vec2 coord = (gl_FragCoord.xy + offset) / bounds;
  return texture2D(physicsData, coord);
}
void main() {
  int slot = int(mod(gl_FragCoord.x, 2.0));
  if (slot == POSITION_SLOT) {
    vec4 dataA = texel(vec2(0, 0));
    vec4 dataB = texel(vec2(1, 0));
    vec3 position = dataA.xyz;
    vec3 velocity = dataB.xyz;
    float phase = dataA.w;
    if (phase > 0.0) {
      position += velocity * 0.005;
      if (length(TARGET - position) < 0.035) phase = 0.0;
      else phase += 0.1;
    } else {
      position = vec3(-1);
    }
    gl_FragColor = vec4(position, phase);
  } else if (slot == VELOCITY_SLOT) {
    vec4 dataA = texel(vec2(-1, 0));
    vec4 dataB = texel(vec2(0, 0));
    vec3 position = dataA.xyz;
    vec3 velocity = dataB.xyz;
    float phase = dataA.w;
    if (phase > 0.0) {
      vec3 delta = normalize(TARGET - position);
      velocity += delta * 0.05;
      velocity *= 0.991;
    } else {
      velocity = vec3(0);
    }
    gl_FragColor = vec4(velocity, 1);
  }
}