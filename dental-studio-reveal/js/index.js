gsap.registerPlugin(ScrollTrigger);

gsap.to('.dark-overlay', {
    width: '100%',
    height: '100%',
    scrollTrigger: {
        trigger: '.animation-section',
        start: 'top top',
        end: 'center top',
        scrub: 1,
    }
});

gsap.to('.contour-lines', {
    opacity: 1,
    scrollTrigger: {
        trigger: '.animation-section',
        start: 'top top',
        end: '30% top',
        scrub: 1,
    }
});

ScrollTrigger.create({
    trigger: '.animation-section',
    start: 'top top',
    end: '40% top',
    onUpdate: (self) => {
        const text = document.querySelector('.text-content');
        if (self.progress > 0.3) {
            text.classList.add('text-light');
        } else {
            text.classList.remove('text-light');
        }
    }
});

gsap.to('.contour-lines', {
    x: '-25%',
    y: '-10%',
    duration: 20,
    ease: 'none',
    repeat: -1,
    yoyo: true
});

gsap.to('.contour-lines', {
    rotation: 2,
    duration: 15,
    ease: 'none',
    repeat: -1,
    yoyo: true
});
