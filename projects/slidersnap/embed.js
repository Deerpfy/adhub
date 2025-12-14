/**
 * Image Compare - Embed Script
 * Standalone JS for before/after image comparison slider
 * https://deerpfy.github.io/adhub/projects/slidersnap-offline/
 */

(function() {
    'use strict';

    function initImageCompare(container) {
        const images = container.querySelectorAll('img');
        if (images.length < 2) return;

        const beforeImg = images[0];
        const afterImg = images[1];
        const isVertical = container.dataset.orientation === 'vertical';
        const startPosition = parseInt(container.dataset.position) || 50;
        const beforeLabel = beforeImg.dataset.label || 'Before';
        const afterLabel = afterImg.dataset.label || 'After';

        // Clear container
        container.innerHTML = '';

        // Create structure
        const afterDiv = document.createElement('div');
        afterDiv.className = 'image-compare__after';
        afterDiv.appendChild(afterImg.cloneNode(true));

        const beforeDiv = document.createElement('div');
        beforeDiv.className = 'image-compare__before';
        beforeDiv.appendChild(beforeImg.cloneNode(true));

        const handle = document.createElement('div');
        handle.className = 'image-compare__handle';
        handle.innerHTML = `
            <div class="image-compare__handle-circle">
                <div class="image-compare__arrows">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="${isVertical ? 'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z' : 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z'}"/>
                    </svg>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="${isVertical ? 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z' : 'M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z'}"/>
                    </svg>
                </div>
            </div>
        `;

        const labelBefore = document.createElement('div');
        labelBefore.className = 'image-compare__label image-compare__label--before';
        labelBefore.textContent = beforeLabel;

        const labelAfter = document.createElement('div');
        labelAfter.className = 'image-compare__label image-compare__label--after';
        labelAfter.textContent = afterLabel;

        container.appendChild(afterDiv);
        container.appendChild(beforeDiv);
        container.appendChild(handle);
        container.appendChild(labelBefore);
        container.appendChild(labelAfter);

        if (isVertical) {
            container.classList.add('vertical');
        }

        // Set initial position
        setPosition(startPosition);

        // Event handlers
        let isDragging = false;

        function setPosition(percent) {
            percent = Math.max(0, Math.min(100, percent));
            if (isVertical) {
                beforeDiv.style.clipPath = `inset(0 0 ${100 - percent}% 0)`;
                handle.style.top = percent + '%';
                handle.style.left = '0';
                handle.style.transform = 'translateY(-50%)';
            } else {
                beforeDiv.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
                handle.style.left = percent + '%';
                handle.style.top = '0';
                handle.style.transform = 'translateX(-50%)';
            }
        }

        function getPosition(e) {
            const rect = container.getBoundingClientRect();
            if (isVertical) {
                const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
                return (y / rect.height) * 100;
            } else {
                const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
                return (x / rect.width) * 100;
            }
        }

        container.addEventListener('mousedown', function(e) {
            e.preventDefault();
            isDragging = true;
            setPosition(getPosition(e));
        });

        document.addEventListener('mousemove', function(e) {
            if (isDragging) {
                e.preventDefault();
                setPosition(getPosition(e));
            }
        });

        document.addEventListener('mouseup', function() {
            isDragging = false;
        });

        container.addEventListener('touchstart', function(e) {
            e.preventDefault();
            isDragging = true;
            setPosition(getPosition(e));
        }, { passive: false });

        container.addEventListener('touchmove', function(e) {
            if (isDragging) {
                e.preventDefault();
                setPosition(getPosition(e));
            }
        }, { passive: false });

        container.addEventListener('touchend', function() {
            isDragging = false;
        });

        // Set aspect ratio based on image
        const img = beforeImg.cloneNode(true);
        img.onload = function() {
            const ratio = img.naturalHeight / img.naturalWidth;
            container.style.paddingBottom = (ratio * 100) + '%';
        };
        if (img.complete) {
            const ratio = img.naturalHeight / img.naturalWidth;
            container.style.paddingBottom = (ratio * 100) + '%';
        }
    }

    // Initialize all sliders on page
    function init() {
        document.querySelectorAll('.image-compare').forEach(initImageCompare);
    }

    // Run on DOMContentLoaded or immediately if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export for manual initialization
    window.ImageCompare = { init: init, initSlider: initImageCompare };
})();
