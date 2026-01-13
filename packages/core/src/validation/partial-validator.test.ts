/**
 * Tests for Partial Template Validator
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  validatePartialContent,
  configurePartialValidation,
  resetPartialValidationConfig,
  getPartialValidationConfig,
} from './partial-validator';

describe('validatePartialContent', () => {
  beforeEach(() => {
    // Reset config before each test
    resetPartialValidationConfig();
    // Enable validation for tests (may be disabled in production mode detection)
    configurePartialValidation({ enabled: true });
  });

  afterEach(() => {
    resetPartialValidationConfig();
  });

  describe('critical layout elements', () => {
    it('should detect <html> element as critical issue', () => {
      const html = '<html><body><div>content</div></body></html>';
      const result = validatePartialContent(html, '#target');

      expect(result.valid).toBe(false);
      expect(result.bySeverity.critical.length).toBeGreaterThan(0);
      expect(result.issues.some(i => i.element === 'html')).toBe(true);
      expect(result.shouldProceed).toBe(true); // Non-blocking
    });

    it('should detect <body> element as critical issue', () => {
      const html = '<body><div>content</div></body>';
      const result = validatePartialContent(html, '#target');

      expect(result.valid).toBe(false);
      expect(result.bySeverity.critical.some(i => i.element === 'body')).toBe(true);
    });

    it('should detect <head> element as critical issue', () => {
      const html = '<head><title>Title</title></head><div>content</div>';
      const result = validatePartialContent(html, '#target');

      expect(result.valid).toBe(false);
      expect(result.bySeverity.critical.some(i => i.element === 'head')).toBe(true);
    });

    it('should detect DOCTYPE as critical issue', () => {
      const html = '<!DOCTYPE html><div>content</div>';
      const result = validatePartialContent(html, '#target');

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.element === 'DOCTYPE')).toBe(true);
    });
  });

  describe('structural semantic elements', () => {
    it('should detect <header> as structural issue in standard mode', () => {
      const html = '<header><nav>Navigation</nav></header>';
      const result = validatePartialContent(html, '#main-content');

      expect(result.bySeverity.structural.some(i => i.element === 'header')).toBe(true);
      expect(result.valid).toBe(true); // Structural issues don't make result invalid
    });

    it('should detect <footer> as structural issue', () => {
      const html = '<footer><p>Footer content</p></footer>';
      const result = validatePartialContent(html, '#main-content');

      expect(result.bySeverity.structural.some(i => i.element === 'footer')).toBe(true);
    });

    it('should detect <main> as structural issue', () => {
      const html = '<main><article>Content</article></main>';
      const result = validatePartialContent(html, '#content');

      expect(result.bySeverity.structural.some(i => i.element === 'main')).toBe(true);
    });

    it('should detect <nav> as structural issue', () => {
      const html = '<nav><ul><li>Link</li></ul></nav>';
      const result = validatePartialContent(html, '#sidebar');

      expect(result.bySeverity.structural.some(i => i.element === 'nav')).toBe(true);
    });

    it('should detect <aside> as structural issue', () => {
      const html = '<aside><p>Sidebar content</p></aside>';
      const result = validatePartialContent(html, '#content');

      expect(result.bySeverity.structural.some(i => i.element === 'aside')).toBe(true);
    });

    it('should not detect structural elements in relaxed mode', () => {
      configurePartialValidation({ strictness: 'relaxed' });

      const html = '<header><nav>Navigation</nav></header>';
      const result = validatePartialContent(html, '#main-content');

      expect(result.bySeverity.structural.length).toBe(0);
    });

    it('should treat structural elements as critical in strict mode', () => {
      configurePartialValidation({ strictness: 'strict' });

      const html = '<header><nav>Navigation</nav></header>';
      const result = validatePartialContent(html, '#main-content');

      expect(result.bySeverity.critical.some(i => i.element === 'header')).toBe(true);
      expect(result.valid).toBe(false);
    });
  });

  describe('warning elements (strict mode only)', () => {
    it('should not detect <title> in standard mode', () => {
      const html = '<title>Page Title</title><div>content</div>';
      const result = validatePartialContent(html, '#target');

      expect(result.bySeverity.warning.length).toBe(0);
    });

    it('should detect <title> in strict mode', () => {
      configurePartialValidation({ strictness: 'strict' });

      const html = '<title>Page Title</title><div>content</div>';
      const result = validatePartialContent(html, '#target');

      expect(result.bySeverity.warning.some(i => i.element === 'title')).toBe(true);
    });

    it('should detect <meta> in strict mode', () => {
      configurePartialValidation({ strictness: 'strict' });

      const html = '<meta charset="utf-8"><div>content</div>';
      const result = validatePartialContent(html, '#target');

      expect(result.bySeverity.warning.some(i => i.element === 'meta')).toBe(true);
    });
  });

  describe('valid partial content', () => {
    it('should pass validation for simple div content', () => {
      const html = '<div class="card"><p>Content here</p></div>';
      const result = validatePartialContent(html, '#target');

      expect(result.valid).toBe(true);
      expect(result.totalIssues).toBe(0);
    });

    it('should pass validation for article content', () => {
      const html = '<article><h2>Title</h2><p>Paragraph</p></article>';
      const result = validatePartialContent(html, '#target');

      expect(result.valid).toBe(true);
      expect(result.bySeverity.critical.length).toBe(0);
    });

    it('should pass validation for form content', () => {
      const html = '<form><input type="text"><button>Submit</button></form>';
      const result = validatePartialContent(html, '#target');

      expect(result.valid).toBe(true);
    });
  });

  describe('configuration options', () => {
    it('should respect enabled flag', () => {
      configurePartialValidation({ enabled: false });

      const html = '<html><body>content</body></html>';
      const result = validatePartialContent(html, '#target');

      expect(result.valid).toBe(true);
      expect(result.totalIssues).toBe(0);
    });

    it('should respect ignoredElements', () => {
      configurePartialValidation({ ignoredElements: ['header', 'footer'] });

      const html = '<header><nav>Nav</nav></header><footer>Footer</footer>';
      const result = validatePartialContent(html, '#target');

      expect(result.issues.some(i => i.element === 'header')).toBe(false);
      expect(result.issues.some(i => i.element === 'footer')).toBe(false);
    });

    it('should respect ignoredTargets', () => {
      configurePartialValidation({ ignoredTargets: ['#modal-*', '#popup-container'] });

      const html = '<html><body>content</body></html>';
      const result = validatePartialContent(html, '#modal-login');

      expect(result.valid).toBe(true);
      expect(result.totalIssues).toBe(0);
    });

    it('should detect additionalCriticalElements', () => {
      configurePartialValidation({ additionalCriticalElements: ['app-shell'] });

      const html = '<app-shell><div>content</div></app-shell>';
      const result = validatePartialContent(html, '#target');

      expect(result.valid).toBe(false);
      expect(result.bySeverity.critical.some(i => i.element === 'app-shell')).toBe(true);
    });

    it('should detect additionalStructuralElements', () => {
      configurePartialValidation({ additionalStructuralElements: ['app-sidebar'] });

      const html = '<app-sidebar><ul>Links</ul></app-sidebar>';
      const result = validatePartialContent(html, '#target');

      expect(result.bySeverity.structural.some(i => i.element === 'app-sidebar')).toBe(true);
    });
  });

  describe('target overrides', () => {
    it('should apply target-specific overrides', () => {
      configurePartialValidation({
        targetOverrides: [
          {
            target: '#full-page-container',
            config: { enabled: false },
          },
        ],
      });

      // Regular target gets validated
      const result1 = validatePartialContent('<html>content</html>', '#regular');
      expect(result1.valid).toBe(false);

      // Overridden target skips validation
      const result2 = validatePartialContent('<html>content</html>', '#full-page-container');
      expect(result2.valid).toBe(true);
      expect(result2.totalIssues).toBe(0);
    });

    it('should support wildcard patterns in target overrides', () => {
      configurePartialValidation({
        targetOverrides: [
          {
            target: '#modal-*',
            config: { strictness: 'relaxed' },
          },
        ],
      });

      // Modal targets use relaxed mode
      const html = '<header>Header in modal</header>';
      const result = validatePartialContent(html, '#modal-login');

      expect(result.bySeverity.structural.length).toBe(0);
    });
  });

  describe('issue count tracking', () => {
    it('should count multiple instances of same element', () => {
      const html = '<header>H1</header><footer>F1</footer>';
      const result = validatePartialContent(html, '#target');

      expect(result.totalIssues).toBe(2);
    });

    it('should count multiple instances of same element correctly', () => {
      const html = '<div><nav>Nav 1</nav></div><div><nav>Nav 2</nav></div>';
      const result = validatePartialContent(html, '#target');

      const navIssue = result.issues.find(i => i.element === 'nav');
      expect(navIssue?.count).toBe(2);
    });
  });

  describe('issue content', () => {
    it('should include target selector in issue', () => {
      const html = '<html>content</html>';
      const result = validatePartialContent(html, '#my-target');

      const issue = result.issues[0];
      expect(issue.targetSelector).toBe('#my-target');
    });

    it('should include message and suggestion', () => {
      const html = '<body>content</body>';
      const result = validatePartialContent(html, '#target');

      const issue = result.bySeverity.critical[0];
      expect(issue.message).toBeDefined();
      expect(issue.message.length).toBeGreaterThan(0);
      expect(issue.suggestion).toBeDefined();
      expect(issue.suggestion.length).toBeGreaterThan(0);
    });
  });

  describe('custom validator', () => {
    it('should call custom validator and include its issues', () => {
      configurePartialValidation({
        customValidator: (html, target) => {
          if (html.includes('dangerous')) {
            return [
              {
                severity: 'warning',
                category: 'script-style',
                element: 'custom',
                message: 'Custom validation detected dangerous content',
                suggestion: 'Review the content',
                targetSelector: target,
                count: 1,
              },
            ];
          }
          return [];
        },
      });

      const html = '<div>Some dangerous content</div>';
      const result = validatePartialContent(html, '#target');

      expect(result.issues.some(i => i.element === 'custom')).toBe(true);
    });
  });
});

describe('getPartialValidationConfig', () => {
  beforeEach(() => {
    resetPartialValidationConfig();
  });

  it('should return default configuration', () => {
    const config = getPartialValidationConfig();

    expect(config.showWarnings).toBe(true);
    expect(config.strictness).toBe('standard');
  });

  it('should reflect configuration changes', () => {
    configurePartialValidation({ strictness: 'strict', showWarnings: false });

    const config = getPartialValidationConfig();

    expect(config.strictness).toBe('strict');
    expect(config.showWarnings).toBe(false);
  });
});

/**
 * Real-world regression tests
 *
 * These tests are based on actual bugs discovered in production.
 * They validate that our partial validation system would catch these issues.
 */
describe('real-world regression tests', () => {
  beforeEach(() => {
    resetPartialValidationConfig();
    configurePartialValidation({ enabled: true });
  });

  afterEach(() => {
    resetPartialValidationConfig();
  });

  /**
   * Regression test for: patterns-browser duplicate nav bug (commit e36862f)
   *
   * The bug: Pattern cards used `fetch '/patterns/${id}' as html` then
   * `morph #main with it`, but the endpoint returned a FULL PAGE (with
   * <header>, <nav>, <main>) instead of a partial. This caused duplicate
   * nav menus to appear.
   *
   * Fix: Changed pattern cards to use standard <a> links with CSS View Transitions.
   *
   * Our validation should catch this by detecting <header>, <nav>, and <main>
   * when morphing content into #main.
   */
  describe('patterns-browser duplicate nav (commit e36862f)', () => {
    it('should detect full page response morphed into #main', () => {
      // Simulates what /patterns/:id returned (a full page, not a partial)
      const fullPageResponse = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Pattern Details</title>
        </head>
        <body>
          <header class="navbar">
            <nav>
              <a href="/" class="brand">HyperFixi Patterns</a>
              <div class="nav-links">
                <a href="/patterns">Patterns</a>
                <a href="/translations">Translations</a>
              </div>
            </nav>
          </header>
          <main id="main">
            <article class="pattern-detail">
              <h1>Toggle Class Pattern</h1>
              <p>This pattern demonstrates toggling a CSS class.</p>
            </article>
          </main>
          <footer>
            <p>© 2024 HyperFixi</p>
          </footer>
        </body>
        </html>
      `;

      // Validate as if morphing into #main (the actual bug scenario)
      const result = validatePartialContent(fullPageResponse, '#main');

      // Should detect critical issues (DOCTYPE, html, body, head)
      expect(result.valid).toBe(false);
      expect(result.bySeverity.critical.length).toBeGreaterThan(0);

      // Check specific critical elements
      expect(result.issues.some(i => i.element === 'DOCTYPE')).toBe(true);
      expect(result.issues.some(i => i.element === 'html')).toBe(true);
      expect(result.issues.some(i => i.element === 'body')).toBe(true);
      expect(result.issues.some(i => i.element === 'head')).toBe(true);

      // Should also detect structural issues (header, nav, main, footer)
      expect(result.bySeverity.structural.some(i => i.element === 'header')).toBe(true);
      expect(result.bySeverity.structural.some(i => i.element === 'nav')).toBe(true);
      expect(result.bySeverity.structural.some(i => i.element === 'main')).toBe(true);
      expect(result.bySeverity.structural.some(i => i.element === 'footer')).toBe(true);

      // In standard mode, should have many issues
      expect(result.totalIssues).toBeGreaterThanOrEqual(8); // At least 4 critical + 4 structural
    });

    it('should pass validation for correct partial response', () => {
      // This is what the endpoint SHOULD have returned (just the content)
      const properPartialResponse = `
        <article class="pattern-detail">
          <h1>Toggle Class Pattern</h1>
          <p>This pattern demonstrates toggling a CSS class.</p>
          <div class="code-example">
            <pre><code>on click toggle .active</code></pre>
          </div>
        </article>
      `;

      const result = validatePartialContent(properPartialResponse, '#main');

      // Should pass validation - no layout or semantic landmark elements
      expect(result.valid).toBe(true);
      expect(result.totalIssues).toBe(0);
    });

    it('should provide helpful suggestions for the bug scenario', () => {
      const fullPageResponse =
        '<header><nav>Nav</nav></header><main><article>Content</article></main>';
      const result = validatePartialContent(fullPageResponse, '#main');

      // Find the header issue
      const headerIssue = result.issues.find(i => i.element === 'header');
      expect(headerIssue).toBeDefined();
      expect(headerIssue?.suggestion).toBeDefined();
      expect(headerIssue?.suggestion.length).toBeGreaterThan(0);

      // Find the main issue
      const mainIssue = result.issues.find(i => i.element === 'main');
      expect(mainIssue).toBeDefined();
      expect(mainIssue?.targetSelector).toBe('#main');
    });
  });
});
