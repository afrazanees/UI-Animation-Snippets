document.addEventListener('DOMContentLoaded', () => {
    const items = document.querySelectorAll('.accordion-item');
    const totalItems = items.length;
    
    function updateAccordion() {
        const scrollTop = window.scrollY;
        // Use scrollHeight minus innerHeight to get total scrollable distance
        const docHeight = document.body.scrollHeight - window.innerHeight;
        
        if (docHeight <= 0) return;

        let scrollFraction = scrollTop / docHeight;
        
        // Map the scroll fraction (0 to 1) directly to item indices
        let activeIndex = Math.floor(scrollFraction * totalItems);
        
        // Clamp the index to ensure it stays within bounds [0, 3]
        activeIndex = Math.max(0, Math.min(activeIndex, totalItems - 1));

        items.forEach((item, index) => {
            if (index === activeIndex) {
                if (!item.classList.contains('active')) {
                    item.classList.add('active');
                }
            } else {
                if (item.classList.contains('active')) {
                    item.classList.remove('active');
                }
            }
        });
    }

    // Run once on load to ensure correct state
    updateAccordion();

    // Optimized scroll listener
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateAccordion();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
});
