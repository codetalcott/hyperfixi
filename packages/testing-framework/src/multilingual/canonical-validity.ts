/**
 * Canonical-validity gate
 * ------------------------
 * The multilingual fidelity ratchet scores role recall on de-duplicated
 * action/role sets and NEVER parses the rendered surface on the real
 * `hyperscript.org` engine. So a parse can be 100 %-faithful (right actions,
 * right roles) yet emit English the canonical parser rejects — e.g. the
 * `fetch from "/url"` defect. This gate closes that blind spot: render every
 * corpus English reference and parse the result on the canonical engine,
 * failing on any invalid output that is not in the committed allowlist.
 *
 * It is deterministic and English-only (no translation leg), which isolates the
 * renderer. Denominator = inputs the canonical parser already accepts, so a few
 * inherently non-canonical corpus rows never distort the signal.
 *
 * Follow-up (see HANDOFF_semantic-roundtrip-validity.md § Recommendation):
 * fold this as an R4 canonical-validity signal into `multilingual/cli.ts`'s
 * `--regression` gate, and bake the same parse-check into the build-time
 * `@hyperscript-tools/i18n` transpiler so every emitted output is parser-gated.
 */

import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { getAllPatterns } from '@hyperfixi/patterns-reference';
import { parseSemantic, render } from '@lokascript/semantic';

/** Parse `src` on the canonical engine; returns the list of error messages (empty = valid). */
export type CanonicalValidate = (src: string) => string[];

export interface CanonicalValidityFailure {
  id: string;
  /** First command of the source (`on click fetch …` → `fetch`), for grouping. */
  command: string;
  en: string;
  rendered: string;
  error: string;
}

export interface CanonicalValidityResult {
  /** Corpus rows whose English input the canonical parser itself accepts. */
  checked: number;
  valid: number;
  failures: CanonicalValidityFailure[];
}

/**
 * Load the real `hyperscript.org` parser headlessly — resolve the package, then
 * import the sibling prebuilt `_hyperscript.esm.js` by file URL (no DOM shim
 * needed for parsing). `hs.parse(src).errors` COLLECTS errors, it does not throw
 * (except the `js` command's `new Function`, which we don't exercise here).
 */
export async function loadCanonicalParser(): Promise<CanonicalValidate> {
  const require = createRequire(import.meta.url);
  const dir = path.dirname(require.resolve('hyperscript.org')); // …/hyperscript.org/dist
  const esm = path.join(dir, '_hyperscript.esm.js');
  const hs = (await import(pathToFileURL(esm).href)).default;
  return (src: string) => (hs.parse(src)?.errors ?? []).map((e: { message: string }) => e.message);
}

function firstCommand(src: string): string {
  const m = src.match(/^\s*on\s+\S+\s+(\w+)/) ?? src.match(/^\s*(\w+)/);
  return m?.[1] ?? '?';
}

/**
 * Render every corpus English reference to English and parse it on the canonical
 * engine. Only rows the canonical parser already accepts are scored.
 */
export async function checkCorpusRenderValidity(opts?: {
  validate?: CanonicalValidate;
}): Promise<CanonicalValidityResult> {
  const validate = opts?.validate ?? (await loadCanonicalParser());
  const patterns = await getAllPatterns();

  const failures: CanonicalValidityFailure[] = [];
  let checked = 0;
  let valid = 0;

  for (const pattern of patterns) {
    const en = pattern.rawCode;
    if (validate(en).length !== 0) continue; // fair denominator: canonical accepts the input
    checked++;

    let rendered: string;
    let errors: string[];
    try {
      const node = parseSemantic(en, 'en').node;
      rendered = node ? render(node, 'en') : '(no node)';
      errors = validate(rendered);
    } catch (e) {
      rendered = '(threw)';
      errors = ['threw: ' + (e as Error).message.split('\n')[0]];
    }

    if (errors.length === 0) {
      valid++;
    } else {
      failures.push({
        id: pattern.id,
        command: firstCommand(en),
        en,
        rendered,
        error: errors[0] ?? 'unknown error',
      });
    }
  }

  return { checked, valid, failures };
}
