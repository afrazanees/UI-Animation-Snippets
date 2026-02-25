/**
 * Configuration
 */
const CONFIG = {
    // Grid settings - INCREASED SIZE
    pixelSize: 10,         // Larger pixels
    gridSpacing: 11,       // Spacing to match
    
    // 3D Settings
    depth: 8,              // Thicker coin
    layerSpacing: 9,       // Spacing between Z-layers
    perspective: 1000,     // Adjusted focal length for new size
    
    // Physics - TUNED FOR "AUTHENTIC" FEEL
    repulsionRadius: 60,   // MUCH SMALLER for precise interaction (was 120)
    repulsionStrength: 80, // STRONGER to compensate for small radius (was 45)
    returnSpeed: 0.08,     // Slightly faster snap back
    friction: 0.86,        // More friction for tighter control
    
    // Visuals
    bgColor: '#ffffff',
    gridLineColor: 'rgba(0, 0, 0, 0.03)', // Lighter, subtler grid
    
    colors: {
        face: '#F7931A',     // Official Bitcoin Orange
        edge: '#D67D0F',     // Darker Orange
        side: '#B06305',     // Rim color
        symbol: '#ffffff',   // White
        trail: '#F7931A'
    }
};

class App {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.hint = document.getElementById('hint');
        
        this.dpr = window.devicePixelRatio || 1;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.particles = [];
        this.trailParticles = [];
        
        // Mouse state
        this.mouse = { x: -5000, y: -5000, active: false };
        
        // Rotation state
        this.rotX = 0;
        this.rotY = 0;
        this.targetRotX = 0;
        this.targetRotY = 0;
        
        this.init();
        this.bindEvents();
        this.animate();
    }

    init() {
        this.resize();
        this.createCoinParticles();
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            this.resize();
            this.createCoinParticles();
        });

        const onMove = (x, y) => {
            this.mouse.x = x;
            this.mouse.y = y;
            this.mouse.active = true;
            this.addTrail(x, y);
            
            // Fade out hint on first interaction
            if(this.hint.style.opacity !== '0') this.hint.style.opacity = '0';

            // Calculate target rotation
            const cx = this.width / 2;
            const cy = this.height / 2;
            
            // Smoother, limited rotation
            this.targetRotY = ((x - cx) / cx) * 0.6;
            this.targetRotX = -((y - cy) / cy) * 0.6;
        };

        window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
        
        window.addEventListener('touchmove', (e) => {
            e.preventDefault();
            onMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);
        
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
    }

    createCoinParticles() {
        this.particles = [];
        
        const buffer = document.createElement('canvas');
        const bCtx = buffer.getContext('2d');
        
        // Increased resolution for template
        const cols = 46;
        const rows = 46;
        buffer.width = cols;
        buffer.height = rows;
        const cx = cols / 2;
        const cy = rows / 2;
        
        bCtx.clearRect(0, 0, cols, rows);

        // Face
        bCtx.fillStyle = '#00ff00'; 
        bCtx.beginPath();
        bCtx.arc(cx, cy, 19, 0, Math.PI * 2); // Larger radius
        bCtx.fill();

        // Symbol
        bCtx.fillStyle = '#0000ff'; 
        bCtx.font = 'bold 28px sans-serif'; // Larger font
        bCtx.textAlign = 'center';
        bCtx.textBaseline = 'middle';
        bCtx.fillText('₿', cx, cy + 2);

        const imgData = bCtx.getImageData(0, 0, cols, rows).data;
        const startX = - (cols * CONFIG.gridSpacing) / 2;
        const startY = - (rows * CONFIG.gridSpacing) / 2;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const i = (y * cols + x) * 4;
                const r = imgData[i];
                const g = imgData[i + 1];
                const b = imgData[i + 2];
                const a = imgData[i + 3];
                
                if (a > 100) {
                    const px = startX + x * CONFIG.gridSpacing;
                    const py = startY + y * CONFIG.gridSpacing;
                    const isSymbol = b > 100;
                    
                    // Create Volume
                    if (isSymbol) {
                         this.particles.push(new Particle(px, py, CONFIG.layerSpacing * 3, CONFIG.colors.symbol));
                    } else {
                         this.particles.push(new Particle(px, py, CONFIG.layerSpacing * 2, CONFIG.colors.face));
                         this.particles.push(new Particle(px, py, -CONFIG.layerSpacing * 2, CONFIG.colors.edge));
                    }
                    
                    if (this.isEdgePixel(x, y, cols, imgData)) {
                        for (let z = -1; z <= 1; z++) {
                             this.particles.push(new Particle(px, py, z * CONFIG.layerSpacing, CONFIG.colors.side));
                        }
                    }
                }
            }
        }
        
        this.particles.forEach(p => {
            p.currentX += this.width / 2;
            p.currentY += this.height / 2;
        });
    }
    
    isEdgePixel(x, y, cols, data) {
        const check = (dx, dy) => {
            const idx = ((y + dy) * cols + (x + dx)) * 4;
            return data[idx + 3] < 100; 
        };
        return check(1,0) || check(-1,0) || check(0,1) || check(0,-1);
    }
    
    addTrail(x, y) {
        if (Math.random() > 0.4) {
            this.trailParticles.push(new TrailParticle(x, y));
        }
    }

    drawGrid() {
        this.ctx.beginPath();
        this.ctx.strokeStyle = CONFIG.gridLineColor;
        this.ctx.lineWidth = 1;
        const spacing = 40;
        
        for (let x = 0; x <= this.width; x += spacing) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
        }
        for (let y = 0; y <= this.height; y += spacing) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
        }
        this.ctx.stroke();
    }

    drawCursor() {
        if (!this.mouse.active) return;
        this.ctx.save();
        this.ctx.translate(this.mouse.x, this.mouse.y);
        
        // Polished cursor
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(0, 18);
        this.ctx.lineTo(5, 14);
        this.ctx.lineTo(9, 20);
        this.ctx.lineTo(12, 18);
        this.ctx.lineTo(8, 12);
        this.ctx.lineTo(14, 12);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
        this.ctx.restore();
    }

    animate() {
        // Clear with transparency for trail effect? No, clean wipe is better for this style
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        this.drawGrid();

        // 1. Smooth Rotation
        this.rotX += (this.targetRotX - this.rotX) * 0.08;
        this.rotY += (this.targetRotY - this.rotY) * 0.08;

        const cx = this.width / 2;
        const cy = this.height / 2;
        const cosY = Math.cos(this.rotY);
        const sinY = Math.sin(this.rotY);
        const cosX = Math.cos(this.rotX);
        const sinX = Math.sin(this.rotX);

        // 3. Update Physics & Projection
        this.particles.forEach(p => {
            p.update(this.mouse, cx, cy, cosX, sinX, cosY, sinY);
        });

        // 4. Sort Z-buffer
        this.particles.sort((a, b) => a.sortZ - b.sortZ);

        // 5. Draw
        this.particles.forEach(p => p.draw(this.ctx));
        
        // Trail
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            const p = this.trailParticles[i];
            p.update();
            p.draw(this.ctx);
            if (p.life <= 0) this.trailParticles.splice(i, 1);
        }

        this.drawCursor();
        requestAnimationFrame(() => this.animate());
    }
}

class Particle {
    constructor(x, y, z, color) {
        this.bx = x; // Base 3D X
        this.by = y; // Base 3D Y
        this.bz = z; // Base 3D Z
        
        // Current Screen Position (start at center to bloom out)
        this.currentX = x;
        this.currentY = y;
        
        this.sortZ = 0;
        
        this.vx = 0;
        this.vy = 0;
        
        this.color = color;
        this.isDisplaced = false;
        
        // Random offset for organic noise in movement
        this.noise = Math.random() * 0.2; 
        
        // --- AUTHENTIC DEBRIS PROPERTIES ---
        // 1. Scale Variation: 50% to 120% of base size
        this.debrisScale = 0.5 + Math.random() * 0.7;
        
        // 2. Shade Variation: Hot colors (Red -> Yellow/Orange)
        // Hue: 0-45 (Red-Orange-Yellow)
        // Lightness: 40-80% (Dark red to bright yellow)
        const hue = Math.floor(Math.random() * 45);
        const sat = 90 + Math.floor(Math.random() * 10);
        const light = 40 + Math.floor(Math.random() * 40);
        this.debrisColor = `hsl(${hue}, ${sat}%, ${light}%)`;

        // 3. Interaction Scalar: Defines the unique "sensitivity" radius for this particle
        // This ensures the void is not a perfect circle, but a jagged, random shape.
        // Some particles react from far away (1.4x), some only when very close (0.2x)
        this.interactionScalar = 0.25 + Math.random() * 1.15;
    }

    update(mouse, cx, cy, cosX, sinX, cosY, sinY) {
        // --- 1. 3D ROTATION ---
        let x1 = this.bx * cosY - this.bz * sinY;
        let z1 = this.bz * cosY + this.bx * sinY;
        let y1 = this.by * cosX - z1 * sinX;
        let z2 = z1 * cosX + this.by * sinX;

        // --- 2. PROJECTION ---
        const scale = CONFIG.perspective / (CONFIG.perspective + z2);
        const homeX = cx + x1 * scale;
        const homeY = cy + y1 * scale;
        
        this.sortZ = z2;

        // --- 3. PHYSICS ---
        
        const dx = mouse.x - this.currentX;
        const dy = mouse.y - this.currentY;
        const distSq = dx*dx + dy*dy;
        
        // Use individual interaction radius instead of global CONFIG
        const effectiveRadius = CONFIG.repulsionRadius * this.interactionScalar;
        const effectiveRadiusSq = effectiveRadius * effectiveRadius;
        
        if (distSq < effectiveRadiusSq) {
            const distance = Math.sqrt(distSq);
            const force = (effectiveRadius - distance) / effectiveRadius;
            const angle = Math.atan2(dy, dx);
            
            // Non-linear repulsion for "Explosion" feel
            const repStrength = CONFIG.repulsionStrength * Math.pow(force, 1.5);
            
            // Add a little randomization to the angle for "scatter" effect
            const noiseAngle = (Math.random() - 0.5) * 0.5; 
            
            this.vx -= Math.cos(angle + noiseAngle) * repStrength;
            this.vy -= Math.sin(angle + noiseAngle) * repStrength;
        }
        
        // Spring Return
        const homeDx = homeX - this.currentX;
        const homeDy = homeY - this.currentY;
        
        // Variable return speed based on distance (snap back faster when far)
        this.vx += homeDx * (CONFIG.returnSpeed + this.noise * 0.01);
        this.vy += homeDy * (CONFIG.returnSpeed + this.noise * 0.01);
        
        // Friction
        this.vx *= CONFIG.friction;
        this.vy *= CONFIG.friction;
        
        this.currentX += this.vx;
        this.currentY += this.vy;
        
        // State Calculation
        const distFromHome = Math.sqrt(homeDx*homeDx + homeDy*homeDy);
        this.isDisplaced = distFromHome > 5; 
    }

    draw(ctx) {
        const scale = CONFIG.perspective / (CONFIG.perspective + this.sortZ);
        const size = Math.max(0.1, CONFIG.pixelSize * scale);

        if (this.isDisplaced) {
            // Displaced: Pixelated Debris (Blocky "X" or Glitch)
            // Uses randomized scale and color
            
            // Apply unique debris scale
            const s = size * 0.6 * this.debrisScale; 
            const bit = s * 0.5; // Individual bit size
            
            ctx.save();
            ctx.translate(this.currentX, this.currentY);
            
            // Rotate based on velocity for dynamic feel
            const rotation = Math.atan2(this.vy, this.vx);
            ctx.rotate(rotation);
            
            ctx.fillStyle = this.debrisColor; // Randomized hot color
            
            // Draw a "Pixelated Cross" made of 5 small squares
            // Center
            ctx.fillRect(-bit/2, -bit/2, bit, bit);
            // Top-Left
            ctx.fillRect(-s - bit/2, -s - bit/2, bit, bit);
            // Top-Right
            ctx.fillRect(s - bit/2, -s - bit/2, bit, bit);
            // Bottom-Left
            ctx.fillRect(-s - bit/2, s - bit/2, bit, bit);
            // Bottom-Right
            ctx.fillRect(s - bit/2, s - bit/2, bit, bit);
            
            ctx.restore();
        } else {
            // Normal: Solid Pixel
            ctx.fillStyle = this.color;
            // Snap to pixel grid for crispness
            ctx.fillRect(
                (this.currentX - size/2), 
                (this.currentY - size/2), 
                size, 
                size
            );
        }
    }
}

class TrailParticle {
    constructor(x, y) {
        this.x = x + (Math.random() * 10 - 5);
        this.y = y + (Math.random() * 10 - 5);
        this.size = Math.random() * 3 + 1;
        this.life = 1.0;
        this.decay = 0.05;
        this.color = CONFIG.colors.trail;
    }

    update() {
        this.life -= this.decay;
        this.size *= 0.95;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        // Draw cross for trail too to match theme
        const s = this.size;
        ctx.fillRect(this.x, this.y, s, s);
        ctx.globalAlpha = 1.0;
    }
}

new App();
