import { MultilingualHyperscript } from '@hyperfixi/core/multilingual';
import { getTranslationsByLanguage } from '@hyperfixi/patterns-reference';
import { collectActions } from '../src/multilingual/fidelity';

// Representative degenerate cases spanning the dominant clusters + word orders.
const CASES: Array<[string, string]> = [
  ['if-empty', 'ja'],
  ['fetch-loading-state', 'ar'],
  ['async-block', 'tl'],
  ['input-validation', 'ko'],
  ['form-submit-prevent', 'tr'],
];

function tree(node: any, depth = 0): string {
  if (!node || typeof node !== 'object') return '';
  const pad = '  '.repeat(depth);
  const lines: string[] = [];
  const action = node.action;
  if (typeof action === 'string') lines.push(`${pad}• ${action}`);
  for (const f of ['body', 'statements', 'thenBranch', 'elseBranch', 'branches']) {
    const c = node[f];
    if (Array.isArray(c)) {
      if (c.length) lines.push(`${pad}  [${f}]`);
      for (const x of c) lines.push(tree(x, depth + 2));
    } else if (c && typeof c === 'object') {
      lines.push(`${pad}  {${f}}`);
      lines.push(tree(c, depth + 2));
    }
  }
  return lines.filter(Boolean).join('\n');
}

async function textOf(id: string, lang: string): Promise<string | undefined> {
  const all = await getTranslationsByLanguage(lang as any, 1000);
  return all.find((t: any) => t.codeExampleId === id)?.hyperscript;
}

async function main() {
  const ml = new MultilingualHyperscript();
  await ml.initialize();

  for (const [id, lang] of CASES) {
    const enText = await textOf(id, 'en');
    const trText = await textOf(id, lang);
    console.log('\n' + '='.repeat(78));
    console.log(`PATTERN: ${id}   (${lang})`);
    console.log('-'.repeat(78));
    if (!enText || !trText) {
      console.log(`  MISSING TEXT: en=${!!enText} ${lang}=${!!trText}`);
      continue;
    }
    const enNode: any = await ml.parse(enText, 'en');
    const trNode: any = await ml.parse(trText, lang);
    const enA = collectActions(enNode);
    const trA = collectActions(trNode);
    const missing = enA.filter(a => !trA.includes(a));
    const extra = trA.filter(a => !enA.includes(a));

    console.log(`EN  src: ${enText}`);
    console.log(`${lang.toUpperCase().padStart(3)} src: ${trText}`);
    console.log(`\nEN  actions [${enA.length}]: ${enA.join(', ')}`);
    console.log(`${lang.toUpperCase().padStart(3)} actions [${trA.length}]: ${trA.join(', ') || '(none)'}`);
    console.log(`DROPPED: ${missing.join(', ') || '—'}    EXTRA: ${extra.join(', ') || '—'}`);
    console.log(`fidelity(recall) = ${(enA.length ? (enA.length - missing.length) / enA.length : 1).toFixed(2)}`);
    console.log(`\nEN parse tree:\n${tree(enNode) || '  (empty)'}`);
    console.log(`\n${lang.toUpperCase()} parse tree:\n${tree(trNode) || '  (empty)'}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
