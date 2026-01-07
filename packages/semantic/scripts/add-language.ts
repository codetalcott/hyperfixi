#!/usr/bin/env npx ts-node
/**
 * Add Language CLI Tool
 *
 * Generates all boilerplate files and updates index files for a new language.
 *
 * Usage:
 *   npm run add-language -- --code=XX --name=Name --native=NativeName \
 *     --wordOrder=SVO --direction=ltr --marking=preposition --usesSpaces=true
 *
 * Example:
 *   npm run add-language -- --code=sw --name=Swahili --native=Kiswahili \
 *     --wordOrder=SVO --direction=ltr --marking=preposition --usesSpaces=true
 */

import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// Types
// =============================================================================

interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  wordOrder: 'SVO' | 'SOV' | 'VSO';
  direction: 'ltr' | 'rtl';
  markingStrategy: 'preposition' | 'postposition' | 'particle' | 'case-suffix';
  usesSpaces: boolean;
}

// =============================================================================
// Argument Parsing
// =============================================================================

function parseArgs(): LanguageConfig {
  const args = process.argv.slice(2);
  const config: Partial<LanguageConfig> = {};

  for (const arg of args) {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) {
      const [, key, value] = match;
      switch (key) {
        case 'code':
          config.code = value.toLowerCase();
          break;
        case 'name':
          config.name = value;
          break;
        case 'native':
          config.nativeName = value;
          break;
        case 'wordOrder':
          if (!['SVO', 'SOV', 'VSO'].includes(value)) {
            console.error(`Invalid wordOrder: ${value}. Must be SVO, SOV, or VSO.`);
            process.exit(1);
          }
          config.wordOrder = value as 'SVO' | 'SOV' | 'VSO';
          break;
        case 'direction':
          if (!['ltr', 'rtl'].includes(value)) {
            console.error(`Invalid direction: ${value}. Must be ltr or rtl.`);
            process.exit(1);
          }
          config.direction = value as 'ltr' | 'rtl';
          break;
        case 'marking':
          if (!['preposition', 'postposition', 'particle', 'case-suffix'].includes(value)) {
            console.error(`Invalid marking: ${value}. Must be preposition, postposition, particle, or case-suffix.`);
            process.exit(1);
          }
          config.markingStrategy = value as LanguageConfig['markingStrategy'];
          break;
        case 'usesSpaces':
          config.usesSpaces = value === 'true';
          break;
      }
    }
  }

  // Validate required fields
  const required: (keyof LanguageConfig)[] = ['code', 'name', 'nativeName', 'wordOrder', 'direction', 'markingStrategy', 'usesSpaces'];
  const missing = required.filter(k => config[k] === undefined);
  if (missing.length > 0) {
    console.error(`Missing required arguments: ${missing.map(k => `--${k}`).join(', ')}`);
    console.error(`
Usage:
  npm run add-language -- --code=XX --name=Name --native=NativeName \\
    --wordOrder=SVO --direction=ltr --marking=preposition --usesSpaces=true

Options:
  --code        ISO 639-1 language code (e.g., 'sw', 'bn')
  --name        English name (e.g., 'Swahili', 'Bengali')
  --native      Native name (e.g., 'Kiswahili', 'বাংলা')
  --wordOrder   SVO, SOV, or VSO
  --direction   ltr or rtl
  --marking     preposition, postposition, particle, or case-suffix
  --usesSpaces  true or false
`);
    process.exit(1);
  }

  return config as LanguageConfig;
}

// =============================================================================
// File Paths
// =============================================================================

const SEMANTIC_SRC = path.resolve(__dirname, '../src');
const I18N_SRC = path.resolve(__dirname, '../../i18n/src');
const VITE_PLUGIN_SRC = path.resolve(__dirname, '../../vite-plugin/src');

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert a hyphenated string to PascalCase.
 * e.g., "event-handler" → "EventHandler"
 */
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

// =============================================================================
// Template Functions
// =============================================================================

function generateLanguageModule(config: LanguageConfig): string {
  const { code, name } = config;
  const varName = name.toLowerCase();

  return `/**
 * ${name} Language Registration
 *
 * Self-registering language module for ${name}.
 * Import this module to enable ${name} language support.
 */

import { registerLanguage } from '../registry';
import { ${varName}Tokenizer } from '../tokenizers/${code}';
import { ${varName}Profile } from '../generators/profiles/${code}';

// Register ${name} with the tokenizer and profile
registerLanguage('${code}', ${varName}Tokenizer, ${varName}Profile);

// Re-export for direct access
export { ${varName}Tokenizer, ${varName}Profile };
`;
}

function generateTokenizer(config: LanguageConfig): string {
  const { code, name, direction, usesSpaces, wordOrder } = config;
  const varName = name.toLowerCase();
  const className = name.charAt(0).toUpperCase() + name.slice(1);
  const upperCode = code.toUpperCase();

  return `/**
 * ${name} Tokenizer
 *
 * Tokenizes ${name} hyperscript input.
 * Word order: ${wordOrder}
 * Direction: ${direction}
 * Uses spaces: ${usesSpaces}
 */

import type { LanguageToken, TokenKind, TokenStream } from '../types';
import {
  BaseTokenizer,
  TokenStreamImpl,
  createToken,
  createPosition,
  isWhitespace,
  isSelectorStart,
  isQuote,
  isDigit,
  isAsciiIdentifierChar,
  isUrlStart,
} from './base';

// =============================================================================
// ${name} Keywords
// =============================================================================

// TODO: Add keywords from profile - these map native words to English commands
const ${upperCode}_KEYWORDS: Map<string, string> = new Map([
  // Commands - copy from profile.keywords
  // ['native_word', 'toggle'],
  // ['native_word', 'add'],
  // etc.
]);

// =============================================================================
// ${name} Tokenizer Implementation
// =============================================================================

export class ${className}Tokenizer extends BaseTokenizer {
  readonly language = '${code}';
  readonly direction = '${direction}' as const;

  tokenize(input: string): TokenStream {
    const tokens: LanguageToken[] = [];
    let pos = 0;

    while (pos < input.length) {
      // Skip whitespace
      if (isWhitespace(input[pos])) {
        pos++;
        continue;
      }

      // CSS selectors
      if (isSelectorStart(input[pos])) {
        const selectorToken = this.trySelector(input, pos);
        if (selectorToken) {
          tokens.push(selectorToken);
          pos = selectorToken.position.end;
          continue;
        }
      }

      // String literals
      if (isQuote(input[pos])) {
        const stringToken = this.tryString(input, pos);
        if (stringToken) {
          tokens.push(stringToken);
          pos = stringToken.position.end;
          continue;
        }
      }

      // Numbers
      if (isDigit(input[pos]) || (input[pos] === '-' && pos + 1 < input.length && isDigit(input[pos + 1]))) {
        const numberToken = this.tryNumber(input, pos);
        if (numberToken) {
          tokens.push(numberToken);
          pos = numberToken.position.end;
          continue;
        }
      }

      // URLs
      if (isUrlStart(input, pos)) {
        const urlToken = this.tryUrl(input, pos);
        if (urlToken) {
          tokens.push(urlToken);
          pos = urlToken.position.end;
          continue;
        }
      }

      // Variable references (:name)
      if (input[pos] === ':') {
        const startPos = pos;
        pos++;
        let varName = '';
        while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
          varName += input[pos];
          pos++;
        }
        if (varName) {
          tokens.push(
            createToken(':' + varName, 'identifier', createPosition(startPos, pos), ':' + varName)
          );
          continue;
        }
        pos = startPos;
      }

      // Operators and punctuation
      if ('()[]{}:,;'.includes(input[pos])) {
        tokens.push(createToken(input[pos], 'operator', createPosition(pos, pos + 1)));
        pos++;
        continue;
      }

      // Words/identifiers
      if (isAsciiIdentifierChar(input[pos])) {
        const startPos = pos;
        let word = '';
        while (pos < input.length && isAsciiIdentifierChar(input[pos])) {
          word += input[pos];
          pos++;
        }
        const kind = this.classifyToken(word);
        const normalized = ${upperCode}_KEYWORDS.get(word.toLowerCase());
        tokens.push(createToken(word, kind, createPosition(startPos, pos), normalized));
        continue;
      }

      // Unknown character - skip
      pos++;
    }

    return new TokenStreamImpl(tokens, '${code}');
  }

  classifyToken(token: string): TokenKind {
    if (${upperCode}_KEYWORDS.has(token.toLowerCase())) return 'keyword';
    return 'identifier';
  }
}

export const ${varName}Tokenizer = new ${className}Tokenizer();
`;
}

function generateProfile(config: LanguageConfig): string {
  const { code, name, nativeName, direction, wordOrder, markingStrategy, usesSpaces } = config;
  const varName = name.toLowerCase();
  const verbPosition = wordOrder === 'SOV' ? 'end' : wordOrder === 'VSO' ? 'start' : 'start';
  const markerPosition = markingStrategy === 'postposition' || markingStrategy === 'case-suffix' ? 'after' : 'before';

  return `/**
 * ${name} Language Profile
 *
 * ${wordOrder} word order, ${markingStrategy}s, ${usesSpaces ? 'space-separated' : 'no spaces'}.
 */

import type { LanguageProfile } from './types';

export const ${varName}Profile: LanguageProfile = {
  code: '${code}',
  name: '${name}',
  nativeName: '${nativeName}',
  direction: '${direction}',
  wordOrder: '${wordOrder}',
  markingStrategy: '${markingStrategy}',
  usesSpaces: ${usesSpaces},
  defaultVerbForm: 'base',
  verb: {
    position: '${verbPosition}',
    subjectDrop: true,
  },
  references: {
    me: 'TODO',      // "I/me"
    it: 'TODO',      // "it"
    you: 'TODO',     // "you"
    result: 'TODO',
    event: 'TODO',
    target: 'TODO',
    body: 'body',
  },
  roleMarkers: {
    destination: { primary: 'TODO', position: '${markerPosition}' },
    source: { primary: 'TODO', position: '${markerPosition}' },
    patient: { primary: '', position: '${markerPosition}' },
    style: { primary: 'TODO', position: '${markerPosition}' },
  },
  keywords: {
    // Class/Attribute operations
    toggle: { primary: 'TODO', normalized: 'toggle' },
    add: { primary: 'TODO', normalized: 'add' },
    remove: { primary: 'TODO', normalized: 'remove' },
    // Content operations
    put: { primary: 'TODO', normalized: 'put' },
    append: { primary: 'TODO', normalized: 'append' },
    prepend: { primary: 'TODO', normalized: 'prepend' },
    take: { primary: 'TODO', normalized: 'take' },
    make: { primary: 'TODO', normalized: 'make' },
    clone: { primary: 'TODO', normalized: 'clone' },
    swap: { primary: 'TODO', normalized: 'swap' },
    morph: { primary: 'TODO', normalized: 'morph' },
    // Variable operations
    set: { primary: 'TODO', normalized: 'set' },
    get: { primary: 'TODO', normalized: 'get' },
    increment: { primary: 'TODO', normalized: 'increment' },
    decrement: { primary: 'TODO', normalized: 'decrement' },
    log: { primary: 'TODO', normalized: 'log' },
    // Visibility
    show: { primary: 'TODO', normalized: 'show' },
    hide: { primary: 'TODO', normalized: 'hide' },
    transition: { primary: 'TODO', normalized: 'transition' },
    // Events
    on: { primary: 'TODO', normalized: 'on' },
    trigger: { primary: 'TODO', normalized: 'trigger' },
    send: { primary: 'TODO', normalized: 'send' },
    // DOM focus
    focus: { primary: 'TODO', normalized: 'focus' },
    blur: { primary: 'TODO', normalized: 'blur' },
    // Navigation
    go: { primary: 'TODO', normalized: 'go' },
    // Async
    wait: { primary: 'TODO', normalized: 'wait' },
    fetch: { primary: 'TODO', normalized: 'fetch' },
    settle: { primary: 'TODO', normalized: 'settle' },
    // Control flow
    if: { primary: 'TODO', normalized: 'if' },
    else: { primary: 'TODO', normalized: 'else' },
    repeat: { primary: 'TODO', normalized: 'repeat' },
    for: { primary: 'TODO', normalized: 'for' },
    while: { primary: 'TODO', normalized: 'while' },
    continue: { primary: 'TODO', normalized: 'continue' },
    halt: { primary: 'TODO', normalized: 'halt' },
    throw: { primary: 'TODO', normalized: 'throw' },
    call: { primary: 'TODO', normalized: 'call' },
    return: { primary: 'TODO', normalized: 'return' },
    then: { primary: 'TODO', normalized: 'then' },
    and: { primary: 'TODO', normalized: 'and' },
    end: { primary: 'TODO', normalized: 'end' },
    // Advanced
    js: { primary: 'js', normalized: 'js' },
    async: { primary: 'TODO', normalized: 'async' },
    tell: { primary: 'TODO', normalized: 'tell' },
    default: { primary: 'TODO', normalized: 'default' },
    init: { primary: 'TODO', normalized: 'init' },
    behavior: { primary: 'TODO', normalized: 'behavior' },
    install: { primary: 'TODO', normalized: 'install' },
    measure: { primary: 'TODO', normalized: 'measure' },
    // Modifiers
    into: { primary: 'TODO', normalized: 'into' },
    before: { primary: 'TODO', normalized: 'before' },
    after: { primary: 'TODO', normalized: 'after' },
    // Event modifiers
    until: { primary: 'TODO', normalized: 'until' },
    event: { primary: 'TODO', normalized: 'event' },
    from: { primary: 'TODO', normalized: 'from' },
  },
  eventHandler: {
    keyword: { primary: 'TODO', normalized: 'on' },
    sourceMarker: { primary: 'TODO', position: '${markerPosition}' },
  },
};
`;
}

function generatePatternFile(config: LanguageConfig, command: string): string {
  const { code, name } = config;
  const upperCode = code.charAt(0).toUpperCase() + code.slice(1);
  const cmdPascal = toPascalCase(command);
  const funcName = `get${cmdPascal}Patterns${upperCode}`;

  return `/**
 * ${name} ${command.charAt(0).toUpperCase() + command.slice(1)} Patterns
 *
 * Patterns for parsing "${command}" command in ${name}.
 */

import type { LanguagePattern } from '../../types';

export function ${funcName}(): LanguagePattern[] {
  return [
    // TODO: Add patterns for ${command}
    // Example:
    // {
    //   id: '${command}-${code}-simple',
    //   language: '${code}',
    //   command: '${command}',
    //   priority: 100,
    //   template: {
    //     format: 'TODO {patient}',
    //     tokens: [
    //       { type: 'literal', value: 'TODO' },
    //       { type: 'role', role: 'patient' },
    //     ],
    //   },
    //   extraction: {
    //     patient: { position: 1 },
    //   },
    // },
  ];
}
`;
}

function generateDictionary(config: LanguageConfig): string {
  const { code, name } = config;
  const varName = `${name.toLowerCase()}Dictionary`;

  return `/**
 * ${name} Dictionary
 *
 * ${name} translations for hyperscript keywords.
 */

import { Dictionary } from '../types';

export const ${varName}: Dictionary = {
  commands: {
    on: 'TODO',
    toggle: 'TODO',
    add: 'TODO',
    remove: 'TODO',
    set: 'TODO',
    get: 'TODO',
    put: 'TODO',
    take: 'TODO',
    show: 'TODO',
    hide: 'TODO',
    increment: 'TODO',
    decrement: 'TODO',
    if: 'TODO',
    else: 'TODO',
    repeat: 'TODO',
    for: 'TODO',
    while: 'TODO',
    wait: 'TODO',
    fetch: 'TODO',
    call: 'TODO',
    return: 'TODO',
    log: 'TODO',
    trigger: 'TODO',
    send: 'TODO',
    go: 'TODO',
    halt: 'TODO',
    throw: 'TODO',
    continue: 'TODO',
    make: 'TODO',
    append: 'TODO',
    prepend: 'TODO',
    focus: 'TODO',
    blur: 'TODO',
    transition: 'TODO',
    settle: 'TODO',
    measure: 'TODO',
    async: 'TODO',
    tell: 'TODO',
    default: 'TODO',
    init: 'TODO',
    behavior: 'TODO',
    install: 'TODO',
    clone: 'TODO',
    swap: 'TODO',
    morph: 'TODO',
  },
  modifiers: {
    to: 'TODO',
    from: 'TODO',
    into: 'TODO',
    on: 'TODO',
    with: 'TODO',
    by: 'TODO',
    as: 'TODO',
    before: 'TODO',
    after: 'TODO',
    at: 'TODO',
    in: 'TODO',
    over: 'TODO',
    then: 'TODO',
    and: 'TODO',
    end: 'TODO',
    until: 'TODO',
    of: 'TODO',
  },
  events: {
    click: 'TODO',
    change: 'TODO',
    input: 'TODO',
    submit: 'TODO',
    load: 'TODO',
    focus: 'TODO',
    blur: 'TODO',
    keydown: 'TODO',
    keyup: 'TODO',
    mouseover: 'TODO',
    mouseout: 'TODO',
    scroll: 'TODO',
    resize: 'TODO',
    every: 'TODO',
  },
  logical: {
    if: 'TODO',
    else: 'TODO',
    not: 'TODO',
    and: 'TODO',
    or: 'TODO',
    is: 'TODO',
    exists: 'TODO',
    empty: 'TODO',
    true: 'TODO',
    false: 'TODO',
    null: 'TODO',
    undefined: 'TODO',
  },
  temporal: {
    now: 'TODO',
    seconds: 'TODO',
    milliseconds: 'TODO',
    minutes: 'TODO',
    hours: 'TODO',
    forever: 'TODO',
    times: 'TODO',
    s: 'TODO',
    ms: 'TODO',
  },
  values: {
    me: 'TODO',
    my: 'TODO',
    it: 'TODO',
    its: 'TODO',
    result: 'TODO',
    event: 'TODO',
    target: 'TODO',
    body: 'TODO',
  },
  attributes: {
    class: 'TODO',
    id: 'TODO',
    style: 'TODO',
    value: 'TODO',
    text: 'TODO',
    html: 'TODO',
    disabled: 'TODO',
    checked: 'TODO',
  },
  expressions: {
    first: 'TODO',
    last: 'TODO',
    next: 'TODO',
    previous: 'TODO',
    closest: 'TODO',
    parent: 'TODO',
    children: 'TODO',
    random: 'TODO',
    length: 'TODO',
    index: 'TODO',
  },
};

// Default export alias
export const ${code} = ${varName};
`;
}

// =============================================================================
// Index File Updates
// =============================================================================

function updateLanguagesAll(code: string): void {
  const filePath = path.join(SEMANTIC_SRC, 'languages/_all.ts');
  let content = fs.readFileSync(filePath, 'utf-8');

  // Find the last import and add after it
  const importMatch = content.match(/import '\.\/(\w+)';/g);
  if (importMatch) {
    const lastImport = importMatch[importMatch.length - 1];
    content = content.replace(lastImport, `${lastImport}\nimport './${code}';`);
  }

  // Find the last export and add after it
  const exportMatch = content.match(/export \* from '\.\/(\w+)';/g);
  if (exportMatch) {
    const lastExport = exportMatch[exportMatch.length - 1];
    content = content.replace(lastExport, `${lastExport}\nexport * from './${code}';`);
  }

  fs.writeFileSync(filePath, content);
  console.log(`  Updated: ${filePath}`);
}

function updateTokenizersIndex(code: string, name: string): void {
  const filePath = path.join(SEMANTIC_SRC, 'tokenizers/index.ts');
  let content = fs.readFileSync(filePath, 'utf-8');
  const varName = name.toLowerCase();

  // Find the export block and add before the base exports
  const exportLine = `export { ${varName}Tokenizer } from './${code}';`;
  const baseExportMatch = content.match(/export \{\n\s+BaseTokenizer,/);
  if (baseExportMatch) {
    content = content.replace(baseExportMatch[0], `${exportLine}\n\n${baseExportMatch[0]}`);
  }

  fs.writeFileSync(filePath, content);
  console.log(`  Updated: ${filePath}`);
}

function updateProfilesIndex(code: string, name: string): void {
  const filePath = path.join(SEMANTIC_SRC, 'generators/profiles/index.ts');
  let content = fs.readFileSync(filePath, 'utf-8');
  const varName = name.toLowerCase();

  // Add export at the end
  const exportLine = `export { ${varName}Profile } from './${code}';`;
  content = content.trimEnd() + '\n' + exportLine + '\n';

  fs.writeFileSync(filePath, content);
  console.log(`  Updated: ${filePath}`);
}

function updateLanguageProfiles(code: string, name: string): void {
  const filePath = path.join(SEMANTIC_SRC, 'generators/language-profiles.ts');
  let content = fs.readFileSync(filePath, 'utf-8');
  const varName = name.toLowerCase();

  // 1. Add re-export after last export
  const exportMatch = content.match(/export \{ \w+Profile \} from '\.\/profiles\/\w+';/g);
  if (exportMatch) {
    const lastExport = exportMatch[exportMatch.length - 1];
    content = content.replace(lastExport, `${lastExport}\nexport { ${varName}Profile } from './profiles/${code}';`);
  }

  // 2. Add import after last import (before the type import)
  const importMatch = content.match(/import \{ \w+Profile \} from '\.\/profiles\/\w+';/g);
  if (importMatch) {
    const lastImport = importMatch[importMatch.length - 1];
    content = content.replace(lastImport, `${lastImport}\nimport { ${varName}Profile } from './profiles/${code}';`);
  }

  // 3. Add to languageProfiles object - find the closing brace and add before it
  const objMatch = content.match(/(\w+): (\w+Profile),\n\};/);
  if (objMatch) {
    const lastCode = objMatch[1];
    const lastProfile = objMatch[2];
    content = content.replace(objMatch[0], `${lastCode}: ${lastProfile},\n  ${code}: ${varName}Profile,\n};`);
  }

  fs.writeFileSync(filePath, content);
  console.log(`  Updated: ${filePath}`);
}

function updatePatternIndex(code: string, _name: string, command: string): void {
  const filePath = path.join(SEMANTIC_SRC, `patterns/${command}/index.ts`);
  if (!fs.existsSync(filePath)) {
    console.log(`  Skipped (not found): ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  const upperCode = code.charAt(0).toUpperCase() + code.slice(1);
  const cmdPascal = toPascalCase(command);
  const funcName = `get${cmdPascal}Patterns${upperCode}`;

  // 1. Add re-export
  const reExportMatch = content.match(/export \{ get\w+Patterns\w+ \} from '\.\/\w+';/g);
  if (reExportMatch) {
    const lastReExport = reExportMatch[reExportMatch.length - 1];
    content = content.replace(lastReExport, `${lastReExport}\nexport { ${funcName} } from './${code}';`);
  }

  // 2. Add import
  const importMatch = content.match(/import \{ get\w+Patterns\w+ \} from '\.\/\w+';/g);
  if (importMatch) {
    const lastImport = importMatch[importMatch.length - 1];
    content = content.replace(lastImport, `${lastImport}\nimport { ${funcName} } from './${code}';`);
  }

  // 3. Add case to switch
  // Handle both single-line (case 'xx': return ...) and multi-line formats
  const singleLineCaseMatch = content.match(/case '(\w+)': return get\w+Patterns\w+\(\);\n(\s+default:)/);
  const multiLineCaseMatch = content.match(/case '(\w+)':\s*\n\s+return get\w+Patterns\w+\(\);\n(\s+default:)/);

  if (singleLineCaseMatch) {
    content = content.replace(singleLineCaseMatch[0], `case '${singleLineCaseMatch[1]}': return get${cmdPascal}Patterns${singleLineCaseMatch[1].charAt(0).toUpperCase() + singleLineCaseMatch[1].slice(1)}();\n    case '${code}': return ${funcName}();\n${singleLineCaseMatch[2]}`);
  } else if (multiLineCaseMatch) {
    const lastCode = multiLineCaseMatch[1];
    const lastCodeCap = lastCode.charAt(0).toUpperCase() + lastCode.slice(1);
    content = content.replace(multiLineCaseMatch[0], `case '${lastCode}':\n      return get${cmdPascal}Patterns${lastCodeCap}();\n    case '${code}':\n      return ${funcName}();\n${multiLineCaseMatch[2]}`);
  }

  // 4. Add to languages array
  // Use camelCase for hyphenated commands (e.g., event-handler -> eventHandler)
  const cmdCamel = command.split('-').map((part, i) =>
    i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
  ).join('');
  const langArrayMatch = content.match(/const \w+PatternLanguages = \[([^\]]+)\];/);
  if (langArrayMatch) {
    const newArray = langArrayMatch[1].trim() + `, '${code}'`;
    content = content.replace(langArrayMatch[0], `const ${cmdCamel}PatternLanguages = [${newArray}];`);
  }

  fs.writeFileSync(filePath, content);
  console.log(`  Updated: ${filePath}`);
}

// =============================================================================
// Vite Plugin Updates
// =============================================================================

/**
 * Determine if a language uses non-Latin script based on its properties.
 */
function isNonLatinScript(config: LanguageConfig): boolean {
  // Non-Latin scripts: CJK, Arabic, Cyrillic, Indic, Thai, etc.
  // We check based on direction (RTL is non-Latin) or known script families
  if (config.direction === 'rtl') return true;

  // Languages that typically use non-Latin scripts
  const nonLatinCodes = ['ja', 'zh', 'ko', 'ar', 'he', 'ru', 'uk', 'bg', 'hi', 'bn', 'th', 'ta', 'te', 'ml', 'ka', 'hy', 'am', 'my'];
  return nonLatinCodes.includes(config.code);
}

/**
 * Generate a keyword set stub for the vite-plugin.
 */
function generateVitePluginKeywordSet(config: LanguageConfig): string {
  const { code, name } = config;
  const upperCode = code.toUpperCase();
  const scriptType = isNonLatinScript(config) ? 'non-Latin script' : 'Latin script';

  return `
/**
 * ${name} keywords (${scriptType}).
 * TODO: Fill in keywords after completing the semantic profile.
 * Run 'npm run sync-keywords' to auto-populate from profile.
 */
export const ${upperCode}_KEYWORDS = new Set([
  // Commands - copy from profile after filling in TODO values
  // 'toggle_keyword', 'add_keyword', 'remove_keyword',
  // 'show_keyword', 'hide_keyword', 'set_keyword',
]);
`;
}

/**
 * Update vite-plugin's language-keywords.ts to add the new language.
 */
function updateVitePluginKeywords(config: LanguageConfig): void {
  const keywordsFilePath = path.join(VITE_PLUGIN_SRC, 'language-keywords.ts');
  if (!fs.existsSync(keywordsFilePath)) {
    console.log(`  Skipped (not found): ${keywordsFilePath}`);
    return;
  }

  let content = fs.readFileSync(keywordsFilePath, 'utf-8');
  const { code, name } = config;
  const upperCode = code.toUpperCase();
  const isNonLatin = isNonLatinScript(config);

  // 1. Add to SUPPORTED_LANGUAGES array
  // Find the last entry in the array and add after it
  const supportedMatch = content.match(/export const SUPPORTED_LANGUAGES = \[[\s\S]*?\] as const;/);
  if (supportedMatch) {
    const arrayContent = supportedMatch[0];
    // Find the last language code before '] as const'
    const lastCodeMatch = arrayContent.match(/'(\w+)',?\s*\/\/[^\n]*\n\s*\] as const;/);
    if (lastCodeMatch) {
      const newEntry = `'${code}',  // ${name} (auto-added)\n] as const;`;
      content = content.replace(
        lastCodeMatch[0],
        `'${lastCodeMatch[1]}',${lastCodeMatch[0].includes('//') ? lastCodeMatch[0].match(/\/\/[^\n]*/)?.[0] || '' : ''}\n  ${newEntry}`
      );
    }
  }

  // 2. Add keyword set before LANGUAGE_KEYWORDS mapping
  const keywordSet = generateVitePluginKeywordSet(config);
  const langKeywordsMatch = content.match(/\/\*\*\n \* Map of language code to keyword set\./);
  if (langKeywordsMatch) {
    content = content.replace(langKeywordsMatch[0], keywordSet + '\n' + langKeywordsMatch[0]);
  }

  // 3. Add to LANGUAGE_KEYWORDS mapping
  const mappingMatch = content.match(/export const LANGUAGE_KEYWORDS: Record<SupportedLanguage, Set<string>> = \{[\s\S]*?\};/);
  if (mappingMatch) {
    const mappingContent = mappingMatch[0];
    // Find the last entry before '};'
    const lastEntryMatch = mappingContent.match(/(\w+): (\w+_KEYWORDS),\n\};/);
    if (lastEntryMatch) {
      content = content.replace(
        lastEntryMatch[0],
        `${lastEntryMatch[1]}: ${lastEntryMatch[2]},\n  ${code}: ${upperCode}_KEYWORDS,\n};`
      );
    }
  }

  // 4. Add to nonLatinLangs if applicable
  if (isNonLatin) {
    const nonLatinMatch = content.match(/const nonLatinLangs: SupportedLanguage\[\] = \[([^\]]+)\];/);
    if (nonLatinMatch) {
      const currentLangs = nonLatinMatch[1];
      if (!currentLangs.includes(`'${code}'`)) {
        content = content.replace(
          nonLatinMatch[0],
          `const nonLatinLangs: SupportedLanguage[] = [${currentLangs}, '${code}'];`
        );
      }
    }
  }

  fs.writeFileSync(keywordsFilePath, content);
  console.log(`  Updated: ${keywordsFilePath}`);
}

/**
 * Update vite-plugin's types.ts to add new region if needed.
 */
function updateVitePluginTypes(config: LanguageConfig): void {
  // For now, just log that manual region updates may be needed
  // Regions are semantic groupings that require human judgment
  if (config.wordOrder === 'SOV' || config.wordOrder === 'VSO' || config.direction === 'rtl') {
    console.log(`  Note: Consider adding '${config.code}' to an appropriate region in vite-plugin/src/types.ts`);
  }
}

// =============================================================================
// Pattern Builders Update
// =============================================================================

/**
 * Update builders.ts to add the new language to handcraftedLanguages array.
 */
function updatePatternBuilders(code: string): void {
  const filePath = path.join(SEMANTIC_SRC, 'patterns/builders.ts');
  if (!fs.existsSync(filePath)) {
    console.log(`  Skipped (not found): ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  // Find the handcraftedLanguages array and add the new language
  const arrayMatch = content.match(/const handcraftedLanguages = \[([^\]]+)\];/);
  if (arrayMatch) {
    const currentArray = arrayMatch[1].trim();
    // Check if already present
    if (currentArray.includes(`'${code}'`)) {
      console.log(`  Skipped (already present): ${filePath}`);
      return;
    }
    content = content.replace(
      arrayMatch[0],
      `const handcraftedLanguages = [${currentArray}, '${code}'];`
    );
    fs.writeFileSync(filePath, content);
    console.log(`  Updated: ${filePath}`);
  } else {
    console.log(`  Warning: Could not find handcraftedLanguages array in ${filePath}`);
  }
}

// =============================================================================
// Language Building Schema Update
// =============================================================================

/**
 * Generate a SUPPORTED_LANGUAGES entry for the new language.
 */
function generateLanguageSchemaEntry(config: LanguageConfig): string {
  const { code, name, wordOrder, direction } = config;

  return `  {
    code: '${code}',
    name: '${name}',
    wordOrder: '${wordOrder}',
    direction: '${direction}',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: false,
      eventHandlerPatterns: true,
      tests: true,
      morphologyTests: false,
    },
    morphology: {
      needed: false,
      reason: 'TODO: Determine if morphological normalization is needed',
      inflectionTypes: [],
      integratedWithTokenizer: false,
      confidenceThreshold: 1.0,
    },
    profileKeywords: [
      // TODO: Fill in after completing profile
    ],
    tokenizerKeywords: [
      // TODO: Fill in after completing tokenizer
    ],
    missingFromTokenizer: [],
    potentialConflicts: [],
  }`;
}

/**
 * Update language-building-schema.ts to add the new language.
 */
function updateLanguageBuildingSchema(config: LanguageConfig): void {
  const filePath = path.join(SEMANTIC_SRC, 'language-building-schema.ts');
  if (!fs.existsSync(filePath)) {
    console.log(`  Skipped (not found): ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  // Check if already present
  if (content.includes(`code: '${config.code}'`)) {
    console.log(`  Skipped (already present): ${filePath}`);
    return;
  }

  // Find the end of SUPPORTED_LANGUAGES array (before SUPPORTED_COMMANDS)
  const arrayEndMatch = content.match(/(\s+potentialConflicts: \[\],\n\s+\},)\n\];\n\n\/\*\*\n \* Documents the current state of command support\./);
  if (arrayEndMatch) {
    const entry = generateLanguageSchemaEntry(config);
    content = content.replace(
      arrayEndMatch[0],
      `${arrayEndMatch[1]},\n${entry},\n];\n\n/**\n * Documents the current state of command support.`
    );
    fs.writeFileSync(filePath, content);
    console.log(`  Updated: ${filePath}`);
  } else {
    console.log(`  Warning: Could not find SUPPORTED_LANGUAGES array end in ${filePath}`);
  }
}

function updateI18nDictionariesIndex(code: string, name: string): void {
  const filePath = path.join(I18N_SRC, 'dictionaries/index.ts');
  if (!fs.existsSync(filePath)) {
    console.log(`  Skipped (not found): ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  const varName = `${name.toLowerCase()}Dictionary`;

  // 1. Add import
  const importMatch = content.match(/import \{ \w+Dictionary as \w+Legacy \} from '\.\/\w+';/g);
  if (importMatch) {
    const lastImport = importMatch[importMatch.length - 1];
    content = content.replace(lastImport, `${lastImport}\nimport { ${varName} as ${code}Legacy } from './${code}';`);
  }

  // 2. Add export const
  const exportConstMatch = content.match(/export const (\w+): Dictionary = \w+Legacy;\n\n\/\/ ={10,}/);
  if (exportConstMatch) {
    content = content.replace(
      exportConstMatch[0],
      `export const ${exportConstMatch[1]}: Dictionary = ${exportConstMatch[1]}Legacy;\n\n/**\n * ${name} dictionary - legacy overrides for compatibility.\n */\nexport const ${code}: Dictionary = ${code}Legacy;\n\n// =============================================================================`
    );
  }

  // 3. Add to dictionaries object
  const dictObjMatch = content.match(/(\w+),\n\};/);
  if (dictObjMatch) {
    content = content.replace(dictObjMatch[0], `${dictObjMatch[1]},\n  ${code},\n};`);
  }

  fs.writeFileSync(filePath, content);
  console.log(`  Updated: ${filePath}`);
}

// =============================================================================
// Main
// =============================================================================

const PATTERN_COMMANDS = [
  'toggle', 'add', 'remove', 'put', 'set', 'get',
  'show', 'hide', 'increment', 'decrement', 'event-handler'
];

function main() {
  const config = parseArgs();

  console.log(`\nAdding language: ${config.name} (${config.code})`);
  console.log(`  Word order: ${config.wordOrder}`);
  console.log(`  Direction: ${config.direction}`);
  console.log(`  Marking: ${config.markingStrategy}`);
  console.log(`  Uses spaces: ${config.usesSpaces}\n`);

  // Check if language already exists
  const langModulePath = path.join(SEMANTIC_SRC, `languages/${config.code}.ts`);
  if (fs.existsSync(langModulePath)) {
    console.error(`Error: Language ${config.code} already exists at ${langModulePath}`);
    process.exit(1);
  }

  // Generate files
  console.log('Generating files...');

  // 1. Language module
  fs.writeFileSync(langModulePath, generateLanguageModule(config));
  console.log(`  Created: ${langModulePath}`);

  // 2. Tokenizer
  const tokenizerPath = path.join(SEMANTIC_SRC, `tokenizers/${config.code}.ts`);
  fs.writeFileSync(tokenizerPath, generateTokenizer(config));
  console.log(`  Created: ${tokenizerPath}`);

  // 3. Profile
  const profilePath = path.join(SEMANTIC_SRC, `generators/profiles/${config.code}.ts`);
  fs.writeFileSync(profilePath, generateProfile(config));
  console.log(`  Created: ${profilePath}`);

  // 4. Pattern files
  for (const cmd of PATTERN_COMMANDS) {
    const patternDir = path.join(SEMANTIC_SRC, `patterns/${cmd}`);
    if (fs.existsSync(patternDir)) {
      const patternPath = path.join(patternDir, `${config.code}.ts`);
      fs.writeFileSync(patternPath, generatePatternFile(config, cmd));
      console.log(`  Created: ${patternPath}`);
    }
  }

  // 5. Dictionary
  const dictPath = path.join(I18N_SRC, `dictionaries/${config.code}.ts`);
  if (fs.existsSync(path.dirname(dictPath))) {
    fs.writeFileSync(dictPath, generateDictionary(config));
    console.log(`  Created: ${dictPath}`);
  }

  // Update index files
  console.log('\nUpdating index files...');

  updateLanguagesAll(config.code);
  updateTokenizersIndex(config.code, config.name);
  updateProfilesIndex(config.code, config.name);
  updateLanguageProfiles(config.code, config.name);

  for (const cmd of PATTERN_COMMANDS) {
    updatePatternIndex(config.code, config.name, cmd);
  }

  updateI18nDictionariesIndex(config.code, config.name);

  // Update pattern builders (handcraftedLanguages array)
  updatePatternBuilders(config.code);

  // Update language-building-schema.ts (SUPPORTED_LANGUAGES array)
  updateLanguageBuildingSchema(config);

  // Update vite-plugin
  console.log('\nUpdating vite-plugin...');
  updateVitePluginKeywords(config);
  updateVitePluginTypes(config);

  // Summary
  console.log(`
================================================================================
Language ${config.name} (${config.code}) scaffolded successfully!
================================================================================

Next steps:
1. Fill in TODO translations in:
   - ${profilePath}
   - ${tokenizerPath} (add keywords from profile)
   - ${dictPath}

2. Add character classification if non-Latin script (in tokenizer)

3. Add patterns in patterns/*/${config.code}.ts files

4. Sync keywords to vite-plugin (after filling in profile):
   npm run sync-keywords --prefix packages/vite-plugin

5. Run TypeScript checks:
   npm run typecheck --prefix packages/semantic
   npm run typecheck --prefix packages/vite-plugin

6. Run tests:
   npm test --prefix packages/semantic -- --run

Note: The vite-plugin has been scaffolded with a stub keyword set.
      Run sync-keywords after completing the profile translations.
`);
}

main();
