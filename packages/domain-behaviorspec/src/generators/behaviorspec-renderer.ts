/**
 * BehaviorSpec Natural Language Renderer
 *
 * Renders a SemanticNode back into natural-language BehaviorSpec syntax
 * for a target language. Inverse of the parser.
 */

import type { SemanticNode } from '@lokascript/framework';
import { extractValue, createDomainRenderer } from '@lokascript/framework';
import {
  COMMAND_KEYWORDS,
  MARKER_WORDS,
  SOV_LANGUAGES,
  VSO_LANGUAGES,
} from '../constants/keywords.js';
import { allSchemas } from '../schemas/index.js';
import { allProfiles } from '../profiles/index.js';

// =============================================================================
// Renderers
// =============================================================================

function renderTest(node: SemanticNode, lang: string): string {
  const keyword = COMMAND_KEYWORDS.test[lang] ?? 'test';
  const name = node.roles.get('name');
  const nameStr = name ? extractValue(name) : 'Untitled';
  return `${keyword} "${nameStr}"`;
}

function renderGiven(node: SemanticNode, lang: string): string {
  const keyword = COMMAND_KEYWORDS.given[lang] ?? 'given';
  const subject = node.roles.get('subject');
  const value = node.roles.get('value');
  const subjectStr = subject ? extractValue(subject) : '';
  const valueStr = value ? extractValue(value) : '';

  if (SOV_LANGUAGES.has(lang)) {
    return `${subjectStr} ${valueStr} ${keyword}`.replace(/\s+/g, ' ').trim();
  }
  return `${keyword} ${subjectStr} ${valueStr}`.replace(/\s+/g, ' ').trim();
}

function renderWhen(node: SemanticNode, lang: string): string {
  const keyword = COMMAND_KEYWORDS.when[lang] ?? 'when';
  const actor = node.roles.get('actor');
  const action = node.roles.get('action');
  const target = node.roles.get('target');
  const destination = node.roles.get('destination');

  const actorStr = actor ? extractValue(actor) : '';
  const actionStr = action ? extractValue(action) : '';
  const targetStr = target ? extractValue(target) : '';
  const destStr = destination ? extractValue(destination) : '';
  const onMarker = MARKER_WORDS.on[lang] ?? 'on';
  const intoMarker = MARKER_WORDS.into[lang] ?? 'into';

  if (SOV_LANGUAGES.has(lang)) {
    const parts = [actorStr, targetStr, onMarker, actionStr, keyword];
    if (destStr) parts.splice(3, 0, destStr, intoMarker);
    return parts.filter(Boolean).join(' ');
  }
  if (VSO_LANGUAGES.has(lang)) {
    const parts = [keyword, actorStr, actionStr, onMarker, targetStr];
    if (destStr) parts.push(intoMarker, destStr);
    return parts.filter(Boolean).join(' ');
  }
  // SVO
  const parts = [keyword, actorStr, actionStr, onMarker, targetStr];
  if (destStr) parts.push(intoMarker, destStr);
  return parts.filter(Boolean).join(' ');
}

function renderExpect(node: SemanticNode, lang: string): string {
  const keyword = COMMAND_KEYWORDS.expect[lang] ?? 'expect';
  const target = node.roles.get('target');
  const assertion = node.roles.get('assertion');
  const value = node.roles.get('value');

  const targetStr = target ? extractValue(target) : '';
  const assertionStr = assertion ? extractValue(assertion) : '';
  const valueStr = value ? extractValue(value) : '';

  if (SOV_LANGUAGES.has(lang)) {
    return `${targetStr} ${assertionStr} ${valueStr} ${keyword}`.replace(/\s+/g, ' ').trim();
  }
  return `${keyword} ${targetStr} ${assertionStr} ${valueStr}`.replace(/\s+/g, ' ').trim();
}

function renderAfter(node: SemanticNode, lang: string): string {
  const keyword = COMMAND_KEYWORDS.after[lang] ?? 'after';
  const duration = node.roles.get('duration');
  const durationStr = duration ? extractValue(duration) : '';

  if (SOV_LANGUAGES.has(lang)) {
    return `${durationStr} ${keyword}`.trim();
  }
  return `${keyword} ${durationStr}`.trim();
}

// =============================================================================
// Public API
// =============================================================================

function renderNot(node: SemanticNode, language: string): string {
  const keyword = COMMAND_KEYWORDS.not[language] ?? 'not';
  const content = node.roles.get('content');
  return `${keyword} ${content ? extractValue(content) : ''}`.trim();
}

/**
 * Hand-written renderers per action, plus the schema-driven fallthrough for any
 * action they do not cover — which is how a command added via `DomainExtension`
 * renders without this package knowing about it.
 */
const renderer = createDomainRenderer({
  schemas: allSchemas,
  profiles: allProfiles,
  overrides: {
    test: renderTest,
    given: renderGiven,
    when: renderWhen,
    expect: renderExpect,
    after: renderAfter,
    not: renderNot,
  },
});

/**
 * Render a BehaviorSpec SemanticNode to natural-language text in the target language.
 *
 * @returns the rendered text, or `null` when the action has neither a
 *   hand-written renderer nor a schema.
 */
export function renderBehaviorSpec(node: SemanticNode, language: string): string | null {
  return renderer(node, language);
}
