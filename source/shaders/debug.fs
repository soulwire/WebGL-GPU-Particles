precision mediump float;
uniform sampler2D texture;
varying vec2 coord;
void main() {
  vec3 rgb = texture2D(texture, coord).xyz;
  gl_FragColor = vec4(rgb, 0.5);
}