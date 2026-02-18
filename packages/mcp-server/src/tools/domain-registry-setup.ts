/**
 * Domain Registry Setup
 *
 * Registers all framework domains with the DomainRegistry for automatic
 * MCP tool generation and dispatch. Replaces manual per-domain tool files.
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
    getDSL: () => import('@lokascript/domain-sql').then(m => m.createSQLDSL()),
    getRenderer: () => import('@lokascript/domain-sql').then(m => m.renderSQL),
  });

  registry.register({
    name: 'bdd',
    description: 'BDD scenario',
    languages: ['en', 'es', 'ja', 'ar'],
    inputLabel: 'scenario',
    inputDescription: 'BDD scenario text (e.g., "given #button is exists")',
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
    getDSL: () => import('@lokascript/domain-jsx').then(m => m.createJSXDSL()),
    getRenderer: () => import('@lokascript/domain-jsx').then(m => m.renderJSX),
  });

  registry.register({
    name: 'todo',
    description: 'natural language todo management',
    languages: ['en', 'es', 'ja', 'ar', 'ko', 'zh', 'tr', 'fr'],
    inputLabel: 'command',
    inputDescription: 'Todo command in natural language (e.g., "add milk to groceries")',
    getDSL: () => import('@lokascript/domain-todo').then(m => m.createTodoDSL()),
    getRenderer: () => import('@lokascript/domain-todo').then(m => m.renderTodo),
  });

  registry.register({
    name: 'behaviorspec',
    description: 'interaction testing specification',
    languages: ['en', 'es', 'ja', 'ar', 'ko', 'zh', 'tr', 'fr'],
    inputLabel: 'scenario',
    inputDescription: 'BehaviorSpec scenario text (e.g., "given page /home")',
    getDSL: () => import('@lokascript/domain-behaviorspec').then(m => m.createBehaviorSpecDSL()),
    getRenderer: () => import('@lokascript/domain-behaviorspec').then(m => m.renderBehaviorSpec),
  });

  registry.register({
    name: 'llm',
    description: 'natural language LLM prompts (ask, summarize, analyze, translate)',
    languages: ['en', 'es', 'ja', 'ar'],
    inputLabel: 'command',
    inputDescription:
      'LLM command in natural language (e.g., "ask claude to summarize #article as bullets")',
    getDSL: () => import('@lokascript/domain-llm').then(m => m.createLLMDSL()),
    getRenderer: () => import('@lokascript/domain-llm').then(m => m.renderLLM),
  });

  return registry;
}
