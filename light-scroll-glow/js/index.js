const track = document.getElementById('scroll-track');
const sun = document.getElementById('sun-orb');
const content = document.getElementById('hero-content');

// Get the height of the white page section
const whitePage = document.querySelector('.bg-white');
const whitePageHeight = whitePage ? whitePage.offsetHeight : 0;

// --- Smooth Scroll Physics (Lerp) ---
// 'target' is where the native scrollbar is.
// 'current' is where our animation is currently visually at.
// We constantly move 'current' towards 'target' by a small factor.
let targetScrollY = 0;
let currentScrollY = 0;

// Optimized for smooth feel without lag
const lerpFactor = 0.12; 

// Update target on native scroll
window.addEventListener('scroll', () => {
    targetScrollY = window.scrollY;
});

// Config - Optimized for smooth, natural animation
const initialScale = 25; // Massive start to fill screen
const finalScale = 0.15; // Tiny dot
const sunAnimDuration = 0.7; // Slightly faster for better responsiveness
const textMoveStart = 0.7; // Start text fade earlier for smoother transition

// Enhanced easing function for ultra-smooth animation
function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
}

// Additional easing for even smoother feel
function easeInOutQuart(x) {
    return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
}

// Color interpolation helper
function interpolateColor(progress) {
    // Start: pure white (255, 255, 255)
    // End: yellow (#FFD200 = 255, 210, 0)
    const r = 255;
    const g = Math.round(255 - (progress * 45)); // 255 -> 210
    const b = Math.round(255 - (progress * 255)); // 255 -> 0
    return `rgb(${r}, ${g}, ${b})`;
}

function animateLoop() {
    // 1. Calculate the smoothed scroll position
    // Linear Interpolation: current = current + (target - current) * factor
    currentScrollY = currentScrollY + (targetScrollY - currentScrollY) * lerpFactor;
    
    // Optimization: If close enough, snap to target to save CPU when idle
    if (Math.abs(targetScrollY - currentScrollY) < 0.5) {
        currentScrollY = targetScrollY;
    }

    const trackHeight = track.offsetHeight;
    const windowHeight = window.innerHeight;
    
    // 2. Calculate Progress based on SMOOTHED scroll
    // Account for the white page offset - animation starts after white page
    const adjustedScrollY = Math.max(0, currentScrollY - whitePageHeight);
    let rawProgress = adjustedScrollY / (trackHeight - windowHeight);
    let progress = Math.max(0, Math.min(1, rawProgress));
    
    // When scrolling back up into white section, ensure progress stays at 0
    if (currentScrollY <= whitePageHeight) {
        progress = 0;
    }

    // --- Sun Logic ---
    let sunProgress = Math.min(1, progress / sunAnimDuration);
    sunProgress = easeOutCubic(sunProgress);

    // Scale
    const currentScale = initialScale - (sunProgress * (initialScale - finalScale));
    
    // Simplified Blur Logic for better performance
    let currentBlur;
    const blurPeak = 100;
    if (sunProgress < 0.4) {
        currentBlur = (sunProgress / 0.4) * blurPeak; 
    } else if (sunProgress < 0.7) {
        currentBlur = blurPeak;
    } else {
        const sharpenProgress = (sunProgress - 0.7) / 0.3;
        currentBlur = blurPeak * (1 - sharpenProgress);
    }
    currentBlur = Math.max(0, currentBlur);

    // Opacity Logic - Smoother fade in
    const sunOpacity = 0.1 + (sunProgress * 0.9);

    // Color transition from white to yellow
    const currentColor = interpolateColor(sunProgress);

    // Vertical movement
    const yOffset = sunProgress * 180;

    sun.style.transform = `translateY(${yOffset}px) scale(${currentScale})`;
    sun.style.filter = `blur(${currentBlur}px)`;
    sun.style.opacity = sunOpacity;
    sun.style.backgroundColor = currentColor;

    // --- Text Logic ---
    if (progress > textMoveStart) {
        const textProgress = (progress - textMoveStart) / (1 - textMoveStart);
        const textY = -(textProgress * 150); 
        const textOpacity = 1 - textProgress;
        content.style.transform = `translateY(${textY}px)`;
        content.style.opacity = textOpacity;
    } else {
        content.style.transform = `translateY(0px)`;
        content.style.opacity = 1;
    }

    // Loop forever
    requestAnimationFrame(animateLoop);
}

// Start Loop
window.addEventListener('resize', () => {
     // update calculations if needed on resize
});
animateLoop();
