// /app/public/js/landing.js

/**
 * This function runs when the entire HTML document has been loaded and parsed.
 * It's the main entry point for our landing page's interactive elements.
 */
document.addEventListener('DOMContentLoaded', () => {
    
    /**
     * Creates and appends floating particle elements to the background for a dynamic effect.
     */
    function createParticles() {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return; // Exit if the container element doesn't exist

        const particleCount = 50; // The number of particles to create

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';

            // Randomize starting position and animation properties for a natural look
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 6 + 's';
            particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
            
            particlesContainer.appendChild(particle);
        }
    }

    /**
     * Adds a subtle click animation to CTA buttons for better user feedback.
     */
    function initializeButtonAnimations() {
        const ctaButtons = document.querySelectorAll('.cta-button');
        
        ctaButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Temporarily scale the button down to give a "pressed" feel
                button.style.transform = 'scale(0.97)';
                setTimeout(() => {
                    // Reset the transform after a short delay
                    button.style.transform = '';
                }, 150);
            });
        });
    }

    // --- Initialize all functions ---
    createParticles();
    initializeButtonAnimations();

});