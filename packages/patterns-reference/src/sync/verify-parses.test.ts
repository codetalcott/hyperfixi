import { describe, expect, it } from 'vitest';
import { hyperscriptBodies } from './markup-attributes';
import { verifyParses } from './verify-parses';

const COMPONENT = `<script type="text/hyperscript-template" component="click-counter" _="set ^count to 0">
  <button _="on click increment ^count">+</button>
  <span>Clicks: \${^count}</span>
</script>`;

describe('hyperscriptBodies', () => {
  it('is the row itself for plain hyperscript', () => {
    expect(hyperscriptBodies('on click toggle .active')).toEqual(['on click toggle .active']);
  });

  it('finds a component’s init script AND the `_` inside its template body', () => {
    expect(hyperscriptBodies(COMPONENT)).toEqual(['set ^count to 0', 'on click increment ^count']);
  });

  it('finds hx-live values alongside `_` values', () => {
    const markup =
      '<button _="on click set $count to ($count or 0) + 1">+1</button>\n<div hx-live="put $count into me"></div>';
    expect(hyperscriptBodies(markup)).toEqual([
      'on click set $count to ($count or 0) + 1',
      'put $count into me',
    ]);
  });

  it('is empty for markup that carries no hyperscript', () => {
    expect(hyperscriptBodies('<div sse-connect="/events" sse-swap="tick"></div>')).toEqual([]);
  });
});

describe('verifyParses', () => {
  it('measures, rather than assumes: a valid row parses in its language', () => {
    expect(verifyParses('on click toggle .active', 'en')).toBe(true);
    expect(verifyParses('クリック で .active を 切り替え', 'ja')).toBe(true);
  });

  it('fails a row the parser rejects — English included', () => {
    expect(verifyParses('}}} ((( ]]]', 'en')).toBe(false);
  });

  it('fails a row judged in the wrong language', () => {
    // The English row, read as Japanese, is not a Japanese translation.
    expect(verifyParses('on click toggle .active', 'ja')).toBe(false);
  });

  it('requires EVERY body of a markup row to parse', () => {
    const oneBroken = '<button _="on click toggle .a">x</button><i _="}}} ((( ]]]"></i>';
    expect(verifyParses(oneBroken, 'en')).toBe(false);
    expect(verifyParses(COMPONENT, 'en')).toBe(true);
  });

  it('does not verify markup with no hyperscript to parse', () => {
    expect(verifyParses('<div sse-connect="/events" sse-swap="tick"></div>', 'en')).toBe(false);
  });

  it('parses a non-translatable row’s English bodies as English in every language', () => {
    const identity = '<div hx-live="put $count into me"></div>';
    expect(verifyParses(identity, 'ja', false)).toBe(true);
    // The same English body, if it claimed to be a Japanese translation, is not.
    expect(verifyParses(identity, 'ja', true)).toBe(false);
  });
});
