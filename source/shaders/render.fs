uniform sampler2D particleTexture;
void main() {
  gl_FragColor = texture2D(particleTexture, gl_PointCoord);
}