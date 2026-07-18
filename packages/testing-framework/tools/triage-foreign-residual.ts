/**
 * Batch triage of the foreign→English validity residual
 * -----------------------------------------------------
 * Renders AND validates every allowlisted (pattern, language) pair SEPARATELY,
 * then clusters by the canonical parser's actual complaint. This is the fast
 * inner loop of the validity burndown (HANDOFF_foreign-validity-burndown.md,
 * § "EFFICIENT ITERATION"): run it (~2 s, no gate), attack the largest true
 * cluster, re-run for an instant all-pairs delta — it is what refuted the
 * residual's prose triage in Phases 7, 9, and 10. Previously recreated from a
 * recipe each phase (and once rebuilt WRONG — see the note on `validate` below);
 * committed so the correct usage is encoded exactly once.
 *
 *   npm run populate --prefix packages/patterns-reference   # fresh DB first
 *   npx tsx packages/testing-framework/tools/triage-foreign-residual.ts [--detail out.json]
 *
 * `validate()` returns an ERROR ARRAY (empty = valid) and never throws — do not
 * wrap it in try/catch expecting invalidity to throw; a harness that did
 * misclassified 38/64 residual pairs as VALID (Phase 10). A pair reported VALID
 * here is a STALE allowlist entry: run tools/regen-foreign-baseline.ts to prune
 * it, and expect ADDED=0.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getTranslationsByLanguage, type Translation } from '@hyperfixi/patterns-reference';
import { parseSemantic, render } from '@lokascript/semantic';
import { loadCanonicalParser } from '../src/multilingual/canonical-validity';

const baselinePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../baselines/foreign-canonical-validity.json'
);

type Status = 'VALID' | 'INVALID' | 'PARSE_NULL' | 'RENDER_THREW' | 'NO_ROW';

interface TriageRow {
  pattern: string;
  lang: string;
  status: Status;
  /** First canonical-parser complaint (or the render-throw message). */
  complaint: string;
  source: string;
  rendered: string;
  errors: string[];
}

async function main() {
  const detailIdx = process.argv.indexOf('--detail');
  const detailPath = detailIdx !== -1 ? process.argv[detailIdx + 1] : undefined;

  const allowlist = JSON.parse(readFileSync(baselinePath, 'utf8')) as {
    allowedInvalid: Record<string, string[]>;
  };
  const validate = await loadCanonicalParser();

  // One fetch per language (the allowlist is keyed pattern→langs).
  const languages = [...new Set(Object.values(allowlist.allowedInvalid).flat())];
  const byLanguage = new Map<string, Map<string, Translation>>();
  for (const lang of languages) {
    const translations = await getTranslationsByLanguage(lang, 500);
    byLanguage.set(lang, new Map(translations.map(t => [t.codeExampleId, t])));
  }

  const rows: TriageRow[] = [];
  for (const [pattern, langs] of Object.entries(allowlist.allowedInvalid)) {
    for (const lang of langs) {
      const t = byLanguage.get(lang)?.get(pattern);
      if (!t) {
        rows.push({ pattern, lang, status: 'NO_ROW', complaint: '', source: '', rendered: '', errors: [] });
        continue;
      }
      const row: TriageRow = {
        pattern,
        lang,
        status: 'INVALID',
        complaint: '',
        source: t.hyperscript,
        rendered: '',
        errors: [],
      };
      try {
        const node = parseSemantic(t.hyperscript, lang).node;
        if (!node) {
          row.status = 'PARSE_NULL';
        } else {
          row.rendered = render(node, 'en');
          row.errors = validate(row.rendered);
          row.status = row.errors.length === 0 ? 'VALID' : 'INVALID';
          row.complaint = row.errors[0] ?? '';
        }
      } catch (e) {
        row.status = 'RENDER_THREW';
        row.complaint = String((e as Error).message ?? e).split('\n')[0];
      }
      rows.push(row);
    }
  }

  const byStatus: Record<string, number> = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  console.log('=== STATUS SUMMARY ===', JSON.stringify(byStatus));
  if (byStatus['VALID']) {
    console.log(
      `!!! ${byStatus['VALID']} STALE allowlist entries (render valid) — run tools/regen-foreign-baseline.ts`
    );
  }

  const clusters = new Map<string, TriageRow[]>();
  for (const r of rows) {
    const clusterKey =
      r.status === 'INVALID' ? r.complaint.slice(0, 120) : `[${r.status}]${r.complaint ? ' ' + r.complaint.slice(0, 100) : ''}`;
    if (!clusters.has(clusterKey)) clusters.set(clusterKey, []);
    clusters.get(clusterKey)!.push(r);
  }
  console.log('\n=== CLUSTERS (by canonical complaint, largest first) ===');
  for (const [complaint, group] of [...clusters.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n--- ${group.length} × ${complaint}`);
    for (const g of group) console.log(`    ${g.pattern}/${g.lang}`);
  }

  if (detailPath) {
    writeFileSync(detailPath, JSON.stringify(rows, null, 2) + '\n', 'utf8');
    console.log(`\nFull detail (source/rendered/errors per pair) → ${detailPath}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
