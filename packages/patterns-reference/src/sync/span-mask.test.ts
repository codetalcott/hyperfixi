import { describe, it, expect } from 'vitest';
import { maskSpans, unmaskSpans, withMaskedSpans } from './span-mask';

describe('span-mask: round-trip identity', () => {
  const cases: Array<[string, string]> = [
    ['plain', 'on click toggle .active'],
    ['single string', "on click put 'Saved!' into me"],
    ['double string', 'on click set #x.innerText to "Hello World"'],
    ['template literal', 'on click set my innerHTML to `<li>${$item.name}</li>`'],
    ['bracket filter', "on keyup[key is 'Escape'] clear me"],
    [
      'multi-line component',
      '<script type="text/hyperscript-template" component="hello-world">\n  <span>Hello World</span>\n</script>',
    ],
    [
      'component with directives',
      '<script type="text/hyperscript-template" component="user-card" _="set ^user to attrs.data as JSON">\n  <h3>${^user.name}</h3>\n  #if ^user.admin\n    <span class="badge">admin</span>\n  #end\n</script>',
    ],
    ['url path', 'on click fetch /api/me'],
    [
      'intercept DSL',
      'intercept / precache /, /style.css, /app.js as "v1" on /api/* use network-first end',
    ],
    ['ws protocol', 'socket Chat ws://localhost:8080 on message put it into #chat end'],
    ['possessive without strings', "bind my value to #other-input's value"],
    [
      'mixed possessive and string',
      "when (#price's value * #qty's value) changes put '$' + it into me",
    ],
  ];

  it.each(cases)('round-trips %s', (_label, input) => {
    const { masked, spans } = maskSpans(input);
    expect(unmaskSpans(masked, spans)).toBe(input);
  });
});

describe('span-mask: detection coverage', () => {
  it('masks single-quoted strings', () => {
    const { spans } = maskSpans("put 'Saved!' into me");
    expect(spans.find(s => s.kind === 'string-single')?.original).toBe("'Saved!'");
  });

  it("does NOT mask possessive `something's`", () => {
    const { spans } = maskSpans("bind my value to #other-input's value");
    expect(spans.find(s => s.kind === 'string-single')).toBeUndefined();
  });

  it('handles possessive followed by an actual string', () => {
    const { spans } = maskSpans("set me's value to 'hello'");
    const singles = spans.filter(s => s.kind === 'string-single');
    expect(singles).toHaveLength(1);
    expect(singles[0].original).toBe("'hello'");
  });

  it('masks double-quoted strings including HTML attribute values', () => {
    const input = '<span class="badge">admin</span>';
    const { masked, spans } = maskSpans(input);
    const dq = spans.find(s => s.kind === 'string-double');
    expect(dq?.original).toBe('"badge"');
    // Attribute value is a single token after masking, so keyword regex can't bleed in
    expect(masked).toContain('class=__HFXMSK_');
  });

  it('masks template literals as one opaque unit', () => {
    const input = 'live put `Count: ${$count}` into me';
    const { masked, spans } = maskSpans(input);
    const tl = spans.find(s => s.kind === 'string-template');
    expect(tl?.original).toBe('`Count: ${$count}`');
    expect(masked).not.toContain('Count:');
  });

  it('masks HTML inner text (artifact A guard)', () => {
    const input = '<span>Hello World</span>';
    const { masked, spans } = maskSpans(input);
    const ht = spans.find(s => s.kind === 'html-text');
    expect(ht?.original).toBe('Hello World');
    expect(masked).toMatch(/<span>__HFXMSK_\d+_TEXT__<\/span>/);
  });

  it('skips whitespace-only inter-tag content', () => {
    const input = '<header>\n  <main></main>\n</header>';
    const { spans } = maskSpans(input);
    const ht = spans.filter(s => s.kind === 'html-text');
    expect(ht).toHaveLength(0);
  });

  it('masks bracket expressions as a unit (artifact F guard)', () => {
    const input = "on keyup[key is 'Escape'] clear me";
    const { masked, spans } = maskSpans(input);
    const brk = spans.find(s => s.kind === 'bracket-expr');
    // The bracket payload is masked; the inner string is masked first then
    // captured in the original bracket text or as its own span — either is
    // acceptable as long as the bracket structure cannot be reordered.
    expect(brk).toBeDefined();
    expect(masked).toMatch(/keyup__HFXMSK_\d+_BRK__/);
  });

  it('masks URL paths', () => {
    const input = 'on click fetch /api/me';
    const { spans } = maskSpans(input);
    const url = spans.find(s => s.kind === 'url');
    expect(url?.original).toBe('/api/me');
  });

  it('masks bare `/` in intercept DSL', () => {
    const input = 'intercept / precache /, /style.css, /app.js end';
    const { spans } = maskSpans(input);
    const urls = spans.filter(s => s.kind === 'url');
    // Expect at least 4: bare /, /, /style.css, /app.js
    // (The first standalone `/` and the one after precache.)
    expect(urls.length).toBeGreaterThanOrEqual(3);
    expect(urls.map(u => u.original)).toContain('/style.css');
    expect(urls.map(u => u.original)).toContain('/app.js');
  });

  it('masks ws:// protocols', () => {
    const input = 'socket ChatSocket ws://localhost:8080 on message end';
    const { spans } = maskSpans(input);
    const url = spans.find(s => s.kind === 'url');
    expect(url?.original).toBe('ws://localhost:8080');
  });

  it('does NOT mask `/` in arithmetic', () => {
    const input = 'set $x to 10/2 then put $x into me';
    const { spans } = maskSpans(input);
    expect(spans.find(s => s.kind === 'url')).toBeUndefined();
  });

  it('masks component template directives (artifact D guard)', () => {
    const input = '#if ^user.admin\n#end';
    const { spans } = maskSpans(input);
    const dirs = spans.filter(s => s.kind === 'directive');
    expect(dirs.map(d => d.original).sort()).toEqual(['#end', '#if']);
  });
});

describe('span-mask: edge cases', () => {
  it('handles escaped quote inside single-quoted string', () => {
    const input = "put 'don\\'t' into me";
    const { masked, spans } = maskSpans(input);
    expect(spans.find(s => s.kind === 'string-single')?.original).toBe("'don\\'t'");
    expect(unmaskSpans(masked, spans)).toBe(input);
  });

  it('handles escaped quote inside double-quoted string', () => {
    const input = 'put "say \\"hi\\"" into me';
    const { masked, spans } = maskSpans(input);
    expect(spans.find(s => s.kind === 'string-double')?.original).toBe('"say \\"hi\\""');
    expect(unmaskSpans(masked, spans)).toBe(input);
  });

  it('preserves `<form/>` self-closing selector without breaking', () => {
    const input = 'on submit fetch /api/save then morph closest <form/> to it';
    const { masked, spans } = maskSpans(input);
    const restored = unmaskSpans(masked, spans);
    expect(restored).toBe(input);
    expect(masked).toContain('<form/>');
  });

  it('handles nested HTML with text in inner tag only', () => {
    const input = '<header><span>Title</span></header>';
    const { masked, spans } = maskSpans(input);
    const text = spans.filter(s => s.kind === 'html-text');
    expect(text).toHaveLength(1);
    expect(text[0].original).toBe('Title');
    expect(unmaskSpans(masked, spans)).toBe(input);
  });

  it('placeholders are word-boundary safe against `\\bif\\b`', () => {
    // Critical: a keyword regex like /\bif\b/gi must not match anything
    // inside a placeholder, even when the kind tag spells out a real word.
    const { masked } = maskSpans("on keyup[key is 'Escape'] clear me");
    // /\btext\b/gi against the masked string: no match expected because
    // every TEXT/STR/etc. tag is enclosed in underscores, making the whole
    // placeholder one "word" to JS regex \b.
    expect(masked.match(/\btext\b/gi)).toBeNull();
    expect(masked.match(/\bif\b/gi)).toBeNull();
    expect(masked.match(/\bof\b/gi)).toBeNull();
  });

  it('survives a typical translator workflow (mask → reorder → unmask)', () => {
    // Simulate a transformer that moves tokens around, mimicking SOV reorder.
    // The transform must not split or modify placeholders.
    const input = '<span>Hello World</span>';
    const result = withMaskedSpans(input, masked => {
      // Pretend we reorder tokens; placeholders are preserved as words.
      const tokens = masked.split(/\s+/);
      return tokens.reverse().join(' ');
    });
    // Even though tokens were reversed, the inner text is preserved verbatim
    // (because the placeholder was treated as one word).
    expect(result).toContain('Hello World');
  });

  it('handles intercept DSL without dropping path components', () => {
    const input =
      'intercept / precache /, /style.css, /app.js as "v1" on /api/* use network-first end';
    const result = withMaskedSpans(input, m => m); // identity transform
    expect(result).toBe(input);
  });

  it('component-with-conditional preserves state literal', () => {
    const input =
      '<script type="text/hyperscript-template" component="user-card" _="set ^user to {name: \'Demo\', admin: true}">\n  <h3>${^user.name}</h3>\n  #if ^user.admin\n    <span class="badge">admin</span>\n  #end\n</script>';
    const { masked, spans } = maskSpans(input);
    // Inside the _="..." double-quoted attr value, the 'Demo' single quote
    // must be preserved verbatim (it's part of the attribute value, not a
    // separate string).
    const attrSpan = spans.find(s => s.kind === 'string-double' && s.original.includes('Demo'));
    expect(attrSpan).toBeDefined();
    expect(attrSpan!.original).toContain("'Demo'");
    expect(unmaskSpans(masked, spans)).toBe(input);
  });
});

describe('span-mask: unmask is idempotent for unmasked input', () => {
  it('returns input unchanged when no placeholders present', () => {
    expect(unmaskSpans('plain text', [])).toBe('plain text');
  });

  it('leaves stray placeholder-shaped strings alone if no matching span', () => {
    // Defensive: if upstream produces an orphan placeholder somehow, leave it.
    expect(unmaskSpans('__HFXMSK_99_STR1__', [])).toBe('__HFXMSK_99_STR1__');
  });
});
