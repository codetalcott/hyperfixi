/**
 * GRAIL Demo — exercises the MCP tools against the hyperfixi grail.yaml.
 *
 * Run: npx tsx experiments/grail-demo/demo.ts
 *
 * This script shows the Claude-as-agent pattern:
 * 1. grail_check → see what's passing/failing
 * 2. grail_plan → compute steps to reach a goal
 * 3. grail_info → inspect the full workflow graph
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

  // Step 1: List available conditions and affordances
  print('grail_list', await handleGrailTool('grail_list', {}));

  // Step 2: Check current state (skip actual evaluation for speed — just show structure)
  console.log('\n[Note: grail_check evaluates shell commands — skipping in demo for speed]');
  console.log('[In real usage, Claude calls grail_check to see what\'s passing/failing]');

  // Step 3: Plan for release-publish
  // Use a mock truth vector to demo planning without running commands
  console.log('\n--- Demonstrating grail_plan with the workflow graph ---');
  print('grail_plan(release-publish)', await handleGrailTool('grail_plan', { goal: 'release-publish' }));

  // Step 4: Plan for a simpler goal
  print('grail_plan(run-lint)', await handleGrailTool('grail_plan', { goal: 'run-lint' }));

  // Step 5: Show the workflow graph
  print('grail_info', await handleGrailTool('grail_info', {}));

  // Step 6: Dry run an action
  print('grail_run(run-lint, dry_run)', await handleGrailTool('grail_run', { action: 'run-lint', dry_run: true }));

  console.log('\n--- Demo complete ---');
  console.log('In a real session, Claude would:');
  console.log('  1. Call grail_check to see current state');
  console.log('  2. Call grail_plan to compute steps toward a goal');
  console.log('  3. Call grail_run for each step');
  console.log('  4. Call grail_check again to verify progress');
}

demo().catch(console.error);
