attribute vec2 vertexPosition;
void main() {
  gl_Position = vec4(vertexPosition, 1, 1);
}