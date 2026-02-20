// --- WebGL / Three.js Setup ---
const container = document.getElementById('canvas-container');
let camera, scene, renderer;
let uniforms;

// Mouse state with easing
const mouse = new THREE.Vector2(0.5, 0.5);
const targetMouse = new THREE.Vector2(0.5, 0.5);

init();
animate();

function init() {
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    scene = new THREE.Scene();

    const geometry = new THREE.PlaneGeometry(2, 2);

    uniforms = {
        uTime: { value: 1.0 },
        uResolution: { value: new THREE.Vector2() },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) }
    };

    // Custom Shader Material
    const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform vec2 uResolution;
            uniform vec2 uMouse;
            varying vec2 vUv;

            // --- Noise Functions ---
            // Simplex 2D noise
            vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

            float snoise(vec2 v){
                const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                                    -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy) );
                vec2 x0 = v -   i + dot(i, C.xx);
                vec2 i1;
                i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod(i, 289.0);
                vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                + i.x + vec3(0.0, i1.x, 1.0 ));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m*m ;
                m = m*m ;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                vec3 g;
                g.x  = a0.x  * x0.x  + h.x  * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }

            // Fractional Brownian Motion for detail
            float fbm(vec2 st) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 0.0;
                
                // Loop for octaves
                for (int i = 0; i < 4; i++) {
                    value += amplitude * snoise(st);
                    st *= 2.0;
                    amplitude *= 0.5;
                }
                return value;
            }

            // Pseudo-random for grain
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }

            void main() {
                // Normalize coordinates
                vec2 st = gl_FragCoord.xy / uResolution.xy;
                
                // Aspect ratio correction for circularity (though we want vertical streaks)
                // st.x *= uResolution.x / uResolution.y;

                // 1. Calculate Beam/Curtain Mask based on Mouse X
                // The light follows the mouse horizontally
                float mouseDist = abs(st.x - uMouse.x);
                
                // Create a smooth falloff for the beam width
                // DECREASED SIZE: 0.45 -> 0.30
                float beamMask = 1.0 - smoothstep(0.0, 0.30, mouseDist);
                
                // Add a secondary wider, dimmer glow
                // DECREASED SIZE: 0.8 -> 0.6
                float glowMask = 1.0 - smoothstep(0.0, 0.6, mouseDist);
                
                // 2. Generate Texture Pattern (The "Fire" look)
                // We stretch the noise vertically by multiplying UV.y by a small number 
                // and UV.x by a large number.
                
                vec2 noiseUV = st;
                noiseUV.x *= 20.0; // High frequency horizontally (vertical lines)
                noiseUV.y *= 1.5;  // Low frequency vertically
                
                // Animate Y to make it flow like fire/curtain
                noiseUV.y -= uTime * 0.15;
                
                // Generate FBM noise
                float n = fbm(noiseUV);
                
                // Remap noise from [-1, 1] to [0, 1] roughly
                n = n * 0.5 + 0.5;
                
                // 3. Combine Noise and Mask
                // We want the noise to be visible primarily where the beam is
                float finalIntensity = n * beamMask;
                
                // Boost the center brightness
                finalIntensity += (glowMask * 0.3); 
                finalIntensity *= 1.5; // Overall gain

                // 4. Color Mapping
                // Create the specific Red-Orange-Black gradient
                vec3 colorBlack = vec3(0.0, 0.0, 0.0);
                vec3 colorRed = vec3(0.8, 0.05, 0.0);
                vec3 colorOrange = vec3(1.0, 0.3, 0.0);
                vec3 colorWhite = vec3(1.0, 0.9, 0.8);

                vec3 finalColor = colorBlack;
                
                // Color mixing logic
                if (finalIntensity < 0.3) {
                    finalColor = mix(colorBlack, colorRed, finalIntensity / 0.3);
                } else if (finalIntensity < 0.7) {
                    finalColor = mix(colorRed, colorOrange, (finalIntensity - 0.3) / 0.4);
                } else {
                    finalColor = mix(colorOrange, colorWhite, (finalIntensity - 0.7) / 0.3);
                }

                // Apply a vignette/falloff at the very top and bottom of screen for softness
                float verticalFade = smoothstep(0.0, 0.2, st.y) * smoothstep(1.0, 0.8, st.y);
                finalColor *= verticalFade;

                // 5. Film Grain
                // Add high frequency noise on top for texture
                float grain = random(st * uTime) * 0.12;
                finalColor += grain;

                gl_FragColor = vec4(finalColor, 1.0);
            }
        `
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    renderer = new THREE.WebGLRenderer({ alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    onWindowResize();
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
}

function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.uResolution.value.set(renderer.domElement.width, renderer.domElement.height);
}

function onMouseMove(e) {
    // Normalize mouse position 0..1
    targetMouse.x = e.clientX / window.innerWidth;
    targetMouse.y = 1.0 - (e.clientY / window.innerHeight); // Flip Y for WebGL
}

function onTouchMove(e) {
    if(e.touches.length > 0) {
        targetMouse.x = e.touches[0].clientX / window.innerWidth;
        targetMouse.y = 1.0 - (e.touches[0].clientY / window.innerHeight);
    }
}

function animate() {
    requestAnimationFrame(animate);

    // Smooth easing for mouse movement
    mouse.x += (targetMouse.x - mouse.x) * 0.08;
    mouse.y += (targetMouse.y - mouse.y) * 0.08;

    uniforms.uTime.value += 0.01;
    uniforms.uMouse.value.copy(mouse);

    renderer.render(scene, camera);
}
