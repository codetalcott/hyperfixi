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

/** The five that recovered. bn is held out — see the pin at the bottom. */
const SOV_WITH_PHRASE = ['hi', 'ja', 'ko', 'qu', 'tr'] as const;

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

describe('KNOWN RESIDUAL — failing-when-fixed', () => {
  // bn renders the with-phrase correctly and parses it correctly as a BARE
  // command; only inside an event handler does it break, and for an unrelated
  // reason: bn's generic `event-handler-bn-sov` extracts its body by token
  // POSITION, and that path mangles any body whose first clause is a
  // named-argument run. Same path, same shape as the bn `set` defect fixed
  // earlier. Pinned rather than hidden, so it reports the moment it clears.
  it('bn parses the with-phrase as a bare command', () => {
    const rendered = translate('render #user-list with users: $data', 'en', 'bn');
    const node = find(parse(rendered, 'bn'), 'render');
    expect(style(node)?.type).toBe('expression');
  });

  it('bn still loses it inside a handler', () => {
    const rendered = translate('on click render #user-list with users: $data', 'en', 'bn');
    const node = find(parse(rendered, 'bn'), 'render');
    expect(
      style(node),
      `bn now keeps the style inside a handler — remove this pin:\n${rendered}`
    ).toBeUndefined();
  });
});
