/**
 * Pattern Loader Tests
 *
 * Covers isHtmlMarkupPattern: the guard that keeps HTML-markup patterns out of
 * the semantic-parse denominator (they're validated by the DOM/Playwright
 * suites, not the hyperscript text parser).
 */
import { describe, it, expect } from 'vitest';
import { isHtmlMarkupPattern } from './html-pattern';

describe('isHtmlMarkupPattern', () => {
  it('flags HTML-markup patterns (excluded from semantic parsing)', () => {
    const htmlPatterns = [
      '<div hx-live="put $count into me"></div>',
      '<div sse-connect="/events" sse-swap="tick" hx-target="#feed"></div>',
      '<div ws-connect="wss://example/api"><form ws-send></form></div>',
      '<script type="text/hyperscript-template" component="hello-world"><span>Hi</span></script>',
      '  <button _="on click increment ^count">+</button>', // leading whitespace
    ];
    for (const code of htmlPatterns) {
      expect(isHtmlMarkupPattern(code), code).toBe(true);
    }
  });

  it('does not flag real hyperscript source', () => {
    const hyperscript = [
      'toggle .active on #button',
      'on click increment $count',
      'put :x into me',
      'bind $greeting to #name-input',
      'live put `Count: ${$count}` into me end',
      'fetch /api/data as json then put it into #out',
      '#count を 増加', // SOV, non-Latin
    ];
    for (const code of hyperscript) {
      expect(isHtmlMarkupPattern(code), code).toBe(false);
    }
  });
});
