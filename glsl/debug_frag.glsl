
precision mediump float;

uniform sampler2D uParticleData;
varying vec2 vTexCoord;

void main() {
    gl_FragColor = vec4( texture2D( uParticleData, vTexCoord ).xyz, 0.8 );
}