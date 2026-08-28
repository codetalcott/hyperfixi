/**
 * A possessive marker may only be glued to its owner where the tokenizer can
 * take it back off.
 *
 * The renderer's `markerPosition: 'between'` branch emitted
 * `${owner}${marker} ${property}` for every space-using language. That is right
 * where the marker is a CLITIC and the tokenizer splits it — ko/bn/hi return
 * `#picker` + `র` + `মান` from the glued form, and ja/zh do the same without
 * spaces at all. It is wrong where the marker is a FREE WORD and the profile
 * declares no `tokenization` block, which is exactly tl and vi:
 *
 *   tl  `#pickerng halaga`      → ONE selector token `#pickerng`
 *   vi  `#pickercủa giá trị`    → `#pickerc` + `ủa` — split inside the marker
 *
 * Neither surface is well-formed in those languages either, so the possessive
 * was unrecoverable and `bind.source` came back as a bare selector. The glue is
 * now conditional on the profile declaring particle extraction at all.
 *
 * The matcher needed the other half: a free-word marker tokenizes as a plain
 * `identifier`, not a `particle`, so the kind check rejected it even once the
 * spacing was right. The value check beside it is exact — against this
 * profile's own declared marker — so widening the kind is narrow. It also
 * recovers th's `#statusของtextContent`, where the script boundary splits the
 * marker off but leaves it identifier-kind.
 */
import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';
import type { CommandSemanticNode, SemanticNode } from '../src/types';

function find(node: SemanticNode | null, action: string): CommandSemanticNode | null {
  if (!node) return null;
  let found: CommandSemanticNode | null = null;
  const walk = (n: SemanticNode): void => {
    if (!found && (n as CommandSemanticNode).action === action) found = n as CommandSemanticNode;
    const rec = n as unknown as Record<string, unknown>;
    for (const key of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      const kids = rec[key];
      if (Array.isArray(kids)) kids.forEach(k => walk(k as SemanticNode));
    }
  };
  walk(node);
  return found;
}

function source(node: CommandSemanticNode | null) {
  return node?.roles.get('source' as never) as
    { type?: string; object?: { value?: string }; property?: string } | undefined;
}

const EN = "bind $message to #status's textContent";

describe('a free-word marker is spaced, and re-parses', () => {
  it.each([
    ['tl', 'itali $message sa #status ng textContent'],
    ['vi', 'ràng buộc $message vào #status của textContent'],
  ] as const)('%s renders `%s`', (language, expected) => {
    expect(translate(EN, 'en', language)).toBe(expected);
  });

  it.each(['tl', 'vi', 'th'] as const)('%s recovers the property-path', language => {
    const rendered = translate(EN, 'en', language);
    const bound = find(parse(rendered, language), 'bind');
    expect(bound, `${language}: did not parse: ${rendered}`).not.toBeNull();
    const src = source(bound);
    // Pre-fix this came back as a bare selector and the property was gone.
    expect(src?.type, `${language} lost the possessive in: ${rendered}`).toBe('property-path');
    expect(src?.object?.value).toBe('#status');
    expect(src?.property).toBe('textContent');
  });
});

describe('a clitic marker stays glued — the change is scoped by the profile', () => {
  // These languages declare `tokenization.particles`; their tokenizers split a
  // trailing particle from the preceding word, so gluing is both correct
  // orthography and round-trip safe. Their rendered surfaces must not move.
  it.each([
    ['ko', '$message 를 #status의 textContent 에 바인드'],
    ['bn', '$message কে #statusর textContent তে বাইন্ড'],
    ['hi', '$message को #statusका textContent में bind'],
    ['ja', '$message を #statusのtextContent に バインド'],
    ['zh', '绑定 $message 到 #status的textContent'],
  ] as const)('%s still renders `%s`', (language, expected) => {
    expect(translate(EN, 'en', language)).toBe(expected);
  });

  it.each(['ko', 'bn', 'hi', 'ja', 'zh'] as const)('%s still recovers it', language => {
    const src = source(find(parse(translate(EN, 'en', language), language), 'bind'));
    expect(src?.type, `${language} regressed`).toBe('property-path');
    expect(src?.property).toBe('textContent');
  });
});

describe('KNOWN RESIDUAL — failing-when-fixed', () => {
  // Same family, two causes this did NOT address when it landed. Both have since
  // cleared — kept here as positive rows so the behaviour stays pinned.
  it('th renders its possessive property-FIRST and round-trips (former pin)', () => {
    // Was pinned as glued/unrecoverable. The renderer now emits th's genitive
    // in its true direction — `ค่า ของ #picker` ("value of #picker"), spaced —
    // which the of-possessive matcher reads back exactly.
    const rendered = translate("bind $color to #picker's value", 'en', 'th');
    expect(rendered).toContain('ค่า ของ #picker');
    expect(source(find(parse(rendered, 'th'), 'bind'))?.type).toBe('property-path');
  });

  it('vi keeps a possessive whose property is a KEYWORD (former pin)', () => {
    // `giá trị` is vi's translation of `value`, so it tokenizes as
    // `keyword/value` rather than an identifier and the property slot used to
    // reject it — the row was pinned failing-when-fixed. The slot now admits a
    // keyword the language's own property table vouches for, so vi joins the
    // languages whose property is untranslated (`textContent`) and passes above.
    const rendered = translate("bind $color to #picker's value", 'en', 'vi');
    expect(rendered).toBe('ràng buộc $color vào #picker của giá trị');
    expect(source(find(parse(rendered, 'vi'), 'bind'))?.type).toBe('property-path');
  });
});
