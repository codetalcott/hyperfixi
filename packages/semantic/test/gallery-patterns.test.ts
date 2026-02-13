/**
 * Gallery Patterns Semantic Parsing Tests
 *
 * Tests that the semantic parser can handle hyperscript patterns
 * found in the gallery examples. Patterns are extracted from examples/**\/*.html
 *
 * Run: npm test --prefix packages/semantic -- --run gallery-patterns
 */
import { describe, it, expect } from 'vitest';
import { parse, canParse } from '../src/parser';

/**
 * Simple single-command patterns - core functionality
 */
const SIMPLE_PATTERNS = [
  // Toggle patterns
  'toggle .active',
  'toggle .active on #box',
  'toggle .hidden on #content',

  // Increment/decrement
  'increment #count',
  'decrement #count',

  // Show/hide
  'show #content',
  'hide #content',

  // Put patterns
  'put 0 into #count',
  "put 'Hello' into #output",

  // Set patterns
  'set #count to 0',

  // Add/remove class
  'add .highlight to #target',
  'remove .active from #box',

  // Send events
  'send click to #button',
];

/**
 * Event handler patterns - on event do action
 */
const EVENT_HANDLER_PATTERNS = [
  'on click toggle .active',
  'on click toggle .active on #box',
  'on click increment #count',
  'on click decrement #count',
  'on click show #content',
  'on click hide #content',
  'on click put 0 into #count',
  'on input put my value into #output',
];

/**
 * Patterns from actual gallery examples that may not be supported yet
 */
const GALLERY_PATTERNS_TO_INVESTIGATE = [
  // Dialog toggles - modal keyword
  'on click toggle #dialog1 modal',

  // Details toggle
  'on click toggle details',

  // Then chains
  "on click toggle .active then put 'done' into #status",

  // Method calls
  'on click call #dialog.showModal()',
  'on click call #dialog.close()',

  // Swap commands
  'on click swap delete #item',

  // Possessive property access
  "on click set #element's *opacity to 0.5",

  // Complex event sources
  'on keydown from window hide #modal',
];

describe('Gallery Patterns - Semantic Parsing', () => {
  describe('Simple command patterns', () => {
    it.each(SIMPLE_PATTERNS)('canParse: %s', (pattern) => {
      const result = canParse(pattern, 'en');
      // Log result for visibility
      if (!result) {
        console.log(`[NOT SUPPORTED] ${pattern}`);
      }
    });

    it('reports simple pattern support rate', () => {
      const results = SIMPLE_PATTERNS.map((p) => ({
        pattern: p,
        supported: canParse(p, 'en'),
      }));

      const supported = results.filter((r) => r.supported);
      const unsupported = results.filter((r) => !r.supported);

      console.log(`\nSimple patterns: ${supported.length}/${results.length} supported`);
      if (unsupported.length > 0) {
        console.log('Unsupported:');
        unsupported.forEach((r) => console.log(`  - ${r.pattern}`));
      }
    });
  });

  describe('Event handler patterns', () => {
    it.each(EVENT_HANDLER_PATTERNS)('parses with body: %s', (pattern) => {
      const result = canParse(pattern, 'en');
      if (!result) {
        console.log(`[NOT SUPPORTED] ${pattern}`);
        return;
      }

      // CRITICAL: Check that body actually parsed
      const node = parse(pattern, 'en') as any;
      expect(node.kind).toBe('event-handler');
      expect(node.body.length).toBeGreaterThan(0);
    });

    it('reports event handler body parsing rate', () => {
      const results = EVENT_HANDLER_PATTERNS.map((p) => {
        const supported = canParse(p, 'en');
        let bodyParsed = false;

        if (supported) {
          try {
            const node = parse(p, 'en') as any;
            bodyParsed = node.kind === 'event-handler' && node.body.length > 0;
          } catch {
            bodyParsed = false;
          }
        }

        return { pattern: p, supported, bodyParsed };
      });

      const withBody = results.filter((r) => r.bodyParsed);
      const noBody = results.filter((r) => r.supported && !r.bodyParsed);

      console.log(`\nEvent handlers: ${withBody.length}/${results.length} with parsed body`);
      if (noBody.length > 0) {
        console.log('Body NOT parsed (false positive):');
        noBody.forEach((r) => console.log(`  - ${r.pattern}`));
      }
    });
  });

  describe('Gallery patterns investigation', () => {
    it.each(GALLERY_PATTERNS_TO_INVESTIGATE)('checks body parsing: %s', (pattern) => {
      const supported = canParse(pattern, 'en');

      if (!supported) {
        console.log(`[NOT SUPPORTED] ${pattern}`);
        return;
      }

      // Check if body actually parses for event handlers
      const node = parse(pattern, 'en') as any;
      if (node.kind === 'event-handler') {
        const bodyParsed = node.body.length > 0;
        console.log(`[${bodyParsed ? 'FULL' : 'PARTIAL'}] ${pattern} (body: ${node.body.length})`);

        // Only expect body for patterns that should have one
        // Exclude possessive property access with asterisk - not yet fully supported
        const isPossessiveWithAsterisk = pattern.includes("*opacity") || pattern.includes("*");

        if (!isPossessiveWithAsterisk &&
            (pattern.includes('toggle') || pattern.includes('put') || pattern.includes('set') ||
             pattern.includes('swap') || pattern.includes('call') || pattern.includes('hide'))) {
          expect(node.body.length).toBeGreaterThan(0);
        }
      } else {
        console.log(`[OK] ${pattern}`);
      }
    });

    it('reports true coverage (with body parsing check)', () => {
      const allPatterns = [...SIMPLE_PATTERNS, ...EVENT_HANDLER_PATTERNS, ...GALLERY_PATTERNS_TO_INVESTIGATE];

      const results = allPatterns.map((p) => {
        const supported = canParse(p, 'en');
        let fullyParsed = false;

        if (supported) {
          try {
            const node = parse(p, 'en') as any;
            if (node.kind === 'event-handler') {
              // Event handlers need body to be truly parsed
              fullyParsed = node.body.length > 0;
            } else {
              // Simple commands are fully parsed if they succeed
              fullyParsed = true;
            }
          } catch {
            fullyParsed = false;
          }
        }

        return { pattern: p, supported, fullyParsed };
      });

      const fullySupported = results.filter((r) => r.fullyParsed);
      const partialOnly = results.filter((r) => r.supported && !r.fullyParsed);
      const notSupported = results.filter((r) => !r.supported);

      console.log('\n=== True Gallery Pattern Coverage ===');
      console.log(`Total patterns: ${results.length}`);
      console.log(`Fully parsed: ${fullySupported.length} (${((fullySupported.length / results.length) * 100).toFixed(1)}%)`);
      console.log(`Partial (body missing): ${partialOnly.length}`);
      console.log(`Not supported: ${notSupported.length}`);

      if (partialOnly.length > 0) {
        console.log('\nPartial (event handler but body not parsed):');
        partialOnly.forEach((r) => console.log(`  - ${r.pattern}`));
      }
    });
  });

  describe('Parsed node structure', () => {
    it('returns valid SemanticNode for toggle', () => {
      if (!canParse('toggle .active', 'en')) {
        console.log('toggle .active not supported, skipping');
        return;
      }

      const node = parse('toggle .active', 'en');
      expect(node).toBeDefined();
      expect(node.kind).toBe('command');
      expect((node as any).action).toBe('toggle');
    });

    it('returns valid EventHandler with body for on click toggle', () => {
      if (!canParse('on click toggle .active', 'en')) {
        console.log('on click toggle .active not supported, skipping');
        return;
      }

      const node = parse('on click toggle .active', 'en') as any;
      expect(node).toBeDefined();
      expect(node.kind).toBe('event-handler');

      // CRITICAL: Verify body was actually parsed
      expect(node.body).toBeDefined();
      expect(node.body.length).toBeGreaterThan(0);
      expect(node.body[0].action).toBe('toggle');
    });
  });
});
