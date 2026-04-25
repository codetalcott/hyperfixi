/**
 * @lokascript/domain-config
 *
 * Shared domain registry wiring and dispatcher priority for MCP servers
 * (and any other consumer that needs to register the full set of LokaScript
 * domains behind a CrossDomainDispatcher).
 *
 * Single source of truth for:
 *   - Which domains exist (sql, bdd, jsx, todo, behaviorspec, llm, flow, voice)
 *   - How each domain loads its DSL and renderer (lazy dynamic imports)
 *   - How each domain surfaces for AOT/Vite plugin scanning (scanConfig)
 *   - How the dispatcher breaks ambiguity when multiple domains match
 *
 * Previously duplicated between @hyperfixi/mcp-server and
 * @lokascript/mcp-multilingual-intent. Consolidating here prevents drift on
 * new domain additions, schema changes, or priority reordering.
 */

import { DomainRegistry } from '@lokascript/framework';

/**
 * Create and populate a DomainRegistry with all 8 LokaScript domains.
 *
 * Schemas are loaded lazily on first access so startup stays fast. An
 * asynchronous pass attaches each domain's schemas to the registry (used by
 * convenience methods like `generatePrompt`, `generateTrainingData`, and
 * `buildFeedback`). Failures in the async pass are swallowed — core DSL
 * dispatch still works without the attached schemas.
 */
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
    scanConfig: {
      attributes: ['data-sql', '_sql'],
      scriptTypes: ['text/sql-dsl'],
      defaultLanguage: 'en',
    },
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
    scanConfig: {
      attributes: ['data-bdd', '_bdd'],
      scriptTypes: ['text/bdd'],
      defaultLanguage: 'en',
    },
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
    scanConfig: {
      attributes: ['data-jsx', '_jsx'],
      scriptTypes: ['text/jsx-dsl'],
      defaultLanguage: 'en',
    },
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
    scanConfig: {
      attributes: ['data-todo', '_todo'],
      scriptTypes: ['text/todo'],
      defaultLanguage: 'en',
    },
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
    scanConfig: {
      attributes: ['data-spec', '_spec'],
      scriptTypes: ['text/behaviorspec'],
      defaultLanguage: 'en',
    },
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
    scanConfig: {
      attributes: ['data-llm', '_llm'],
      scriptTypes: ['text/llm'],
      defaultLanguage: 'en',
    },
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
    scanConfig: {
      attributes: ['data-flow', '_flow'],
      scriptTypes: ['text/flowscript'],
      defaultLanguage: 'en',
    },
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
    scanConfig: {
      attributes: ['data-voice', '_voice'],
      scriptTypes: ['text/voice'],
      defaultLanguage: 'en',
    },
  });

  loadAllSchemas(registry);

  return registry;
}

/**
 * Asynchronously load and attach schemas to registered domains.
 * Schemas are lightweight metadata objects — loading them doesn't instantiate
 * any DSL or parser. Swallowed failures: a missing schema doesn't break
 * dispatch, it only disables registry convenience methods for that domain.
 */
async function loadAllSchemas(registry: DomainRegistry): Promise<void> {
  const loaders: Array<{ domain: string; load: () => Promise<unknown[]> }> = [
    { domain: 'sql', load: () => import('@lokascript/domain-sql').then(m => [...m.allSchemas]) },
    { domain: 'bdd', load: () => import('@lokascript/domain-bdd').then(m => [...m.allSchemas]) },
    { domain: 'jsx', load: () => import('@lokascript/domain-jsx').then(m => [...m.allSchemas]) },
    { domain: 'todo', load: () => import('@lokascript/domain-todo').then(m => [...m.allSchemas]) },
    {
      domain: 'behaviorspec',
      load: () => import('@lokascript/domain-behaviorspec').then(m => [...m.allSchemas]),
    },
    { domain: 'llm', load: () => import('@lokascript/domain-llm').then(m => [...m.allSchemas]) },
    { domain: 'flow', load: () => import('@lokascript/domain-flow').then(m => [...m.allSchemas]) },
    {
      domain: 'voice',
      load: () => import('@lokascript/domain-voice').then(m => [...m.allSchemas]),
    },
  ];

  await Promise.allSettled(
    loaders.map(async ({ domain, load }) => {
      try {
        const schemas = await load();
        registry.setSchemas(domain, schemas as never[]);
      } catch {
        // Schema loading failure is non-fatal — domain tools still work.
      }
    })
  );
}

/**
 * Priority ordering for `CrossDomainDispatcher` — earlier domains win on
 * confidence ties. Specific syntaxes (sql, bdd) come before more generic
 * pattern matchers (voice, flow) that otherwise overmatch.
 *
 * Load-bearing: the dispatcher routing guard in mcp-multilingual-intent's
 * detect-domain.test.ts pins `sql` before `todo`, which is relied on by the
 * natural-language `add X into Y` → sql routing.
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
