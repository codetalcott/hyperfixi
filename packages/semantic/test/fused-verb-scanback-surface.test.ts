/**
 * The re-parse that reclaims a fused handler's dropped tail has to be able to
 * FIND the verb, and it cannot do that by normalized form alone.
 *
 * A fused event pattern captures the wrapped command's verb plus (at most) its
 * primary argument, leaving secondary role clauses unconsumed — `fetch-event-
 * {L}-vso` keeps `source` but drops the `as {responseType}` tail. The parser
 * already re-parses `[verb..clause boundary]` and swaps in the richer standalone
 * result for exactly this reason, and it locates the verb by scanning back for a
 * token whose NORMALIZED form equals the action name.
 *
 * That premise fails in two ways, both live in the corpus:
 *   id  `muat` normalizes to `load` — a SYNONYM of fetch, not the action name.
 *   he  `הבא`  normalizes to `next` — an outright HOMOGRAPH; the word means
 *        both "next" and "fetch/bring".
 * `verbIdx` stayed -1, so no re-parse ran at all and the tail was simply lost,
 * in every he/id fetch row: fetch-json, fetch-error-handling, fetch-do-not-throw
 * and event-debounce.
 *
 * The profile already carries the verb surface per command
 * (`profile.keywords[action]`), so the scan-back now asks it rather than
 * trusting the normalizer to agree with the schema's action name.
 */
import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';
import type { CommandSemanticNode, SemanticNode } from '../src/types';

const LANGUAGES = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

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

function role(node: CommandSemanticNode | null, name: string) {
  return node?.roles.get(name as never) as
    | { type?: string; raw?: string; value?: unknown }
    | undefined;
}

describe('a fused fetch keeps its `as {responseType}` tail in every language', () => {
  // he and id were the two that failed; the other 21 pin the normalized-form
  // path, which must keep working unchanged.
  it.each(LANGUAGES)('%s recovers responseType inside a handler', language => {
    const rendered = translate('on click fetch /api/user as json', 'en', language);
    const fetched = find(parse(rendered, language), 'fetch');
    expect(fetched, `${language}: no fetch parsed out of: ${rendered}`).not.toBeNull();
    const rt = role(fetched, 'responseType');
    expect(rt?.raw ?? rt?.value, `${language} lost the responseType tail: ${rendered}`).toBe(
      'json'
    );
    // The swap must not cost the role the fused pattern had already captured.
    expect(role(fetched, 'source')?.value, `${language} lost the source`).toBe('/api/user');
  });
});

describe('the two verbs whose normalized form is not the action name', () => {
  // Pinned by surface, so a profile edit that renames either verb reports here
  // rather than silently reverting the fix to a no-op.
  it.each([
    ['id', 'muat', 'ketika klik muat "/api/user" sebagai json'],
    ['he', 'הבא', 'ב click הבא "/api/user" כ json'],
  ] as const)('%s renders the verb `%s` and still re-parses the tail', (language, verb, expected) => {
    const rendered = translate('on click fetch /api/user as json', 'en', language);
    expect(rendered).toBe(expected);
    expect(rendered).toContain(verb);
    const rt = role(find(parse(rendered, language), 'fetch'), 'responseType');
    expect(rt?.raw ?? rt?.value).toBe('json');
  });
});

describe('the bare form was never broken and stays intact', () => {
  // The standalone patterns always captured the tail; only the handler-wrapped
  // path lost it. This is the control that says the fix moved the right thing.
  it.each(['id', 'he'] as const)('%s parses a bare fetch with its tail', language => {
    const rendered = translate('fetch /api/user as json', 'en', language);
    const rt = role(find(parse(rendered, language), 'fetch'), 'responseType');
    expect(rt?.raw ?? rt?.value, `${language}: ${rendered}`).toBe('json');
  });
});
