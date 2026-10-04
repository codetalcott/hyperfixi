/**
 * Shipped sources: the hyperscript this repository ships to users
 * ----------------------------------------------------------------
 * Collects every hyperscript source in `examples/` and the doc trees, for the
 * gates that read them:
 *
 * - `shipped-sources-engine.test.ts`: every English source must parse on
 *   `@hyperfixi/engine`, or be listed with a reason (`checkShippedSourcesOnEngine`);
 * - `shipped-sources-localized.test.ts`: every source written in another
 *   language must translate to English both engines parse (`collectLocalizedSources`);
 * - the R4-style second opinion, upstream `hyperscript.org`, is
 *   `loadCanonicalParser()` in canonical-validity.ts.
 *
 * (The file is named for the gate it began with: core's "recovers with
 * errors" ratchet, which flagged sources `@hyperfixi/core`'s resilient parser
 * accepted with diagnostics — how five malformed examples were found, and the
 * `send`-vs-`trigger` divergence and `parseTriggerCommand` hang of #780. It left
 * with core's parser in Phase C4; the engine has no recovering mode, so a
 * malformed source is simply rejected, and the engine gate sees it.)
 *
 * Node-only: walks the repo and reads git's index.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { extractHyperscriptFromMarkup } from '@hyperfixi/patterns-reference';

/** Repo root, from `packages/testing-framework/src/multilingual/`. */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

/** Trees whose hyperscript we ship to users. */
const DEFAULT_ROOTS = ['examples', 'docs', 'packages/core/docs'];

/**
 * Paths excluded from the sweep, each with the reason it is not a shipped
 * source. Keep this list short and justified — every entry is coverage lost.
 */
const EXCLUDED = [
  {
    match: (rel: string) => rel.includes(`${path.sep}archive${path.sep}`),
    reason: 'historical phase/summary docs, not shipped guidance',
  },
];

export interface ShippedSource {
  /** Repo-relative path of the file the source came from. */
  file: string;
  /** How it was extracted, for triage. */
  kind: 'html-attribute' | 'markdown-html-block';
  /** The hyperscript source itself. */
  source: string;
}

/**
 * A stable key for an individual snippet.
 *
 * Hashing the source (rather than using its index in the file) means the key
 * survives reordering, and — the point — CHANGES when the snippet is fixed, so
 * a stale allowlist entry cannot silently keep covering a source that has been
 * edited. The stale-entry test turns that into a hard failure.
 */
function keyFor(file: string, source: string): string {
  return `${file}::${createHash('sha1').update(source).digest('hex').slice(0, 10)}`;
}

/**
 * The files git actually tracks under `repoRoot`, as absolute paths.
 *
 * These gates walk the working TREE, and a working tree is not a clean checkout:
 * `examples/vite-plugin-multilingual/` is GITIGNORED, so a local run saw a
 * source CI could never see. That is unfixable from the allowlist — with an
 * entry for it the gate failed in CI as a STALE entry, and without one it
 * failed locally as a NEW finding. No allowlist state satisfies both, so the
 * DENOMINATOR is what has to agree.
 *
 * The sibling `shipped-examples-execution` gate already derives its corpus this
 * way, and its comment records that the lesson cost **#862** — it "failed on
 * every clean checkout the first time CI ran it" for exactly this reason. This
 * gate was simply never brought into line; it cost another CI round-trip on
 * 2026-08-31 before anyone noticed the two disagreed.
 *
 * git being unavailable THROWS rather than falling back to the full tree, which
 * is the sibling's convention and for its stated reason: a silent fallback
 * would resurrect the drift this exists to kill.
 */
function trackedFiles(repoRoot: string): Set<string> {
  const out = execFileSync('git', ['-C', repoRoot, 'ls-files', '-z'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return new Set(
    out
      .split('\0')
      .filter(Boolean)
      .map(rel => path.join(repoRoot, rel))
  );
}

function walk(dir: string, acc: string[] = [], tracked?: Set<string>): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc, tracked);
    else if (/\.(html|md)$/.test(entry.name)) {
      // Skip anything git does not track, so local and CI score the same set.
      if (tracked && !tracked.has(full)) continue;
      acc.push(full);
    }
  }
  return acc;
}

/**
 * Collect every hyperscript source we ship.
 *
 * HTML files contribute their `_=` / `hx-live` attributes and
 * `<script type="text/hyperscript">` bodies, read through the DOM (see
 * `extractHyperscriptFromMarkup` for why not a regex). Markdown contributes
 * the same, extracted from its fenced ```html blocks.
 *
 * Bare fenced ```hyperscript blocks are deliberately NOT collected: in this
 * repo they are overwhelmingly syntax *notation* rather than code
 * (`send <event> to <target>`, `copy <source> as <format>`), which no parser
 * can accept and which it would be wrong to demand parses. The sources that
 * actually run on a page are the attributes.
 */
export function collectShippedSources(
  doc: Parameters<typeof extractHyperscriptFromMarkup>[0],
  opts?: { roots?: string[]; repoRoot?: string }
): ShippedSource[] {
  const repoRoot = opts?.repoRoot ?? REPO_ROOT;
  const roots = opts?.roots ?? DEFAULT_ROOTS;
  const out: ShippedSource[] = [];

  const tracked = trackedFiles(repoRoot);
  for (const root of roots) {
    for (const full of walk(path.join(repoRoot, root), [], tracked)) {
      const rel = path.relative(repoRoot, full);
      if (EXCLUDED.some(e => e.match(rel))) continue;
      const text = fs.readFileSync(full, 'utf8');

      if (full.endsWith('.html')) {
        for (const source of extractHyperscriptFromMarkup(doc, text).snippets) {
          out.push({ file: rel, kind: 'html-attribute', source });
        }
      } else {
        for (const block of text.matchAll(/```html\n([\s\S]*?)```/g)) {
          for (const source of extractHyperscriptFromMarkup(doc, block[1] ?? '').snippets) {
            out.push({ file: rel, kind: 'markdown-html-block', source });
          }
        }
      }
    }
  }
  return out;
}

/** A shipped source written in another language: an `_` under a non-English `lang`. */
export interface LocalizedSource extends ShippedSource {
  /** The base language of the closest `lang` (`es` for `es-MX`). */
  lang: string;
}

/**
 * The shipped `_` attributes written in a language other than English. The
 * other collectors hand every source to an English parser, which rejects
 * these, so both shipped-sources gates skip them; on a page they run through
 * the multilingual adapter, which translates a script under its element's
 * `lang`. Pages are parsed as documents here, so a `lang` on `<html>` counts.
 */
export function collectLocalizedSources(opts?: {
  roots?: string[];
  repoRoot?: string;
}): LocalizedSource[] {
  const repoRoot = opts?.repoRoot ?? REPO_ROOT;
  const roots = opts?.roots ?? DEFAULT_ROOTS;
  const out: LocalizedSource[] = [];
  const tracked = trackedFiles(repoRoot);
  for (const root of roots) {
    for (const full of walk(path.join(repoRoot, root), [], tracked)) {
      const rel = path.relative(repoRoot, full);
      if (EXCLUDED.some(e => e.match(rel))) continue;
      const text = fs.readFileSync(full, 'utf8');
      const kind: ShippedSource['kind'] = full.endsWith('.html')
        ? 'html-attribute'
        : 'markdown-html-block';
      const parts =
        kind === 'html-attribute'
          ? [text]
          : [...text.matchAll(/```html\n([\s\S]*?)```/g)].map(m => m[1] ?? '');
      for (const html of parts) {
        const { window } = new JSDOM(html);
        const elements: Element[] = Array.from(window.document.querySelectorAll('[_]'));
        for (const el of elements) {
          const source = el.getAttribute('_') ?? '';
          const lang = (el.closest('[lang]')?.getAttribute('lang') ?? '').split('-')[0];
          if (!source.trim() || !lang || lang.toLowerCase() === 'en') continue;
          out.push({ file: rel, kind, source, lang: lang.toLowerCase() });
        }
        window.close();
      }
    }
  }
  return out;
}

/** A shipped English source `@hyperfixi/engine` rejects. */
export interface EngineRejection extends ShippedSource {
  /** Stable key: file plus a hash of the source. */
  key: string;
  /** The engine's first parse error, first line. */
  error: string;
  excerpt: string;
}

export interface ShippedSourcesOnEngineResult {
  /** Distinct (file, source) pairs written in English: the denominator. */
  checked: number;
  /** Of those, the ones the engine parses. */
  engineAccepts: number;
  /** Distinct sources skipped because they are written in another language. */
  localized: number;
  rejections: EngineRejection[];
}

/**
 * Every shipped source written in English, put to the engine's parser.
 * `engineErrors` returns the engine's parse errors ([] = it parses).
 *
 * A source under a non-English `lang` is not English hyperscript: on a page it
 * runs through the multilingual adapter, and `shipped-sources-localized.test.ts`
 * checks it that way. Every other source must parse, or be listed.
 *
 * (Until Phase C4 the denominator was the sources `@hyperfixi/core` compiled
 * clean, which also excluded non-English snippets that carried no `lang` and
 * malformed doc examples. Moving off core surfaced fourteen: eleven examples in
 * another language without a `lang`, now marked, and three malformed ones, now
 * fixed.)
 */
export function checkShippedSourcesOnEngine(
  engineErrors: (code: string) => string[],
  doc: Parameters<typeof extractHyperscriptFromMarkup>[0],
  opts?: { roots?: string[]; repoRoot?: string }
): ShippedSourcesOnEngineResult {
  const foreign = new Set(collectLocalizedSources(opts).map(s => keyFor(s.file, s.source)));
  const seen = new Set<string>();
  const rejections: EngineRejection[] = [];
  let checked = 0;
  let engineAccepts = 0;
  let localized = 0;

  for (const s of collectShippedSources(doc, opts)) {
    const key = keyFor(s.file, s.source);
    if (seen.has(key)) continue;
    seen.add(key);
    if (foreign.has(key)) {
      localized++;
      continue;
    }
    checked++;
    const errors = engineErrors(s.source);
    if (errors.length === 0) {
      engineAccepts++;
      continue;
    }
    rejections.push({
      ...s,
      key,
      error: (errors[0] ?? '').split('\n')[0] ?? '',
      excerpt: s.source.replace(/\s+/g, ' ').trim().slice(0, 100),
    });
  }
  return { checked, engineAccepts, localized, rejections };
}
