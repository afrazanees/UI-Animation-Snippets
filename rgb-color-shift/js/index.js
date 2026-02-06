const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl', { antialias: true, alpha: false }) || 
           canvas.getContext('experimental-webgl');

const state = {
    mouseX: 0.5,
    mouseY: 0.5,
    targetX: 0.5,
    targetY: 0.5,
    hover: 0,
    targetHover: 0,
    width: 0,
    height: 0
};

function resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    state.width = vw;
    state.height = vh;
    
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(vw * dpr);
    canvas.height = Math.floor(vh * dpr);
    canvas.style.width = vw + 'px';
    canvas.style.height = vh + 'px';
    
    gl.viewport(0, 0, canvas.width, canvas.height);
    createTextTexture();
}

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resize, 100);
});
window.addEventListener('orientationchange', () => setTimeout(resize, 300));

const vertexShaderSrc = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
    }
`;

const fragmentShaderSrc = `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_texture;
    uniform vec2 u_mouse;
    uniform float u_hover;
    uniform vec2 u_resolution;
    
    vec2 bulge(vec2 uv, vec2 center, float radius, float strength) {
        vec2 delta = uv - center;
        float dist = length(delta);
        if (dist < radius && strength > 0.0) {
            float t = dist / radius;
            float curve = pow(1.0 - t, 2.0) * strength;
            return uv - normalize(delta) * curve * 0.08;
        }
        return uv;
    }

    void main() {
        vec2 uv = v_texCoord;
        
        float hover = smoothstep(0.0, 1.0, u_hover);
        hover = hover * (2.0 - hover);
        
        vec2 center = u_mouse;
        
        float baseRadius = min(u_resolution.x, u_resolution.y) < 600.0 ? 0.15 : 0.18;
        float radius = baseRadius + (hover * 0.02);
        
        vec2 delta = uv - center;
        float dist = length(delta);
        
        vec4 color;
        
        if (dist < radius && hover > 0.001) {
            float t = dist / radius;
            float influence = pow(1.0 - t, 3.0) * hover;
            
            float aberration = influence * 0.015;
            vec2 dir = normalize(delta);
            
            float rOffset = aberration * 2.0;
            float gOffset = 0.0;
            float bOffset = -aberration * 1.5;
            
            vec2 bulgeUV = bulge(uv, center, radius, influence);
            
            vec2 rUV = clamp(bulgeUV + dir * rOffset, 0.001, 0.999);
            vec2 gUV = clamp(bulgeUV + dir * gOffset, 0.001, 0.999);
            vec2 bUV = clamp(bulgeUV + dir * bOffset, 0.001, 0.999);
            
            color.r = texture2D(u_texture, rUV).r;
            color.g = texture2D(u_texture, gUV).g;
            color.b = texture2D(u_texture, bUV).b;
            color.a = 1.0;
            
            float centerGlow = (1.0 - t) * influence * 0.15;
            color.rgb += vec3(centerGlow);
            
        } else {
            color = texture2D(u_texture, uv);
        }
        
        gl_FragColor = color;
    }
`;

function compileShader(src, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    return shader;
}

const program = gl.createProgram();
gl.attachShader(program, compileShader(vertexShaderSrc, gl.VERTEX_SHADER));
gl.attachShader(program, compileShader(fragmentShaderSrc, gl.FRAGMENT_SHADER));
gl.linkProgram(program);
gl.useProgram(program);

const posBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
]), gl.STATIC_DRAW);

const texBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0, 1, 1, 1, 0, 0,
    0, 0, 1, 1, 1, 0
]), gl.STATIC_DRAW);

const posLoc = gl.getAttribLocation(program, 'a_position');
const texLoc = gl.getAttribLocation(program, 'a_texCoord');

gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
gl.enableVertexAttribArray(posLoc);
gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
gl.enableVertexAttribArray(texLoc);
gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

const mouseLoc = gl.getUniformLocation(program, 'u_mouse');
const hoverLoc = gl.getUniformLocation(program, 'u_hover');
const resLoc = gl.getUniformLocation(program, 'u_resolution');

let textTexture;

function createTextTexture() {
    if (textTexture) gl.deleteTexture(textTexture);
    
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    
    c.width = canvas.width;
    c.height = canvas.height;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, c.width, c.height);
    
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const minDim = Math.min(state.width, state.height);
    
    let fontSize;
    if (state.width < 480) {
        fontSize = minDim * 0.20 * dpr;
    } else if (state.width < 768) {
        fontSize = minDim * 0.25 * dpr;
    } else {
        fontSize = minDim * 0.30 * dpr;
    }
    
    ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText('text here', c.width / 2, c.height / 2);
    
    textTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

function updateInput(clientX, clientY) {
    // NORMAL HORIZONTAL MAPPING (Not inverted)
    // Mouse Left (0) -> targetX 0 (Left side of screen)
    // Mouse Right (width) -> targetX 1 (Right side of screen)
    state.targetX = clientX / state.width;
    
    // Vertical is flipped because WebGL UV has origin at bottom
    state.targetY = 1.0 - (clientY / state.height);
    state.targetHover = 1.0;
}

// Desktop input
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    updateInput(e.clientX - rect.left, e.clientY - rect.top);
});

canvas.addEventListener('mouseenter', () => state.targetHover = 1);
canvas.addEventListener('mouseleave', () => state.targetHover = 0);

// Mobile input
function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    updateInput(touch.clientX - rect.left, touch.clientY - rect.top);
    return false;
}

canvas.addEventListener('touchstart', (e) => {
    state.targetHover = 1;
    handleTouch(e);
}, { passive: false });

canvas.addEventListener('touchmove', handleTouch, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    setTimeout(() => { state.targetHover = 0; }, 50);
    return false;
}, { passive: false });

document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

resize();

function render() {
    state.mouseX = lerp(state.mouseX, state.targetX, 0.08);
    state.mouseY = lerp(state.mouseY, state.targetY, 0.08);
    state.hover = lerp(state.hover, state.targetHover, 0.12);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.uniform2f(mouseLoc, state.mouseX, state.mouseY);
    gl.uniform1f(hoverLoc, state.hover);
    gl.uniform2f(resLoc, state.width, state.height);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
}

render();
