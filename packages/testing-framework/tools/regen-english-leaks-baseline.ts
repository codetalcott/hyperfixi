#!/usr/bin/env npx tsx
/**
 * Regenerate baselines/english-leaks.corpus.json and baselines/english-leaks.shapes.json
 * from the current tree, and print the burn-down.
 *
 * Each baseline lists, per source, the English findings of each language's render (see
 * src/multilingual/english-leaks.ts). Both only shrink: this writes the improvements and
 * REFUSES to write when a pair gained a finding, unless `--allow-new` is given — say why in
 * the PR.
 *
 * Usage: npx tsx tools/regen-english-leaks-baseline.ts [options]
 *   --corpus | --shapes   one half only (default: both)
 *   --allow-new           write even when pairs gained a finding
 *   --report              print the burn-down only; write nothing
 *   --dry-run             print what would change; write nothing
 *
 * The corpus half reads the corpus rows, so it needs a freshly populated patterns.db
 * (`npm run populate --prefix packages/patterns-reference`), like the other corpus gates.
 * The shapes half runs the command-shape cases (about a minute; fresh semantic and engine
 * dists: `npm run check:fresh`).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadCommandShapeCases, runCommandShapes } from '../src/multilingual/command-shapes';
import {
  LEAK_BASELINE_PATHS,
  corpusLeaks,
  diffLeakBaseline,
  initLeakScanner,
  leakBaselineFrom,
  shapeLeaks,
  type LeakBaseline,
  type LeakFinding,
  type LeakHalf,
  type LeakResults,
} from '../src/multilingual/english-leaks';

const DESCRIPTION: Record<LeakHalf, string> = {
  corpus:
    'English-leak gate, corpus half (src/multilingual/english-leaks.ts): per corpus row, the ' +
    "findings of each language's render (render(parse(en), L)): an English grammar word, " +
    '`event:<name>` (an English event the lexicon has a word for) or `case:me` (a nominative ' +
    'pronoun beside a marker). `*` stands for all 23 languages. Shrink-only: regenerate with ' +
    'tools/regen-english-leaks-baseline.ts after a fresh populate.',
  shapes:
    'English-leak gate, command-shape half (src/multilingual/english-leaks.ts): per command-shape ' +
    "case, the findings of each language's render (translate(src, 'en', L)): an English grammar " +
    'word, `event:<name>` or `case:me`. `*` stands for all 23 languages. Shrink-only: regenerate ' +
    'with tools/regen-english-leaks-baseline.ts.',
};

const has = (flag: string): boolean => process.argv.includes(flag);

function pct(n: number, d: number): string {
  return d ? `${((100 * n) / d).toFixed(1)}%` : '-';
}

function report(half: LeakHalf, results: LeakResults, doc: LeakBaseline): void {
  console.log(
    `\n## ${half}: ${results.size} sources, ${doc.renders} renders; ${doc.leaky} (${pct(doc.leaky, doc.renders)}) ` +
      `with a finding; ${doc.findings} findings`
  );
  for (const kind of ['word', 'event', 'case'] as const)
    console.log(
      `  ${kind.padEnd(5)}  ${String(doc.kinds[kind].renders).padStart(6)} renders (${pct(doc.kinds[kind].renders, doc.renders)}), ` +
        `${doc.kinds[kind].findings} findings`
    );
  const perLanguage = new Map<
    string,
    { renders: number; leaky: number; word: number; event: number; case: number }
  >();
  const words = new Map<
    string,
    { n: number; languages: Set<string>; contexts: Map<string, number>; hasWord: number }
  >();
  const events = new Map<string, { n: number; languages: Set<string> }>();
  for (const byLanguage of results.values()) {
    for (const [language, findings] of byLanguage) {
      if (!findings) continue;
      const row = perLanguage.get(language) ?? { renders: 0, leaky: 0, word: 0, event: 0, case: 0 };
      row.renders++;
      if (findings.length) row.leaky++;
      for (const f of findings as LeakFinding[]) {
        row[f.kind]++;
        if (f.kind === 'word') {
          const w = words.get(f.word) ?? {
            n: 0,
            languages: new Set(),
            contexts: new Map(),
            hasWord: 0,
          };
          w.n++;
          w.languages.add(language);
          w.contexts.set(f.context, (w.contexts.get(f.context) ?? 0) + 1);
          if (f.hasWord) w.hasWord++;
          words.set(f.word, w);
        } else if (f.kind === 'event') {
          const e = events.get(f.word) ?? { n: 0, languages: new Set() };
          e.n++;
          e.languages.add(language);
          events.set(f.word, e);
        }
      }
      perLanguage.set(language, row);
    }
  }
  console.log('\nby language: renders with a finding; words, events, pronoun case');
  for (const [language, row] of [...perLanguage].sort(
    (a, b) => b[1].leaky / b[1].renders - a[1].leaky / a[1].renders
  )) {
    console.log(
      `  ${language}  ${String(row.leaky).padStart(5)}/${String(row.renders).padEnd(5)} ${pct(row.leaky, row.renders).padStart(6)}` +
        `   words ${String(row.word).padStart(5)}  events ${String(row.event).padStart(4)}  case ${String(row.case).padStart(4)}`
    );
  }
  console.log(
    '\nby English word (tokens, languages, contexts; `+` = the language has a word for it):'
  );
  for (const [word, w] of [...words].sort((a, b) => b[1].n - a[1].n).slice(0, 70)) {
    const contexts = [...w.contexts].map(([c, n]) => `${c}:${n}`).join(' ');
    console.log(
      `  ${String(w.n).padStart(6)}  ${word.padEnd(14)} ${String(w.languages.size).padStart(2)} langs  ${contexts}` +
        (w.hasWord ? `  +${w.hasWord}` : '')
    );
  }
  if (words.size > 70) console.log(`  … and ${words.size - 70} more words`);
  if (events.size) {
    console.log('\nby English event name (tokens, languages):');
    for (const [event, e] of [...events].sort((a, b) => b[1].n - a[1].n).slice(0, 30)) {
      console.log(
        `  ${String(e.n).padStart(6)}  ${event.padEnd(14)} ${[...e.languages].sort().join(' ')}`
      );
    }
  }
}

async function main(): Promise<void> {
  const halves: LeakHalf[] = has('--corpus')
    ? ['corpus']
    : has('--shapes')
      ? ['shapes']
      : ['corpus', 'shapes'];
  const scanner = await initLeakScanner();
  let refuse = false;
  for (const half of halves) {
    let results: LeakResults;
    if (half === 'shapes') {
      const { cases } = loadCommandShapeCases();
      console.log(`running ${cases.length} command-shape cases …`);
      results = shapeLeaks(scanner, await runCommandShapes(cases), cases);
    } else {
      const { getAllPatterns } = await import('@hyperfixi/patterns-reference');
      const rows = await getAllPatterns({ limit: 5000 });
      const corpus = await corpusLeaks(scanner, rows);
      console.log(
        `corpus: ${rows.length} rows read; ${corpus.results.size} scored; ` +
          `${corpus.skipped.length} the engine or semantic rejects (${corpus.skipped.join(', ')})`
      );
      results = corpus.results;
    }
    const fresh = leakBaselineFrom(results, DESCRIPTION[half]);
    report(half, results, fresh);
    if (has('--report')) continue;

    const file = LEAK_BASELINE_PATHS[half];
    const previous: LeakBaseline | null = existsSync(file)
      ? (JSON.parse(readFileSync(file, 'utf8')) as LeakBaseline)
      : null;
    const changes = previous ? diffLeakBaseline(results, previous) : [];
    const worse = changes.filter(c => c.added.length);
    const better = changes.filter(c => c.gone.length);
    console.log(
      `\nvs the ${half} baseline: ${better.length} pair(s) lost a finding, ${worse.length} gained one`
    );
    for (const w of worse.slice(0, 60))
      console.log(`  GAINED ${w.id} [${w.language}] ${w.added.join(' ')}`);
    if (worse.length > 60) console.log(`  … and ${worse.length - 60} more`);
    if (worse.length && previous && !has('--allow-new')) {
      console.error(
        `\nrefusing to write ${half}: pairs gained a finding. Fix them, or pass --allow-new and say why.`
      );
      refuse = true;
      continue;
    }
    if (has('--dry-run')) continue;
    writeFileSync(file, JSON.stringify(fresh, null, 2) + '\n');
    console.log(
      `wrote ${path.relative(process.cwd(), file)}: ${Object.keys(fresh.entries).length} sources, ` +
        `${fresh.leaky} renders with a finding, ${fresh.findings} findings`
    );
  }
  if (refuse) process.exitCode = 1;
}

main().then(
  () => process.exit(process.exitCode ?? 0),
  e => {
    console.error(e);
    process.exit(1);
  }
);
