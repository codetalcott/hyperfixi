/**
 * mcp-test.ts — verify Siren format against a running server.
 *
 * Usage:
 *   npm run dev &        # start server on :3030
 *   npm run mcp:test     # run this script
 *
 * Follows the same pattern as grail-demo/examples/mcp-test.ts: exercise
 * the entry point and each tool, assert the response envelope is Siren-
 * compatible, fail fast on any deviation.
 */

export {};

const BASE = process.env.MCP_BASE_URL ?? 'http://localhost:3030/api';

interface TestResult {
  name: string;
  ok: boolean;
  message?: string;
  body?: unknown;
}

const results: TestResult[] = [];

function record(name: string, ok: boolean, message?: string, body?: unknown): void {
  results.push({ name, ok, message, body });
  const icon = ok ? '✓' : '✗';
  const suffix = message ? ` — ${message}` : '';
  console.log(`${icon} ${name}${suffix}`);
}

function assert(cond: unknown, name: string, message?: string, body?: unknown): void {
  record(name, Boolean(cond), message, body);
}

async function fetchJson(path: string, method = 'GET', body?: unknown): Promise<{
  status: number;
  body: any;
}> {
  let url: string;
  if (path.startsWith('http')) {
    url = path;
  } else if (path === '' || path === '/') {
    url = BASE;
  } else {
    url = `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
  }
  const init: RequestInit = {
    method,
    headers: { Accept: 'application/vnd.siren+json, application/json' },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let parsed: any;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { rawText: text };
  }
  return { status: res.status, body: parsed };
}

async function main(): Promise<void> {
  console.log(`\n=== @lokascript/mcp-multilingual-intent MCP Compatibility Test ===`);
  console.log(`Base: ${BASE}\n`);

  // 1. Entry point
  const entry = await fetchJson('');
  assert(entry.status === 200, 'entry point: GET / returns 200');
  assert(Array.isArray(entry.body?.class), 'entry point: has class array');
  assert(
    entry.body?.class?.includes('entry-point'),
    'entry point: class includes "entry-point"'
  );
  assert(Array.isArray(entry.body?.actions), 'entry point: has actions array');
  assert(
    entry.body?.actions?.length >= 4,
    `entry point: has at least 4 actions (got ${entry.body?.actions?.length ?? 0})`
  );
  assert(Array.isArray(entry.body?.links), 'entry point: has links array');

  // 2. list_supported_languages
  const langs = await fetchJson('/languages');
  assert(langs.status === 200, 'languages: GET /languages returns 200');
  assert(
    Array.isArray(langs.body?.properties?.result?.languages),
    'languages: properties.result.languages is an array'
  );
  assert(
    (langs.body?.properties?.result?.languages?.length ?? 0) >= 4,
    `languages: at least 4 languages supported (got ${langs.body?.properties?.result?.languages?.length ?? 0})`
  );

  // 3. parse_multilingual_intent (English, SQL-ish)
  const parseEn = await fetchJson('/parse', 'POST', {
    text: 'select name from users',
    language: 'en',
  });
  assert(parseEn.status === 200, 'parse EN sql: POST /parse returns 200');
  assert(
    parseEn.body?.properties?.result?.action,
    `parse EN sql: result has action (got ${JSON.stringify(parseEn.body?.properties?.result?.action)})`
  );
  assert(
    typeof parseEn.body?.properties?.result?.confidence === 'number',
    'parse EN sql: result has numeric confidence'
  );

  // 4. detect_domain (English, SQL-ish)
  const detectEn = await fetchJson('/detect', 'POST', {
    text: 'select name from users',
    language: 'en',
  });
  assert(detectEn.status === 200, 'detect EN sql: POST /detect returns 200');
  assert(
    typeof detectEn.body?.properties?.result?.matched === 'boolean',
    'detect EN sql: result has matched flag'
  );

  // 5. parse_multilingual_intent (Japanese, SQL — canonical phrasing from
  // domain-sql test fixtures: "users から name 選択")
  const parseJa = await fetchJson('/parse', 'POST', {
    text: 'users から name 選択',
    language: 'ja',
    domain: 'sql',
  });
  assert(parseJa.status === 200, 'parse JA sql: POST /parse with domain=sql returns 200');
  assert(
    parseJa.body?.properties?.result?.action === 'select',
    `parse JA sql: result action is "select" (got ${JSON.stringify(parseJa.body?.properties?.result?.action)})`
  );

  // 6. compile_auto
  const compile = await fetchJson('/compile', 'POST', {
    text: 'select name from users',
    language: 'en',
  });
  assert(compile.status === 200, 'compile EN sql: POST /compile returns 200');
  assert(
    typeof compile.body?.properties?.result?.ok === 'boolean',
    'compile EN sql: result has ok flag'
  );

  // 7. get_pattern_examples
  const examples = await fetchJson('/examples', 'POST', {
    prompt: 'toggle a class on click',
    language: 'en',
    limit: 3,
  });
  assert(examples.status === 200, 'examples: POST /examples returns 200');
  assert(
    Array.isArray(examples.body?.properties?.result?.examples),
    'examples: result has examples array'
  );

  // 8. Error path — missing required field
  const err = await fetchJson('/parse', 'POST', { language: 'en' });
  assert(err.status === 400, 'error path: POST /parse without text returns 400');
  assert(
    err.body?.class?.includes('error'),
    'error path: class includes "error"'
  );

  // 9. After-call entry-point stability — tools should still be listed
  const afterCall = await fetchJson('');
  assert(
    afterCall.body?.actions?.length === entry.body?.actions?.length,
    'stability: entry point action count unchanged after tool calls'
  );

  // Summary
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n--- Summary ---`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${results.length}\n`);

  if (failed > 0) {
    console.log('Failures:');
    for (const r of results) {
      if (!r.ok) console.log(`  - ${r.name}${r.message ? `: ${r.message}` : ''}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('mcp-test failed:', err);
  process.exit(2);
});
