#!/usr/bin/env npx tsx
/**
 * TextMate Grammar Generator
 *
 * Generates hyperscript.tmLanguage.json from semantic language profiles.
 * This keeps syntax highlighting in sync with the semantic package's 21 languages.
 *
 * Emits four files in two modes:
 *   - lokascript mode (full v2/v2.1 grammar) → vscode-extension/syntaxes/
 *   - hyperscript mode (no v2/v2.1 tokens)   → vscode-extension-hyperscript/syntaxes/
 *
 * The hyperscript mode is the strict subset valid in original _hyperscript;
 * tokens added by the v2/v2.1 component model (#if/#for/#else/#end/#continue,
 * ^reactiveVar, attrs.X, <template component>, ${...} interpolation) are
 * excluded so users of the _hyperscript-only extension don't see invalid
 * syntax highlight as legitimate.
 *
 * Usage:
 *   npx tsx scripts/generate-grammar.ts
 *   # or
 *   npm run generate:grammar
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Import semantic profiles
import {
  languageProfiles,
  getSupportedLanguages,
  type LanguageProfile,
  type KeywordTranslation,
} from '@lokascript/semantic';

type GrammarMode = 'lokascript' | 'hyperscript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOKASCRIPT_SYNTAXES = join(__dirname, '..', 'syntaxes');
const HYPERSCRIPT_SYNTAXES = join(__dirname, '..', '..', 'vscode-extension-hyperscript', 'syntaxes');

// =============================================================================
// Configuration
// =============================================================================

/** Languages that use non-Latin scripts (no word boundaries needed) */
const NON_LATIN_LANGUAGES = new Set([
  'ja', // Japanese
  'ko', // Korean
  'zh', // Chinese
  'ar', // Arabic
  'he', // Hebrew
  'hi', // Hindi
  'bn', // Bengali
  'th', // Thai
  'ru', // Russian
  'uk', // Ukrainian
]);

/** Command categories for syntax highlighting */
const COMMAND_KEYWORDS = [
  'toggle', 'add', 'remove', 'show', 'hide', 'put', 'set', 'get', 'fetch',
  'wait', 'send', 'trigger', 'call', 'return', 'throw', 'halt', 'exit', 'go',
  'focus', 'blur', 'log', 'append', 'prepend', 'increment', 'decrement',
  'take', 'settle', 'measure', 'transition', 'async', 'tell', 'js', 'make',
  'clone', 'swap', 'morph', 'copy', 'pick', 'render', 'beep',
];

/** Control flow keywords */
const FLOW_KEYWORDS = [
  'if', 'else', 'unless', 'end', 'then', 'repeat', 'for', 'while', 'until',
  'break', 'continue', 'in', 'from', 'to', 'by', 'times', 'forever', 'when',
  'where', 'default',
];

/** Definition keywords */
const DEFINITION_KEYWORDS = [
  'behavior', 'def', 'init', 'install', 'on', 'eventsource', 'socket', 'worker',
];

/** Event handler keywords */
const EVENT_HANDLER_KEYWORDS = ['on', 'upon'];

/** Event names */
const EVENT_NAMES = [
  'click', 'dblclick', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout',
  'mousedown', 'mouseup', 'mousemove', 'keydown', 'keyup', 'keypress',
  'input', 'change', 'submit', 'focus', 'blur', 'load', 'unload', 'scroll',
  'resize', 'drag', 'dragstart', 'dragend', 'dragenter', 'dragleave',
  'dragover', 'drop', 'touchstart', 'touchend', 'touchmove', 'touchcancel',
  'pointerdown', 'pointerup', 'pointermove', 'pointerenter', 'pointerleave',
  'hover',
];

/** Logical operators */
const LOGICAL_KEYWORDS = [
  'and', 'or', 'not', 'is', 'exists', 'matches', 'contains', 'empty', 'no',
  'neither', 'nor',
];

/** Other keywords (articles, prepositions) */
const OTHER_KEYWORDS = [
  'as', 'with', 'into', 'at', 'of', 'the', 'a', 'an', 'its', 'my', 'your', 'their',
];

/** Reference keywords */
const REFERENCE_KEYWORDS = [
  'me', 'my', 'myself', 'you', 'your', 'yourself', 'it', 'its', 'result',
  'event', 'target', 'detail', 'body', 'document', 'window',
];

/** Positional keywords */
const POSITIONAL_KEYWORDS = [
  'first', 'last', 'next', 'previous', 'closest', 'parent', 'children',
];

/** Constants */
const CONSTANTS = ['true', 'false', 'null', 'undefined'];

// =============================================================================
// Helpers
// =============================================================================

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getKeywordValue(kw: KeywordTranslation | string | undefined): string | null {
  if (!kw) return null;
  if (typeof kw === 'string') return kw;
  return kw.primary || null;
}

function getKeywordAlternatives(kw: KeywordTranslation | string | undefined): string[] {
  if (!kw) return [];
  if (typeof kw === 'string') return [];
  return kw.alternatives || [];
}

/**
 * Extract all translations for a set of English keywords from all profiles.
 */
function collectTranslations(englishKeywords: string[]): { latin: string[]; nonLatin: string[] } {
  const latin = new Set<string>(englishKeywords);
  const nonLatin = new Set<string>();

  const profiles = languageProfiles as Record<string, LanguageProfile>;

  for (const [langCode, profile] of Object.entries(profiles)) {
    if (!profile.keywords) continue;

    const isNonLatin = NON_LATIN_LANGUAGES.has(langCode);
    const targetSet = isNonLatin ? nonLatin : latin;

    for (const engKey of englishKeywords) {
      const kw = profile.keywords[engKey as keyof typeof profile.keywords];
      const primary = getKeywordValue(kw as KeywordTranslation | string | undefined);
      if (primary) targetSet.add(primary);

      const alts = getKeywordAlternatives(kw as KeywordTranslation | string | undefined);
      alts.forEach(alt => targetSet.add(alt));
    }

    // Also check event handler keywords
    if (profile.eventHandler?.keyword) {
      const ehKw = profile.eventHandler.keyword;
      if (englishKeywords.includes('on')) {
        const primary = getKeywordValue(ehKw);
        if (primary) targetSet.add(primary);
        const alts = getKeywordAlternatives(ehKw);
        alts.forEach(alt => targetSet.add(alt));
      }
    }
  }

  return {
    latin: [...latin].filter(k => k.trim()),
    nonLatin: [...nonLatin].filter(k => k.trim()),
  };
}

/**
 * Collect reference translations (me, you, it, etc.)
 */
function collectReferences(): { latin: string[]; nonLatin: string[] } {
  const latin = new Set<string>(REFERENCE_KEYWORDS);
  const nonLatin = new Set<string>();

  const profiles = languageProfiles as Record<string, LanguageProfile>;

  for (const [langCode, profile] of Object.entries(profiles)) {
    if (!profile.references) continue;

    const isNonLatin = NON_LATIN_LANGUAGES.has(langCode);
    const targetSet = isNonLatin ? nonLatin : latin;

    for (const ref of Object.values(profile.references)) {
      if (typeof ref === 'string' && ref.trim()) {
        targetSet.add(ref);
      }
    }
  }

  return {
    latin: [...latin].filter(k => k.trim()),
    nonLatin: [...nonLatin].filter(k => k.trim()),
  };
}

/**
 * Build a regex pattern for TextMate grammar.
 * Latin scripts use \b word boundaries, non-Latin use raw alternation.
 */
function buildPattern(latin: string[], nonLatin: string[]): string {
  const parts: string[] = [];

  if (latin.length > 0) {
    // Sort longest first for greedy matching
    const sorted = [...latin].sort((a, b) => b.length - a.length);
    const escaped = sorted.map(escapeRegex);
    parts.push(`\\b(${escaped.join('|')})\\b`);
  }

  if (nonLatin.length > 0) {
    const sorted = [...nonLatin].sort((a, b) => b.length - a.length);
    const escaped = sorted.map(escapeRegex);
    parts.push(escaped.join('|'));
  }

  return parts.join('|');
}

// =============================================================================
// Grammar Generation
// =============================================================================

function generateGrammar(mode: GrammarMode): object {
  console.log(`Collecting translations from semantic profiles (mode=${mode})...`);
  console.log(`  Supported languages: ${getSupportedLanguages().join(', ')}`);
  const includeV2 = mode === 'lokascript';

  // Collect translations for each category
  const commands = collectTranslations(COMMAND_KEYWORDS);
  const flow = collectTranslations(FLOW_KEYWORDS);
  const definitions = collectTranslations(DEFINITION_KEYWORDS);
  const eventHandlers = collectTranslations(EVENT_HANDLER_KEYWORDS);
  const events = collectTranslations(EVENT_NAMES);
  const logical = collectTranslations(LOGICAL_KEYWORDS);
  const other = collectTranslations(OTHER_KEYWORDS);
  const references = collectReferences();
  const positional = collectTranslations(POSITIONAL_KEYWORDS);
  const constants = collectTranslations(CONSTANTS);

  console.log(`  Commands: ${commands.latin.length} Latin, ${commands.nonLatin.length} non-Latin`);
  console.log(`  Events: ${events.latin.length} Latin, ${events.nonLatin.length} non-Latin`);
  console.log(`  References: ${references.latin.length} Latin, ${references.nonLatin.length} non-Latin`);

  // Build the grammar
  const grammar = {
    $schema: 'https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json',
    name: 'Hyperscript',
    scopeName: 'source.hyperscript',
    patterns: [
      { include: '#comments' },
      // Possessive `'s` (e.g. `#counter's textContent`, `me's parentNode`) must
      // be tokenized before #strings, otherwise the `'` opens a single-quoted
      // string scope that swallows the rest of the line.
      { include: '#possessives' },
      { include: '#strings' },
      { include: '#numbers' },
      // v2 directives go before #event-handlers so `#if`/`#for` etc. don't get
      // mis-tokenized; they're line-anchored so they don't false-match in prose.
      ...(includeV2 ? [{ include: '#directives' }] : []),
      { include: '#event-handlers' },
      { include: '#commands' },
      { include: '#keywords' },
      { include: '#selectors' },
      // Component scope (`attrs`, `attrs.X`) before #variables so `attrs.foo`
      // is tokenized as a unit rather than `attrs` + `.foo`.
      ...(includeV2 ? [{ include: '#component-scope' }] : []),
      // Reactive vars (`^name`) before #operators so the `^` isn't first
      // matched as bitwise XOR.
      ...(includeV2 ? [{ include: '#reactive-vars' }] : []),
      { include: '#variables' },
      { include: '#references' },
      { include: '#operators' },
      { include: '#particles' },
    ],
    repository: {
      comments: {
        patterns: [
          {
            name: 'comment.line.double-dash.hyperscript',
            match: '--.*$',
          },
        ],
      },
      possessives: {
        patterns: [
          {
            name: 'keyword.operator.possessive.hyperscript',
            comment: "Possessive 's — must match before single-quote string rule",
            match: "'s\\b",
          },
        ],
      },
      strings: {
        patterns: [
          {
            name: 'string.quoted.double.hyperscript',
            begin: '"',
            end: '"',
            patterns: [{ name: 'constant.character.escape.hyperscript', match: '\\\\.' }],
          },
          {
            name: 'string.quoted.single.hyperscript',
            begin: "'",
            end: "'",
            patterns: [{ name: 'constant.character.escape.hyperscript', match: '\\\\.' }],
          },
          {
            name: 'string.template.hyperscript',
            begin: '`',
            end: '`',
            patterns: [
              { name: 'constant.character.escape.hyperscript', match: '\\\\.' },
              { name: 'variable.other.template.hyperscript', match: '\\$\\{[^}]+\\}' },
            ],
          },
        ],
      },
      numbers: {
        patterns: [
          { name: 'constant.numeric.duration.hyperscript', match: '\\b\\d+(\\.\\d+)?(ms|s|m|h)\\b' },
          { name: 'constant.numeric.hyperscript', match: '\\b\\d+(\\.\\d+)?\\b' },
        ],
      },
      'event-handlers': {
        patterns: [
          {
            name: 'keyword.control.event.hyperscript',
            comment: 'Event handler keywords (on/upon) in 21 languages',
            match: buildPattern(eventHandlers.latin, eventHandlers.nonLatin),
          },
          {
            name: 'support.type.event.hyperscript',
            comment: 'Event names in 21 languages',
            match: buildPattern(events.latin, events.nonLatin),
          },
        ],
      },
      commands: {
        patterns: [
          {
            name: 'keyword.control.command.hyperscript',
            comment: 'Commands in 21 languages',
            match: buildPattern(commands.latin, commands.nonLatin),
          },
          {
            name: 'keyword.control.flow.hyperscript',
            comment: 'Control flow in 21 languages',
            match: buildPattern(flow.latin, flow.nonLatin),
          },
          {
            name: 'keyword.control.definition.hyperscript',
            comment: 'Definitions in 21 languages',
            match: buildPattern(definitions.latin, definitions.nonLatin),
          },
        ],
      },
      keywords: {
        patterns: [
          {
            name: 'keyword.operator.logical.hyperscript',
            comment: 'Logical operators in 21 languages',
            match: buildPattern(logical.latin, logical.nonLatin),
          },
          {
            name: 'keyword.other.hyperscript',
            comment: 'Other keywords (articles, prepositions) in 21 languages',
            match: buildPattern(other.latin, other.nonLatin),
          },
          {
            name: 'constant.language.hyperscript',
            comment: 'Constants in 21 languages',
            match: buildPattern(constants.latin, constants.nonLatin),
          },
          {
            name: 'keyword.other.modifier.hyperscript',
            match: '\\.(once|prevent|stop|debounce|throttle|capture|passive|self|window|document|outside|elsewhere|from|body)\\b',
          },
        ],
      },
      selectors: {
        patterns: [
          {
            name: 'entity.name.tag.css.hyperscript',
            match: '<[a-zA-Z][a-zA-Z0-9-]*(?:\\.[a-zA-Z][a-zA-Z0-9-]*)*(?:#[a-zA-Z][a-zA-Z0-9-]*)?\\s*/>',
          },
          { name: 'entity.other.attribute-name.id.css.hyperscript', match: '#[a-zA-Z_][a-zA-Z0-9_-]*' },
          { name: 'entity.other.attribute-name.class.css.hyperscript', match: '\\.[a-zA-Z_][a-zA-Z0-9_-]*' },
          { name: 'entity.other.attribute-name.attr.hyperscript', match: '@[a-zA-Z_][a-zA-Z0-9_-]*' },
          { name: 'entity.other.attribute-name.property.hyperscript', match: '\\*[a-zA-Z_][a-zA-Z0-9_-]*' },
        ],
      },
      variables: {
        patterns: [
          { name: 'variable.other.local.hyperscript', match: ':[a-zA-Z_][a-zA-Z0-9_]*' },
          { name: 'variable.other.global.hyperscript', match: '\\$[a-zA-Z_][a-zA-Z0-9_]*' },
        ],
      },
      references: {
        patterns: [
          {
            name: 'variable.language.hyperscript',
            comment: 'References (me, you, it, etc.) in 21 languages',
            match: buildPattern(references.latin, references.nonLatin),
          },
          {
            name: 'keyword.other.positional.hyperscript',
            comment: 'Positional keywords in 21 languages',
            match: buildPattern(positional.latin, positional.nonLatin),
          },
        ],
      },
      operators: {
        patterns: [
          { name: 'keyword.operator.comparison.hyperscript', match: '(==|!=|<=|>=|<|>)' },
          { name: 'keyword.operator.arithmetic.hyperscript', match: '(\\+|-|\\*|/|%)' },
          { name: 'keyword.operator.assignment.hyperscript', match: '=' },
        ],
      },
      particles: {
        patterns: [
          {
            name: 'keyword.other.particle.hyperscript',
            comment: 'Japanese particles for role marking',
            match: 'を|に|へ|から|の|で',
          },
          {
            name: 'keyword.other.particle.korean.hyperscript',
            comment: 'Korean particles for role marking',
            match: '을|를|에|에서|의|로|으로',
          },
        ],
      },
      ...(includeV2
        ? {
            // v2 template directives. Line-anchored to mirror the runtime parser
            // (@hyperfixi/components/src/template-ast.ts:28-31). Surface inside
            // <template component> bodies via the injection grammar; standalone
            // hyperscript files won't typically contain them, but they don't hurt.
            directives: {
              patterns: [
                {
                  name: 'keyword.control.directive.if.hyperscript',
                  match: '^\\s*#if\\b',
                },
                {
                  name: 'keyword.control.directive.for.hyperscript',
                  match: '^\\s*#for\\b',
                },
                {
                  name: 'keyword.control.directive.else.hyperscript',
                  match: '^\\s*#else\\s*$',
                },
                {
                  name: 'keyword.control.directive.end.hyperscript',
                  match: '^\\s*#end\\s*$',
                },
                {
                  name: 'keyword.control.directive.continue.hyperscript',
                  match: '^\\s*#continue\\s*$',
                },
              ],
            },
            // v2 reactive variables: `^name`. Distinct scope from `:locals` and
            // `$globals` so themes can color them differently.
            'reactive-vars': {
              patterns: [
                {
                  name: 'variable.other.reactive.hyperscript',
                  match: '\\^[A-Za-z_][A-Za-z0-9_]*',
                },
              ],
            },
            // v2 component scope: `attrs.propertyName`. Tokenized as a single unit
            // so `attrs` lights up as a support variable and the property name as a
            // distinct property scope.
            'component-scope': {
              patterns: [
                {
                  match: '\\b(attrs)(\\.)([A-Za-z_][A-Za-z0-9_]*)',
                  captures: {
                    '1': { name: 'support.variable.component.hyperscript' },
                    '2': { name: 'punctuation.accessor.hyperscript' },
                    '3': { name: 'variable.other.property.hyperscript' },
                  },
                },
              ],
            },
          }
        : {}),
    },
  };

  return grammar;
}

// =============================================================================
// Injection grammar — read the LokaScript injection JSON (hand-maintained) and,
// for hyperscript mode, return a stripped copy without v2/v2.1 entries.
// =============================================================================

const V2_INJECTION_PATTERN_INCLUDES = new Set([
  '#template-component-body',
  '#script-template-body',
]);
const V2_INJECTION_REPOSITORY_KEYS = [
  'template-component-body',
  'script-template-body',
  'template-directives',
  'template-interpolation',
];

function stripV2FromInjection(grammar: Record<string, unknown>): Record<string, unknown> {
  const patterns = (grammar.patterns as Array<{ include?: string }>).filter(
    p => !p.include || !V2_INJECTION_PATTERN_INCLUDES.has(p.include)
  );
  const repository = { ...(grammar.repository as Record<string, unknown>) };
  for (const key of V2_INJECTION_REPOSITORY_KEYS) delete repository[key];
  return { ...grammar, patterns, repository };
}

// =============================================================================
// Main
// =============================================================================

function writeJson(path: string, obj: unknown): number {
  const json = JSON.stringify(obj, null, 2);
  writeFileSync(path, json + '\n');
  return json.length;
}

function main() {
  console.log('Generating TextMate grammars (lokascript + hyperscript modes)...\n');

  // Main grammar — generated for both modes
  const lokascriptGrammar = generateGrammar('lokascript');
  const hyperscriptGrammar = generateGrammar('hyperscript');

  const lokaMainPath = join(LOKASCRIPT_SYNTAXES, 'hyperscript.tmLanguage.json');
  const hyperMainPath = join(HYPERSCRIPT_SYNTAXES, 'hyperscript.tmLanguage.json');
  const lokaSize = writeJson(lokaMainPath, lokascriptGrammar);
  const hyperSize = writeJson(hyperMainPath, hyperscriptGrammar);

  // Injection grammar — read the LokaScript variant (hand-maintained) and
  // emit a stripped copy for the hyperscript variant.
  const lokaInjectionPath = join(LOKASCRIPT_SYNTAXES, 'hyperscript-injection.tmLanguage.json');
  const hyperInjectionPath = join(HYPERSCRIPT_SYNTAXES, 'hyperscript-injection.tmLanguage.json');
  const lokaInjection = JSON.parse(readFileSync(lokaInjectionPath, 'utf8'));
  const hyperInjection = stripV2FromInjection(lokaInjection);
  const hyperInjectionSize = writeJson(hyperInjectionPath, hyperInjection);

  console.log('');
  console.log(`Generated:`);
  console.log(`  ${lokaMainPath}  (${(lokaSize / 1024).toFixed(1)} KB)`);
  console.log(`  ${hyperMainPath}  (${(hyperSize / 1024).toFixed(1)} KB)`);
  console.log(`  ${hyperInjectionPath}  (${(hyperInjectionSize / 1024).toFixed(1)} KB)`);
  console.log(`(LokaScript injection grammar at ${lokaInjectionPath} is hand-maintained.)`);
}

main();
