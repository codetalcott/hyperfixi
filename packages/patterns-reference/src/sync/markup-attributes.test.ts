import { describe, it, expect } from 'vitest';
import {
  findHyperscriptAttributes,
  spliceHyperscriptAttributes,
  isMarkupRow,
  reRenderPreservesContent,
} from './markup-attributes';

const COMPONENT = `<script type="text/hyperscript-template" component="click-counter" _="set ^count to 0">
  <button _="on click increment ^count">+</button>
  <span>Clicks: \${^count}</span>
</script>`;

describe('markup attribute extraction', () => {
  it('finds every `_=` body in source order, and nothing else', () => {
    expect(findHyperscriptAttributes(COMPONENT).map(s => s.body)).toEqual([
      'set ^count to 0',
      'on click increment ^count',
    ]);
  });

  it('offsets address exactly the value, so a splice touches nothing else', () => {
    const spans = findHyperscriptAttributes(COMPONENT);
    for (const span of spans) {
      expect(COMPONENT.slice(span.start, span.end)).toBe(span.body);
      expect(COMPONENT[span.start - 1]).toMatch(/["']/); // opening quote
      expect(COMPONENT[span.end]).toMatch(/["']/); // closing quote
    }
  });

  it('does not match a look-alike attribute or an interpolation', () => {
    expect(findHyperscriptAttributes('<b data_x="on click toggle .a">x</b>')).toEqual([]);
    expect(findHyperscriptAttributes('<span>total: ${_ = 5}</span>')).toEqual([]);
  });

  it('finds a double-quoted value containing single-quoted string literals', () => {
    // The shape of `component-with-conditional`: a hyperscript string literal
    // lives inside the double-quoted attribute.
    const markup = `<script component="user-card" _="set ^user to {name: 'Demo', admin: true}">x</script>`;
    expect(findHyperscriptAttributes(markup).map(s => s.body)).toEqual([
      "set ^user to {name: 'Demo', admin: true}",
    ]);
    const spans = findHyperscriptAttributes(markup);
    expect(markup.slice(spans[0].start, spans[0].end)).toBe(spans[0].body);
  });

  it('finds a single-quoted value containing double-quoted string literals', () => {
    const markup = `<b _='put "hi" into me'>x</b>`;
    expect(findHyperscriptAttributes(markup).map(s => s.body)).toEqual(['put "hi" into me']);
  });

  it('handles single-quoted values', () => {
    expect(findHyperscriptAttributes(`<b _='toggle .a'>x</b>`).map(s => s.body)).toEqual([
      'toggle .a',
    ]);
  });

  it('splices replacements and leaves every other byte identical', () => {
    const spans = findHyperscriptAttributes(COMPONENT);
    const out = spliceHyperscriptAttributes(COMPONENT, spans, [
      '^count を 0 に 設定',
      'クリック で ^count を 増加',
    ]);
    expect(out).toContain('_="^count を 0 に 設定"');
    expect(out).toContain('_="クリック で ^count を 増加"');
    // Markup, indentation, inner text and the other attributes are untouched.
    expect(out).toContain('<script type="text/hyperscript-template" component="click-counter"');
    expect(out).toContain('  <span>Clicks: ${^count}</span>');
    expect(out.replace(/_="[^"]*"/g, '_=""')).toBe(COMPONENT.replace(/_="[^"]*"/g, '_=""'));
  });

  it('an identity splice reproduces the input byte for byte', () => {
    const spans = findHyperscriptAttributes(COMPONENT);
    expect(
      spliceHyperscriptAttributes(
        COMPONENT,
        spans,
        spans.map(s => s.body)
      )
    ).toBe(COMPONENT);
  });

  it('refuses a replacement-count mismatch rather than splicing the wrong span', () => {
    const spans = findHyperscriptAttributes(COMPONENT);
    expect(() => spliceHyperscriptAttributes(COMPONENT, spans, ['only one'])).toThrow(
      /2 spans but 1 replacements/
    );
  });
});

describe('markup row detection', () => {
  it('recognises markup, and does not mistake a selector literal for it', () => {
    expect(isMarkupRow(COMPONENT)).toBe(true);
    expect(isMarkupRow('<div sse-connect="/events"></div>')).toBe(true);
    expect(isMarkupRow('on click toggle .active')).toBe(false);
    expect(isMarkupRow('focus first <button/> in .modal')).toBe(false);
  });
});

describe('content-preserving re-render guard', () => {
  it('accepts a re-render that only re-spaces punctuation', () => {
    expect(
      reRenderPreservesContent(
        "set ^user to {name: 'Demo', admin: true}",
        "set ^user to { name : 'Demo' , admin : true }"
      )
    ).toBe(true);
  });

  it('rejects a re-render that DROPS content (the `as JSON` truncation)', () => {
    expect(
      reRenderPreservesContent('set ^user to attrs.data as JSON', 'set ^user to attrs.data')
    ).toBe(false);
  });

  it('accepts an exact round trip', () => {
    expect(reRenderPreservesContent('set ^count to 0', 'set ^count to 0')).toBe(true);
  });
});
