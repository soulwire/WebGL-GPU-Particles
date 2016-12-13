// ——————————————————————————————————————————————————
// Dependencies
// ——————————————————————————————————————————————————

import particleSprite from './textures/particle.png';
import physicsVS from './shaders/physics.vs';
import physicsFS from './shaders/physics.fs';
import renderVS from './shaders/render.vs';
import renderFS from './shaders/render.fs';
import debugVS from './shaders/debug.vs';
import debugFS from './shaders/debug.fs';
import copyVS from './shaders/copy.vs';
import copyFS from './shaders/copy.fs';

// ——————————————————————————————————————————————————
// Constants
// ——————————————————————————————————————————————————

const PARTICLE_COUNT = Math.pow(1024, 2);
const PARTICLE_COUNT_SQRT = Math.sqrt(PARTICLE_COUNT);
const PARTICLE_DATA_SLOTS = 2;
const PARTICLE_DATA_WIDTH = PARTICLE_COUNT_SQRT * PARTICLE_DATA_SLOTS;
const PARTICLE_DATA_HEIGHT = PARTICLE_COUNT_SQRT;
const PARTICLE_EMIT_RATE = 1000;

// ——————————————————————————————————————————————————
// Globals
// ——————————————————————————————————————————————————

let physicsInputTexture;
let physicsOutputTexture;
let dataLocationBuffer;
let viewportQuadBuffer;
let particleTexture;
let physicsProgram;
let renderProgram;
let debugProgram;
let copyProgram;
let frameBuffer;
let container;
let emitIndex;
let lastEmit;
let millis;
let height;
let width;
let scale;
let clock;
let gl;

// ——————————————————————————————————————————————————
// GL Utils
// ——————————————————————————————————————————————————

const createContext = () => {
  const el = document.createElement('canvas');
  const gl = el.getContext('webgl') || el.getContext('experimental-webgl');
  if (!gl) {
    throw 'WebGL not supported';
  }
  if (!gl.getExtension('OES_texture_float')) {
    throw 'Float textures not supported';
  }
  return gl;
};

const createShader = (source, type) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw gl.getShaderInfoLog(shader);
  }
  return shader;
};

const createProgram = (vSource, fSource) => {
  const vs = createShader(vSource, gl.VERTEX_SHADER);
  const fs = createShader(fSource, gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw gl.getProgramInfoLog(program);
  }
  return program;
};

const createImageTexture = (image) => {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const update = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
  };
  image.naturalWidth > 0 ? update() : image.onload = update;
  return texture;
};

const createDataTexture = (width, height, data) => {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, data);
  return texture;
};

const createFramebuffer = () => {
  const buffer = gl.createFramebuffer();
  return buffer;
};

// ——————————————————————————————————————————————————
// Helpers
// ——————————————————————————————————————————————————

const random = (min, max) => {
  if (typeof min !== 'number') min = 1;
  if (typeof max !== 'number') max = min, min = 0;
  return min + Math.random() * (max - min);
};

const createPhysicsProgram = () => {
  const program = createProgram(physicsVS, physicsFS);
  program.vertexPosition = gl.getAttribLocation(program, 'vertexPosition');
  program.physicsData = gl.getUniformLocation(program, 'physicsData');
  program.bounds = gl.getUniformLocation(program, 'bounds');
  gl.enableVertexAttribArray(program.vertexPosition);
  return program;
};

const createRenderProgram = () => {
  const program = createProgram(renderVS, renderFS);
  program.dataLocation = gl.getAttribLocation(program, 'dataLocation');
  program.particleTexture = gl.getUniformLocation(program, 'particleTexture');
  program.physicsData = gl.getUniformLocation(program, 'physicsData');
  gl.enableVertexAttribArray(program.dataLocation);
  return program;
};

const createDebugProgram = () => {
  const program = createProgram(debugVS, debugFS);
  program.vertexPosition = gl.getAttribLocation(program, 'vertexPosition');
  program.texture = gl.getUniformLocation(program, 'texture');
  gl.enableVertexAttribArray(program.vertexPosition);
  return program;
};

const createCopyProgram = () => {
  const program = createProgram(copyVS, copyFS);
  program.vertexPosition = gl.getAttribLocation(program, 'vertexPosition');
  program.texture = gl.getUniformLocation(program, 'texture');
  gl.enableVertexAttribArray(program.vertexPosition);
  return program;
};

const createPhysicsDataTexture = () => {
  const size = 4 * PARTICLE_COUNT * PARTICLE_DATA_SLOTS;
  const data = new Float32Array(size);
  return createDataTexture(PARTICLE_DATA_WIDTH, PARTICLE_DATA_HEIGHT, data);
};

const createParticleTexture = () => {
  const image = new Image();
  image.src = particleSprite;
  return createImageTexture(image);
};

const createDataLocationBuffer = () => {
  const data = new Float32Array(PARTICLE_COUNT * 2);
  const step = 1 / PARTICLE_COUNT_SQRT;
  for (let u, v, i = 0; i < PARTICLE_COUNT; i++) {
    u = i * 2;
    v = u + 1;
    data[u] = step * Math.floor(i % PARTICLE_COUNT_SQRT);
    data[v] = step * Math.floor(i / PARTICLE_COUNT_SQRT);
  }
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
};

const createViewportQuadBuffer = () => {
  const data = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
};

const emitParticles = (count, origin, velocities = [0, 0, 0]) => {
  gl.bindTexture(gl.TEXTURE_2D, physicsInputTexture);
  const x = Math.floor((emitIndex * PARTICLE_DATA_SLOTS) % PARTICLE_DATA_WIDTH);
  const y = Math.floor(emitIndex / PARTICLE_DATA_HEIGHT);
  const chunks = [[x, y, count * PARTICLE_DATA_SLOTS]];
  const split = (chunk) => {
    const boundary = chunk[0] + chunk[2];
    if (boundary > PARTICLE_DATA_WIDTH) {
      const delta = boundary - PARTICLE_DATA_WIDTH;
      chunk[2] -= delta;
      chunk = [0, (chunk[1] + 1) % PARTICLE_DATA_HEIGHT, delta];
      chunks.push(chunk);
      split(chunk);
    }
  };
  split(chunks[0]);
  let i, j, n, m, chunk, data, force = 1.0;
  for (i = 0, n = chunks.length; i < n; i++) {
    chunk = chunks[i];
    data = [];
    for (j = 0, m = chunk[2]; j < m; j++) {
      data.push(
        origin[0] + random(-0.02, 0.02),
        origin[1] + random(-0.02, 0.02),
        origin[2] + random(-0.01, 0.01),
        random(10),
        velocities[0] + force * random(-1, 1),
        velocities[1] + force * random(-1, 1),
        velocities[2] + force * random(-1, 1),
        0
      );
    }
    gl.texSubImage2D(
      gl.TEXTURE_2D, 0, chunk[0], chunk[1], chunk[2], 1,
      gl.RGBA, gl.FLOAT, new Float32Array(data)
    );
  }
  emitIndex += count;
  emitIndex %= PARTICLE_COUNT;
};

const leap = () => {
  if (typeof Leap !== 'undefined') {
    Leap.loop(frame => {
      const fingers = frame.pointables;
      for (let i = 0, n = fingers.length; i < n; i++) {
        const { tipPosition, tipVelocity } = fingers[i];
        const count = random(110, 200);
        const position = [
          (tipPosition.x / 200),
          (tipPosition.y / 200) - 1
          (tipPosition.z / 400) * -1
        ];
        const velocity = [
          tipVelocity.x / 100,
          tipVelocity.y / 120,
          tipVelocity.z / 180
        ];
        emitParticles(count, position, velocity);
      }
    });
  }
};

// ——————————————————————————————————————————————————
// Main
// ——————————————————————————————————————————————————

const init = () => {
  gl = createContext();
  container = document.getElementById('container');
  emitIndex = 0;
  millis = 0;
  clock = Date.now();
  document.addEventListener('touchmove', touch);
  document.addEventListener('mousemove', touch);
  window.addEventListener('resize', resize);
  container.appendChild(gl.canvas);
  setup();
  resize();
  update();
  leap();
};

const setup = () => {
  physicsInputTexture = createPhysicsDataTexture();
  physicsOutputTexture = createPhysicsDataTexture();
  dataLocationBuffer = createDataLocationBuffer();
  viewportQuadBuffer = createViewportQuadBuffer();
  particleTexture = createParticleTexture();
  physicsProgram = createPhysicsProgram();
  renderProgram = createRenderProgram();
  debugProgram = createDebugProgram();
  copyProgram = createCopyProgram();
  frameBuffer = createFramebuffer();
};

const physics = () => {
  gl.useProgram(physicsProgram);
  gl.viewport(0, 0, PARTICLE_DATA_WIDTH, PARTICLE_DATA_HEIGHT);
  gl.bindBuffer(gl.ARRAY_BUFFER, viewportQuadBuffer);
  gl.vertexAttribPointer(physicsProgram.vertexPosition, 2, gl.FLOAT, gl.FALSE, 0, 0);
  gl.uniform2f(physicsProgram.bounds, PARTICLE_DATA_WIDTH, PARTICLE_DATA_HEIGHT);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, physicsInputTexture);
  gl.uniform1i(physicsProgram.physicsData, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, physicsOutputTexture, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

const copy = () => {
  gl.useProgram(copyProgram);
  gl.viewport(0, 0, PARTICLE_DATA_WIDTH, PARTICLE_DATA_HEIGHT);
  gl.bindBuffer(gl.ARRAY_BUFFER, viewportQuadBuffer);
  gl.vertexAttribPointer(copyProgram.vertexPosition, 2, gl.FLOAT, gl.FALSE, 0, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, physicsOutputTexture);
  gl.uniform1i(copyProgram.physicsData, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, physicsInputTexture, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

const debug = () => {
  const x = 16 * scale;
  const y = 16 * scale;
  const w = 360 * scale;
  const h = 180 * scale;
  gl.useProgram(debugProgram);
  gl.viewport(x, y, w, h);
  gl.bindBuffer(gl.ARRAY_BUFFER, viewportQuadBuffer);
  gl.vertexAttribPointer(physicsProgram.vertexPosition, 2, gl.FLOAT, gl.FALSE, 0, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, physicsOutputTexture);
  gl.uniform1i(debugProgram.texture, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.disable(gl.BLEND);
};

const render = () => {
  gl.useProgram(renderProgram);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.bindBuffer(gl.ARRAY_BUFFER, dataLocationBuffer);
  gl.vertexAttribPointer(renderProgram.dataLocation, 2, gl.FLOAT, gl.FALSE, 0, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, physicsOutputTexture);
  gl.uniform1i(renderProgram.physicsData, 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, particleTexture);
  gl.uniform1i(renderProgram.particleTexture, 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);
  gl.disable(gl.BLEND);
};

const tick = () => {
  const now = Date.now();
  millis += now - clock || 0;
  clock = now;
};

const spawn = () => {
  if (millis < 3000) {
    emitParticles(800, [
      -1.0 + Math.sin(millis * 0.001) * 2.0,
      -0.2 + Math.cos(millis * 0.004) * 0.5,
      Math.sin(millis * 0.015) * -0.05
    ]);
  }
};

const touch = (event) => {
  if (millis - lastEmit < 20) return;
  const touches = event.changedTouches || [event];
  const limit = PARTICLE_EMIT_RATE / touches.length;
  for (let i = 0; i < touches.length; i++) {
    const touch = touches[i];
    const x = (touch.clientX / width) * 2 - 1;
    const y = (touch.clientY / height) * -2 + 1;
    emitParticles(limit, [x, y, 0]);
  }
  lastEmit = millis;
};

const resize = () => {
  scale = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  gl.canvas.width = width * scale;
  gl.canvas.height = height * scale;
  gl.canvas.style.width = width + 'px';
  gl.canvas.style.height = height + 'px';
};

const update = () => {
  requestAnimationFrame(update);
  tick();
  spawn();
  physics();
  copy();
  render();
  debug();
};

// ——————————————————————————————————————————————————
// Bootstrap
// ——————————————————————————————————————————————————

if (document.readyState === 'complete') init()
else window.addEventListener('load', init);
