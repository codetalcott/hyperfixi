/**
 * A dot access is a member expression, not a possessive.
 *
 * `#input.value` and `#input's value` mean the same thing and used to BE the
 * same thing: `PropertyPathValue` was `{object, property}` with no record of
 * which surface the author wrote. So the renderer had to pick one, picked the
 * target language's possessive construction for both, and turned `#input.value`
 * into es `#input de valor`, de `#input wert`, ar `#input قيمة` — surfaces no
 * target parser binds back as a property path. The role was lost, and in de/ar
 * the surrounding `set` died with it.
 *
 * A renderer-side heuristic cannot recover this. `its.name` (dot) and `my value`
 * (possessive) both have `reference` objects, so the object's type does not
 * discriminate; only the matcher knows, because only the matcher matched a
 * surface. Hence `access` on the value, set at the seven construction sites.
 *
 * THE BASE OF A DOT IS THE SUBTLE PART, and it is the reason this file exists
 * rather than a one-line assertion. The parser's dot path gates on
 * `isValidReference(base)` — an ENGLISH word test — so localizing the base is
 * precisely what breaks it: `ello.name`, `ele.name`, `它.name`, `es.error`,
 * `il.error`, `nó.data` all fail to parse. The possessive form parses (`su.name`,
 * `seu.name`, `sein.error`), so it is preferred; where a language has none —
 * eight lack one for `it`, and NO language has one for `event` — the English
 * base is kept, because a slightly less localized surface beats a lost role.
 */

import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';
import type { CommandSemanticNode, PropertyPathValue } from '../src/types';

const LANGUAGES = [
  'ar',
  'bn',
  'de',
  'es',
  'fr',
  'he',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
] as const;

/** Walk a node tree for the first property-path value. */
function findPropertyPath(node: unknown, seen = new Set<unknown>()): PropertyPathValue | null {
  if (!node || typeof node !== 'object' || seen.has(node)) return null;
  seen.add(node);
  const n = node as Record<string, unknown>;
  if (n.type === 'property-path') return n as unknown as PropertyPathValue;
  if (n.roles instanceof Map) {
    for (const v of n.roles.values()) {
      const hit = findPropertyPath(v, seen);
      if (hit) return hit;
    }
  }
  for (const key of ['body', 'statements', 'thenBranch', 'elseBranch', 'object']) {
    const child = n[key];
    if (Array.isArray(child)) {
      for (const c of child) {
        const hit = findPropertyPath(c, seen);
        if (hit) return hit;
      }
    } else if (child) {
      const hit = findPropertyPath(child, seen);
      if (hit) return hit;
    }
  }
  return null;
}

describe('the parser records which surface it matched', () => {
  it.each([
    ['#input.value', 'dot'],
    ['it.name', 'dot'],
    ["#picker's value", 'possessive'],
    ['my value', 'possessive'],
  ])('%s is tagged %s', (surface, access) => {
    const node = parse(`put ${surface} into #out`, 'en') as CommandSemanticNode;
    const path = findPropertyPath(node);
    expect(path, `no property-path parsed from '${surface}'`).not.toBeNull();
    expect(path!.access).toBe(access);
  });
});

describe('a selector dot survives into every language', () => {
  it.each(LANGUAGES)('%s keeps #output.innerText as a dotted path', language => {
    const rendered = translate('on click set #output.innerText to "Hi"', 'en', language);
    expect(rendered, `${language} did not emit the dotted path`).toContain('#output.innerText');
  });

  it.each(LANGUAGES)('%s round-trips the dotted path back to a property-path', language => {
    // The bare command, not an event handler wrapping one: a handler drags in
    // body-composition defects that have nothing to do with this fix (bn loses
    // the whole body of `on click get … then log it`, which it also does for
    // surfaces containing no property path at all). Those are tracked by the
    // corpus allowlist; this file is about the dot.
    const rendered = translate('set #output.innerText to "Hi"', 'en', language);
    const node = parse(rendered, language);
    expect(node, `${language}: the rendered surface did not re-parse`).not.toBeNull();
    const path = findPropertyPath(node);
    expect(path, `${language}: the dotted path did not survive the round trip`).not.toBeNull();
    expect(path!.property).toBe('innerText');
  });

  it('vi `get` keeps a dotted source (former KNOWN residual)', () => {
    // Was pinned as failing: `get-vi-full`'s UNTYPED trailing role ate the
    // `từ` marker at a 100/100 priority tie with the generated pattern, and
    // the real property-path dropped. The full pattern now sits at 92, so
    // the typed `lấy giá trị từ {source}` claims the surface.
    const rendered = translate('get #input.value', 'en', 'vi');
    expect(rendered).toContain('#input.value');
    const path = findPropertyPath(parse(rendered, 'vi'));
    expect(path, 'vi `get` lost the property-path again').not.toBeNull();
    expect(path!.property).toBe('value');
  });
});

describe('the base of a dot is chosen so it can be read back', () => {
  // These are the exact surfaces measured to FAIL when the base was localized
  // with the plain pronoun. They are pinned per language because the correct
  // base differs by language (possessive form where one exists, English
  // otherwise) — a single expected string would hide that.
  it.each(LANGUAGES)('%s round-trips `it.name` with a parseable base', language => {
    const rendered = translate('on click fetch /api then put it.name into #r', 'en', language);
    const node = parse(rendered, language);
    expect(node, `${language}: rendered surface did not re-parse`).not.toBeNull();
    const path = findPropertyPath(node);
    expect(path, `${language}: it.name did not survive as a property-path`).not.toBeNull();
    expect(path!.property).toBe('name');
  });

  it.each(LANGUAGES)('%s never emits the bare localized pronoun before a dot', language => {
    // The failure mode, stated directly: `ello.name` / `ele.name` / `nó.data`.
    // Every one of those parses to null, so this guards the specific regression.
    const rendered = translate('put it.name into #r', 'en', language);
    const node = parse(rendered, language);
    expect(node, `${language}: emitted an unparseable dot base in ${rendered}`).not.toBeNull();
  });

  it('prefers the possessive form where the language has one', () => {
    // es/de/pt/it all have a single-word possessive, and it is both idiomatic
    // and parseable — so it should win over the English fallback.
    expect(translate('put it.name into #r', 'en', 'es')).toContain('su.name');
    expect(translate('put it.name into #r', 'en', 'de')).toContain('sein.name');
    expect(translate('put it.name into #r', 'en', 'pt')).toContain('seu.name');
  });

  it('falls back to the English base when the language has no single-word form', () => {
    // `event` has no possessive form in ANY language, so it stays English.
    // Rendering `घटना.detail` / `ঘটনা.detail` was measured to lose the role.
    for (const language of ['hi', 'bn', 'qu', 'zh', 'ja']) {
      const rendered = translate('put event.detail into #r', 'en', language);
      expect(rendered, `${language} localized a dot base with no possessive form`).toContain(
        'event.detail'
      );
    }
  });
});

describe('the possessive surface is left alone', () => {
  // The whole point of recording `access` is that the two surfaces diverge.
  // If the dot branch ever widened to swallow possessives, `my value` would
  // start rendering `me.value` and this would fail.
  it.each(['es', 'ja', 'zh', 'de'] as const)('%s still renders `my value` possessively', language => {
    const rendered = translate('put my value into #out', 'en', language);
    expect(rendered).not.toContain('me.value');
    expect(rendered).not.toContain('my.value');
  });

  it('English is unchanged in both directions', () => {
    expect(translate('on click set #output.innerText to "Hi"', 'en', 'en')).toContain(
      '#output.innerText'
    );
    expect(translate('put my value into #out', 'en', 'en')).toContain('my value');
  });
});

describe('an optional chain keeps its own connector', () => {
  // `my?.dataset?.customValue` already carries `?.`; adding a dot would produce
  // `mi.?.dataset`. The property is glued instead.
  it.each(['es', 'de', 'zh'] as const)('%s does not inject a second connector', language => {
    const rendered = translate('log it?.dataset?.customValue', 'en', language);
    expect(rendered).not.toContain('.?.');
  });
});

describe('get-value round trips (render residual: ja fetch homonym + uk put positions)', () => {
  it('ja `#input.value を 取得` parses as GET, not fetch', () => {
    // `取得` is ja's GET verb; it was also listed as a fetch-ja-sov verb
    // alternative (priority 105), so the get surface mis-parsed as fetch —
    // the zh `获得` bug, one language over. The alternative is removed; the
    // real fetch word フェッチ is untouched.
    const node = parse('#input.value を 取得', 'ja') as Record<string, any>;
    expect(node.action).toBe('get');
    const src = node.roles.get('source');
    expect(src).toMatchObject({ type: 'property-path', property: 'value' });
  });

  it('ja fetch still parses with its own verb', () => {
    const node = parse('"/api/data" を フェッチ', 'ja') as Record<string, any>;
    expect(node.action).toBe('fetch');
  });

  it('uk positional put keeps its destination (before/after outrank full)', () => {
    for (const [en, manner] of [
      ['put "<p>New</p>" before me', 'before'],
      ['put "<p>New</p>" after me', 'after'],
    ] as const) {
      const rendered = translate(en, 'en', 'uk');
      const node = parse(rendered, 'uk') as Record<string, any>;
      expect(node.action, `uk: ${rendered}`).toBe('put');
      expect(node.roles.get('destination')).toMatchObject({ type: 'reference', value: 'me' });
      expect(node.roles.get('manner')).toMatchObject({ value: manner });
    }
  });
});
