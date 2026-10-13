/**
 * Measure the domain DSLs as docs-internal/DOMAINS_RETHINK.md reports them. Read-only: prints, writes
 * nothing. Runs against the locked `@lokascript/domains` (a devDependency) on this tree's framework and
 * semantic, so build them first (`npm run check:fresh` at the root).
 *
 *   cd packages/framework && npx tsx scripts/domain-probes.ts
 *
 * 1. Round trip: every command of each domain, its roles filled with placeholder values, rendered in each
 *    of the domain's languages by its own renderer and parsed back by its own parser. `pass`, `refused`
 *    (the parse throws) or `silent` (it reads something else), with the silent cases classified.
 * 2. Leftover input: each command's English render plus a trailing unknown word. A parse that does not
 *    throw accepted input it did not read.
 * 3. learn vs semantic: domain-learn's translation of 15 English commands, read back by
 *    `@lokascript/semantic` (the reader the hyperscript adapter runs).
 */
import * as semantic from '@lokascript/semantic';

const DOMAINS = [
  'animation',
  'bdd',
  'behaviorspec',
  'control',
  'events',
  'flow',
  'html',
  'hypermedia',
  'jsx',
  'learn',
  'llm',
  'sprites',
  'sql',
  'todo',
  'voice',
];

type Roles = Record<string, string>;
interface Schema {
  action: string;
  roles: { role: string; required?: boolean; expectedTypes?: string[] }[];
}
interface DSL {
  parse(input: string, language: string): { action: string; roles: Map<string, unknown> | Roles };
  render?(node: unknown, language: string): string | null;
  translate(input: string, from: string, to: string): string;
  getSupportedLanguages(): string[];
}

async function load(name: string): Promise<{ dsl: DSL; schemas: Schema[] }> {
  const mod: Record<string, unknown> = await import(`@lokascript/domains/${name}`);
  const factory = Object.keys(mod).find(k => /^create\w*DSL$/.test(k));
  if (!factory) throw new Error(`no DSL factory in @lokascript/domains/${name}`);
  const found = Object.values(mod)
    .flatMap(v => (Array.isArray(v) ? v : []))
    .filter((x): x is Schema => typeof x?.action === 'string' && Array.isArray(x?.roles));
  const schemas = [...new Map(found.map(s => [s.action, s])).values()];
  return { dsl: (mod[factory] as () => DSL)(), schemas };
}

/** A placeholder no domain's vocabulary uses: a selector where only a selector fits, a number for counts. */
function placeholder(role: Schema['roles'][number], i: number): string {
  const types = role.expectedTypes ?? [];
  if (types.includes('selector') && !types.includes('literal') && !types.includes('expression'))
    return `#box${i}`;
  if (
    types.length === 1 &&
    types[0] === 'literal' &&
    /count|amount|number|limit|times|duration|quantity/i.test(role.role)
  )
    return String(10 + i);
  return `v${i}x`;
}

function rolesOf(node: { roles: Map<string, unknown> | Roles }): Roles {
  const entries = node.roles instanceof Map ? [...node.roles] : Object.entries(node.roles ?? {});
  return Object.fromEntries(
    entries
      .map(([k, v]): [string, string] => [
        k,
        String((v as { value?: unknown })?.value ?? (v as { raw?: unknown })?.raw ?? v),
      ])
      .sort(([a], [b]) => (a < b ? -1 : 1))
  );
}

function classify(want: Roles, got: Roles, sameAction: boolean): string {
  if (!sameAction) return 'another command';
  if (Object.entries(want).every(([k, v]) => got[k] === v)) return 'a role added';
  const written = new Set(Object.values(want));
  if (
    Object.values(got).some(
      v => !written.has(v) && !/^(v\d+x|#box\d+|\d+)$/.test(v) && !v.includes(' ')
    )
  )
    return 'a marker word as the value';
  if (Object.keys(want).some(k => !(k in got))) return 'a role lost';
  return 'a value changed';
}

async function roundTrip(): Promise<void> {
  console.log('1. Round trip (render in each language, parse back)');
  let pass = 0,
    refused = 0,
    silent = 0;
  const classes: Record<string, number> = {};
  const leftover = { refused: 0, accepted: 0 };
  for (const name of DOMAINS) {
    const { dsl, schemas } = await load(name);
    const langs = dsl.getSupportedLanguages();
    let p = 0,
      n = 0;
    for (const schema of schemas) {
      const required = schema.roles.filter(r => r.required);
      const variants =
        required.length === schema.roles.length ? [required] : [required, schema.roles];
      for (const roles of variants) {
        const ref = dsl.parse(
          `[${schema.action}${roles.map((r, i) => ` ${r.role}:${placeholder(r, i)}`).join('')}]`,
          'en'
        );
        const want = rolesOf(ref);
        for (const lang of langs) {
          n++;
          const text = dsl.render?.(ref, lang);
          let back;
          try {
            if (!text) throw new Error('no render');
            back = dsl.parse(text, lang);
          } catch {
            refused++;
            continue;
          }
          const got = rolesOf(back);
          if (back.action === ref.action && JSON.stringify(got) === JSON.stringify(want)) {
            p++;
            continue;
          }
          silent++;
          const c = classify(want, got, back.action === ref.action);
          classes[c] = (classes[c] ?? 0) + 1;
        }
        if (roles === required) {
          const english = dsl.render?.(ref, 'en');
          if (english) {
            try {
              dsl.parse(`${english} zzqx`, 'en');
              leftover.accepted++;
            } catch {
              leftover.refused++;
            }
          }
        }
      }
    }
    pass += p;
    console.log(
      `  ${name.padEnd(13)} ${String(schemas.length).padStart(2)} commands, ${String(langs.length).padStart(2)} languages: ${p}/${n}`
    );
  }
  const total = pass + refused + silent;
  console.log(
    `  total ${pass}/${total} (${Math.round((100 * pass) / total)}%): ${refused} refused, ${silent} silent`
  );
  console.log(
    `  silent: ${Object.entries(classes)
      .sort((a, b) => b[1] - a[1])
      .map(([c, k]) => `${k} ${c}`)
      .join(', ')}`
  );
  console.log('\n2. Leftover input (English render + one unknown word)');
  console.log(`  accepted ${leftover.accepted}, refused ${leftover.refused}`);
}

async function learnVsSemantic(): Promise<void> {
  console.log('\n3. domain-learn sentences read by semantic');
  const { dsl } = await load('learn');
  const sources = [
    'add .active to #box',
    'remove .active from #box',
    'toggle .active on #box',
    'put "hi" into #box',
    'set x to 5',
    'show #box',
    'hide #box',
    'wait 2s',
    'fetch /api',
    'send click to #box',
    'go to /home',
    'increment x',
    'decrement x',
    'take .active from #box',
    'get #box',
  ];
  const langs = dsl.getSupportedLanguages().filter(l => l !== 'en');
  const out = { same: 0, refused: 0, other: 0, learnFailed: 0 };
  for (const src of sources) {
    const want = semantic.translate(src, 'en', 'en');
    for (const lang of langs) {
      let sentence;
      try {
        sentence = dsl.translate(src, 'en', lang);
      } catch {
        out.learnFailed++;
        continue;
      }
      let got;
      try {
        got = semantic.translate(sentence, lang, 'en');
      } catch {
        out.refused++;
        continue;
      }
      if (got === want) out.same++;
      else out.other++;
    }
  }
  const n = sources.length * langs.length;
  console.log(
    `  ${n} (${sources.length} commands × ${langs.length} languages): read as the source ${out.same}, refused ${out.refused}, read otherwise ${out.other}, learn could not translate ${out.learnFailed}`
  );
}

await roundTrip();
await learnVsSemantic();
