const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl');

if (!gl) {
    alert("WebGL not supported");
}

// --- Text Texture Generation ---
const textCanvas = document.createElement('canvas');
const ctx = textCanvas.getContext('2d');

function updateTextTexture() {
    textCanvas.width = window.innerWidth;
    textCanvas.height = window.innerHeight;
    
    ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
    
    // Draw Text - Smaller Size
    // Reduced multiplier from 0.35 to 0.18 and cap from 500 to 250
    const fontSize = Math.min(window.innerWidth * 0.18, 250); 
    ctx.font = `900 ${fontSize}px "Impact", "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText('STUDIO', textCanvas.width / 2, textCanvas.height / 2);
    
    return textCanvas;
}

// --- Shader Setup ---
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

const vsSource = document.getElementById('vertex-shader').text;
const fsSource = document.getElementById('fragment-shader').text;

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
const program = createProgram(gl, vertexShader, fragmentShader);

// --- Buffers ---
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0, 0, 1, 0, 0, 1,
    0, 1, 1, 0, 1, 1,
]), gl.STATIC_DRAW);

const texCoordBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0, 1, 1, 1, 0, 0,
    0, 0, 1, 1, 1, 0,
]), gl.STATIC_DRAW);

// --- Texture Setup ---
const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

function uploadTexture() {
    updateTextTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
}

uploadTexture();

// --- Uniforms ---
const positionLocation = gl.getAttribLocation(program, "a_position");
const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
const mouseLocation = gl.getUniformLocation(program, "u_mouse");
const aspectLocation = gl.getUniformLocation(program, "u_aspect");
const velocityLocation = gl.getUniformLocation(program, "u_velocity");

// --- State ---
let mouse = { x: 0.5, y: 0.5 };
let targetMouse = { x: 0.5, y: 0.5 };
let velocity = { x: 0, y: 0 };

// --- Event Listeners ---
window.addEventListener('mousemove', (e) => {
    targetMouse.x = e.clientX / window.innerWidth;
    targetMouse.y = 1.0 - (e.clientY / window.innerHeight);
});

window.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    targetMouse.x = touch.clientX / window.innerWidth;
    targetMouse.y = 1.0 - (touch.clientY / window.innerHeight);
}, {passive: true});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    uploadTexture();
});

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
gl.viewport(0, 0, canvas.width, canvas.height);

// --- Render Loop ---
function render() {
    // Smooth mouse movement (Inertia)
    // Increased to 0.1 for snappier response
    const lerpSpeed = 0.1; 
    const prevX = mouse.x;
    const prevY = mouse.y;
    
    mouse.x += (targetMouse.x - mouse.x) * lerpSpeed;
    mouse.y += (targetMouse.y - mouse.y) * lerpSpeed;
    
    // Calculate velocity
    velocity.x = (mouse.x - prevX);
    velocity.y = (mouse.y - prevY);

    gl.useProgram(program);

    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(texCoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(mouseLocation, mouse.x, mouse.y);
    gl.uniform1f(aspectLocation, canvas.width / canvas.height);
    
    // Send velocity to shader
    // Greatly reduced from 40.0 to 15.0 for minimal effect
    gl.uniform2f(velocityLocation, velocity.x * 15.0, velocity.y * 15.0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
}

requestAnimationFrame(render);
