import { JSDOM } from 'jsdom';
import { CriticalCSSExtractor as ICriticalCSSExtractor } from './types';

/**
 * Critical CSS extraction for above-the-fold content
 */
export class CriticalCSSExtractor implements ICriticalCSSExtractor {
  private viewport = { width: 1200, height: 800 };

  /**
   * Set viewport dimensions for critical CSS extraction
   */
  setViewport(width: number, height: number): void {
    this.viewport = { width, height };
  }

  /**
   * Extract critical CSS from HTML and stylesheets
   */
  async extract(
    html: string,
    css: string[]
  ): Promise<{
    critical: string;
    remaining: string;
    coverage: number;
  }> {
    try {
      // Create virtual DOM
      const dom = new JSDOM(html, {
        resources: 'usable',
        runScripts: 'dangerously',
      });

      const document = dom.window.document;
      const window = dom.window;

      // Set viewport
      Object.defineProperty(window, 'innerWidth', { value: this.viewport.width });
      Object.defineProperty(window, 'innerHeight', { value: this.viewport.height });

      // Combine all CSS
      const allCSS = css.join('\n');

      // Parse CSS rules
      const cssRules = this.parseCSS(allCSS);

      // Determine which rules are critical
      const criticalRules: string[] = [];
      const remainingRules: string[] = [];
      let totalRules = cssRules.length;
      let criticalCount = 0;

      for (const rule of cssRules) {
        if (this.isRuleCritical(rule, document, window)) {
          criticalRules.push(rule);
          criticalCount++;
        } else {
          remainingRules.push(rule);
        }
      }

      const critical = criticalRules.join('\n');
      const remaining = remainingRules.join('\n');
      const coverage = totalRules > 0 ? (criticalCount / totalRules) * 100 : 0;

      // Cleanup
      dom.window.close();

      return {
        critical,
        remaining,
        coverage,
      };
    } catch (error) {
      console.warn('Critical CSS extraction failed:', error);

      // Fallback: return all CSS as critical
      return {
        critical: css.join('\n'),
        remaining: '',
        coverage: 100,
      };
    }
  }

  /**
   * Parse CSS string into individual rules
   */
  private parseCSS(css: string): string[] {
    const rules: string[] = [];
    let current = '';
    let braceCount = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < css.length; i++) {
      const char = css[i];
      const prevChar = css[i - 1];

      current += char;

      // Handle strings
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }

      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;

          if (braceCount === 0) {
            // End of rule
            const rule = current.trim();
            if (rule && !rule.startsWith('/*') && !rule.startsWith('@import')) {
              rules.push(rule);
            }
            current = '';
          }
        }
      }
    }

    // Handle any remaining content
    if (current.trim()) {
      rules.push(current.trim());
    }

    return rules;
  }

  /**
   * Determine if a CSS rule is critical (affects above-the-fold content)
   */
  private isRuleCritical(rule: string, document: Document, window: Window): boolean {
    try {
      // Extract selector from rule
      const selectorMatch = rule.match(/^([^{]+)\{/);
      if (!selectorMatch) {
        return false;
      }

      const selector = selectorMatch[1].trim();

      // Skip certain rule types
      if (
        selector.startsWith('@media') ||
        selector.startsWith('@keyframes') ||
        selector.startsWith('@font-face')
      ) {
        return this.isMediaQueryCritical(rule, window);
      }

      // Split multiple selectors
      const selectors = selector.split(',').map(s => s.trim());

      for (const sel of selectors) {
        if (this.isSelectorCritical(sel, document, window)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      // If we can't parse the rule, consider it critical to be safe
      return true;
    }
  }

  /**
   * Check if a CSS selector matches critical elements
   */
  private isSelectorCritical(selector: string, document: Document, window: Window): boolean {
    try {
      // Always include certain selectors
      const alwaysCritical = [
        'html',
        'body',
        '*',
        ':root',
        'head',
        'meta',
        'title',
        'link',
        'style',
      ];

      const normalizedSelector = selector.replace(/::?[a-z-]+/g, '').trim();

      if (alwaysCritical.some(critical => normalizedSelector.startsWith(critical))) {
        return true;
      }

      // Try to query the DOM
      const elements = document.querySelectorAll(normalizedSelector);

      if (elements.length === 0) {
        return false;
      }

      // Check if any matching elements are in the critical area
      for (const element of Array.from(elements)) {
        if (this.isElementCritical(element as Element, window)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      // If selector is invalid, skip it
      return false;
    }
  }

  /**
   * Check if an element is in the critical above-the-fold area
   */
  private isElementCritical(element: Element, window: Window): boolean {
    // Always include certain elements
    const alwaysCritical = ['html', 'body', 'head', 'meta', 'title', 'link', 'style'];

    if (alwaysCritical.includes(element.tagName.toLowerCase())) {
      return true;
    }

    // Check if element has display: none or visibility: hidden
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
      return false;
    }

    // Get element position
    const rect = element.getBoundingClientRect();

    // Element is critical if any part is visible in viewport
    return (
      rect.top < this.viewport.height &&
      rect.bottom > 0 &&
      rect.left < this.viewport.width &&
      rect.right > 0
    );
  }

  /**
   * Check if a media query is critical
   */
  private isMediaQueryCritical(rule: string, window: Window): boolean {
    // Extract media query
    const mediaMatch = rule.match(/@media\s+([^{]+)\{/);
    if (!mediaMatch) {
      return false;
    }

    const mediaQuery = mediaMatch[1].trim();

    // Always include certain media queries
    const alwaysCritical = [
      'screen',
      'all',
      '(prefers-reduced-motion',
      '(prefers-color-scheme',
      'print and (max-width: 0)', // This will never match, so safe to include
    ];

    if (alwaysCritical.some(critical => mediaQuery.includes(critical))) {
      return true;
    }

    try {
      // Test if media query matches current viewport
      return window.matchMedia(mediaQuery).matches;
    } catch (error) {
      // If media query is invalid, consider it critical to be safe
      return true;
    }
  }
}
