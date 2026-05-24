import { describe, it, expect } from 'vitest';
import {
  htmlParityCheck,
  literalPreservationCheck,
  tokenCountCheck,
  runAllChecks,
} from './translation-checks';

describe('htmlParityCheck', () => {
  it('passes when no HTML present', () => {
    expect(htmlParityCheck('toggle .active', 'トグル .active').valid).toBe(true);
  });

  it('passes when source and translation have identical tag set', () => {
    const source = '<span>Hello World</span>';
    const translated = '<span>こんにちは 世界</span>';
    expect(htmlParityCheck(source, translated).valid).toBe(true);
  });

  it('fails when translation reorders tags (artifact A)', () => {
    // The bug: <span>Hello World</span> → World</span> を <span>Hello
    // Tag count is the same but order is wrong: close before open.
    const source = '<span>Hello World</span>';
    const translated = 'World</span> を <span>Hello';
    const result = htmlParityCheck(source, translated);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('before');
  });

  it('fails when a tag is missing in translation', () => {
    const source = '<header><main></main></header>';
    const translated = '<header></header>';
    expect(htmlParityCheck(source, translated).valid).toBe(false);
  });

  it('fails when a tag count differs', () => {
    const source = '<span>a</span><span>b</span>';
    const translated = '<span>a b</span>';
    expect(htmlParityCheck(source, translated).valid).toBe(false);
  });

  it('handles self-closing tags', () => {
    const source = '<form/>';
    const translated = '<form/>';
    expect(htmlParityCheck(source, translated).valid).toBe(true);
  });

  it('passes for the multi-line component case', () => {
    const source =
      '<script type="text/hyperscript-template" component="hello-world">\n  <span>Hello World</span>\n</script>';
    // Same tags + balance, just translated text inside.
    const translated =
      '<script type="text/hyperscript-template" component="hello-world">\n  <span>HI WORLD</span>\n</script>';
    expect(htmlParityCheck(source, translated).valid).toBe(true);
  });
});

describe('literalPreservationCheck', () => {
  it('passes when string literals appear verbatim', () => {
    const source = "put 'Saved!' into me";
    const translated = "ضع 'Saved!' إلى أنا";
    expect(literalPreservationCheck(source, translated).valid).toBe(true);
  });

  it("fails when translator bled into a string ('Got it!' → 'Got זה!')", () => {
    const source = "on hello put 'Got it!' into me";
    const translated = "ב hello שים 'Got זה!' לתוך אני";
    const result = literalPreservationCheck(source, translated);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("'Got it!'");
  });

  it("fails when an attribute value was modified ('my-layout' → '-ku-layout')", () => {
    const source = '<script component="my-layout"></script>';
    const translated = '<script component="-ku-layout"></script>';
    const result = literalPreservationCheck(source, translated);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('"my-layout"');
  });

  it('fails when a URL was modified (/api/me → /api/אני)', () => {
    const source = 'on click fetch /api/me';
    const translated = 'ב click הבא /api/אני';
    expect(literalPreservationCheck(source, translated).valid).toBe(false);
  });

  it('fails when a #if directive was translated (#if → #אם)', () => {
    const source = '#if ^user.admin\n#end';
    const translated = '#אם ^user.admin\n#סוף';
    const result = literalPreservationCheck(source, translated);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('#if');
  });

  it('passes for a translation that only changed keywords outside literals', () => {
    const source = 'on click set my innerHTML to `<li>${$item.name}</li>`';
    const translated = 'クリック で 私の innerHTML を `<li>${$item.name}</li>` に 設定';
    expect(literalPreservationCheck(source, translated).valid).toBe(true);
  });
});

describe('tokenCountCheck', () => {
  it('passes for identity translation in English', () => {
    expect(tokenCountCheck('on click toggle .active', 'on click toggle .active', 'en').valid).toBe(
      true
    );
  });

  it('passes for normal Japanese reorder/expansion', () => {
    const source = 'on click toggle .active';
    const translated = '.active を クリック で 切り替え'; // 5 vs 4 — within tolerance
    expect(tokenCountCheck(source, translated, 'ja').valid).toBe(true);
  });

  it('fails for severe Chinese truncation (artifact E)', () => {
    // socket-send observed bug: source 7 tokens, translation 5 (ratio 0.71 — within tolerance!)
    // Use a more egregious case to verify the floor catches truncation.
    const source = 'on click set my innerHTML to `<li>${$item.name}</li>`'; // 8 tokens
    const translated = '当 点击 时 设置'; // 4 tokens — ratio 0.5, below 0.65 zh floor
    const result = tokenCountCheck(source, translated, 'zh');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('truncation');
  });

  it('fails for runaway expansion', () => {
    const source = 'toggle .active';
    const translated = 'a a a a a a a a a a a a a a a'; // 15 vs 2 = 7.5x
    expect(tokenCountCheck(source, translated, 'es').valid).toBe(false);
  });

  it('uses tighter bounds for he/ms (no grammar profile)', () => {
    // 1:1 substitution should be near identity. He ceiling is 1.5.
    const source = 'on click toggle .active'; // 4 tokens
    const translated = 'on click toggle .active a a a a'; // 8 tokens, ratio 2.0
    const result = tokenCountCheck(source, translated, 'he');
    expect(result.valid).toBe(false); // exceeds 1.5 ceiling
  });
});

describe('runAllChecks', () => {
  it('returns empty for a clean translation', () => {
    const source = 'on click toggle .active on #button';
    const translated = '#button で .active を クリック で 切り替え';
    expect(runAllChecks(source, translated, 'ja')).toEqual([]);
  });

  it('aggregates multiple failures', () => {
    const source = "<span>Hello</span> 'literal' /api/me";
    const translated = '<span></span> "literal" /api/אני'; // wrong span content, wrong literal, wrong url
    const failures = runAllChecks(source, translated, 'he');
    expect(failures.length).toBeGreaterThan(0);
    const kinds = failures.map(f => f.kind);
    expect(kinds).toContain('literal');
  });
});
