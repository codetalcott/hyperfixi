/**
 * Chevrotain Grammar Generator (Phase 5.2)
 *
 * Reads semantic profiles (keywords) and command schemas (structure) to generate
 * a Chevrotain token vocabulary and parser rules for the language server.
 *
 * Output: src/generated/chevrotain-vocabulary.ts
 *
 * Sync guarantee: CI regenerates and diffs on every PR (same pattern as Phase 4.2).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Import from semantic package (main entry registers all languages)
import {
  commandSchemas,
  getRegisteredLanguages,
  getProfile,
} from '@lokascript/semantic';
import type {
  CommandSchema,
  CommandCategory,
  LanguageProfile,
} from '@lokascript/semantic';

// =============================================================================
// Types
// =============================================================================

interface TokenDef {
  name: string;
  pattern: string; // Regex pattern as string
  category?: string;
  longerAlt?: string;
}

interface CategoryGroup {
  category: CommandCategory;
  label: string;
  commands: string[];
}

// =============================================================================
// Collect Keywords
// =============================================================================

function collectAllKeywords(): Map<string, Set<string>> {
  /** keyword → set of languages that use it */
  const keywordMap = new Map<string, Set<string>>();

  const languages = getRegisteredLanguages();

  for (const lang of languages) {
    let profile: LanguageProfile;
    try {
      profile = getProfile(lang);
    } catch {
      continue;
    }

    if (!profile.keywords) continue;

    for (const [_action, kw] of Object.entries(profile.keywords)) {
      if (!kw) continue;
      const words = [kw.primary, ...(kw.alternatives || [])];
      for (const word of words) {
        if (!word) continue;
        const lower = word.toLowerCase();
        if (!keywordMap.has(lower)) {
          keywordMap.set(lower, new Set());
        }
        keywordMap.get(lower)!.add(lang);
      }
    }

    // Role markers
    if (profile.roleMarkers) {
      for (const marker of Object.values(profile.roleMarkers)) {
        if (marker?.primary) {
          const lower = marker.primary.toLowerCase();
          if (!keywordMap.has(lower)) {
            keywordMap.set(lower, new Set());
          }
          keywordMap.get(lower)!.add(lang);
        }
      }
    }
  }

  return keywordMap;
}

// =============================================================================
// Group Commands by Category
// =============================================================================

function groupByCategory(): CategoryGroup[] {
  const groups = new Map<CommandCategory, string[]>();

  for (const schema of Object.values(commandSchemas) as CommandSchema[]) {
    if (!groups.has(schema.category)) {
      groups.set(schema.category, []);
    }
    groups.get(schema.category)!.push(schema.action);
  }

  const labels: Record<CommandCategory, string> = {
    'dom-class': 'DOM Class/Attribute',
    'dom-content': 'DOM Content',
    'dom-visibility': 'DOM Visibility',
    'variable': 'Variable Operations',
    'event': 'Event Handling',
    'async': 'Async Operations',
    'navigation': 'Navigation',
    'control-flow': 'Control Flow',
  };

  return Array.from(groups.entries()).map(([category, commands]) => ({
    category,
    label: labels[category] || category,
    commands: commands.sort(),
  }));
}

// =============================================================================
// Build Token Definitions
// =============================================================================

function buildTokenDefs(keywords: Map<string, Set<string>>): TokenDef[] {
  const tokens: TokenDef[] = [];

  // Structural tokens (always present)
  // Pattern strings are written as regex literals in the output file
  tokens.push(
    { name: 'WhiteSpace', pattern: String.raw`/\s+/`, category: 'whitespace' },
    { name: 'StringLiteral', pattern: String.raw`/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/`, category: 'literal' },
    { name: 'TemplateLiteral', pattern: '/`(?:[^`\\\\]|\\\\.)*`/', category: 'literal' },
    { name: 'NumberLiteral', pattern: String.raw`/\d+(\.\d+)?/`, category: 'literal' },
    { name: 'CSSSelector', pattern: String.raw`/[#.][a-zA-Z_][\w-]*/`, category: 'selector' },
    { name: 'AttributeSelector', pattern: String.raw`/@[a-zA-Z_][\w-]*/`, category: 'selector' },
    { name: 'HTMLSelector', pattern: String.raw`/<[a-zA-Z][\w.-]*\/>/`, category: 'selector' },
    { name: 'LocalVariable', pattern: String.raw`/:[a-zA-Z_][\w]*/`, category: 'variable' },
    { name: 'GlobalVariable', pattern: String.raw`/\$[a-zA-Z_][\w]*/`, category: 'variable' },
    { name: 'URLLiteral', pattern: String.raw`/\/[a-zA-Z0-9_\-.\/]+/`, category: 'literal' },
    { name: 'LParen', pattern: String.raw`/\(/` },
    { name: 'RParen', pattern: String.raw`/\)/` },
    { name: 'Comma', pattern: `/,/` },
    { name: 'Dot', pattern: String.raw`/\./` },
    { name: 'PossessiveS', pattern: String.raw`/'s(?=[\s),.\]}|])/` },
  );

  // Event names — skip those that duplicate command names (focus, blur are both events and commands)
  const eventNames = [
    'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseenter', 'mouseleave',
    'keydown', 'keyup', 'keypress', 'input', 'change', 'submit', 'focus', 'blur',
    'load', 'scroll', 'resize', 'mutation', 'intersection', 'every',
  ];
  // We'll track which events to skip after we know the command set
  const eventSet = new Set(eventNames);

  // Structural keywords — define BEFORE commands to establish longer_alt relationships
  // Use word-boundary patterns to prevent prefix matching issues (e.g., 'it' matching 'its')
  const structural = ['on', 'then', 'end', 'if', 'else', 'to', 'from', 'into', 'in', 'of',
    'as', 'with', 'at', 'by', 'for', 'while', 'until', 'times', 'and', 'or', 'not',
    'is', 'has', 'have', 'me', 'it', 'you', 'my', 'its', 'the', 'first', 'last',
    'next', 'previous', 'closest', 'true', 'false', 'null', 'no'];
  const structuralSet = new Set(structural);

  // Sort so that longer keywords come first to avoid prefix shadowing
  // e.g., 'its' before 'it', 'into' before 'in'
  const sortedStructural = [...structural].sort((a, b) => b.length - a.length);
  for (const kw of sortedStructural) {
    tokens.push({
      name: `Kw_${kw}`,
      pattern: `/${kw}/`,
      category: 'keyword',
      longerAlt: 'Identifier',
    });
  }

  // Command keywords (from schemas, English only for token names)
  // Skip commands that duplicate a structural keyword — the Kw_ token serves both purposes
  // Sort by length DESC to prevent prefix shadowing (e.g., 'settle' before 'set')
  const commandNames = new Set<string>();
  const commandEntries = (Object.values(commandSchemas) as CommandSchema[])
    .filter(s => !structuralSet.has(s.action))
    .sort((a, b) => b.action.length - a.action.length);
  for (const schema of commandEntries) {
    commandNames.add(schema.action);
    const name = `Cmd_${schema.action}`;
    tokens.push({
      name,
      pattern: `/${schema.action}/`,
      category: `cmd-${schema.category}`,
      longerAlt: 'Identifier',
    });
  }

  // Event name tokens — skip those that overlap with commands or structural keywords
  // Sort by length DESC to prevent prefix shadowing
  const sortedEvents = [...eventNames].sort((a, b) => b.length - a.length);
  for (const event of sortedEvents) {
    if (commandNames.has(event) || structuralSet.has(event)) continue;
    tokens.push({
      name: `Event_${event}`,
      pattern: `/${event}/`,
      category: 'event',
      longerAlt: 'Identifier',
    });
  }

  // Identifier (catch-all for words not matching keywords)
  tokens.push({
    name: 'Identifier',
    pattern: String.raw`/[a-zA-Z\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u0900-\u09FF\u0E00-\u0E7F\u3040-\u9FFF\uAC00-\uD7AF][\w\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u0900-\u09FF\u0E00-\u0E7F\u3040-\u9FFF\uAC00-\uD7AF'-]*/`,
    category: 'identifier',
  });

  return tokens;
}

// =============================================================================
// Generate Schema Info
// =============================================================================

interface SchemaInfo {
  action: string;
  category: CommandCategory;
  roles: Array<{
    role: string;
    required: boolean;
    expectedTypes: string[];
  }>;
  primaryRole: string;
}

function buildSchemaInfos(): SchemaInfo[] {
  return (Object.values(commandSchemas) as CommandSchema[]).map(schema => ({
    action: schema.action,
    category: schema.category,
    roles: schema.roles.map(r => ({
      role: r.role,
      required: r.required,
      expectedTypes: [...r.expectedTypes],
    })),
    primaryRole: schema.primaryRole,
  }));
}

// =============================================================================
// Code Generation
// =============================================================================

function generateOutput(
  tokens: TokenDef[],
  categories: CategoryGroup[],
  schemas: SchemaInfo[],
  keywordCount: number,
  languageCount: number,
): string {
  const lines: string[] = [];

  lines.push('/**');
  lines.push(' * Generated Chevrotain Vocabulary (Phase 5.2)');
  lines.push(' *');
  lines.push(' * Auto-generated from semantic profiles and command schemas.');
  lines.push(' * DO NOT EDIT — regenerate with: npx tsx scripts/generate-chevrotain-grammar.ts');
  lines.push(` *`);
  lines.push(` * Source: ${languageCount} language profiles, ${schemas.length} command schemas`);
  lines.push(` * Keywords indexed: ${keywordCount}`);
  lines.push(' */');
  lines.push('');
  lines.push("import { createToken, Lexer, type ITokenConfig, type TokenType } from 'chevrotain';");
  lines.push('');

  // Token definitions
  lines.push('// =============================================================================');
  lines.push('// Token Definitions');
  lines.push('// =============================================================================');
  lines.push('');

  // Group tokens by category for clarity
  const byCategory = new Map<string, TokenDef[]>();
  for (const t of tokens) {
    const cat = t.category || 'structural';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(t);
  }

  // Emit Identifier first (needed as longerAlt reference)
  const identifierToken = tokens.find(t => t.name === 'Identifier')!;
  lines.push(`export const Identifier = createToken({ name: 'Identifier', pattern: ${identifierToken.pattern} });`);
  lines.push('');

  for (const [cat, catTokens] of Array.from(byCategory.entries())) {
    lines.push(`// --- ${cat} ---`);
    for (const t of catTokens) {
      if (t.name === 'Identifier') continue; // Already emitted
      const config: string[] = [`name: '${t.name}'`, `pattern: ${t.pattern}`];
      if (t.longerAlt) config.push(`longer_alt: ${t.longerAlt}`);
      lines.push(`export const ${t.name} = createToken({ ${config.join(', ')} });`);
    }
    lines.push('');
  }

  // All tokens array (order matters for Chevrotain — keywords before Identifier)
  lines.push('// =============================================================================');
  lines.push('// Token Vocabulary (order matters: keywords before Identifier)');
  lines.push('// =============================================================================');
  lines.push('');
  lines.push('export const allTokens: TokenType[] = [');

  // Whitespace first
  lines.push('  // Whitespace');
  lines.push('  WhiteSpace,');

  // Literals before identifiers
  lines.push('  // Literals');
  lines.push('  PossessiveS, StringLiteral, TemplateLiteral, NumberLiteral, URLLiteral,');

  // Selectors
  lines.push('  // Selectors');
  lines.push('  CSSSelector, AttributeSelector, HTMLSelector,');

  // Variables
  lines.push('  // Variables');
  lines.push('  LocalVariable, GlobalVariable,');

  // Punctuation
  lines.push('  // Punctuation');
  lines.push('  LParen, RParen, Comma, Dot,');

  // Keywords (must come before Identifier)
  lines.push('  // Event names');
  const eventTokens = tokens.filter(t => t.category === 'event');
  lines.push(`  ${eventTokens.map(t => t.name).join(', ')},`);

  lines.push('  // Command keywords');
  const cmdTokens = tokens.filter(t => t.category?.startsWith('cmd-'));
  lines.push(`  ${cmdTokens.map(t => t.name).join(', ')},`);

  lines.push('  // Structural keywords');
  const kwTokens = tokens.filter(t => t.category === 'keyword');
  lines.push(`  ${kwTokens.map(t => t.name).join(', ')},`);

  // Identifier last
  lines.push('  // Identifier (catch-all)');
  lines.push('  Identifier,');
  lines.push('];');
  lines.push('');

  // Lexer instance
  lines.push('export const hyperscriptLexer = new Lexer(allTokens, {');
  lines.push("  positionTracking: 'full',");
  lines.push('  ensureOptimizations: true,');
  lines.push('});');
  lines.push('');

  // Command categories
  lines.push('// =============================================================================');
  lines.push('// Command Categories (from command schemas)');
  lines.push('// =============================================================================');
  lines.push('');
  lines.push('export interface CommandCategoryGroup {');
  lines.push('  readonly category: string;');
  lines.push('  readonly label: string;');
  lines.push('  readonly commands: readonly string[];');
  lines.push('}');
  lines.push('');
  lines.push('export const COMMAND_CATEGORIES: readonly CommandCategoryGroup[] = [');
  for (const group of categories) {
    lines.push(`  { category: '${group.category}', label: '${group.label}', commands: [${group.commands.map(c => `'${c}'`).join(', ')}] },`);
  }
  lines.push('];');
  lines.push('');

  // Schema info for content assist
  lines.push('// =============================================================================');
  lines.push('// Command Schema Info (for content assist and validation)');
  lines.push('// =============================================================================');
  lines.push('');
  lines.push('export interface SchemaRoleInfo {');
  lines.push('  readonly role: string;');
  lines.push('  readonly required: boolean;');
  lines.push('  readonly expectedTypes: readonly string[];');
  lines.push('}');
  lines.push('');
  lines.push('export interface CommandSchemaInfo {');
  lines.push('  readonly action: string;');
  lines.push('  readonly category: string;');
  lines.push('  readonly roles: readonly SchemaRoleInfo[];');
  lines.push('  readonly primaryRole: string;');
  lines.push('}');
  lines.push('');
  lines.push('export const COMMAND_SCHEMAS: readonly CommandSchemaInfo[] = [');
  for (const schema of schemas) {
    const roles = schema.roles.map(r =>
      `{ role: '${r.role}', required: ${r.required}, expectedTypes: [${r.expectedTypes.map(t => `'${t}'`).join(', ')}] }`
    ).join(', ');
    lines.push(`  { action: '${schema.action}', category: '${schema.category}', roles: [${roles}], primaryRole: '${schema.primaryRole}' },`);
  }
  lines.push('];');
  lines.push('');

  // Command token map for quick lookup
  // Includes both Cmd_* tokens and Kw_* tokens for commands that share names with structural keywords
  lines.push('/** Maps command action name to its token */');
  lines.push('export const COMMAND_TOKEN_MAP: Record<string, TokenType> = {');
  for (const t of cmdTokens) {
    const action = t.name.replace('Cmd_', '');
    lines.push(`  '${action}': ${t.name},`);
  }
  // Also map structural keywords that are command names
  for (const schema of schemas) {
    const kwToken = kwTokens.find(t => t.name === `Kw_${schema.action}`);
    if (kwToken && !cmdTokens.find(t => t.name === `Cmd_${schema.action}`)) {
      lines.push(`  '${schema.action}': Kw_${schema.action},`);
    }
  }
  lines.push('};');
  lines.push('');

  return lines.join('\n');
}

// =============================================================================
// Main
// =============================================================================

const keywords = collectAllKeywords();
const categories = groupByCategory();
const tokens = buildTokenDefs(keywords);
const schemas = buildSchemaInfos();
const languages = getRegisteredLanguages();

const output = generateOutput(tokens, categories, schemas, keywords.size, languages.length);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'src', 'generated');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'chevrotain-vocabulary.ts');
fs.writeFileSync(outPath, output, 'utf-8');

console.log(`Generated ${outPath}`);
console.log(`  ${languages.length} language profiles`);
console.log(`  ${Object.keys(commandSchemas).length} command schemas`);
console.log(`  ${tokens.length} token definitions`);
console.log(`  ${categories.length} command categories`);
