/**
 * Validation Tools
 *
 * Hyperscript syntax validation and development assistance.
 * Supports 21 languages via @lokascript/semantic for multilingual validation.
 */

import type { Tool } from '@modelcontextprotocol/server';

// Import error fixes registry
import { getFixesForError, getFixesForDiagnostic, getFixableErrorCodes } from './error-fixes.js';
import { translationRefusal } from './utils.js';

// Try to import semantic package for multilingual support
let semanticPackage: any = null;
try {
  semanticPackage = await import('@lokascript/semantic');
} catch {
  // semantic not available - will use English-only fallback
}

// =============================================================================
// Cached Semantic Analyzer (Phase 6 - Performance)
// =============================================================================

// Module-level cached adapter instance. Wraps the new parseSemantic
// primitives in the legacy `analyze()` shape so call sites can stay unchanged.
let cachedAnalyzer: {
  analyze: (
    code: string,
    language: string
  ) => {
    confidence: number;
    command?: { name: string; roles: Map<string, unknown> };
    errors?: string[];
  };
  supportsLanguage: (language: string) => boolean;
  supportedLanguages: () => string[];
} | null = null;

/**
 * Get or create a cached adapter wrapping parseSemantic from @lokascript/semantic.
 * Shape matches the deprecated createSemanticAnalyzer() return value so
 * existing call sites (analyzer.analyze, .supportsLanguage, .supportedLanguages)
 * remain valid.
 */
function getSemanticAnalyzer(): typeof cachedAnalyzer {
  if (!semanticPackage) return null;
  if (!cachedAnalyzer) {
    cachedAnalyzer = {
      analyze(code: string, language: string) {
        if (!semanticPackage.isLanguageRegistered(language)) {
          return {
            confidence: 0,
            errors: [`Language '${language}' is not supported for semantic parsing`],
          };
        }
        const result = semanticPackage.parseSemantic(code, language);
        const out: ReturnType<NonNullable<typeof cachedAnalyzer>['analyze']> = {
          confidence: result.confidence,
        };
        if (result.node) {
          out.command = { name: result.node.action, roles: result.node.roles };
        }
        if (result.error) out.errors = [result.error];
        return out;
      },
      supportsLanguage(language: string) {
        return semanticPackage.isLanguageRegistered(language);
      },
      supportedLanguages() {
        return semanticPackage.getRegisteredLanguages();
      },
    };
  }
  return cachedAnalyzer;
}

// =============================================================================
// Tool Definitions
// =============================================================================

export const validationTools: Tool[] = [
  {
    name: 'validate_schema',
    description:
      'Validate internal command SCHEMA definitions for design issues — NOT for checking user-written hyperscript. Returns structured items with error codes and severity. Use only when developing or debugging LokaScript command schemas.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description:
            'Specific command action to validate (e.g., "toggle", "put"). If omitted, validates all schemas.',
        },
        includeNotes: {
          type: 'boolean',
          description:
            'Include informational notes (severity="note") in addition to warnings and errors. Default: false',
          default: false,
        },
        showCodes: {
          type: 'boolean',
          description: 'Include machine-readable error codes in the output. Default: true',
          default: true,
        },
      },
    },
  },
  {
    name: 'suggest_command',
    description:
      'Suggest the best hyperscript command for a task. Returns suggestions in specified language.',
    inputSchema: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: 'Description of what you want to do',
        },
        language: {
          type: 'string',
          description:
            'Language code for command suggestions (en, ko, ja, es, zh, ar, tr, pt, fr, de, id, qu, sw, etc.). Default: en',
          default: 'en',
        },
      },
      required: ['task'],
    },
  },
  {
    name: 'get_bundle_config',
    description:
      'Get recommended bundle configuration based on usage. Supports both LokaScript and original _hyperscript (via the @lokascript/hyperscript-adapter plugin). Specify runtime="hyperscript" for original _hyperscript projects.',
    inputSchema: {
      type: 'object',
      properties: {
        commands: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of commands used',
        },
        blocks: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of block commands used (if, repeat, for, etc.)',
        },
        languages: {
          type: 'array',
          items: { type: 'string' },
          description: 'Languages used',
        },
        positional: {
          type: 'boolean',
          description: 'Whether positional expressions are used (first, last, next, etc.)',
        },
        runtime: {
          type: 'string',
          enum: ['lokascript', 'hyperscript', 'auto'],
          description:
            'Target runtime: "lokascript" for LokaScript bundles, "hyperscript" for original _hyperscript with adapter plugin, "auto" to include both recommendations. Default: auto',
          default: 'auto',
        },
      },
    },
  },
  {
    name: 'translate_to_english',
    description:
      'Normalize non-English hyperscript to English. Returns English code plus explicit bracket syntax. Set getAllLanguages=true to get all 24 translations at once. Use when you receive code in Japanese, Korean, Arabic, etc. Code the parse cannot carry whole is refused (refused: true, with `lost` and the `partial` English), never returned as `english`.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Hyperscript code in source language',
        },
        sourceLanguage: {
          type: 'string',
          description: 'Source language code (ja, ko, es, ar, etc.)',
        },
        getAllLanguages: {
          type: 'boolean',
          description: 'If true, return translations for all supported languages',
          default: false,
        },
      },
      required: ['code', 'sourceLanguage'],
    },
  },
  {
    name: 'explain_in_language',
    description:
      'Explain hyperscript code in detail. Returns command description, role breakdown, grammar rules, and translations.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Hyperscript code to explain',
        },
        sourceLanguage: {
          type: 'string',
          description: 'Language the code is written in',
        },
        targetLanguage: {
          type: 'string',
          description: 'Language to explain in (defaults to sourceLanguage)',
        },
        includeTranslations: {
          type: 'boolean',
          description: 'Include translations to all supported languages',
          default: false,
        },
      },
      required: ['code', 'sourceLanguage'],
    },
  },
  {
    name: 'get_code_fixes',
    description:
      'Get available auto-fixes for a specific error code or diagnostic — the repair half of the agent loop. When validate_and_compile reports a coded error, this returns LSP-compatible CodeFix suggestions to apply before re-validating.',
    inputSchema: {
      type: 'object',
      properties: {
        errorCode: {
          type: 'string',
          description: 'Error code from ErrorCodes (e.g., "MISSING.ARGUMENT", "NOT_FOUND.ELEMENT")',
        },
        diagnosticCode: {
          type: 'string',
          description: 'Diagnostic code from get_diagnostics (e.g., "parse-error", "missing-role")',
        },
        listAll: {
          type: 'boolean',
          description: 'If true, list all available error codes that have fixes',
          default: false,
        },
      },
    },
  },
];

// =============================================================================
// Tool Handlers
// =============================================================================

export async function handleValidationTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case 'validate_schema': {
        const action = args.action as string | undefined;
        const includeNotes = (args.includeNotes as boolean) || false;
        const showCodes = args.showCodes !== false; // default true
        return validateSchema(action, includeNotes, showCodes);
      }

      case 'suggest_command': {
        const task = args.task as string;
        const language = (args.language as string) || 'en';
        return suggestCommand(task, language);
      }

      case 'get_bundle_config': {
        const commands = (args.commands as string[]) || [];
        const blocks = (args.blocks as string[]) || [];
        const languages = (args.languages as string[]) || ['en'];
        const positional = (args.positional as boolean) || false;
        const runtime = (args.runtime as string) || 'auto';
        return getBundleConfig(commands, blocks, languages, positional, runtime);
      }

      case 'translate_to_english': {
        const code = args.code as string;
        const sourceLanguage = args.sourceLanguage as string;
        const getAllLanguages = (args.getAllLanguages as boolean) || false;
        return translateToEnglish(code, sourceLanguage, getAllLanguages);
      }

      case 'explain_in_language': {
        const code = args.code as string;
        const sourceLanguage = args.sourceLanguage as string;
        const targetLanguage = (args.targetLanguage as string) || sourceLanguage;
        const includeTranslations = (args.includeTranslations as boolean) || false;
        return explainInLanguage(code, sourceLanguage, targetLanguage, includeTranslations);
      }

      case 'get_code_fixes': {
        const errorCode = args.errorCode as string | undefined;
        const diagnosticCode = args.diagnosticCode as string | undefined;
        const listAll = (args.listAll as boolean) || false;
        return getCodeFixes(errorCode, diagnosticCode, listAll);
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown validation tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error in ${name}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// =============================================================================
// Command Suggestion
// =============================================================================

const COMMAND_SUGGESTIONS: Record<
  string,
  { command: string; example: string; explicitSyntax: string; description: string }
> = {
  toggle: {
    command: 'toggle',
    example: 'toggle .active',
    explicitSyntax: '[toggle patient:.active destination:#element]',
    description: 'Toggle a class, attribute, or visibility',
  },
  add: {
    command: 'add',
    example: 'add .highlight to me',
    explicitSyntax: '[add patient:.highlight destination:#element]',
    description: 'Add a class, attribute, or style',
  },
  remove: {
    command: 'remove',
    example: 'remove .error from #form',
    explicitSyntax: '[remove patient:.error source:#form]',
    description: 'Remove a class, attribute, or element',
  },
  show: {
    command: 'show',
    example: 'show #modal with *opacity',
    explicitSyntax: '[show patient:#modal style:opacity]',
    description: 'Show a hidden element',
  },
  hide: {
    command: 'hide',
    example: 'hide me with *opacity',
    explicitSyntax: '[hide patient:me style:opacity]',
    description: 'Hide an element',
  },
  set: {
    command: 'set',
    example: 'set :count to 0',
    explicitSyntax: '[set destination::count patient:0]',
    description: 'Set a variable or property',
  },
  put: {
    command: 'put',
    example: 'put "Hello" into #greeting',
    explicitSyntax: '[put patient:"Hello" destination:#greeting]',
    description: 'Set element content',
  },
  fetch: {
    command: 'fetch',
    example: 'fetch /api as json',
    explicitSyntax: '[fetch source:/api responseType:json]',
    description: 'Make HTTP request',
  },
  wait: {
    command: 'wait',
    example: 'wait 500ms',
    explicitSyntax: '[wait patient:500ms]',
    description: 'Pause execution',
  },
  send: {
    command: 'send',
    example: 'send refresh to #list',
    explicitSyntax: '[send event:refresh destination:#list]',
    description: 'Dispatch custom event',
  },
  go: {
    command: 'go',
    example: 'go to /page',
    explicitSyntax: '[go destination:/page]',
    description: 'Navigate to URL',
  },
  increment: {
    command: 'increment',
    example: 'increment :count',
    explicitSyntax: '[increment patient::count]',
    description: 'Add 1 to a number',
  },
  decrement: {
    command: 'decrement',
    example: 'decrement :count',
    explicitSyntax: '[decrement patient::count]',
    description: 'Subtract 1 from a number',
  },
  focus: {
    command: 'focus',
    example: 'focus #input',
    explicitSyntax: '[focus patient:#input]',
    description: 'Focus an element',
  },
  call: {
    command: 'call',
    example: 'call myFunction()',
    explicitSyntax: '[call patient:myFunction()]',
    description: 'Call a JavaScript function',
  },
  log: {
    command: 'log',
    example: 'log me',
    explicitSyntax: '[log patient:me]',
    description: 'Log to console',
  },
  beep: {
    command: 'beep',
    example: 'beep me',
    explicitSyntax: '[beep patient:me]',
    description: 'Debug output with type info',
  },
  ask: {
    command: 'ask',
    example: 'ask "Your name?"',
    explicitSyntax: '[ask patient:"Your name?"]',
    description: 'Prompt the user; the reply is `it`',
  },
  answer: {
    command: 'answer',
    example: 'answer "Save?" with "Yes" or "No"',
    explicitSyntax: '[answer patient:"Save?" style:"Yes" or "No"]',
    description: 'Show a message, or confirm with two choices',
  },
  break: {
    command: 'break',
    example: 'break',
    explicitSyntax: '[break]',
    description: 'Exit current loop',
  },
  copy: {
    command: 'copy',
    example: 'copy #input.value',
    explicitSyntax: '[copy patient:#input]',
    description: 'Copy to clipboard',
  },
  exit: {
    command: 'exit',
    example: 'exit',
    explicitSyntax: '[exit]',
    description: 'Exit event handler',
  },
  pick: {
    command: 'pick',
    example: 'pick .items',
    explicitSyntax: '[pick source:.items]',
    description: 'Pick random item',
  },
  render: {
    command: 'render',
    example: 'render "<p>${name}</p>" with {name: "World"}',
    explicitSyntax: '[render patient:"<p>${name}</p>"]',
    description: 'Render a template',
  },
};

const TASK_KEYWORDS: Record<string, string[]> = {
  toggle: ['toggle', 'switch', 'flip', 'alternate', 'on/off', 'open/close'],
  add: ['add', 'insert', 'include', 'attach', 'apply', 'highlight'],
  remove: ['remove', 'delete', 'clear', 'erase', 'detach'],
  show: ['show', 'display', 'reveal', 'appear', 'visible', 'open', 'popup', 'modal'],
  hide: ['hide', 'conceal', 'invisible', 'close', 'dismiss'],
  set: ['set', 'assign', 'store', 'save', 'update', 'change', 'variable'],
  put: ['put', 'content', 'text', 'html', 'innerHTML', 'display text'],
  fetch: ['fetch', 'api', 'ajax', 'request', 'http', 'load data', 'get data', 'post'],
  wait: ['wait', 'delay', 'pause', 'sleep', 'timeout', 'after'],
  send: ['send', 'emit', 'dispatch', 'event', 'trigger', 'notify'],
  go: ['go', 'navigate', 'redirect', 'link', 'url', 'page'],
  increment: ['increment', 'increase', 'count up', 'add 1', 'plus'],
  decrement: ['decrement', 'decrease', 'count down', 'subtract', 'minus'],
  focus: ['focus', 'select', 'cursor', 'active element'],
  call: ['call', 'execute', 'run', 'invoke', 'function'],
  log: ['log', 'debug', 'console', 'print', 'output'],
  beep: ['beep', 'debug', 'inspect', 'type info', 'dump'],
  ask: ['ask', 'prompt', 'question', 'input dialog'],
  answer: ['answer', 'alert', 'confirm', 'message box', 'dialog'],
  break: ['break', 'exit loop', 'stop loop', 'end loop'],
  copy: ['copy', 'clipboard', 'copy text', 'copy value'],
  exit: ['exit', 'stop', 'abort', 'quit handler', 'early return'],
  pick: ['pick', 'random', 'choose', 'select random', 'sample'],
  render: ['render', 'template', 'interpolate', 'substitute', 'format'],
};

/**
 * Translate a command suggestion to a specific language.
 */
function translateSuggestion(
  suggestion: { command: string; example: string; explicitSyntax: string; description: string },
  language: string
): {
  command: string;
  example: string;
  explicitSyntax: string;
  description: string;
  englishCommand?: string;
} {
  if (!semanticPackage || language === 'en') {
    return suggestion;
  }

  try {
    const profile = semanticPackage.tryGetProfile(language);
    if (profile && profile.keywords && profile.keywords[suggestion.command]) {
      const trans = profile.keywords[suggestion.command] as { primary?: string };
      if (trans.primary) {
        return {
          command: trans.primary,
          example: suggestion.example.replace(suggestion.command, trans.primary),
          explicitSyntax: suggestion.explicitSyntax,
          description: suggestion.description,
          englishCommand: suggestion.command,
        };
      }
    }
  } catch {
    // Profile not available
  }

  return suggestion;
}

function suggestCommand(
  task: string,
  language: string = 'en'
): { content: Array<{ type: string; text: string }> } {
  const taskLower = task.toLowerCase();
  const matches: Array<{
    command: string;
    score: number;
    suggestion: (typeof COMMAND_SUGGESTIONS)[string];
  }> = [];

  for (const [command, keywords] of Object.entries(TASK_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (taskLower.includes(keyword)) {
        score += keyword.length; // Longer matches score higher
      }
    }
    if (score > 0) {
      matches.push({
        command,
        score,
        suggestion: COMMAND_SUGGESTIONS[command],
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);

  if (matches.length === 0) {
    // Translate default suggestions to target language
    const translatedSuggestions = Object.values(COMMAND_SUGGESTIONS)
      .slice(0, 5)
      .map(s => translateSuggestion(s, language));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              task,
              language,
              suggestions: translatedSuggestions,
              note: 'No exact match found. Here are common commands.',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Translate the best match and alternatives to target language
  const bestMatch = translateSuggestion(matches[0].suggestion, language);
  const alternatives = matches.slice(1, 4).map(m => translateSuggestion(m.suggestion, language));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            task,
            language,
            bestMatch,
            alternatives,
          },
          null,
          2
        ),
      },
    ],
  };
}

// =============================================================================
// Bundle Configuration
// =============================================================================

// Adapter bundle metadata for original _hyperscript users
const ADAPTER_BUNDLES: Record<string, { file: string; size: string; languages: string[] }> = {
  es: { file: 'hyperscript-i18n-es.global.js', size: '94 KB', languages: ['es'] },
  ja: { file: 'hyperscript-i18n-ja.global.js', size: '95 KB', languages: ['ja'] },
  ko: { file: 'hyperscript-i18n-ko.global.js', size: '100 KB', languages: ['ko'] },
  zh: { file: 'hyperscript-i18n-zh.global.js', size: '88 KB', languages: ['zh'] },
  fr: { file: 'hyperscript-i18n-fr.global.js', size: '87 KB', languages: ['fr'] },
  de: { file: 'hyperscript-i18n-de.global.js', size: '86 KB', languages: ['de'] },
  pt: { file: 'hyperscript-i18n-pt.global.js', size: '86 KB', languages: ['pt'] },
  ar: { file: 'hyperscript-i18n-ar.global.js', size: '95 KB', languages: ['ar'] },
  tr: { file: 'hyperscript-i18n-tr.global.js', size: '101 KB', languages: ['tr'] },
  id: { file: 'hyperscript-i18n-id.global.js', size: '85 KB', languages: ['id'] },
  western: {
    file: 'hyperscript-i18n-western.global.js',
    size: '146 KB',
    languages: ['es', 'pt', 'fr', 'de'],
  },
  'east-asian': {
    file: 'hyperscript-i18n-east-asian.global.js',
    size: '146 KB',
    languages: ['ja', 'ko', 'zh'],
  },
};

function getAdapterBundle(languages: string[]): {
  bundle: string;
  size: string;
  note: string;
} {
  const nonEn = languages.filter(l => l !== 'en');
  if (nonEn.length === 0) {
    return { bundle: 'none', size: '0 KB', note: 'English only — no adapter needed' };
  }

  // Single language with a dedicated bundle
  if (nonEn.length === 1 && ADAPTER_BUNDLES[nonEn[0]]) {
    const b = ADAPTER_BUNDLES[nonEn[0]];
    return { bundle: b.file, size: b.size, note: `Per-language bundle for ${nonEn[0]}` };
  }

  // Check regional bundles
  if (nonEn.every(l => ['es', 'pt', 'fr', 'de'].includes(l))) {
    const b = ADAPTER_BUNDLES['western'];
    return { bundle: b.file, size: b.size, note: 'Western regional bundle (es, pt, fr, de)' };
  }
  if (nonEn.every(l => ['ja', 'ko', 'zh'].includes(l))) {
    const b = ADAPTER_BUNDLES['east-asian'];
    return { bundle: b.file, size: b.size, note: 'East Asian regional bundle (ja, ko, zh)' };
  }

  // Full bundle or lite + external semantic
  return {
    bundle: 'hyperscript-i18n.global.js',
    size: '568 KB',
    note: 'Full adapter bundle (all 24 languages). Consider the lite adapter (~1.8 KB gz) beside a @lokascript/semantic bundle for a smaller total.',
  };
}

function getBundleConfig(
  commands: string[],
  blocks: string[],
  languages: string[],
  positional: boolean,
  runtime: string = 'auto'
): { content: Array<{ type: string; text: string }> } {
  const needsMultilingual = languages.length > 1 || languages.some(l => l !== 'en');

  // ---- Bundle recommendation ----
  // A script-tag user starts with the engine's hyperfixi-hs.js
  // (@hyperfixi/engine: hyperscript only, every module, upstream's grammar).
  // core's small prebuilt, hyperfixi-hx.js, retired in Phase C3 of the engine
  // cutover. A Vite project should not pick at all — the plugin does — which
  // the generated config below is for. `blocks` / `positional` do not change
  // the answer: hyperfixi-hs.js carries both. Nor does the language: hyperscript
  // in another language runs on the same bundle through
  // @lokascript/hyperscript-adapter (the `adapter` field below). core's
  // parser-free hyperfixi-multilingual.js retired in Phase C3 (C-R3).
  const bundle = 'hyperfixi-hs.js';
  const bundleSize = '34.1 KB';

  // Generate vite config
  const viteConfig = {
    plugins: [
      `hyperfixi({
  extraCommands: ${JSON.stringify(commands.filter(c => !['toggle', 'add', 'remove', 'show', 'hide', 'set', 'put'].includes(c)))},
  extraBlocks: ${JSON.stringify(blocks)},
  positional: ${positional},
  languages: ${JSON.stringify(languages)},
})`,
    ],
  };

  // Regional semantic bundle suggestion
  let regionalBundle = 'browser.global.js';
  if (languages.length === 1 && languages[0] === 'en') {
    regionalBundle = 'browser-en.global.js (20 KB)';
  } else if (languages.every(l => ['en', 'es', 'pt', 'fr', 'de'].includes(l))) {
    regionalBundle = 'browser-western.global.js (30 KB)';
  } else if (languages.every(l => ['ja', 'zh', 'ko'].includes(l))) {
    regionalBundle = 'browser-east-asian.global.js (24 KB)';
  }

  // ---- Adapter recommendation for original _hyperscript ----
  const adapterRec = needsMultilingual ? getAdapterBundle(languages) : null;

  // Build response based on runtime
  if (runtime === 'hyperscript' && needsMultilingual) {
    // User explicitly wants original _hyperscript advice
    const adapter = getAdapterBundle(languages);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              runtime: 'hyperscript',
              package: '@lokascript/hyperscript-adapter',
              recommendedBundle: adapter.bundle,
              estimatedSize: adapter.size,
              note: adapter.note,
              setup: `<script src="_hyperscript.js"></script>\n<script src="${adapter.bundle}"></script>\n<!-- Auto-registers on load. Use data-lang attribute per element. -->`,
              programmaticSetup: `import { hyperscriptI18n } from '@lokascript/hyperscript-adapter';\n_hyperscript.use(hyperscriptI18n({ defaultLanguage: '${languages.find(l => l !== 'en') || languages[0]}' }));`,
              availableBundles: Object.entries(ADAPTER_BUNDLES).map(([key, val]) => ({
                key,
                file: val.file,
                size: val.size,
                languages: val.languages,
              })),
              usage: { commands, blocks, languages, positional },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Default: LokaScript recommendation with optional adapter alternative
  const result: Record<string, unknown> = {
    recommendedBundle: bundle,
    estimatedSize: bundleSize,
    viteConfig: `// vite.config.js
import { hyperfixi } from '@hyperfixi/vite-plugin';

export default {
  plugins: [
    ${viteConfig.plugins[0]}
  ]
};`,
    semanticBundle: regionalBundle,
    usage: {
      commands,
      blocks,
      languages,
      positional,
    },
  };

  if (adapterRec) {
    // Non-English hyperscript: the adapter translates each script to English as
    // the engine reads it, and the attribute keeps what its author wrote.
    result.adapter = {
      package: '@lokascript/hyperscript-adapter',
      bundle: adapterRec.bundle,
      size: adapterRec.size,
      detail: adapterRec.note,
      setup: `<script src="hyperfixi-hs.js"></script>\n<script src="${adapterRec.bundle}"></script>\n<!-- Set lang (or data-lang) on an element or an ancestor. -->`,
    };
    if (runtime !== 'lokascript') {
      result.adapterAlternative = {
        note: 'The same adapter runs on original _hyperscript: load it after _hyperscript.js',
        package: '@lokascript/hyperscript-adapter',
        bundle: adapterRec.bundle,
        size: adapterRec.size,
        detail: adapterRec.note,
      };
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

// =============================================================================
// Schema Validation (Phase 1 Error Codes)
// =============================================================================

/**
 * Validate command schemas for design issues.
 * Exposes schema validation with machine-readable error codes for LLMs.
 */
function validateSchema(
  action: string | undefined,
  includeNotes: boolean,
  showCodes: boolean
): { content: Array<{ type: string; text: string }>; isError?: boolean } {
  if (!semanticPackage) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: '@lokascript/semantic package not available',
              suggestion: 'Install with: npm install @lokascript/semantic',
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  try {
    // Try to get schema validation functions from semantic package
    const validateCommandSchema = semanticPackage.validateCommandSchema;
    const validateAllSchemas = semanticPackage.validateAllSchemas;
    const commandSchemas = semanticPackage.commandSchemas;
    const getSchema = semanticPackage.getSchema;
    const formatValidationResults = semanticPackage.formatValidationResults;
    const getValidationStats = semanticPackage.getValidationStats;

    if (!validateCommandSchema || !commandSchemas) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Schema validation not available in this version of @lokascript/semantic',
                suggestion: 'Update to latest version: npm update @lokascript/semantic',
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    // Validate specific action or all schemas
    if (action) {
      const schema = getSchema?.(action);
      if (!schema) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: `Unknown command: ${action}`,
                  suggestion: `Available commands: ${Object.keys(commandSchemas).slice(0, 10).join(', ')}...`,
                  availableCount: Object.keys(commandSchemas).length,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      const result = validateCommandSchema(schema);
      const response = {
        action,
        valid: result.errors.length === 0,
        items: result.items
          .map((item: any) => ({
            ...(showCodes && { code: item.code }),
            severity: item.severity,
            message: item.message,
            ...(item.role && { role: item.role }),
            ...(item.suggestion && { suggestion: item.suggestion }),
          }))
          .filter((item: any) => includeNotes || item.severity !== 'note'),
        summary: {
          errors: result.errors.length,
          warnings: result.warnings.length,
          notes: result.notes.length,
        },
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
        isError: result.errors.length > 0,
      };
    }

    // Validate all schemas
    const validations = validateAllSchemas(commandSchemas, { includeNotes });
    const stats = getValidationStats?.(validations) || {
      totalCommands: validations.size,
      errors: 0,
      warnings: 0,
      notes: 0,
      byCode: {},
    };

    // Format the results
    const formattedText =
      formatValidationResults?.(validations, { showNotes: includeNotes, showCodes }) || '';

    // Build structured response
    const validationResults: Record<string, any> = {};
    for (const [actionName, result] of validations) {
      validationResults[actionName] = {
        items: result.items
          .map((item: any) => ({
            ...(showCodes && { code: item.code }),
            severity: item.severity,
            message: item.message,
            ...(item.role && { role: item.role }),
            ...(item.suggestion && { suggestion: item.suggestion }),
          }))
          .filter((item: any) => includeNotes || item.severity !== 'note'),
        hasErrors: result.errors.length > 0,
        hasWarnings: result.warnings.length > 0,
      };
    }

    const response = {
      valid: stats.errors === 0,
      totalSchemasValidated: Object.keys(commandSchemas).length,
      schemasWithIssues: validations.size,
      summary: {
        errors: stats.errors,
        warnings: stats.warnings,
        notes: stats.notes,
      },
      ...(showCodes &&
        stats.byCode &&
        Object.keys(stats.byCode).length > 0 && {
          byCode: stats.byCode,
        }),
      validations: validationResults,
      formatted: formattedText,
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
      isError: stats.errors > 0,
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: error instanceof Error ? error.message : String(error),
              suggestion: 'Check that @lokascript/semantic is properly installed',
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

// =============================================================================
// Semantic Parsing Tools (Phase 5)
// =============================================================================

/**
 * Translate hyperscript from any supported language to English.
 * Optionally returns translations for all supported languages.
 */
function translateToEnglish(
  code: string,
  sourceLanguage: string,
  getAllLanguages: boolean
): { content: Array<{ type: string; text: string }>; isError?: boolean } {
  if (!semanticPackage) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: '@lokascript/semantic package not available',
              suggestion: 'Install with: npm install @lokascript/semantic',
              original: code,
              sourceLanguage,
              explicit: null,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  try {
    // Translate to English first: it refuses a script the parse cannot carry
    // whole, which every other language's render would lose the same way.
    const english = semanticPackage.translate(code, sourceLanguage, 'en');

    if (getAllLanguages) {
      // Get translations for all supported languages
      const translations = semanticPackage.getAllTranslations(code, sourceLanguage);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                original: code,
                sourceLanguage,
                translations,
                languageCount: Object.keys(translations).length,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Also get explicit syntax for debugging/learning
    let explicit: string | null = null;
    try {
      explicit = semanticPackage.toExplicit(code, sourceLanguage);
    } catch {
      // toExplicit may not be available or may fail
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              original: code,
              sourceLanguage,
              english,
              explicit,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    // A translation that would lose part of the script is refused, with what it
    // loses; its partial English is never reported as `english`.
    const refusal = translationRefusal(error);
    if (refusal) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ...refusal, original: code, sourceLanguage }, null, 2),
          },
        ],
        isError: true,
      };
    }
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: error instanceof Error ? error.message : String(error),
              original: code,
              sourceLanguage,
              suggestion: 'Check that the code is valid hyperscript in the specified language',
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Phase 6: Explain hyperscript code in detail.
 * Returns command description, role breakdown, grammar rules, and translations.
 */
function explainInLanguage(
  code: string,
  sourceLanguage: string,
  targetLanguage: string,
  includeTranslations: boolean
): { content: Array<{ type: string; text: string }>; isError?: boolean } {
  if (!semanticPackage) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: '@lokascript/semantic package not available',
              suggestion: 'Install with: npm install @lokascript/semantic',
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  try {
    // Parse the code using cached analyzer
    const analyzer = getSemanticAnalyzer();
    if (!analyzer) {
      throw new Error('Semantic analyzer not available');
    }

    const parseResult = analyzer.analyze(code, sourceLanguage);

    // Get language profile for keyword translations
    const profile = semanticPackage.tryGetProfile(targetLanguage);

    // Build the explanation
    const explanation: Record<string, unknown> = {
      code,
      sourceLanguage,
      targetLanguage,
      confidence: parseResult.confidence,
    };

    // Add command information if successfully parsed
    if (parseResult.command) {
      const cmdName = parseResult.command.name;

      // Get command schema for description
      let commandSchema = null;
      try {
        commandSchema = semanticPackage.getValidatorSchema?.(cmdName) || null;
      } catch {
        // Schema not available
      }

      // Build command info
      explanation.command = {
        name: cmdName,
        description: commandSchema?.description || `The ${cmdName} command`,
        category: commandSchema?.category || 'unknown',
      };

      // Build role breakdown
      const rolesInfo: Record<string, unknown> = {};
      for (const [roleName, roleValue] of parseResult.command.roles) {
        const roleSchema = commandSchema?.roles?.find((r: { role: string }) => r.role === roleName);
        rolesInfo[roleName] = {
          value: roleValue,
          description: roleSchema?.description || `The ${roleName} role`,
          required: roleSchema?.required ?? false,
        };
      }
      explanation.roles = rolesInfo;

      // Add keyword info in target language
      if (profile?.keywords?.[cmdName]) {
        explanation.keywords = {
          [cmdName]: {
            primary: profile.keywords[cmdName].primary,
            alternatives: profile.keywords[cmdName].alternatives || [],
          },
        };
      }
    }

    // Add grammar information
    if (profile) {
      explanation.grammar = {
        wordOrder: profile.wordOrder,
        direction: profile.direction || 'ltr',
      };
    }

    // Add translations if requested
    if (includeTranslations) {
      try {
        const translations = semanticPackage.getAllTranslations(code, sourceLanguage);
        explanation.translations = translations;
        explanation.translationCount = Object.keys(translations).length;
      } catch {
        explanation.translations = null;
        explanation.translationNote = 'Translations not available for this code';
      }
    }

    // Add warnings if any
    if (parseResult.errors && parseResult.errors.length > 0) {
      explanation.warnings = parseResult.errors;
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(explanation, null, 2) }],
      isError: parseResult.confidence < 0.3,
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: error instanceof Error ? error.message : String(error),
              code,
              sourceLanguage,
              targetLanguage,
              suggestion: 'Check that the code is valid hyperscript',
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

// =============================================================================
// Code Fixes Tool (Phase 6 - CodeFix Integration)
// =============================================================================

/**
 * Get available auto-fixes for error codes or diagnostics.
 *
 * Returns LSP-compatible CodeFix suggestions that LLMs can use to:
 * - Suggest corrections without running full diagnostics
 * - Apply fixes automatically when integrated with IDE
 * - Learn common error patterns and their solutions
 */
function getCodeFixes(
  errorCode: string | undefined,
  diagnosticCode: string | undefined,
  listAll: boolean
): { content: Array<{ type: string; text: string }>; isError?: boolean } {
  // List all fixable error codes
  if (listAll) {
    const allCodes = getFixableErrorCodes();
    const fixesByCategory: Record<string, string[]> = {};

    for (const code of allCodes) {
      const category = code.split('.')[0] || 'OTHER';
      if (!fixesByCategory[category]) {
        fixesByCategory[category] = [];
      }
      fixesByCategory[category].push(code);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              totalFixableErrors: allCodes.length,
              byCategory: fixesByCategory,
              allCodes,
              usage: 'Call get_code_fixes with errorCode or diagnosticCode to get specific fixes',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Get fixes for specific error code
  if (errorCode) {
    const fixes = getFixesForError(errorCode);
    const hasFixes = fixes.length > 0;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              errorCode,
              hasFixes,
              fixCount: fixes.length,
              fixes: fixes.map(fix => ({
                code: fix.code,
                title: fix.title,
                kind: fix.kind,
                description: fix.description,
                isPreferred: fix.isPreferred || false,
                priority: fix.priority || 0,
                edit: fix.edit,
              })),
              note: hasFixes
                ? 'Use the edit.text template to generate corrected code'
                : 'No automated fixes available for this error code',
            },
            null,
            2
          ),
        },
      ],
      isError: !hasFixes,
    };
  }

  // Get fixes for diagnostic code (maps to error codes)
  if (diagnosticCode) {
    const fixes = getFixesForDiagnostic(diagnosticCode);
    const hasFixes = fixes.length > 0;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              diagnosticCode,
              hasFixes,
              fixCount: fixes.length,
              fixes: fixes.map(fix => ({
                code: fix.code,
                title: fix.title,
                kind: fix.kind,
                description: fix.description,
                isPreferred: fix.isPreferred || false,
                priority: fix.priority || 0,
                edit: fix.edit,
              })),
              note: hasFixes
                ? 'Use the edit.text template to generate corrected code'
                : 'No automated fixes available for this diagnostic code',
            },
            null,
            2
          ),
        },
      ],
      isError: !hasFixes,
    };
  }

  // No code provided - return usage info
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            error: 'No error code or diagnostic code provided',
            usage: {
              errorCode: 'Provide an error code like "MISSING.ARGUMENT" or "NOT_FOUND.ELEMENT"',
              diagnosticCode: 'Provide a diagnostic code like "parse-error" or "missing-role"',
              listAll: 'Set to true to list all fixable error codes',
            },
            examples: [
              { errorCode: 'MISSING.ARGUMENT' },
              { diagnosticCode: 'parse-error' },
              { listAll: true },
            ],
          },
          null,
          2
        ),
      },
    ],
    isError: true,
  };
}
