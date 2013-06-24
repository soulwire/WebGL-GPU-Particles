
precision mediump float;

const vec3 TARGET = vec3( 0, 0, 0.01 );

uniform sampler2D uParticleData;
uniform vec2 uViewport;

// Retrieves the texel at a given offset from the current pixel
vec4 texelAtOffet( vec2 offset ) {
    return texture2D( uParticleData, ( gl_FragCoord.xy + offset ) / uViewport );
}

void main() {

    // Determine which data slot we're at (position or velocity)
    int slot = int( mod( gl_FragCoord.x, 2.0 ) );

    if ( slot == 0 ) { // position

        // Retrieve data at current and adjacent slots
        vec4 dataA = texelAtOffet( vec2( 0, 0 ) );
        vec4 dataB = texelAtOffet( vec2( 1, 0 ) );

        // Extract position and velocity data
        vec3 pos = dataA.xyz;
        vec3 vel = dataB.xyz;

        float phase = dataA.w;

        if ( phase > 0.0 ) {

            // Integrate velocity
            pos += vel * 0.005;

            // Kill the particle if it's near the target
            if ( length( TARGET - pos ) < 0.035 ) phase = 0.0;
            else phase += 0.1;

        } else {

            pos = vec3(-1);
        }

        // Write out the new position data
        gl_FragColor = vec4( pos, phase );

    } else if ( slot == 1 ) { // velocity

        // Retrieve data at current and previous slots
        vec4 dataA = texelAtOffet( vec2( -1, 0 ) );
        vec4 dataB = texelAtOffet( vec2( 0, 0 ) );

        // Extract position and velocity data
        vec3 pos = dataA.xyz;
        vec3 vel = dataB.xyz;

        float phase = dataA.w;

        if ( phase > 0.0 ) {

            // Compute a normalised vector pointing towards target
            vec3 delta = normalize( TARGET - pos );

            // Add a force along the delta vector
            vel += delta * 0.05;

            // Add a drag force
            vel *= 0.991;

        } else {

            vel = vec3(0);
        }

        // Write out the velocity data
        gl_FragColor = vec4( vel, 1.0 );
    }
}