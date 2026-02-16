const canvas = document.getElementById('blobCanvas');
const ctx = canvas.getContext('2d', { alpha: true });
const cursor = document.querySelector('.cursor');
const cursorRing = document.querySelector('.cursor-ring');

// Set canvas size with pixel ratio for crisp rendering
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);
}
resizeCanvas();

// Mouse tracking with velocity history
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let prevMouseX = mouseX;
let prevMouseY = mouseY;
let mouseSpeed = 0;
let isMouseMoving = false;
let velocityHistory = [];
const velocityHistorySize = 5;

// Ink droplet class with realistic physics
class InkDroplet {
    constructor(x, y, velocity = { x: 0, y: 0 }) {
        this.x = x;
        this.y = y;
        this.vx = velocity.x + (Math.random() - 0.5) * 3;
        this.vy = velocity.y + (Math.random() - 0.5) * 3;
        this.baseSize = Math.random() * 50 + 40;
        this.size = this.baseSize;
        this.maxSize = this.baseSize * 1.8;
        this.life = 1;
        this.decay = Math.random() * 0.004 + 0.003;
        this.angle = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.03;
        
        // Organic shape parameters
        this.points = 12;
        this.noise = Array.from({ length: this.points }, () => ({
            amplitude: Math.random() * 0.4 + 0.6,
            frequency: Math.random() * 0.02 + 0.01,
            phase: Math.random() * Math.PI * 2,
            offset: Math.random() * Math.PI * 2
        }));

        // Expansion phase
        this.expanding = true;
        this.expansionSpeed = 0.08;
    }

    update() {
        // Physics
        this.vx *= 0.92;
        this.vy *= 0.92;
        this.x += this.vx;
        this.y += this.vy;

        // Expansion
        if (this.expanding) {
            this.size += (this.maxSize - this.size) * this.expansionSpeed;
            if (this.size >= this.maxSize * 0.95) {
                this.expanding = false;
            }
        } else {
            this.size += (this.baseSize - this.size) * 0.02;
        }

        // Rotation
        this.angle += this.rotationSpeed;

        // Morph noise
        this.noise.forEach(n => {
            n.phase += n.frequency;
        });

        // Decay
        this.life -= this.decay;
    }

    draw(ctx) {
        if (this.life <= 0) return;

        ctx.save();
        ctx.globalAlpha = this.life * 0.95;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Create soft multi-layer gradient for realistic ink
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 1.2);
        gradient.addColorStop(0, 'rgba(85, 160, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(75, 143, 249, 0.95)');
        gradient.addColorStop(0.55, 'rgba(65, 133, 239, 0.7)');
        gradient.addColorStop(0.75, 'rgba(55, 123, 229, 0.35)');
        gradient.addColorStop(0.9, 'rgba(45, 113, 219, 0.1)');
        gradient.addColorStop(1, 'rgba(35, 103, 209, 0)');

        ctx.fillStyle = gradient;

        // Draw organic shape with smooth curves
        ctx.beginPath();
        for (let i = 0; i <= this.points; i++) {
            const angle = (i / this.points) * Math.PI * 2;
            const n = this.noise[i % this.points];
            const radius = this.size * n.amplitude * (1 + Math.sin(n.phase + n.offset) * 0.35);
            
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                const prevAngle = ((i - 1) / this.points) * Math.PI * 2;
                const prevN = this.noise[(i - 1) % this.points];
                const prevRadius = this.size * prevN.amplitude * (1 + Math.sin(prevN.phase + prevN.offset) * 0.35);
                const prevX = Math.cos(prevAngle) * prevRadius;
                const prevY = Math.sin(prevAngle) * prevRadius;
                
                // Smooth bezier curves for soft edges
                const cpX = (prevX + x) / 2;
                const cpY = (prevY + y) / 2;
                ctx.quadraticCurveTo(cpX, cpY, x, y);
            }
        }
        ctx.closePath();
        ctx.fill();

        // Soft inner glow layer
        ctx.globalAlpha = this.life * 0.4;
        const innerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 0.6);
        innerGradient.addColorStop(0, 'rgba(140, 200, 255, 0.9)');
        innerGradient.addColorStop(0.5, 'rgba(100, 170, 255, 0.5)');
        innerGradient.addColorStop(1, 'rgba(75, 143, 249, 0)');
        ctx.fillStyle = innerGradient;
        ctx.fill();

        // Extra soft outer edge for feathering
        ctx.globalAlpha = this.life * 0.2;
        const outerGradient = ctx.createRadialGradient(0, 0, this.size * 0.8, 0, 0, this.size * 1.5);
        outerGradient.addColorStop(0, 'rgba(75, 143, 249, 0.3)');
        outerGradient.addColorStop(0.5, 'rgba(65, 133, 239, 0.1)');
        outerGradient.addColorStop(1, 'rgba(55, 123, 229, 0)');
        ctx.fillStyle = outerGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 1.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    isAlive() {
        return this.life > 0;
    }
}

// Splatter particles for extra detail
class Splatter {
    constructor(x, y, velocity) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 10 + 5;
        this.vx = Math.cos(angle) * speed + velocity.x * 0.8;
        this.vy = Math.sin(angle) * speed + velocity.y * 0.8;
        this.size = Math.random() * 10 + 5;
        this.life = 1;
        this.decay = Math.random() * 0.012 + 0.008;
    }

    update() {
        this.vx *= 0.88;
        this.vy *= 0.88;
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.life * 0.8;
        
        // Soft gradient for splatters
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 1.5);
        gradient.addColorStop(0, 'rgba(75, 143, 249, 1)');
        gradient.addColorStop(0.5, 'rgba(75, 143, 249, 0.6)');
        gradient.addColorStop(1, 'rgba(75, 143, 249, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isAlive() {
        return this.life > 0;
    }
}

// Particle system
let droplets = [];
let splatters = [];
const maxDroplets = 35;
const maxSplatters = 80;
let lastSpawnTime = 0;

// Track mouse movement with velocity
document.addEventListener('mousemove', (e) => {
    prevMouseX = mouseX;
    prevMouseY = mouseY;
    mouseX = e.clientX;
    mouseY = e.clientY;

    const dx = mouseX - prevMouseX;
    const dy = mouseY - prevMouseY;
    const instantSpeed = Math.sqrt(dx * dx + dy * dy);
    
    // Track velocity history for smoother detection
    velocityHistory.push(instantSpeed);
    if (velocityHistory.length > velocityHistorySize) {
        velocityHistory.shift();
    }
    
    // Calculate average velocity for more stable detection
    mouseSpeed = velocityHistory.reduce((a, b) => a + b, 0) / velocityHistory.length;

    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
    cursorRing.style.left = mouseX + 'px';
    cursorRing.style.top = mouseY + 'px';

    if (mouseSpeed > 0.5) {
        cursor.classList.add('active');
        cursorRing.classList.add('active');
        isMouseMoving = true;
    } else {
        cursor.classList.remove('active');
        cursorRing.classList.remove('active');
        setTimeout(() => { isMouseMoving = false; }, 100);
    }
});

// Animation loop
function animate(currentTime) {
    // Fade effect instead of clear for trails
    ctx.fillStyle = 'rgba(10, 10, 10, 0.08)';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // Spawn new droplets
    if (isMouseMoving && currentTime - lastSpawnTime > 15) {
        if (droplets.length < maxDroplets) {
            const velocity = {
                x: (mouseX - prevMouseX) * 0.3,
                y: (mouseY - prevMouseY) * 0.3
            };
            
            // Main droplet
            droplets.push(new InkDroplet(mouseX, mouseY, velocity));

            // Add splatters based on speed - more responsive to fast movement
            if (mouseSpeed > 3 && splatters.length < maxSplatters) {
                const splatterCount = Math.min(5, Math.floor(mouseSpeed / 3));
                for (let i = 0; i < splatterCount; i++) {
                    splatters.push(new Splatter(mouseX, mouseY, velocity));
                }
            }
            
            lastSpawnTime = currentTime;
        }
    }

    // Update and draw splatters
    splatters = splatters.filter(splatter => {
        splatter.update();
        splatter.draw(ctx);
        return splatter.isAlive();
    });

    // Update and draw droplets
    droplets = droplets.filter(droplet => {
        droplet.update();
        droplet.draw(ctx);
        return droplet.isAlive();
    });

    requestAnimationFrame(animate);
}

animate(0);

// Handle window resize
window.addEventListener('resize', () => {
    resizeCanvas();
});

// Initial burst at center
setTimeout(() => {
    for (let i = 0; i < 8; i++) {
        setTimeout(() => {
            const angle = (i / 8) * Math.PI * 2;
            const offset = 60;
            droplets.push(new InkDroplet(
                window.innerWidth / 2 + Math.cos(angle) * offset,
                window.innerHeight / 2 + Math.sin(angle) * offset,
                { x: 0, y: 0 }
            ));
        }, i * 80);
    }
}, 500);
