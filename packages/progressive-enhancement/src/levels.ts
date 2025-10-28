/**
 * Enhancement Level Definitions
 * Defines what features are available at each capability level
 */

import type { Enhancement, CapabilityLevel } from './types';

/**
 * Core enhancement definitions organized by capability level
 */
export const ENHANCEMENT_LEVELS: Record<CapabilityLevel, Enhancement[]> = {
  basic: [
    {
      id: 'basic-forms',
      name: 'Basic Form Enhancement',
      level: 'basic',
      requires: ['javascript'],
      script: `
        // Basic form validation and submission
        document.addEventListener('submit', function(e) {
          if (e.target.hasAttribute('data-validate')) {
            // Basic validation logic
            const required = e.target.querySelectorAll('[required]');
            for (const field of required) {
              if (!field.value.trim()) {
                e.preventDefault();
                field.focus();
                return false;
              }
            }
          }
        });
      `,
      priority: 1,
    },
    {
      id: 'basic-toggles',
      name: 'Basic Toggle Elements',
      level: 'basic',
      requires: ['javascript'],
      script: `
        // Basic show/hide toggles
        document.addEventListener('click', function(e) {
          if (e.target.hasAttribute('data-toggle')) {
            const target = document.querySelector(e.target.getAttribute('data-toggle'));
            if (target) {
              target.style.display = target.style.display === 'none' ? '' : 'none';
            }
          }
        });
      `,
      priority: 2,
    },
    {
      id: 'basic-navigation',
      name: 'Basic Navigation Enhancement',
      level: 'basic',
      requires: ['javascript'],
      script: `
        // Basic navigation helpers
        document.addEventListener('click', function(e) {
          if (e.target.hasAttribute('data-nav')) {
            const action = e.target.getAttribute('data-nav');
            if (action === 'back') {
              window.history.back();
            } else if (action === 'forward') {
              window.history.forward();
            }
          }
        });
      `,
      priority: 3,
    },
  ],

  enhanced: [
    {
      id: 'enhanced-animations',
      name: 'CSS Transition Animations',
      level: 'enhanced',
      requires: ['javascript', 'cssCustomProperties'],
      styles: `
        .fade-in { opacity: 0; transition: opacity 0.3s ease; }
        .fade-in.visible { opacity: 1; }
        .slide-in { transform: translateY(20px); opacity: 0; transition: all 0.3s ease; }
        .slide-in.visible { transform: translateY(0); opacity: 1; }
      `,
      script: `
        // Enhanced animations with CSS transitions
        function animateIn(element, className = 'fade-in') {
          element.classList.add(className);
          requestAnimationFrame(() => {
            element.classList.add('visible');
          });
        }
        
        // Auto-animate elements on scroll
        const animateElements = document.querySelectorAll('[data-animate]');
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const animation = entry.target.getAttribute('data-animate') || 'fade-in';
              animateIn(entry.target, animation);
              observer.unobserve(entry.target);
            }
          });
        });
        
        animateElements.forEach(el => observer.observe(el));
      `,
      priority: 1,
      conditions: [
        { feature: 'intersectionObserver', operator: 'exists' }
      ],
    },
    {
      id: 'enhanced-forms',
      name: 'Enhanced Form Validation',
      level: 'enhanced',
      requires: ['javascript', 'promises'],
      script: `
        // Enhanced form validation with better UX
        class FormValidator {
          constructor(form) {
            this.form = form;
            this.setupValidation();
          }
          
          setupValidation() {
            this.form.addEventListener('submit', this.handleSubmit.bind(this));
            this.form.addEventListener('input', this.handleInput.bind(this));
          }
          
          async handleSubmit(e) {
            e.preventDefault();
            const isValid = await this.validateForm();
            if (isValid) {
              this.submitForm();
            }
          }
          
          handleInput(e) {
            if (e.target.hasAttribute('data-validate')) {
              this.validateField(e.target);
            }
          }
          
          async validateForm() {
            const fields = this.form.querySelectorAll('[data-validate]');
            const results = await Promise.all(
              Array.from(fields).map(field => this.validateField(field))
            );
            return results.every(result => result);
          }
          
          async validateField(field) {
            const rules = field.getAttribute('data-validate').split(',');
            for (const rule of rules) {
              const isValid = await this.applyRule(field, rule.trim());
              if (!isValid) {
                this.showFieldError(field, rule);
                return false;
              }
            }
            this.clearFieldError(field);
            return true;
          }
          
          async applyRule(field, rule) {
            switch (rule) {
              case 'required': return field.value.trim() !== '';
              case 'email': return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(field.value);
              case 'url': return /^https?:\\/\\/.+/.test(field.value);
              default: return true;
            }
          }
          
          showFieldError(field, rule) {
            field.classList.add('error');
            field.setAttribute('aria-invalid', 'true');
          }
          
          clearFieldError(field) {
            field.classList.remove('error');
            field.removeAttribute('aria-invalid');
          }
          
          async submitForm() {
            // Enhanced form submission
            const formData = new FormData(this.form);
            // Submit via fetch if available, fallback to normal submission
            if (window.fetch) {
              try {
                await fetch(this.form.action, {
                  method: this.form.method,
                  body: formData
                });
              } catch {
                this.form.submit();
              }
            } else {
              this.form.submit();
            }
          }
        }
        
        // Initialize enhanced forms
        document.querySelectorAll('form[data-enhanced]').forEach(form => {
          new FormValidator(form);
        });
      `,
      priority: 2,
    },
  ],

  modern: [
    {
      id: 'modern-components',
      name: 'Modern Web Components',
      level: 'modern',
      requires: ['javascript', 'webComponents', 'modules'],
      script: `
        // Modern web components for interactive elements
        class InteractiveButton extends HTMLElement {
          connectedCallback() {
            this.addEventListener('click', this.handleClick);
            this.setAttribute('role', 'button');
            this.setAttribute('tabindex', '0');
          }
          
          handleClick() {
            const action = this.getAttribute('data-action');
            const target = this.getAttribute('data-target');
            
            switch (action) {
              case 'toggle':
                this.toggleTarget(target);
                break;
              case 'fetch':
                this.fetchContent(target);
                break;
              case 'scroll':
                this.scrollToTarget(target);
                break;
            }
          }
          
          toggleTarget(selector) {
            const target = document.querySelector(selector);
            if (target) {
              target.hidden = !target.hidden;
              this.setAttribute('aria-expanded', (!target.hidden).toString());
            }
          }
          
          async fetchContent(url) {
            try {
              const response = await fetch(url);
              const content = await response.text();
              const target = document.querySelector(this.getAttribute('data-output'));
              if (target) {
                target.innerHTML = content;
              }
            } catch (error) {
              console.warn('Failed to fetch content:', error);
            }
          }
          
          scrollToTarget(selector) {
            const target = document.querySelector(selector);
            if (target) {
              target.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }
        
        customElements.define('interactive-button', InteractiveButton);
      `,
      priority: 1,
    },
    {
      id: 'modern-lazy-loading',
      name: 'Modern Lazy Loading',
      level: 'modern',
      requires: ['javascript', 'intersectionObserver', 'fetchAPI'],
      script: `
        // Modern lazy loading with Intersection Observer
        class LazyLoader {
          constructor() {
            this.observer = new IntersectionObserver(
              this.handleIntersection.bind(this),
              { rootMargin: '50px' }
            );
            this.init();
          }
          
          init() {
            document.querySelectorAll('[data-lazy]').forEach(element => {
              this.observer.observe(element);
            });
          }
          
          handleIntersection(entries) {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                this.loadElement(entry.target);
                this.observer.unobserve(entry.target);
              }
            });
          }
          
          async loadElement(element) {
            const type = element.getAttribute('data-lazy');
            const src = element.getAttribute('data-src');
            
            switch (type) {
              case 'image':
                await this.loadImage(element, src);
                break;
              case 'content':
                await this.loadContent(element, src);
                break;
              case 'script':
                await this.loadScript(element, src);
                break;
            }
          }
          
          loadImage(img, src) {
            return new Promise((resolve, reject) => {
              const image = new Image();
              image.onload = () => {
                img.src = src;
                img.classList.add('loaded');
                resolve();
              };
              image.onerror = reject;
              image.src = src;
            });
          }
          
          async loadContent(element, url) {
            try {
              const response = await fetch(url);
              const content = await response.text();
              element.innerHTML = content;
              element.classList.add('loaded');
            } catch (error) {
              element.classList.add('error');
            }
          }
          
          loadScript(element, src) {
            return new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.onload = resolve;
              script.onerror = reject;
              script.src = src;
              document.head.appendChild(script);
            });
          }
        }
        
        new LazyLoader();
      `,
      priority: 2,
    },
  ],

  'cutting-edge': [
    {
      id: 'cutting-edge-performance',
      name: 'Performance Optimized Components',
      level: 'cutting-edge',
      requires: ['javascript', 'webWorkers', 'serviceWorker', 'modules'],
      script: `
        // Cutting-edge performance optimizations
        class PerformanceOptimizer {
          constructor() {
            this.setupServiceWorker();
            this.setupWebWorkers();
            this.setupPreloading();
          }
          
          async setupServiceWorker() {
            if ('serviceWorker' in navigator) {
              try {
                await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered');
              } catch (error) {
                console.warn('Service Worker registration failed:', error);
              }
            }
          }
          
          setupWebWorkers() {
            // Use web workers for heavy computations
            const heavyTasks = document.querySelectorAll('[data-compute]');
            heavyTasks.forEach(element => {
              element.addEventListener('click', () => {
                this.runInWorker(element.getAttribute('data-compute'));
              });
            });
          }
          
          runInWorker(taskType) {
            const worker = new Worker('/workers/compute-worker.js');
            worker.postMessage({ type: taskType });
            worker.onmessage = (e) => {
              console.log('Worker result:', e.data);
              worker.terminate();
            };
          }
          
          setupPreloading() {
            // Intelligent resource preloading
            const links = document.querySelectorAll('a[href]');
            const preloadObserver = new IntersectionObserver((entries) => {
              entries.forEach(entry => {
                if (entry.isIntersecting) {
                  this.preloadLink(entry.target.href);
                }
              });
            });
            
            links.forEach(link => preloadObserver.observe(link));
          }
          
          preloadLink(url) {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            document.head.appendChild(link);
          }
        }
        
        new PerformanceOptimizer();
      `,
      priority: 1,
    },
    {
      id: 'cutting-edge-interactive',
      name: 'Advanced Interaction Patterns',
      level: 'cutting-edge',
      requires: ['javascript', 'webAnimations', 'webComponents'],
      script: `
        // Advanced interaction patterns with Web Animations API
        class AdvancedInteractions {
          constructor() {
            this.setupGestureHandlers();
            this.setupAdvancedAnimations();
          }
          
          setupGestureHandlers() {
            document.addEventListener('touchstart', this.handleTouchStart.bind(this));
            document.addEventListener('touchmove', this.handleTouchMove.bind(this));
            document.addEventListener('touchend', this.handleTouchEnd.bind(this));
          }
          
          setupAdvancedAnimations() {
            document.querySelectorAll('[data-animate-advanced]').forEach(element => {
              this.setupElementAnimation(element);
            });
          }
          
          setupElementAnimation(element) {
            const animationType = element.getAttribute('data-animate-advanced');
            const trigger = element.getAttribute('data-trigger') || 'click';
            
            element.addEventListener(trigger, () => {
              this.playAdvancedAnimation(element, animationType);
            });
          }
          
          playAdvancedAnimation(element, type) {
            let keyframes;
            let options = { duration: 300, easing: 'ease-out' };
            
            switch (type) {
              case 'bounce':
                keyframes = [
                  { transform: 'scale(1)', offset: 0 },
                  { transform: 'scale(1.1)', offset: 0.5 },
                  { transform: 'scale(1)', offset: 1 }
                ];
                break;
              case 'shake':
                keyframes = [
                  { transform: 'translateX(0)', offset: 0 },
                  { transform: 'translateX(-10px)', offset: 0.25 },
                  { transform: 'translateX(10px)', offset: 0.75 },
                  { transform: 'translateX(0)', offset: 1 }
                ];
                break;
              case 'pulse':
                keyframes = [
                  { opacity: 1, offset: 0 },
                  { opacity: 0.7, offset: 0.5 },
                  { opacity: 1, offset: 1 }
                ];
                break;
            }
            
            if (keyframes) {
              element.animate(keyframes, options);
            }
          }
          
          handleTouchStart(e) {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
          }
          
          handleTouchMove(e) {
            if (!this.touchStartX || !this.touchStartY) return;
            
            const touchEndX = e.touches[0].clientX;
            const touchEndY = e.touches[0].clientY;
            
            const deltaX = this.touchStartX - touchEndX;
            const deltaY = this.touchStartY - touchEndY;
            
            // Detect swipe gestures
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
              if (deltaX > 50) {
                this.handleSwipe('left', e.target);
              } else if (deltaX < -50) {
                this.handleSwipe('right', e.target);
              }
            }
          }
          
          handleTouchEnd() {
            this.touchStartX = null;
            this.touchStartY = null;
          }
          
          handleSwipe(direction, target) {
            const swipeAction = target.getAttribute(\`data-swipe-\${direction}\`);
            if (swipeAction) {
              // Execute swipe action
              eval(swipeAction);
            }
          }
        }
        
        new AdvancedInteractions();
      `,
      priority: 2,
    },
  ],
};

/**
 * Get enhancements for a specific capability level
 */
export function getEnhancementsForLevel(level: CapabilityLevel): Enhancement[] {
  const enhancements: Enhancement[] = [];
  
  // Include all enhancements up to and including the current level
  const levels: CapabilityLevel[] = ['basic', 'enhanced', 'modern', 'cutting-edge'];
  const levelIndex = levels.indexOf(level);

  for (let i = 0; i <= levelIndex; i++) {
    const currentLevel = levels[i];
    if (currentLevel) {
      enhancements.push(...ENHANCEMENT_LEVELS[currentLevel]);
    }
  }
  
  return enhancements.sort((a, b) => a.priority - b.priority);
}

/**
 * Get fallback enhancements for when a capability is missing
 */
export function getFallbackEnhancements(
  targetLevel: CapabilityLevel,
  missingCapabilities: string[]
): Enhancement[] {
  const fallbacks: Enhancement[] = [];
  
  // Find enhancements that don't require the missing capabilities
  for (const enhancement of getEnhancementsForLevel(targetLevel)) {
    const hasAllRequirements = enhancement.requires.every(
      req => !missingCapabilities.includes(req)
    );
    
    if (hasAllRequirements) {
      fallbacks.push(enhancement);
    }
  }
  
  return fallbacks;
}

/**
 * Filter enhancements based on capability conditions
 */
export function filterEnhancementsByConditions(
  enhancements: Enhancement[],
  capabilities: Record<string, any>
): Enhancement[] {
  return enhancements.filter(enhancement => {
    if (!enhancement.conditions) return true;
    
    return enhancement.conditions.every(condition => {
      const value = capabilities[condition.feature];
      
      switch (condition.operator) {
        case 'exists':
          return value !== undefined && value !== null;
        case 'equals':
          return value === condition.value;
        case 'greaterThan':
          return typeof value === 'number' && value > condition.value;
        case 'lessThan':
          return typeof value === 'number' && value < condition.value;
        case 'matches':
          return typeof value === 'string' && new RegExp(condition.value).test(value);
        default:
          return true;
      }
    });
  });
}