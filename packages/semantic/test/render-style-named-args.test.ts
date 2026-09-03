/**
 * `render #tpl with users: $data` keeps its variables in every language.
 *
 * `renderSchema.style` declared `expectedTypes: ['expression', 'reference']`.
 * The `reference` is what broke it: the pattern matcher routes a named-argument
 * run through its object-literal fold only in an EXPRESSION-ONLY slot, so with
 * `reference` in the list the slot bound the first thing that looked like a
 * reference — `$data` — and left `users :` unconsumed. The role came back typed
 * `reference` where the English reference says `expression`, which the corpus
 * gate scores as a lost `render.style:expression`.
 *
 * This is the same lever `fetchSchema.style` already documents: expression-only
 * plus `valueShape: 'object'`, the second half being what keeps an UNCAPTURED
 * style slot out of `scoreRoleCoverage`'s denominator so a plain `render #tpl`
 * does not lose confidence for the slot it did not fill.
 *
 * Only the six SOV languages showed it, because only they render the with-phrase
 * ahead of the verb where the pattern's `[{style} <marker>]` group has to bind
 * it: ja `users:$data で #user-list を 描画`. The SVO/VSO renders put it after
 * the patient, where the trailing-style reclaim already folded it.
 */

import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';
import type { CommandSemanticNode, SemanticNode } from '../src/types';

const LANGUAGES = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

/**
 * All six SOV languages. bn was held out until the fused-handler body rewind
 * landed: it rendered and parsed the with-phrase correctly as a BARE command
 * and lost it only inside a handler, because `event-handler-bn-sov`'s trailing
 * `{action}` slot swallowed the body's leading named-argument run and the body
 * parse resumed after it. The pin that guarded that residual is now the second
 * assertion below.
 */
const SOV_WITH_PHRASE = ['bn', 'hi', 'ja', 'ko', 'qu', 'tr'] as const;

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

function style(node: CommandSemanticNode | null): { type?: string; raw?: string } | undefined {
  return node?.roles.get('style' as never) as { type?: string; raw?: string } | undefined;
}

describe('the with-phrase binds as ONE expression', () => {
  it.each(SOV_WITH_PHRASE)('%s folds `users: $data` into the style slot', language => {
    // Pre-change: `style: reference="$data"`, with `users :` reported as
    // `unconsumed-input` — half the argument silently gone.
    const rendered = translate('render #user-list with users: $data', 'en', language);
    const node = find(parse(rendered, language), 'render');
    expect(node, `${language}: rendered render did not re-parse: ${rendered}`).not.toBeNull();
    expect(style(node)?.type, `${language} mistyped the style`).toBe('expression');
    expect(style(node)?.raw, `${language} lost half the argument`).toContain('users');
  });

  it.each(SOV_WITH_PHRASE)('%s survives the handler form too', language => {
    const rendered = translate(
      'on click render #user-list with users: $data then put it into #container',
      'en',
      language
    );
    const node = find(parse(rendered, language), 'render');
    expect(node, `${language}: handler form did not re-parse: ${rendered}`).not.toBeNull();
    expect(style(node)?.type, `${language} lost the style in a handler`).toBe('expression');
  });
});

describe('a render with NO variables is unchanged', () => {
  // `valueShape: 'object'` is what keeps the unfilled slot out of the confidence
  // denominator; without it a plain render pays for the option it did not use.
  it.each(LANGUAGES)('%s still round-trips a bare render', language => {
    const rendered = translate('render #user-list', 'en', language);
    const node = find(parse(rendered, language), 'render');
    expect(node, `${language}: bare render did not re-parse: ${rendered}`).not.toBeNull();
    expect(node!.roles.has('style' as never), `${language} invented a style role`).toBe(false);
  });
});

describe('bn keeps the with-phrase inside a handler (was the held-out residual)', () => {
  // The bare form always worked; the handler form did not, and the difference
  // was the fused handler body rewind — kept as its own case so a regression
  // reports as "bn lost it again inside a handler" rather than as one row of
  // the parameterised sweep above.
  it('bn parses the with-phrase as a bare command', () => {
    const rendered = translate('render #user-list with users: $data', 'en', 'bn');
    const node = find(parse(rendered, 'bn'), 'render');
    expect(style(node)?.type).toBe('expression');
  });

  it('bn keeps it inside a handler too', () => {
    const rendered = translate('on click render #user-list with users: $data', 'en', 'bn');
    const node = find(parse(rendered, 'bn'), 'render');
    expect(style(node)?.type, `bn lost the style inside a handler:\n${rendered}`).toBe(
      'expression'
    );
  });
});
