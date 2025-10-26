document.addEventListener('DOMContentLoaded', () => {
    // Create stars container
    const starsContainer = document.createElement('div');
    starsContainer.id = 'stars-container';
    document.body.insertBefore(starsContainer, document.body.firstChild);
    
    // Generate stars with scroll-based movement
    const stars = [];
    
    function createStars() {
        const numberOfStars = 60;
        
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
                translateY: 0 // Track Y position directly instead of parsing
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
            
            // Apply transform using translate3d for better Safari performance
            star.element.style.transform = `translate3d(0, ${star.translateY}px, 0)`;
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
    
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth) * 100;
        mouseY = (e.clientY / window.innerHeight) * 100;
        
        // Add active class when mouse is detected
        if (!document.body.classList.contains('mouse-active')) {
            document.body.classList.add('mouse-active');
        }
    });
    
    // Smooth animation for the background effect
    function animate() {
        // Smooth interpolation for natural movement
        const speed = 0.15;
        currentX += (mouseX - currentX) * speed;
        currentY += (mouseY - currentY) * speed;
        
        document.body.style.setProperty('--mouse-x', `${currentX}%`);
        document.body.style.setProperty('--mouse-y', `${currentY}%`);
        
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
    
    // Projects horizontal scroll with arrow buttons
    const projectsGrid = document.querySelector('.projects-grid');
    const scrollLeftBtn = document.getElementById('scrollLeft');
    const scrollRightBtn = document.getElementById('scrollRight');
    
    if (projectsGrid && scrollLeftBtn && scrollRightBtn) {
        // Function to update arrow visibility based on scroll position
        const updateArrowVisibility = () => {
            const scrollLeft = projectsGrid.scrollLeft;
            const maxScroll = projectsGrid.scrollWidth - projectsGrid.clientWidth;
            
            // Show left arrow if not at the start
            if (scrollLeft > 10) {
                scrollLeftBtn.classList.add('visible');
            } else {
                scrollLeftBtn.classList.remove('visible');
            }
            
            // Show right arrow if not at the end
            if (scrollLeft < maxScroll - 10) {
                scrollRightBtn.classList.add('visible');
            } else {
                scrollRightBtn.classList.remove('visible');
            }
        };
        
        // Initial check
        updateArrowVisibility();
        
        // Update on scroll
        projectsGrid.addEventListener('scroll', updateArrowVisibility);
        
        // Update on window resize
        window.addEventListener('resize', updateArrowVisibility);
        
        // Scroll left button click
        scrollLeftBtn.addEventListener('click', () => {
            const scrollAmount = projectsGrid.clientWidth * 0.8;
            projectsGrid.scrollBy({
                left: -scrollAmount,
                behavior: 'smooth'
            });
        });
        
        // Scroll right button click
        scrollRightBtn.addEventListener('click', () => {
            const scrollAmount = projectsGrid.clientWidth * 0.8;
            projectsGrid.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
            });
        });
    }
}); 