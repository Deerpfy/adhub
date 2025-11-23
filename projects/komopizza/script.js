// ===== NAVIGATION INTERACTIVITY =====
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-link');

// Toggle mobile menu
hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close menu when clicking on a link
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// ===== SMOOTH SCROLLING =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// ===== NAVBAR SCROLL EFFECT =====
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
    } else {
        navbar.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    }
    
    lastScroll = currentScroll;
});

// ===== MENU ITEM INTERACTIVITY =====
const menuItems = document.querySelectorAll('.menu-item');

menuItems.forEach(item => {
    // Add hover effect with animation
    item.addEventListener('mouseenter', function() {
        const icon = this.querySelector('.menu-icon');
        const svg = this.querySelector('svg');
        
        if (svg) {
            // Animate SVG elements
            const elements = svg.querySelectorAll('circle, rect');
            elements.forEach((el, index) => {
                setTimeout(() => {
                    el.style.transform = 'scale(1.1)';
                    setTimeout(() => {
                        el.style.transform = 'scale(1)';
                    }, 200);
                }, index * 50);
            });
        }
    });

    // Click effect
    item.addEventListener('click', function() {
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = '';
        }, 150);
    });
});

// ===== INTERSECTION OBSERVER FOR ANIMATIONS =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe menu items
menuItems.forEach(item => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(30px)';
    item.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(item);
});

// Observe contact cards
const contactCards = document.querySelectorAll('.contact-card');
contactCards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(card);
});

// ===== PIZZA ICON ROTATION ANIMATION =====
const pizzaIconsInteractive = document.querySelectorAll('.pizza-icon-interactive');
pizzaIconsInteractive.forEach(icon => {
    icon.addEventListener('mouseenter', function() {
        const svg = this.querySelector('svg');
        if (svg) {
            svg.style.animation = 'rotate 2s linear infinite';
        }
    });
    
    icon.addEventListener('mouseleave', function() {
        const svg = this.querySelector('svg');
        if (svg) {
            svg.style.animation = '';
        }
    });
});

// ===== PIZZA ICON PULSE ANIMATION =====
const pizzaIcons = document.querySelectorAll('.pizza-icon-interactive');
pizzaIcons.forEach(icon => {
    icon.addEventListener('mouseenter', function() {
        const svg = this.querySelector('svg');
        if (svg) {
            svg.style.animation = 'pulse 1s ease-in-out infinite';
        }
    });
    
    icon.addEventListener('mouseleave', function() {
        const svg = this.querySelector('svg');
        if (svg) {
            svg.style.animation = '';
        }
    });
});

// Add pulse animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.05);
        }
    }
`;
document.head.appendChild(style);

// ===== PERFORMANCE OPTIMIZATION =====
// Debounce function for scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Optimized scroll handler
const optimizedScrollHandler = debounce(() => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
    } else {
        navbar.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    }
}, 10);

window.addEventListener('scroll', optimizedScrollHandler);

// ===== LAZY LOADING FOR IMAGES (if added later) =====
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            }
        });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ===== STYLE SWITCHER =====
const styleSwitcher = document.getElementById('styleSwitcher');
const styleToggle = document.getElementById('styleToggle');
const styleButtons = document.querySelectorAll('.style-btn');
const body = document.body;

// Load saved theme
const savedTheme = localStorage.getItem('komopizza-theme') || '1';
// Remove default theme-1 if saved theme is different
if (savedTheme !== '1') {
    body.classList.remove('theme-1');
    body.classList.add(`theme-${savedTheme}`);
}
// Ensure valid theme (1-11)
if (parseInt(savedTheme) < 1 || parseInt(savedTheme) > 11) {
    body.classList.remove(`theme-${savedTheme}`);
    body.classList.add('theme-1');
    updateActiveButton('1');
} else {
    updateActiveButton(savedTheme);
}

// Toggle style switcher
styleToggle.addEventListener('click', () => {
    const isOpen = styleSwitcher.classList.toggle('open');
    if (isOpen) {
        styleToggle.classList.add('panel-open');
    } else {
        styleToggle.classList.remove('panel-open');
    }
});

// Style button click handlers
styleButtons.forEach(button => {
    button.addEventListener('click', () => {
        const theme = button.getAttribute('data-theme');
        changeTheme(theme);
        styleSwitcher.classList.remove('open');
        styleToggle.classList.remove('panel-open');
    });
});

function changeTheme(theme) {
    // Remove all theme classes
    body.classList.remove('theme-1', 'theme-2', 'theme-3', 'theme-4', 'theme-5', 
                          'theme-6', 'theme-7', 'theme-8', 'theme-9', 'theme-10', 'theme-11');
    
    // Add new theme class
    body.classList.add(`theme-${theme}`);
    
    // Update active button
    updateActiveButton(theme);
    
    // Save to localStorage
    localStorage.setItem('komopizza-theme', theme);
    
    // Log theme change
    console.log(`%cStyl změněn na: ${theme}`, 'color: #4a90e2; font-weight: bold;');
}

function updateActiveButton(theme) {
    styleButtons.forEach(btn => {
        if (btn.getAttribute('data-theme') === theme) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Close style switcher when clicking outside
document.addEventListener('click', (e) => {
    if (!styleSwitcher.contains(e.target) && !styleToggle.contains(e.target)) {
        styleSwitcher.classList.remove('open');
        styleToggle.classList.remove('panel-open');
    }
});

// Keyboard navigation for style switcher
document.addEventListener('keydown', (e) => {
    // Alt + 1-9, Alt + 0 for theme 10, or Alt + - for theme 11 to switch themes
    if (e.altKey && ((e.key >= '1' && e.key <= '9') || e.key === '0' || e.key === '-')) {
        e.preventDefault();
        let theme;
        if (e.key === '0') {
            theme = '10';
        } else if (e.key === '-') {
            theme = '11';
        } else {
            theme = e.key;
        }
        changeTheme(theme);
    }
    
    // Escape to close style switcher
    if (e.key === 'Escape') {
        styleSwitcher.classList.remove('open');
        styleToggle.classList.remove('panel-open');
    }
});

// ===== CONSOLE GREETING =====
console.log('%c🥙 Komopizza - Nejlepší kebab! 🥙', 'color: #ff6b35; font-size: 20px; font-weight: bold;');
console.log('%cVítejte na našich webových stránkách!', 'color: #666; font-size: 14px;');
console.log('%cTip: Použijte Alt + 1-9, Alt + 0 nebo Alt + - pro rychlé přepínání stylů', 'color: #4a90e2; font-size: 12px; font-style: italic;');

