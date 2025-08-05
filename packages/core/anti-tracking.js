/**
 * Anti-Tracking Script for HyperFixi
 * Blocks third-party tracking calls from bat.bing.com, j.clarity, api.getkoala.com
 */

(function() {
    'use strict';
    
    const BLOCKED_DOMAINS = [
        'bat.bing.com',
        'j.clarity',
        'api.getkoala.com',
        'clarity.ms',
        'koala.com',
        'microsoft.com/clarity',
        'getkoala.com'
    ];
    
    const BLOCKED_KEYWORDS = [
        'clarity',
        'koala',
        'microsoft-clarity',
        'msclarita',
        'bat.bing'
    ];
    
    function isBlocked(url) {
        const urlString = url.toString().toLowerCase();
        return BLOCKED_DOMAINS.some(domain => urlString.includes(domain)) ||
               BLOCKED_KEYWORDS.some(keyword => urlString.includes(keyword));
    }
    
    function logBlock(type, url) {
        console.warn(`🚫 HYPERFIXI BLOCKED ${type}:`, url);
    }
    
    // Block fetch requests
    if (window.fetch) {
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            if (isBlocked(url)) {
                logBlock('FETCH', url);
                return Promise.reject(new Error('Request blocked by HyperFixi anti-tracking'));
            }
            return originalFetch.call(this, url, options);
        };
    }
    
    // Block XMLHttpRequest
    if (window.XMLHttpRequest) {
        const OriginalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new OriginalXHR();
            const originalOpen = xhr.open;
            
            xhr.open = function(method, url, async, user, password) {
                if (isBlocked(url)) {
                    logBlock('XHR', url);
                    throw new Error('Request blocked by HyperFixi anti-tracking');
                }
                return originalOpen.call(this, method, url, async, user, password);
            };
            
            return xhr;
        };
    }
    
    // Block dynamic script insertion  
    if (document.createElement) {
        const originalCreateElement = document.createElement;
        document.createElement = function(tagName) {
            const element = originalCreateElement.call(this, tagName);
            
            if (tagName.toLowerCase() === 'script') {
                const originalSetAttribute = element.setAttribute;
                element.setAttribute = function(name, value) {
                    if (name === 'src' && isBlocked(value)) {
                        logBlock('SCRIPT', value);
                        return; // Block the script
                    }
                    return originalSetAttribute.call(this, name, value);
                };
                
                // Also intercept direct src assignment
                let srcValue = '';
                Object.defineProperty(element, 'src', {
                    get: function() { return srcValue; },
                    set: function(value) {
                        if (isBlocked(value)) {
                            logBlock('SCRIPT SRC', value);
                            return;
                        }
                        srcValue = value;
                        originalSetAttribute.call(this, 'src', value);
                    }
                });
            }
            
            return element;
        };
    }
    
    // Block image requests (pixel tracking)
    if (window.Image) {
        const OriginalImage = window.Image;
        window.Image = function() {
            const img = new OriginalImage();
            let srcValue = '';
            
            Object.defineProperty(img, 'src', {
                get: function() { return srcValue; },
                set: function(value) {
                    if (isBlocked(value)) {
                        logBlock('IMAGE', value);
                        return;
                    }
                    srcValue = value;
                    OriginalImage.prototype.src = value;
                }
            });
            
            return img;
        };
    }
    
    // Block iframe insertions
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Check script tags
                    if (node.tagName === 'SCRIPT' && node.src && isBlocked(node.src)) {
                        logBlock('DYNAMIC SCRIPT', node.src);
                        node.remove();
                    }
                    
                    // Check iframe tags  
                    if (node.tagName === 'IFRAME' && node.src && isBlocked(node.src)) {
                        logBlock('IFRAME', node.src);
                        node.remove();
                    }
                    
                    // Check for nested blocked elements
                    const blockedScripts = node.querySelectorAll ? node.querySelectorAll('script[src]') : [];
                    blockedScripts.forEach(function(script) {
                        if (isBlocked(script.src)) {
                            logBlock('NESTED SCRIPT', script.src);
                            script.remove();
                        }
                    });
                }
            });
        });
    });
    
    // Start observing
    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            observer.observe(document.body, { childList: true, subtree: true });
        });
    }
    
    // Also observe head for script insertions
    if (document.head) {
        observer.observe(document.head, { childList: true, subtree: true });
    }
    
    console.log('🛡️ HyperFixi anti-tracking protection activated');
    console.log('🚫 Blocked domains:', BLOCKED_DOMAINS.join(', '));
    
})();