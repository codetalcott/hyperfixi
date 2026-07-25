/**
 * Imperative command forms on INPUT (es, pt, fr, ko).
 *
 * Hyperscript is a command language, and every language but English distinguishes
 * the imperative from the dictionary form. The profiles declare the dictionary
 * form as `primary` — deliberately, per `LanguageProfile.defaultVerbForm`, which
 * records infinitive as the industry standard for UI localization — so RENDERING
 * is unchanged. But a native speaker giving a command writes `agrega`, not
 * `agregar`, and the parser used to reject it.
 *
 * Two mechanisms get us there, and the split is deliberate:
 *
 *   1. Regular forms resolve through the morphological normalizer's STEM. The
 *      pattern matcher compares a token against the pattern's NATIVE literal
 *      (`agregar`), so `stem` is what matches; `normalized` is the English
 *      concept (`add`) and never equals the literal. es/pt/fr keyword extractors
 *      used to compute the stem and then drop it — that omission was the bug.
 *   2. Irregulars the rules cannot reach are declared as keyword `alternatives`,
 *      which is what that field is documented for.
 *
 * Rendering is asserted unchanged at the bottom, because that is the constraint
 * this must not violate.
 */
import { describe, it, expect } from 'vitest';
import { parse, translate, getTokenizer } from '../src/index';

/** The imperative of each core verb, as domain-learn renders it to a learner. */
const IMPERATIVES: Record<string, Array<[string, string]>> = {
  es: [
    ['agrega', 'add'], ['quita', 'remove'], ['alterna', 'toggle'], ['establece', 'set'],
    ['muestra', 'show'], ['oculta', 'hide'], ['obtén', 'get'], ['espera', 'wait'],
    ['busca', 'fetch'], ['envía', 'send'], ['ve', 'go'], ['toma', 'take'],
  ],
  pt: [
    ['adicione', 'add'], ['remova', 'remove'], ['alterne', 'toggle'], ['defina', 'set'],
    ['mostre', 'show'], ['esconda', 'hide'], ['obtenha', 'get'], ['espere', 'wait'],
    ['busque', 'fetch'], ['envie', 'send'], ['vá', 'go'], ['pegue', 'take'],
  ],
  fr: [
    ['ajoute', 'add'], ['retire', 'remove'], ['bascule', 'toggle'], ['montre', 'show'],
    ['obtiens', 'get'], ['attends', 'wait'], ['récupère', 'fetch'], ['envoie', 'send'],
    ['va', 'go'], ['prends', 'take'],
  ],
  ko: [
    ['추가하세요', 'add'], ['제거하세요', 'remove'], ['토글하세요', 'toggle'],
    ['설정하세요', 'set'], ['보이세요', 'show'], ['숨기세요', 'hide'],
    ['얻으세요', 'get'], ['보내세요', 'send'], ['가져오세요', 'take'],
  ],
};

describe.each(Object.keys(IMPERATIVES))('%s imperatives', language => {
  it.each(IMPERATIVES[language])('%s resolves to %s', (surface, concept) => {
    const [token] = getTokenizer(language).tokenize(surface).tokens;
    // Either route is acceptable: a declared alternative makes it a keyword outright,
    // a regular form carries the native stem. What matters is that the concept
    // is reachable — assert the outcome, not which mechanism supplied it.
    const reachedByKeyword = token.kind === 'keyword' && token.normalized === concept;
    const reachedByStem = token.stem !== undefined && token.normalized === concept;
    expect(reachedByKeyword || reachedByStem).toBe(true);
  });
});

describe('imperative commands parse end to end', () => {
  it.each([
    ['es', 'agrega .active a #button', 'add'],
    ['es', 'oculta #button', 'hide'],
    ['pt', 'adicione .active a #button', 'add'],
    ['pt', 'remova .active de #button', 'remove'],
    ['fr', 'ajoute .active à #button', 'add'],
    ['fr', 'montre #button', 'show'],
    ['ko', '.active을 추가하세요', 'add'],
  ])('[%s] %s', (language, source, action) => {
    const node = parse(source, language);
    expect(node).not.toBeNull();
    expect((node as { action?: string }).action).toBe(action);
  });

  it('still parses the dictionary form it always accepted', () => {
    for (const [language, source] of [
      ['es', 'agregar .active a #button'],
      ['pt', 'adicionar .active a #button'],
      ['fr', 'ajouter .active à #button'],
    ] as Array<[string, string]>) {
      expect((parse(source, language) as { action?: string }).action).toBe('add');
    }
  });
});

describe('rendering is unchanged', () => {
  // The constraint this must not violate: accepting the imperative on input must
  // not make anything EMIT it. `primary` stays the dictionary form.
  it.each(['es', 'pt', 'fr'])('[%s] still renders the dictionary form', language => {
    const rendered = translate('add .active to #button', 'en', language);
    expect(rendered).toMatch(/agregar|adicionar|ajouter/);
  });
});
