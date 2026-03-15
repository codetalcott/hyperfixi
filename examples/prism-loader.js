/**
 * Prism.js + prism-hyperscript-i18n Loader for LokaScript Examples Gallery
 *
 * Auto-highlights code blocks with Prism's hyperscript language support.
 * Handles both pure hyperscript and HTML with embedded hyperscript.
 *
 * Usage:
 *   <script src="../prism-loader.js"></script>
 *   <!-- Code blocks with .code class will be auto-highlighted -->
 */

(function () {
  'use strict';

  const PRISM_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js';

  // Calculate path to prism-hyperscript-i18n based on current location
  function getPrismHyperfixiPath() {
    const path = window.location.pathname;

    if (path.includes('/examples/')) {
      const afterExamples = path.split('/examples/')[1] || '';
      const depth = (afterExamples.match(/\//g) || []).length;

      if (depth === 0) {
        // examples/index.html
        return '../packages/developer-tools/dist/prism-hyperscript-i18n/browser.mjs';
      } else if (depth === 1) {
        // examples/basics/01-hello.html
        return '../../packages/developer-tools/dist/prism-hyperscript-i18n/browser.mjs';
      } else {
        // deeper nesting
        return '../'.repeat(depth + 1) + 'packages/developer-tools/dist/prism-hyperscript-i18n/browser.mjs';
      }
    }

    // Fallback
    return '/packages/developer-tools/dist/prism-hyperscript-i18n/browser.mjs';
  }

  // Load Prism from CDN
  function loadPrism() {
    return new Promise((resolve, reject) => {
      if (window.Prism) {
        resolve(window.Prism);
        return;
      }
      const script = document.createElement('script');
      script.src = PRISM_CDN;
      script.onload = () => resolve(window.Prism);
      script.onerror = () => reject(new Error('Failed to load Prism.js'));
      document.head.appendChild(script);
    });
  }

  // Load prism-hyperscript-i18n plugin
  function loadPrismHyperfixi() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = getPrismHyperfixiPath();
      script.onload = () => {
        // Brief delay to ensure registration completes
        setTimeout(resolve, 50);
      };
      script.onerror = () => reject(new Error('Failed to load prism-hyperscript-i18n'));
      document.head.appendChild(script);
    });
  }

  // Extract text content, unescaping HTML entities
  function unescapeHtml(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  }

  // Strip existing span tags but keep their text content
  function stripSpans(html) {
    return html.replace(/<span[^>]*>/g, '').replace(/<\/span>/g, '');
  }

  // Detect if content is pure hyperscript or HTML with hyperscript
  function detectContentType(text) {
    const trimmed = text.trim();
    // Pure hyperscript starts with event/command keywords
    if (/^(on|init|set|put|add|remove|toggle|wait|call|go|trigger|send|take|log|repeat|for|if|behavior)\s/i.test(trimmed)) {
      return 'hyperscript';
    }
    // Attribute-style: _="..." or _='...' - extract and highlight the hyperscript inside
    if (/^_\s*=\s*["']/.test(trimmed)) {
      return 'attribute-hyperscript';
    }
    // HTML content contains angle brackets
    if (trimmed.includes('<') && trimmed.includes('>')) {
      return 'html-hyperscript';
    }
    return 'hyperscript';
  }

  // Highlight a single code block
  function highlightCodeBlock(codeElement) {
    // Get the raw text by stripping existing spans and unescaping HTML entities
    const rawHtml = codeElement.innerHTML;
    const stripped = stripSpans(rawHtml);
    const text = unescapeHtml(stripped);

    const contentType = detectContentType(text);

    if (contentType === 'hyperscript' && window.Prism.languages.hyperscript) {
      // Pure hyperscript - highlight with prism-hyperscript-i18n
      codeElement.textContent = text;
      codeElement.classList.add('language-hyperscript');
      window.Prism.highlightElement(codeElement);
    } else if (contentType === 'attribute-hyperscript' && window.Prism.languages.hyperscript) {
      // _="..." pattern - extract hyperscript and highlight it
      const match = text.trim().match(/^(_\s*=\s*)(["'])([\s\S]*)\2$/);
      if (match) {
        const prefix = match[1]; // _= or _ =
        const quote = match[2];  // " or '
        const hsCode = match[3]; // the hyperscript code
        const highlighted = window.Prism.highlight(hsCode, window.Prism.languages.hyperscript, 'hyperscript');
        codeElement.innerHTML = `<span class="token attr-name">${prefix.trim()}</span><span class="token punctuation">${quote}</span>${highlighted}<span class="token punctuation">${quote}</span>`;
        codeElement.classList.add('language-hyperscript');
      }
    } else if (contentType === 'html-hyperscript') {
      // HTML with embedded hyperscript - keep as-is but highlight attribute values
      codeElement.textContent = text;
      codeElement.classList.add('language-markup');
      window.Prism.highlightElement(codeElement);

      // Post-process: enhance _="..." attribute values with hyperscript highlighting
      enhanceHyperscriptAttributes(codeElement);
    }
  }

  // Enhance _="..." attribute values in already-highlighted HTML
  function enhanceHyperscriptAttributes(element) {
    if (!window.Prism.languages.hyperscript) return;

    // Find string tokens that contain hyperscript
    const attrValueTokens = element.querySelectorAll('.token.attr-value');
    attrValueTokens.forEach(token => {
      const text = token.textContent;
      // Check if this looks like a hyperscript attribute value
      // Prism may include the = in the attr-value, so check for both patterns
      const match = text.match(/^(=?)(["'])(on\s|init|set\s|put\s|toggle\s|add\s|remove\s|wait\s|call\s)/i);
      if (match) {
        const hasEquals = match[1] === '=';
        const quoteChar = match[2];
        // Extract the hyperscript code (skip = and quotes)
        const startIndex = hasEquals ? 2 : 1;
        const hsCode = text.slice(startIndex, -1);
        const highlighted = window.Prism.highlight(hsCode, window.Prism.languages.hyperscript, 'hyperscript');
        // Rebuild with optional = and quotes
        const prefix = hasEquals ? '<span class="token punctuation">=</span>' : '';
        token.innerHTML = `${prefix}<span class="token punctuation">${quoteChar}</span>${highlighted}<span class="token punctuation">${quoteChar}</span>`;
        token.classList.add('hs-attribute-value');
      }
    });
  }

  // Main initialization
  async function init() {
    try {
      await loadPrism();
      await loadPrismHyperfixi();

      // Find all code blocks and highlight them
      const codeBlocks = document.querySelectorAll('.code');
      codeBlocks.forEach(highlightCodeBlock);

      console.log(`[prism-loader] Highlighted ${codeBlocks.length} code block(s)`);
    } catch (error) {
      console.error('[prism-loader] Failed to load:', error.message);
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
