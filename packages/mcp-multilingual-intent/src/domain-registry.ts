/**
 * Domain Registry Setup
 *
 * Registers all 8 framework domains with a DomainRegistry so the
 * CrossDomainDispatcher can auto-detect which domain natural-language
 * input belongs to.
 *
 * This is a trimmed copy of `@hyperfixi/mcp-server`'s
 * `src/tools/domain-registry-setup.ts`. The mcp-server package is CLI-only
 * (no library exports), so we replicate the setup here. Kept in sync
 * manually — if domain registration changes in mcp-server, mirror it here.
 */

import { DomainRegistry } from '@lokascript/framework';

export function createDomainRegistry(): DomainRegistry {
  const registry = new DomainRegistry();

  registry.register({
    name: 'sql',
    description: 'natural language SQL',
    languages: ['en', 'es', 'ja', 'ar', 'ko', 'zh', 'tr', 'fr'],
    inputLabel: 'query',
    inputDescription: 'SQL query in natural language (e.g., "select name from users")',
    outputDescription: 'a SQL query string',
    getDSL: () => import('@lokascript/domain-sql').then(m => m.createSQLDSL()),
    getRenderer: () => import('@lokascript/domain-sql').then(m => m.renderSQL),
  });

  registry.register({
    name: 'bdd',
    description: 'BDD scenario',
    languages: ['en', 'es', 'ja', 'ar'],
    inputLabel: 'scenario',
    inputDescription: 'BDD scenario text (e.g., "given #button is exists")',
    outputDescription: 'Playwright test code with Given/When/Then assertions',
    getDSL: () => import('@lokascript/domain-bdd').then(m => m.createBDDDSL()),
    getRenderer: () => import('@lokascript/domain-bdd').then(m => m.renderBDD),
  });

  registry.register({
    name: 'jsx',
    description: 'natural language JSX/React',
    languages: ['en', 'es', 'ja', 'ar', 'ko', 'zh', 'tr', 'fr'],
    inputLabel: 'code',
    inputDescription:
      'JSX description in natural language (e.g., "element div with className app")',
    outputDescription: 'JSX/React component markup',
    getDSL: () => import('@lokascript/domain-jsx').then(m => m.createJSXDSL()),
    getRenderer: () => import('@lokascript/domain-jsx').then(m => m.renderJSX),
  });

  registry.register({
    name: 'todo',
    description: 'natural language todo management',
    languages: ['en', 'es', 'ja', 'ar', 'ko', 'zh', 'tr', 'fr'],
    inputLabel: 'command',
    inputDescription: 'Todo command in natural language (e.g., "add milk to groceries")',
    outputDescription: 'a structured todo operation object',
    getDSL: () => import('@lokascript/domain-todo').then(m => m.createTodoDSL()),
    getRenderer: () => import('@lokascript/domain-todo').then(m => m.renderTodo),
  });

  registry.register({
    name: 'behaviorspec',
    description: 'interaction testing specification',
    languages: ['en', 'es', 'ja', 'ar', 'ko', 'zh', 'tr', 'fr'],
    inputLabel: 'scenario',
    inputDescription: 'BehaviorSpec scenario text (e.g., "given page /home")',
    outputDescription: 'a Playwright interaction test with page assertions',
    getDSL: () => import('@lokascript/domain-behaviorspec').then(m => m.createBehaviorSpecDSL()),
    getRenderer: () => import('@lokascript/domain-behaviorspec').then(m => m.renderBehaviorSpec),
  });

  registry.register({
    name: 'llm',
    description: 'natural language LLM prompts (ask, summarize, analyze, translate)',
    languages: ['en', 'es', 'ja', 'ar', 'ko', 'zh', 'tr', 'fr'],
    inputLabel: 'command',
    inputDescription:
      'LLM command in natural language (e.g., "ask claude to summarize #article as bullets")',
    outputDescription: 'an LLMPromptSpec JSON (action, messages, model preferences)',
    getDSL: () => import('@lokascript/domain-llm').then(m => m.createLLMDSL()),
    getRenderer: () => import('@lokascript/domain-llm').then(m => m.renderLLM),
  });

  registry.register({
    name: 'flow',
    description: 'declarative reactive data flow pipelines (fetch, poll, stream, submit)',
    languages: ['en', 'es', 'ja', 'ar', 'ko', 'zh', 'tr', 'fr'],
    inputLabel: 'pipeline',
    inputDescription: 'FlowScript pipeline (e.g., "fetch /api/users as json into #list")',
    outputDescription: 'reactive data flow JavaScript (fetch/poll/stream handlers)',
    getDSL: () => import('@lokascript/domain-flow').then(m => m.createFlowDSL()),
    getRenderer: () => import('@lokascript/domain-flow').then(m => m.renderFlow),
  });

  registry.register({
    name: 'voice',
    description: 'voice/accessibility commands for speech-controlled web interaction',
    languages: ['en', 'es', 'ja', 'ar', 'ko', 'zh', 'tr', 'fr'],
    inputLabel: 'command',
    inputDescription: 'Voice command in natural language (e.g., "click the submit button")',
    outputDescription: 'a DOM interaction command (click, scroll, type, navigate)',
    getDSL: () => import('@lokascript/domain-voice').then(m => m.createVoiceDSL()),
    getRenderer: () => import('@lokascript/domain-voice').then(m => m.renderVoice),
  });

  return registry;
}

/**
 * Priority ordering for the dispatcher — earlier domains win on confidence
 * ties. Specific syntaxes (sql, bdd) come before more generic pattern
 * matchers (voice, flow) that otherwise overmatch.
 */
export const DOMAIN_PRIORITY: readonly string[] = [
  'sql',
  'bdd',
  'behaviorspec',
  'jsx',
  'todo',
  'llm',
  'flow',
  'voice',
];
