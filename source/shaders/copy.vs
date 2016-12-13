attribute vec2 vertexPosition;
varying vec2 coord;
void main() {
  coord = (vertexPosition + 1.0) / 2.0;
  gl_Position = vec4(vertexPosition, 1, 1);
}