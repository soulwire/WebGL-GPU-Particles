
attribute vec2 aParticleUV;

uniform sampler2D uParticleData;

void main() {

    vec4 particle = texture2D( uParticleData, aParticleUV );
    float perspective = 1.0 + particle.z * 5.5;
    float phase = cos( particle.w ) * max( 0.5, tan( particle.z * 8.05 ) );

    gl_Position = vec4( particle.xyz, perspective );
    gl_PointSize = min( 64.0, ( 1.0 / perspective ) * ( 0.5 + phase ) );
}