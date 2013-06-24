
uniform sampler2D uParticleTexture;

void main() {
    gl_FragColor = texture2D( uParticleTexture, gl_PointCoord );
}