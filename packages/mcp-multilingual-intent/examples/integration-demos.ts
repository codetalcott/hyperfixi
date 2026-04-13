/**
 * integration-demos.ts — three scripted IDE integration demos.
 *
 * Each demo simulates what an LLM coding agent would receive after calling
 * the MCP server's `parse_multilingual_intent` tool. All three use the
 * `voice` domain (8 languages, language-neutral action vocabulary). The
 * punchline: the semantic *schema* is identical across languages — the
 * action, domain, and role keys are byte-for-byte equivalent whether the
 * prompt is written in EN, JA, AR, or KO. Role *values* preserve the
 * user-supplied identifier verbatim (e.g. `送信` stays `送信`, not
 * auto-translated to `submit`), which is the correct behavior — those
 * identifiers refer to DOM targets the user named in their own language.
 *
 * The demos exist for three purposes:
 *   1. Reproducible artifacts for the landing page and launch posts.
 *   2. Regression detection (assertion failures surface parser drift).
 *   3. Concrete examples for the Claude Desktop / Cursor / Continue docs.
 *
 * Usage:
 *   npm run dev &             # start server on :3030
 *   npm run demos             # run this script
 */

export {};

const BASE = process.env.MCP_BASE_URL ?? 'http://localhost:3030/api';

interface ParseResult {
  domain: string | null;
  language: string;
  confidence: number;
  action: string;
  roles: Record<string, unknown>;
  explicit: string;
}

interface Demo {
  /** Which IDE this demo targets (for header/banner text). */
  ide: string;
  /** One-sentence scenario framing. */
  scenario: string;
  /** Natural-language prompt in the target language. */
  prompt: string;
  /** ISO 639-1 language code. */
  language: string;
  /** English prompt that should produce the same semantic AST. */
  englishPrompt: string;
  /** Optional domain hint — unset means auto-detect. */
  domain?: string;
}

const DEMOS: Demo[] = [
  {
    ide: 'Claude Desktop',
    scenario: 'Japanese prompt → multilingual voice/UI command',
    prompt: '送信 を クリック',
    language: 'ja',
    englishPrompt: 'click submit',
    domain: 'voice',
  },
  {
    ide: 'Cursor',
    scenario: 'Arabic (RTL) prompt → language-neutral intent JSON',
    prompt: 'انقر على إرسال',
    language: 'ar',
    englishPrompt: 'click submit',
    domain: 'voice',
  },
  {
    ide: 'Continue',
    scenario: 'Korean prompt → semantic-equivalent LSE (byte-for-byte match)',
    prompt: '제출 을 클릭',
    language: 'ko',
    englishPrompt: 'click submit',
    domain: 'voice',
  },
];

async function parse(
  text: string,
  language: string,
  domain?: string
): Promise<ParseResult> {
  const body: Record<string, string> = { text, language };
  if (domain) body.domain = domain;
  const res = await fetch(`${BASE}/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/vnd.siren+json, application/json',
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { properties?: { result?: ParseResult }; title?: string };
  if (res.status !== 200 || !json.properties?.result) {
    throw new Error(
      `parse failed for ${JSON.stringify({ text, language, domain })}: status ${res.status}, title=${json.title ?? 'none'}`
    );
  }
  return json.properties.result;
}

function banner(text: string): string {
  const bar = '═'.repeat(text.length + 4);
  return `\n╔${bar}╗\n║  ${text}  ║\n╚${bar}╝`;
}

function pad(s: string, n: number): string {
  const visible = [...s].length; // crude but handles non-ASCII width roughly
  if (visible >= n) return s;
  return s + ' '.repeat(n - visible);
}

async function runDemo(demo: Demo, index: number): Promise<boolean> {
  console.log(banner(`Demo ${index + 1}/${DEMOS.length} — ${demo.ide}`));
  console.log(`Scenario: ${demo.scenario}`);
  console.log(`Target language: ${demo.language.toUpperCase()}`);
  console.log(`Domain: ${demo.domain ?? '(auto-detect)'}`);
  console.log('');

  const english = await parse(demo.englishPrompt, 'en', demo.domain);
  const foreign = await parse(demo.prompt, demo.language, demo.domain);

  console.log('Inputs:');
  console.log(`  EN  ${demo.englishPrompt}`);
  console.log(`  ${demo.language.toUpperCase()}  ${demo.prompt}`);
  console.log('');

  console.log('Parsed outputs (from MCP parse_multilingual_intent):');
  console.log(`  ${pad('field', 12)} │ ${pad('EN', 32)} │ ${demo.language.toUpperCase()}`);
  console.log(`  ${'─'.repeat(12)}─┼─${'─'.repeat(32)}─┼─${'─'.repeat(32)}`);
  console.log(`  ${pad('action', 12)} │ ${pad(english.action, 32)} │ ${foreign.action}`);
  console.log(
    `  ${pad('domain', 12)} │ ${pad(String(english.domain), 32)} │ ${String(foreign.domain)}`
  );
  console.log(
    `  ${pad('confidence', 12)} │ ${pad(english.confidence.toFixed(2), 32)} │ ${foreign.confidence.toFixed(2)}`
  );
  console.log(`  ${pad('explicit', 12)} │ ${pad(english.explicit, 32)} │ ${foreign.explicit}`);
  console.log('');

  const sameAction = english.action === foreign.action;
  const sameDomain = english.domain === foreign.domain;
  const sameRoleKeys =
    JSON.stringify(Object.keys(english.roles).sort()) ===
    JSON.stringify(Object.keys(foreign.roles).sort());
  // Explicit-form shape equivalence: same action and role keys, in the same
  // order. Values are intentionally author-preserved (user identifiers).
  const shapeOf = (e: ParseResult): string =>
    `[${e.action} ${Object.keys(e.roles).join(' ')}]`.trim();
  const sameShape = shapeOf(english) === shapeOf(foreign);

  console.log('Assertions:');
  console.log(
    `  ${sameAction ? '✓' : '✗'} action is language-neutral (EN=${english.action}, ${demo.language.toUpperCase()}=${foreign.action})`
  );
  console.log(
    `  ${sameDomain ? '✓' : '✗'} domain classification agrees (both → ${english.domain})`
  );
  console.log(
    `  ${sameRoleKeys ? '✓' : '✗'} role keys match byte-for-byte: ${shapeOf(english)}`
  );
  console.log(
    `  ${sameShape ? '✓' : '✗'} LSE schema is identical; role values preserve user-authored identifiers (${JSON.stringify(
      Object.fromEntries(
        Object.entries(foreign.roles).map(([k, v]) => [
          k,
          (v as { raw?: string; value?: string })?.raw ?? (v as { value?: string })?.value ?? v,
        ])
      )
    )})`
  );

  if (demo.language === 'ar') {
    console.log(
      `  ℹ  Arabic input is RTL; the LSE bracketed form uses LTR syntax so the schema renders consistently across script directions`
    );
  }

  console.log('');
  console.log('MCP tool call (what the IDE sends):');
  console.log('  {');
  console.log('    "tool": "action__parse_multilingual_intent",');
  console.log('    "arguments": {');
  console.log(`      "text": ${JSON.stringify(demo.prompt)},`);
  console.log(`      "language": "${demo.language}",`);
  console.log(`      "domain": "${demo.domain ?? ''}"`);
  console.log('    }');
  console.log('  }');

  return sameAction && sameDomain && sameRoleKeys && sameShape;
}

async function main(): Promise<void> {
  console.log('@lokascript/mcp-multilingual-intent — IDE integration demos');
  console.log(`Server: ${BASE}`);

  let passed = 0;
  for (let i = 0; i < DEMOS.length; i++) {
    const ok = await runDemo(DEMOS[i], i);
    if (ok) passed++;
  }

  console.log(banner('Summary'));
  console.log(`  ${passed}/${DEMOS.length} demos produced language-neutral semantic ASTs.`);
  console.log('');
  if (passed !== DEMOS.length) {
    console.log('One or more demos failed the equivalence assertions. See above.');
    process.exit(1);
  }
  console.log('All three demos demonstrate the core architectural claim:');
  console.log('  A prompt in any supported language yields a semantic AST whose');
  console.log('  action, domain, and role keys are byte-for-byte identical to the');
  console.log('  English equivalent. Role values stay in the user\'s language.');
  console.log('  The behavior layer is language-neutral by construction — not by');
  console.log('  translation.');
  console.log('');
  process.exit(0);
}

main().catch(err => {
  console.error('integration-demos failed:', err);
  process.exit(2);
});
