const CONFIG = {
    // Grid settings
    pixelSize: 8,          // Slightly smaller for higher definition
    gap: 2,                // Distinct gap between pixels as seen in video
    gridSpacing: 10,       // Total cell size (8 + 2)
    
    // Physics
    repulsionRadius: 70,   // Radius of influence
    repulsionStrength: 15, // Force of push
    returnSpeed: 0.08,     // Snap back speed
    friction: 0.82,        // Damping
    
    // Visuals
    bgColor: '#ffffff',
    gridLineColor: '#f2f2f2',
    
    colors: {
        face: '#ff884d',     // Lighter Orange face
        shadow: '#e05030',   // Red/Dark Orange for 3D depth/shadow
        symbol: '#ffffff',   // White B
        trail: '#ff884d',    // Mouse trail color
        cross: '#ff4400'     // Color of the 'x' when displaced
    }
};

class App {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.dpr = window.devicePixelRatio || 1;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.particles = [];
        this.trailParticles = [];
        
        this.mouse = { x: -5000, y: -5000, active: false };
        
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
        
        // 1. Setup a temporary canvas to draw the shape pixel-perfectly
        const buffer = document.createElement('canvas');
        const bCtx = buffer.getContext('2d');
        
        // Logical resolution (pixels wide/tall)
        const cols = 44;
        const rows = 44;
        buffer.width = cols;
        buffer.height = rows;
        
        const cx = cols / 2;
        const cy = rows / 2;
        
        // Clear
        bCtx.clearRect(0, 0, cols, rows);

        // --- DRAWING THE BITCOIN SHAPE ---

        // 1. The 3D Depth/Shadow (Bottom Right)
        // Draw a circle shifted down-right
        bCtx.fillStyle = '#ff0000'; // Red marker for SHADOW/DEPTH
        bCtx.beginPath();
        bCtx.ellipse(cx + 2, cy + 2, 16, 14, Math.PI / 4, 0, Math.PI * 2);
        bCtx.fill();

        // 2. The Main Face (Top Left)
        // Draw a circle shifted up-left
        bCtx.fillStyle = '#00ff00'; // Green marker for FACE
        bCtx.beginPath();
        bCtx.ellipse(cx - 1, cy - 1, 16, 14, Math.PI / 4, 0, Math.PI * 2);
        bCtx.fill();

        // 3. The Highlight (Top edge of face)
        bCtx.fillStyle = '#ffff00'; // Yellow marker for HIGHLIGHT
        bCtx.beginPath();
        bCtx.ellipse(cx - 1, cy - 1, 14, 12, Math.PI / 4, 3.2, 4.7); // Arc on top left
        bCtx.lineWidth = 2;
        bCtx.strokeStyle = '#ffff00';
        bCtx.stroke();

        // 4. The "B" Symbol
        bCtx.fillStyle = '#0000ff'; // Blue marker for SYMBOL
        bCtx.font = 'bold 24px sans-serif'; // Generic sans-serif bold usually works best for block 'B'
        bCtx.textAlign = 'center';
        bCtx.textBaseline = 'middle';
        
        bCtx.save();
        bCtx.translate(cx - 1, cy - 1); // Center on face
        bCtx.rotate(Math.PI / 8);       // Rotate with the coin
        bCtx.fillText('₿', 0, 1);
        bCtx.restore();

        // --- GENERATING PARTICLES FROM PIXELS ---
        
        const imgData = bCtx.getImageData(0, 0, cols, rows).data;
        const startX = (this.width - cols * CONFIG.gridSpacing) / 2;
        const startY = (this.height - rows * CONFIG.gridSpacing) / 2;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const i = (y * cols + x) * 4;
                const r = imgData[i];
                const g = imgData[i + 1];
                const b = imgData[i + 2];
                const a = imgData[i + 3];
                
                if (a > 100) {
                    let color = null;
                    
                    // Priority logic (Layers)
                    if (b > 100) color = CONFIG.colors.symbol;
                    else if (r > 100 && g > 100) color = '#ffccaa'; // Yellow marker (Highlight) -> Light Orange
                    else if (g > 100) color = CONFIG.colors.face;
                    else if (r > 100) color = CONFIG.colors.shadow;
                    
                    if (color) {
                        const px = startX + x * CONFIG.gridSpacing;
                        const py = startY + y * CONFIG.gridSpacing;
                        this.particles.push(new Particle(px, py, color));
                    }
                }
            }
        }
    }
    
    addTrail(x, y) {
        // Create small trail dots
        if (Math.random() > 0.5) { // Limit density
            this.trailParticles.push(new TrailParticle(x, y));
        }
    }

    drawGrid() {
        this.ctx.beginPath();
        this.ctx.strokeStyle = CONFIG.gridLineColor;
        this.ctx.lineWidth = 1;

        // Draw vertical lines every X pixels
        const spacing = 20; 
        
        // Vertical
        for (let x = 0; x <= this.width; x += spacing) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
        }
        
        // Horizontal (very faint in video, mostly vertical visible)
        for (let y = 0; y <= this.height; y += spacing) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
        }
        
        this.ctx.stroke();
    }

    drawCursor() {
        if (!this.mouse.active) return;
        
        // Draw the custom mouse cursor (small arrow or cross)
        // Video has a standard pointer, but we hid default.
        // Let's draw a small "x" or pointer to match the "trail" source
        this.ctx.save();
        this.ctx.translate(this.mouse.x, this.mouse.y);
        
        // Simple pointer shape
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(0, 16);
        this.ctx.lineTo(4, 12);
        this.ctx.lineTo(9, 18); // Leg 1
        this.ctx.lineTo(11, 16); // Leg 2
        this.ctx.lineTo(7, 11);
        this.ctx.lineTo(12, 11);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    animate() {
        this.ctx.fillStyle = CONFIG.bgColor;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.drawGrid();

        // Update and Draw Coin Particles
        this.particles.forEach(p => {
            p.update(this.mouse);
            p.draw(this.ctx);
        });
        
        // Update and Draw Trail Particles
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            const p = this.trailParticles[i];
            p.update();
            p.draw(this.ctx);
            if (p.life <= 0) {
                this.trailParticles.splice(i, 1);
            }
        }

        this.drawCursor();
        requestAnimationFrame(() => this.animate());
    }
}

class Particle {
    constructor(x, y, color) {
        this.originX = x;
        this.originY = y;
        this.x = x; 
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.color = color;
        this.isDisplaced = false;
    }

    update(mouse) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Physics: Repulsion
        if (distance < CONFIG.repulsionRadius) {
            const force = (CONFIG.repulsionRadius - distance) / CONFIG.repulsionRadius;
            const angle = Math.atan2(dy, dx);
            const repStrength = CONFIG.repulsionStrength * Math.pow(force, 2); // Non-linear force for "snap" feel
            
            this.vx -= Math.cos(angle) * repStrength;
            this.vy -= Math.sin(angle) * repStrength;
        }
        
        // Physics: Spring Return
        const homeDx = this.originX - this.x;
        const homeDy = this.originY - this.y;
        
        this.vx += homeDx * CONFIG.returnSpeed;
        this.vy += homeDy * CONFIG.returnSpeed;
        
        // Physics: Friction
        this.vx *= CONFIG.friction;
        this.vy *= CONFIG.friction;
        
        this.x += this.vx;
        this.y += this.vy;
        
        // Check displacement state
        // If it moves significantly from home, it changes appearance
        const distFromHome = Math.sqrt(homeDx*homeDx + homeDy*homeDy);
        this.isDisplaced = distFromHome > 4; 
    }

    draw(ctx) {
        if (this.isDisplaced) {
            // THE "X" EFFECT FROM VIDEO
            // When moved, it turns into a small red/orange cross
            const size = 3; 
            ctx.strokeStyle = CONFIG.colors.cross; // Reddish when flying
            ctx.lineWidth = 1.5;
            
            ctx.beginPath();
            ctx.moveTo(this.x - size, this.y - size);
            ctx.lineTo(this.x + size, this.y + size);
            ctx.moveTo(this.x + size, this.y - size);
            ctx.lineTo(this.x - size, this.y + size);
            ctx.stroke();
        } else {
            // NORMAL STATE: Square Pixel
            ctx.fillStyle = this.color;
            ctx.fillRect(
                Math.round(this.x - CONFIG.pixelSize/2), 
                Math.round(this.y - CONFIG.pixelSize/2), 
                CONFIG.pixelSize, 
                CONFIG.pixelSize
            );
        }
    }
}

class TrailParticle {
    constructor(x, y) {
        this.x = x + (Math.random() * 6 - 3);
        this.y = y + (Math.random() * 6 - 3);
        this.size = Math.random() * 2 + 1; // Small dots
        this.life = 1.0;
        this.decay = 0.08; // Fast fade
        this.color = CONFIG.colors.trail;
    }

    update() {
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        
        // Draw small cross or dot for trail
        // Video trails look like tiny dust dots
        ctx.fillRect(this.x, this.y, this.size, this.size);
        
        ctx.globalAlpha = 1.0;
    }
}

// Start
new App();
