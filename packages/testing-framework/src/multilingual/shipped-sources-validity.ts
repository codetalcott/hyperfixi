/**
 * Shipped-sources validity gate
 * -----------------------------
 * Every hyperscript source we ship in `examples/` and the doc trees, parsed
 * with hyperfixi, must not land in the *recovers-with-errors* state:
 * `ok === true` with a non-empty `errors`.
 *
 * That state is the blind spot this gate exists for. The parser is
 * deliberately resilient — it recovers from some malformed input and returns a
 * usable-but-degraded AST plus diagnostics — so genuinely broken sources
 * neither throw nor report `ok: false`. Nothing in the existing suites looks at
 * the combination, which is how five malformed examples shipped undetected
 * (an `if` with no `end`, a `put` with no target, `{id}` where `${id}` was
 * meant, and a `*--css-var` neither engine supports). The same sweep is what
 * caught the `send`-vs-`trigger` divergence and the `parseTriggerCommand` hang
 * in #780, neither of which was reachable from the existing tests.
 *
 * Deliberately NOT gated: `ok === false`. That is a much larger and mostly
 * legitimate class — non-English sources (which need the multilingual path,
 * not `compileSync`), plugin syntax whose feature is not installed, and
 * intentionally-broken "this does not work" doc snippets. Gating it would
 * drown the signal. A source that fails outright is also loud; one that
 * silently recovers is not, and that asymmetry is the whole point.
 *
 * Node-only: the second-opinion path needs `loadCanonicalParser()`, which
 * imports the real `hyperscript.org` build off disk. Cannot run in a browser
 * suite.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
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

export interface ShippedSourceFinding extends ShippedSource {
  /** Stable allowlist key: file plus a hash of the source. */
  key: string;
  /** First hyperfixi diagnostic. */
  error: string;
  /** Single-line excerpt, for reading the baseline without opening the file. */
  excerpt: string;
}

export interface ShippedSourcesResult {
  /** Sources extracted and compiled. */
  checked: number;
  /** Sources that compiled with no diagnostics. */
  clean: number;
  /** Sources in the recovers-with-errors state. */
  findings: ShippedSourceFinding[];
}

/** Minimal shape of `hyperscript.compileSync`, injected so this stays testable. */
export type CompileForValidity = (code: string) => {
  ok: boolean;
  errors?: Array<{ message: string }>;
};

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
 * This gate walks the working TREE, and a working tree is not a clean checkout:
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

/**
 * Compile every shipped source and report the ones that recovered with errors.
 */
export function checkShippedSourcesValidity(
  compile: CompileForValidity,
  doc: Parameters<typeof extractHyperscriptFromMarkup>[0],
  opts?: { roots?: string[]; repoRoot?: string }
): ShippedSourcesResult {
  const sources = collectShippedSources(doc, opts);
  const findings: ShippedSourceFinding[] = [];
  let clean = 0;

  for (const s of sources) {
    let result: ReturnType<CompileForValidity>;
    try {
      result = compile(s.source);
    } catch {
      // A throw is the loud failure mode, not this gate's business.
      continue;
    }
    const errors = result.errors ?? [];
    if (result.ok && errors.length > 0) {
      findings.push({
        ...s,
        key: keyFor(s.file, s.source),
        error: errors[0]?.message ?? 'recovered with errors',
        excerpt: s.source.replace(/\s+/g, ' ').trim().slice(0, 100),
      });
    } else if (result.ok) {
      clean++;
    }
  }

  return { checked: sources.length, clean, findings };
}
