
attribute vec2 aVertexPosition;
varying vec2 vTexCoord;

void main() {

    // Map from xy (-1 -> 1) to uv (0 -> 1)
    vTexCoord = ( aVertexPosition + 1.0 ) / 2.0;
    gl_Position = vec4( aVertexPosition, 1, 1 );
}