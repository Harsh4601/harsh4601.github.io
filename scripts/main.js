document.addEventListener('DOMContentLoaded', () => {
    // Create stars container
    const starsContainer = document.createElement('div');
    starsContainer.id = 'stars-container';
    document.body.insertBefore(starsContainer, document.body.firstChild);
    
    // Create SVG canvas for constellation lines
    const svgNS = "http://www.w3.org/2000/svg";
    const svgCanvas = document.createElementNS(svgNS, "svg");
    svgCanvas.id = 'constellation-canvas';
    svgCanvas.style.position = 'fixed';
    svgCanvas.style.top = '0';
    svgCanvas.style.left = '0';
    svgCanvas.style.width = '100%';
    svgCanvas.style.height = '100%';
    svgCanvas.style.pointerEvents = 'none';
    svgCanvas.style.zIndex = '1';
    document.body.insertBefore(svgCanvas, document.body.firstChild);
    
    // Generate stars with scroll-based movement
    const stars = [];
    
    function createStars() {
        const numberOfStars = 120;
        
        for (let i = 0; i < numberOfStars; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            
            // Random position
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            
            // Random properties
            const opacity = 0.3 + Math.random() * 0.5;
            const speed = 0.1 + Math.random() * 0.3; // Very slow parallax speed (0.1-0.4)
            
            star.style.left = `${x}%`;
            star.style.top = `${y}%`;
            star.style.setProperty('--opacity', opacity);
            
            // Store star data for scroll animation (store Y position directly)
            stars.push({
                element: star,
                initialY: y,
                speed: speed,
                translateY: 0, // Track Y position directly instead of parsing
                x: x, // Store percentage position
                y: y,
                // For magnetic effect
                currentX: 0, // Current displacement from original position
                currentY: 0,
                velocityX: 0, // Velocity for smooth spring motion
                velocityY: 0
            });
            
            starsContainer.appendChild(star);
        }
    }
    
    createStars();
    
    // Track scroll position for parallax effect
    let lastScrollY = window.scrollY;
    let scrollVelocity = 0;
    let ticking = false;
    
    function updateStarsOnScroll() {
        const currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - lastScrollY;
        
        // Update scroll velocity (smooth it out)
        scrollVelocity = scrollVelocity * 0.85 + scrollDelta * 0.15;
        
        // Update each star based on scroll
        stars.forEach(star => {
            // Calculate new Y position based on scroll with parallax effect
            const movement = scrollVelocity * star.speed;
            star.translateY += movement;
            
            // Don't apply transform here - let animate() handle it with magnetic effect
        });
        
        lastScrollY = currentScrollY;
        ticking = false;
    }
    
    // Use requestAnimationFrame for smoother updates in Safari
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateStarsOnScroll);
            ticking = true;
        }
    }
    
    // Update stars on scroll
    window.addEventListener('scroll', requestTick, { passive: true });
    
    // Mouse-following background effect
    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;
    let mousePixelX = 0;
    let mousePixelY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth) * 100;
        mouseY = (e.clientY / window.innerHeight) * 100;
        mousePixelX = e.clientX;
        mousePixelY = e.clientY;
        
        // Add active class when mouse is detected
        if (!document.body.classList.contains('mouse-active')) {
            document.body.classList.add('mouse-active');
        }
    });
    
    // Constellation drawing function
    function drawConstellation() {
        // Clear existing lines
        while (svgCanvas.firstChild) {
            svgCanvas.removeChild(svgCanvas.firstChild);
        }
        
        const maxDistance = 150; // Maximum distance for connection (in pixels)
        const lineOpacityBase = 0.5;
        
        stars.forEach(star => {
            // Get the current position of the star element
            const rect = star.element.getBoundingClientRect();
            const starX = rect.left + rect.width / 2;
            const starY = rect.top + rect.height / 2;
            
            // Calculate distance from mouse to star
            const dx = mousePixelX - starX;
            const dy = mousePixelY - starY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If star is within range, draw a line to the mouse
            if (distance < maxDistance) {
                const line = document.createElementNS(svgNS, 'line');
                line.setAttribute('x1', starX);
                line.setAttribute('y1', starY);
                line.setAttribute('x2', mousePixelX);
                line.setAttribute('y2', mousePixelY);
                
                // Calculate opacity based on distance (closer = more opaque)
                const opacity = (1 - distance / maxDistance) * lineOpacityBase;
                line.setAttribute('stroke', `rgba(147, 197, 253, ${opacity})`);
                line.setAttribute('stroke-width', '1');
                
                svgCanvas.appendChild(line);
                
                // Add glow effect to the star
                star.element.style.boxShadow = `0 0 ${10 - distance / maxDistance * 5}px rgba(147, 197, 253, 0.8)`;
            } else {
                // Remove glow when not connected
                star.element.style.boxShadow = 'none';
            }
        });
        
        // Also connect nearby stars to each other for a more constellation-like effect
        const starConnectDistance = 100; // Distance to connect stars to each other
        for (let i = 0; i < stars.length; i++) {
            for (let j = i + 1; j < stars.length; j++) {
                const rect1 = stars[i].element.getBoundingClientRect();
                const rect2 = stars[j].element.getBoundingClientRect();
                
                const star1X = rect1.left + rect1.width / 2;
                const star1Y = rect1.top + rect1.height / 2;
                const star2X = rect2.left + rect2.width / 2;
                const star2Y = rect2.top + rect2.height / 2;
                
                // Check if both stars are near the mouse
                const dist1ToMouse = Math.sqrt(
                    Math.pow(mousePixelX - star1X, 2) + 
                    Math.pow(mousePixelY - star1Y, 2)
                );
                const dist2ToMouse = Math.sqrt(
                    Math.pow(mousePixelX - star2X, 2) + 
                    Math.pow(mousePixelY - star2Y, 2)
                );
                
                // Only connect stars if both are near the mouse
                if (dist1ToMouse < maxDistance && dist2ToMouse < maxDistance) {
                    const dx = star2X - star1X;
                    const dy = star2Y - star1Y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < starConnectDistance) {
                        const line = document.createElementNS(svgNS, 'line');
                        line.setAttribute('x1', star1X);
                        line.setAttribute('y1', star1Y);
                        line.setAttribute('x2', star2X);
                        line.setAttribute('y2', star2Y);
                        
                        const opacity = (1 - distance / starConnectDistance) * 0.3;
                        line.setAttribute('stroke', `rgba(147, 197, 253, ${opacity})`);
                        line.setAttribute('stroke-width', '0.5');
                        
                        svgCanvas.appendChild(line);
                    }
                }
            }
        }
    }
    
    // Magnetic star attraction effect
    function updateStarMagnetism() {
        const magneticRadius = 150; // Distance at which stars are attracted to mouse
        const attractionStrength = 0.05; // How strongly stars are pulled (reduced for subtlety)
        const springStrength = 0.03; // How strongly stars return to original position (reduced)
        const damping = 0.92; // Reduces velocity over time (makes it smooth, higher = smoother)
        
        stars.forEach(star => {
            // Get star's original position in pixels
            const rect = star.element.getBoundingClientRect();
            const starCenterX = rect.left + rect.width / 2;
            const starCenterY = rect.top + rect.height / 2;
            
            // Calculate distance from mouse to star
            const dx = mousePixelX - starCenterX;
            const dy = mousePixelY - starCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If mouse is within magnetic radius
            if (distance < magneticRadius && distance > 0) {
                // Calculate attraction force (stronger when closer)
                const force = (1 - distance / magneticRadius) * attractionStrength;
                
                // Apply force in direction of mouse
                const angle = Math.atan2(dy, dx);
                star.velocityX += Math.cos(angle) * force * 10;
                star.velocityY += Math.sin(angle) * force * 10;
            }
            
            // Spring force to return to original position
            star.velocityX += -star.currentX * springStrength;
            star.velocityY += -star.currentY * springStrength;
            
            // Apply damping to velocity
            star.velocityX *= damping;
            star.velocityY *= damping;
            
            // Update position
            star.currentX += star.velocityX;
            star.currentY += star.velocityY;
            
            // Apply the transform (combine scroll parallax with magnetic effect)
            star.element.style.transform = `translate3d(${star.currentX}px, ${star.translateY + star.currentY}px, 0)`;
        });
    }
    
    // Smooth animation for the background effect and constellation
    function animate() {
        // Smooth interpolation for natural movement
        const speed = 0.15;
        currentX += (mouseX - currentX) * speed;
        currentY += (mouseY - currentY) * speed;
        
        document.body.style.setProperty('--mouse-x', `${currentX}%`);
        document.body.style.setProperty('--mouse-y', `${currentY}%`);
        
        // Update magnetic star attraction
        updateStarMagnetism();
        
        // Draw constellation lines
        drawConstellation();
        
        requestAnimationFrame(animate);
    }
    
    animate();
    
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav-item');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const targetId = link.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Parallax effect for hero section
    const hero = document.querySelector('.hero');
    
    window.addEventListener('scroll', () => {
        const scrollPosition = window.scrollY;
        
        if (scrollPosition < window.innerHeight) {
            hero.style.transform = `translateY(${scrollPosition * 0.3}px)`;
            hero.style.opacity = 1 - (scrollPosition * 0.002);
        }
    });
    
    // Intersection Observer for section animations
    const animateOnScroll = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    };
    
    const observer = new IntersectionObserver(animateOnScroll, {
        threshold: 0.15,
        rootMargin: '0px 0px -100px 0px'
    });
    
    // Observe sections
    const sections = document.querySelectorAll('section:not(.hero)');
    sections.forEach(section => {
        section.classList.add('section-hidden');
        observer.observe(section);
    });
    
    // Observe timeline items
    const timelineItems = document.querySelectorAll('.timeline-item');
    timelineItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = `all 0.5s ease ${0.1 + index * 0.1}s`;
        
        observer.observe(item);
    });
    
    // Observe skill categories
    const skillCategories = document.querySelectorAll('.skill-category');
    skillCategories.forEach((category, index) => {
        category.style.opacity = '0';
        category.style.transform = 'translateY(20px)';
        category.style.transition = `all 0.5s ease ${0.1 + index * 0.1}s`;
        
        observer.observe(category);
    });
    
    // Observe project cards
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `all 0.5s ease ${0.1 + index * 0.1}s`;
        
        observer.observe(card);
    });
    
    // Add the animate-in CSS
    const style = document.createElement('style');
    style.textContent = `
        .section-hidden {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.8s ease;
        }
        
        .animate-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
    
    // Handle contact form submission (just prevent default for now)
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(contactForm);
            const formObject = Object.fromEntries(formData.entries());
            
            // Show success message (in a real application, you would send this data to a server)
            alert('Thank you for your message! This is a demo form, so no message was actually sent.');
            
            // Reset the form
            contactForm.reset();
        });
    }
    
    // Add a subtle parallax effect to project cards
    projectCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const xPercent = x / rect.width - 0.5;
            const yPercent = y / rect.height - 0.5;
            
            card.style.transform = `perspective(1000px) rotateY(${xPercent * 5}deg) rotateX(${yPercent * -5}deg)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateY(0) rotateX(0)';
        });
    });
    
    // Initialize header behavior (transparent at top, solid on scroll)
    const header = document.querySelector('header');
    
    const updateHeader = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };
    
    window.addEventListener('scroll', updateHeader);
    updateHeader(); // Initial check
    
    // Add the header style for scrolled state
    const headerStyle = document.createElement('style');
    headerStyle.textContent = `
        header.scrolled {
            background-color: rgba(0, 0, 0, 0.3);
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        }
    `;
    document.head.appendChild(headerStyle);
    
    // Add active state to navigation based on scroll position
    const updateActiveNav = () => {
        const scrollPosition = window.scrollY + 150;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    };
    
    // Add the active nav style
    const activeNavStyle = document.createElement('style');
    activeNavStyle.textContent = `
        .nav-item.active {
            color: var(--text-primary);
        }
        
        .nav-item.active::after {
            width: 100%;
        }
    `;
    document.head.appendChild(activeNavStyle);
    
    window.addEventListener('scroll', updateActiveNav);
    updateActiveNav(); // Initial check
    
    // Add typing animation to the hero section subtitle
    const animateTitle = () => {
        const heroTitle = document.querySelector('.hero h1');
        if (heroTitle) {
            heroTitle.style.opacity = '1';
        }
    };
    
    // Trigger the animation after a short delay
    setTimeout(animateTitle, 500);
}); 