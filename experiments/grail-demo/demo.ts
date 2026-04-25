/**
 * GRAIL Demo — exercises the MCP tools against the hyperfixi grail.yaml.
 *
 * Run: npx tsx experiments/grail-demo/demo.ts
 *
 * Shows the Claude-as-agent pattern:
 * 1. grail_list / grail_info → inspect workflow graph (instant)
 * 2. grail_check → evaluate conditions (runs shell commands — slow)
 * 3. grail_plan(goal, truth) → compute steps using cached truth (instant)
 * 4. grail_run(action) → execute an action
 */

import { handleGrailTool, _resetRegistry } from '../../packages/mcp-server/src/tools/grail-tools.js';

function print(label: string, response: { content: Array<{ text: string }> }) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${label}`);
  console.log('='.repeat(60));
  const data = JSON.parse(response.content[0].text);
  console.log(JSON.stringify(data, null, 2));
}

async function demo() {
  // Point at the repo root grail.yaml
  const repoRoot = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
  process.env.GRAIL_YAML = `${repoRoot}/grail.yaml`;
  process.env.GRAIL_CWD = repoRoot;
  _resetRegistry();

  // Step 1: Structural queries — instant, no shell evaluation
  print('grail_list', await handleGrailTool('grail_list', {}));
  print('grail_info', await handleGrailTool('grail_info', {}));

  // Step 2: Evaluate conditions — runs real shell commands
  console.log('\n--- Evaluating conditions (runs npm run lint, npm test, etc.) ---');
  const checkResponse = await handleGrailTool('grail_check', {});
  print('grail_check', checkResponse);

  // Extract truth vector from check response
  const checkData = JSON.parse(checkResponse.content[0].text);
  const truth = checkData.truth;

  // Step 3: Plan using cached truth — instant (no re-evaluation)
  const planResponse = await handleGrailTool('grail_plan', { goal: 'release-publish', truth });
  print('grail_plan(release-publish) — using cached truth', planResponse);

  // Step 4: Dry run using cached truth — instant
  const runResponse = await handleGrailTool('grail_run', {
    action: 'run-lint',
    dry_run: true,
    truth,
  });
  print('grail_run(run-lint, dry_run) — using cached truth', runResponse);

  console.log('\n--- Demo complete ---');
  console.log('Pattern: grail_check once → pass truth to grail_plan/grail_run');
  console.log('This avoids redundant condition evaluation (30s+ per call).');
}

demo().catch(console.error);
