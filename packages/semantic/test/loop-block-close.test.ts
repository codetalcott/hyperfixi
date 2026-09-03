/**
 * A flattened loop/tell header is closed by an explicit `end`.
 *
 * `repeat … end` reaches the renderer FLATTENED: the parser emits
 * `[repeat-header, stmt, stmt, …]` and attaches no body (`LoopSemanticNode`
 * exists in the type model and nothing constructs one). Rendering that without
 * a closing `end` produced a surface the structural layer cannot segment —
 * `block-parser.ts` counts `repeat`/`for`/`while` as depth OPENERS, so the
 * enclosing handler's own `end` was spent closing the loop and whatever came
 * next was swallowed into the handler body.
 *
 * That is what merged the `init` block into the `on pointerdown` handler of
 * `behavior-sortable` in 13 languages. Every fidelity score was 1.0 — the same
 * command set, the same roles, the same values, in the wrong block — so the
 * English round-trip was the only signal that could see it.
 *
 * The `end` is also the canonical form: the engine requires `repeat … end`, so
 * the unterminated render was invalid English as well as unparseable input.
 */
import { describe, it, expect } from 'vitest';
import { parseSemantic, render } from '../src/index';

const LANGUAGES = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

/**
 * The `behavior-sortable` shape, reduced to the two features that collided.
 *
 * The loop body is `add .b to me` rather than sortable's own `trigger … on me`
 * for one reason: zh's renderer drops `trigger`'s destination (`trigger m on me`
 * → `触发 把 m` → `trigger m`) with or without this change, which would make the
 * zh row fail here for an unrelated defect. That defect is real and tracked —
 * it is what keeps behavior-sortable/draggable/resizable[zh] on i18n.
 */
const BEHAVIOR = `behavior Demo(cls)
init
set cls to "a"
end
on pointerdown
  repeat until event pointerup from document
    add .b to me
  end
  remove .{cls} from me
end
end`;

function parseEn(code: string) {
  return parseSemantic(code, 'en')?.node ?? null;
}

describe('a loop header inside a handler closes before the handler does', () => {
  const reference = parseEn(BEHAVIOR);
  const referenceEn = reference ? render(reference, 'en') : null;

  it('the English reference itself emits the closing `end`', () => {
    expect(referenceEn).toContain('remove .{cls} from me end');
  });

  it('the reference keeps `init` as its own block, not handler body', () => {
    // The assertion that fails without the fix: `set cls to "a"` must NOT be
    // reachable from inside the `on pointerdown` line.
    const handlerLine = (referenceEn ?? '').split('\n').find(l => l.includes('on pointerdown'));
    expect(handlerLine).toBeDefined();
    expect(handlerLine).not.toContain('set cls');
  });

  it.each(LANGUAGES)('%s round-trips both features', language => {
    const rendered = render(reference!, language);
    const back = parseSemantic(rendered, language)?.node ?? null;
    expect(back, `${language}: did not re-parse`).not.toBeNull();
    expect(render(back!, 'en'), `${language}: ${rendered}`).toBe(referenceEn);
  });
});

describe('the close is emitted once per header, and only for headers', () => {
  it('a statement list with no block header is unchanged', () => {
    const node = parseEn('add .a to me then remove .b from me');
    expect(render(node!, 'en')).toBe('add .a to me then remove .b from me');
  });

  it('a bare `repeat` header at the top of a handler closes once', () => {
    const node = parseEn('on click repeat 3 times add .a to me end');
    const out = render(node!, 'en');
    expect(out).toBe('on click repeat 3 times add .a to me end');
    expect(out.match(/\bend\b/g)).toHaveLength(1);
  });

  it('a `tell` header closes too', () => {
    const node = parseEn('on click tell #panel add .a to me end');
    expect(render(node!, 'en')).toBe('on click tell #panel add .a to me end');
  });
});

describe('a loop inside a conditional branch closes before the branch does', () => {
  // The SECOND rendering path (`joinStatements`, which renders if/else branch
  // bodies) — mutation-verified separately from the compound path: without its
  // close, this renders ONE `end`, the `if`'s own, so the branch has no
  // terminator of its own and the loop swallows whatever follows the `if`.
  const SOURCE = 'on click if x repeat 3 times add .a to me end end then remove .b from me';
  const reference = parseEn(SOURCE);
  const referenceEn = reference ? render(reference, 'en') : null;

  it('emits both ends — the loop closes, then the branch', () => {
    expect(referenceEn).toBe('on click if x repeat 3 times add .a to me end end');
  });

  it.each(LANGUAGES)('%s round-trips the nested close', language => {
    const rendered = render(reference!, language);
    const back = parseSemantic(rendered, language)?.node ?? null;
    expect(back, `${language}: did not re-parse`).not.toBeNull();
    expect(render(back!, 'en'), `${language}: ${rendered}`).toBe(referenceEn);
  });
});
