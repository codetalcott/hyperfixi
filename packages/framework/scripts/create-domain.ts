#!/usr/bin/env npx tsx
/**
 * create-domain — Scaffold a new LokaScript domain package
 *
 * Usage:
 *   npx tsx scripts/create-domain.ts \
 *     --name=sprites \
 *     --description="Manage Fly.io Sprites" \
 *     --commands=create,destroy,list,run \
 *     [--languages=en,es,ja,ar] \
 *     [--output=../../packages/domain-sprites] \
 *     [--external] \
 *     [--mcp]
 *
 * Generates:
 *   package.json, tsconfig.json, vitest.config.ts, tsup.config.ts
 *   src/index.ts, src/schemas/index.ts, src/profiles/index.ts,
 *   src/tokenizers/index.ts, src/generators/{name}-generator.ts,
 *   src/__test__/{name}-domain.test.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// =============================================================================
// Argument Parsing
// =============================================================================

interface Args {
  name: string;
  description: string;
  commands: string[];
  languages: string[];
  output: string;
  external: boolean;
  mcp: boolean;
}

function parseArgs(): Args {
  const args: Record<string, string> = {};
  const flags: Set<string> = new Set();

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--') && arg.includes('=')) {
      const [key, ...rest] = arg.slice(2).split('=');
      args[key] = rest.join('=');
    } else if (arg.startsWith('--')) {
      flags.add(arg.slice(2));
    }
  }

  if (!args.name) {
    console.error('Error: --name is required');
    console.error('Usage: npx tsx scripts/create-domain.ts --name=myDomain --commands=cmd1,cmd2');
    process.exit(1);
  }

  if (!args.commands) {
    console.error('Error: --commands is required (comma-separated list)');
    process.exit(1);
  }

  const name = args.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const defaultOutput = path.resolve(process.cwd(), `../../packages/domain-${name}`);

  return {
    name,
    description: args.description ?? `${capitalize(name)} domain DSL`,
    commands: args.commands.split(',').map((c) => c.trim().toLowerCase()),
    languages: (args.languages ?? 'en').split(',').map((l) => l.trim().toLowerCase()),
    output: args.output ? path.resolve(process.cwd(), args.output) : defaultOutput,
    external: flags.has('external'),
    mcp: flags.has('mcp'),
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function camelCase(s: string): string {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function pascalCase(s: string): string {
  return capitalize(camelCase(s));
}

// =============================================================================
// Language Metadata
// =============================================================================

const LANGUAGE_META: Record<string, { name: string; native: string; wordOrder: string }> = {
  en: { name: 'English', native: 'English', wordOrder: 'SVO' },
  es: { name: 'Spanish', native: 'Español', wordOrder: 'SVO' },
  fr: { name: 'French', native: 'Français', wordOrder: 'SVO' },
  de: { name: 'German', native: 'Deutsch', wordOrder: 'SVO' },
  pt: { name: 'Portuguese', native: 'Português', wordOrder: 'SVO' },
  zh: { name: 'Chinese', native: '中文', wordOrder: 'SVO' },
  ja: { name: 'Japanese', native: '日本語', wordOrder: 'SOV' },
  ko: { name: 'Korean', native: '한국어', wordOrder: 'SOV' },
  tr: { name: 'Turkish', native: 'Türkçe', wordOrder: 'SOV' },
  ar: { name: 'Arabic', native: 'العربية', wordOrder: 'VSO' },
};

// =============================================================================
// Templates
// =============================================================================

function genPackageJson(args: Args): string {
  const frameworkDep = args.external
    ? '"@lokascript/framework": "file:../hyperfixi/packages/framework"'
    : '"@lokascript/framework": "1.0.0"';

  return `{
  "name": "@lokascript/domain-${args.name}",
  "version": "1.0.0",
  "description": "${args.description}",
  "type": "module",
  "main": "dist/index.cjs",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "scripts": {
    "build": "tsup && npm run build:types",
    "build:types": "tsc --emitDeclarationOnly --outDir dist --noEmit false",
    "test": "vitest",
    "test:run": "vitest run",
    "test:check": "vitest run --reporter=dot 2>&1 | tail -5",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    ${frameworkDep}
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0",
    "vitest": "^4.0.0"
  },
  "license": "MIT"
}
`;
}

function genTsconfig(): string {
  return `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "dist",
    "declaration": true,
    "declarationDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/__test__/**"]
}
`;
}

function genVitestConfig(): string {
  return `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
`;
}

function genTsupConfig(): string {
  return `import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['@lokascript/framework'],
});
`;
}

function genSchemas(args: Args): string {
  const imports = `import { defineCommand, defineRole } from '@lokascript/framework';
import type { CommandSchema } from '@lokascript/framework';`;

  const schemas = args.commands
    .map((cmd) => {
      return `
export const ${camelCase(cmd)}Schema = defineCommand({
  action: '${cmd}',
  description: '${capitalize(cmd)} command',
  category: 'general',
  primaryRole: 'target',
  roles: [
    defineRole({
      role: 'target',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      // TODO: Add markerOverride for non-English languages
      // markerOverride: { ja: 'を', ar: 'على', es: 'en' },
    }),
  ],
});`;
    })
    .join('\n');

  const allSchemas = args.commands.map((c) => `${camelCase(c)}Schema`).join(', ');

  return `${imports}
${schemas}

export const allSchemas: CommandSchema[] = [${allSchemas}];
`;
}

function genProfiles(args: Args): string {
  const profiles = args.languages
    .map((lang) => {
      const meta = LANGUAGE_META[lang] ?? { name: lang, native: lang, wordOrder: 'SVO' };
      const keywords = args.commands
        .map((cmd) => {
          const translation = lang === 'en' ? cmd : `${cmd}`; // TODO placeholder
          return `    ${cmd}: { primary: '${translation}', aliases: [] },`;
        })
        .join('\n');

      return `
export const ${lang}Profile: PatternGenLanguageProfile = {
  code: '${lang}',
  name: '${meta.name}',
  nativeName: '${meta.native}',
  wordOrder: '${meta.wordOrder}',
  keywords: {
${keywords}
  },
  roleMarkers: {
    // TODO: Fill in role markers for ${meta.name}
    // destination: '${lang === 'en' ? 'to' : 'TODO'}',
    // source: '${lang === 'en' ? 'from' : 'TODO'}',
  },
};`;
    })
    .join('\n');

  const allProfiles = args.languages.map((l) => `${l}Profile`).join(', ');

  return `import type { PatternGenLanguageProfile } from '@lokascript/framework';
${profiles}

export const allProfiles = [${allProfiles}];
`;
}

function genTokenizers(args: Args): string {
  const tokenizers = args.languages
    .map((lang) => {
      const meta = LANGUAGE_META[lang] ?? { name: lang, native: lang, wordOrder: 'SVO' };
      const keywords = args.commands.map((c) => `'${c}'`).join(', ');
      const varName = `${pascalCase(meta.name)}${pascalCase(args.name)}Tokenizer`;

      return `
export const ${varName} = createSimpleTokenizer({
  language: '${lang}',
  direction: '${lang === 'ar' || lang === 'he' ? 'rtl' : 'ltr'}',
  keywords: [${keywords}],
  // TODO: Add translated keywords for ${meta.name}
});`;
    })
    .join('\n');

  return `import { createSimpleTokenizer } from '@lokascript/framework';
${tokenizers}
`;
}

function genCodeGenerator(args: Args): string {
  const cases = args.commands
    .map((cmd) => {
      return `    case '${cmd}':
      return generate${pascalCase(cmd)}(node);`;
    })
    .join('\n');

  const generators = args.commands
    .map((cmd) => {
      return `
function generate${pascalCase(cmd)}(node: SemanticNode): string {
  const target = extractRoleValue(node, 'target');
  // TODO: Implement ${cmd} code generation
  return \`/* ${cmd} \${target} */\`;
}`;
    })
    .join('\n');

  return `import type { CodeGenerator, SemanticNode } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

export const ${camelCase(args.name)}CodeGenerator: CodeGenerator = {
  generate(node: SemanticNode): string {
    switch (node.action) {
${cases}
      default:
        return \`/* unknown command: \${node.action} */\`;
    }
  },
};
${generators}
`;
}

function genIndex(args: Args): string {
  const langConfigs = args.languages
    .map((lang) => {
      const meta = LANGUAGE_META[lang] ?? { name: lang, native: lang, wordOrder: 'SVO' };
      const tokenizerName = `${pascalCase(meta.name)}${pascalCase(args.name)}Tokenizer`;
      return `    {
      code: '${lang}',
      name: '${meta.name}',
      nativeName: '${meta.native}',
      tokenizer: ${tokenizerName},
      patternProfile: ${lang}Profile,
    },`;
    })
    .join('\n');

  const tokenizerImports = args.languages
    .map((lang) => {
      const meta = LANGUAGE_META[lang] ?? { name: lang, native: lang, wordOrder: 'SVO' };
      return `${pascalCase(meta.name)}${pascalCase(args.name)}Tokenizer`;
    })
    .join(', ');

  const profileImports = args.languages.map((l) => `${l}Profile`).join(', ');

  return `import { createMultilingualDSL } from '@lokascript/framework';
import type { MultilingualDSL } from '@lokascript/framework';
import { allSchemas } from './schemas/index';
import { ${profileImports} } from './profiles/index';
import { ${tokenizerImports} } from './tokenizers/index';
import { ${camelCase(args.name)}CodeGenerator } from './generators/${args.name}-generator';

export function create${pascalCase(args.name)}DSL(): MultilingualDSL {
  return createMultilingualDSL({
    name: '${pascalCase(args.name)}',
    schemas: allSchemas,
    languages: [
${langConfigs}
    ],
    codeGenerator: ${camelCase(args.name)}CodeGenerator,
  });
}

// Re-exports
export { allSchemas } from './schemas/index';
export { ${camelCase(args.name)}CodeGenerator } from './generators/${args.name}-generator';
`;
}

function genTests(args: Args): string {
  const langTests = args.languages
    .map((lang) => {
      const meta = LANGUAGE_META[lang] ?? { name: lang, native: lang, wordOrder: 'SVO' };
      return `
  describe('${meta.name} (${lang})', () => {
    it('parses ${args.commands[0]} command', () => {
      const result = dsl.parse('${args.commands[0]} test-target', '${lang}');
      expect(result.action).toBe('${args.commands[0]}');
    });

    it('compiles ${args.commands[0]} command', () => {
      const result = dsl.compile('${args.commands[0]} test-target', '${lang}');
      expect(result.ok).toBe(true);
      expect(result.code).toBeDefined();
    });
  });`;
    })
    .join('\n');

  const equivTest =
    args.languages.length > 1
      ? `
  describe('semantic equivalence', () => {
    it('all languages produce equivalent output for ${args.commands[0]}', () => {
      const outputs = [${args.languages.map((l) => `'${l}'`).join(', ')}].map((lang) => {
        const result = dsl.compile('${args.commands[0]} test-target', lang);
        return result.code;
      });
      // All languages should compile to the same output
      const unique = new Set(outputs);
      expect(unique.size).toBe(1);
    });
  });`
      : '';

  return `import { describe, it, expect, beforeAll } from 'vitest';
import { create${pascalCase(args.name)}DSL } from '../index';
import type { MultilingualDSL } from '@lokascript/framework';

describe('domain-${args.name}', () => {
  let dsl: MultilingualDSL;

  beforeAll(() => {
    dsl = create${pascalCase(args.name)}DSL();
  });

  describe('language support', () => {
    it('supports ${args.languages.length} language(s)', () => {
      expect(dsl.getSupportedLanguages()).toEqual(
        expect.arrayContaining([${args.languages.map((l) => `'${l}'`).join(', ')}])
      );
    });
  });
${langTests}
${equivTest}

  describe('error handling', () => {
    it('returns errors for invalid input', () => {
      const result = dsl.validate('completely invalid gibberish xyz', 'en');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});
`;
}

function genMcpTools(args: Args): string {
  const toolPrefix = args.name.replace(/-/g, '_');
  const dslFactory = `create${pascalCase(args.name)}DSL`;

  return `/**
 * MCP tools for domain-${args.name}
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// Lazy-loaded DSL instance
let dslInstance: ReturnType<typeof import('@lokascript/domain-${args.name}').${dslFactory}> | null = null;

async function getDSL() {
  if (!dslInstance) {
    const { ${dslFactory} } = await import('@lokascript/domain-${args.name}');
    dslInstance = ${dslFactory}();
  }
  return dslInstance;
}

function serializeRoles(roles: ReadonlyMap<string, unknown>): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of roles) obj[k] = v;
  return obj;
}

export const ${camelCase(args.name)}DomainTools: Tool[] = [
  {
    name: 'parse_${toolPrefix}',
    description: 'Parse a ${args.name} command into a semantic representation',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'The ${args.name} command to parse' },
        language: { type: 'string', description: 'Language code (default: en)', default: 'en' },
      },
      required: ['query'],
    },
  },
  {
    name: 'compile_${toolPrefix}',
    description: 'Compile a ${args.name} command to target code',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'The ${args.name} command to compile' },
        language: { type: 'string', description: 'Language code (default: en)', default: 'en' },
      },
      required: ['query'],
    },
  },
  {
    name: 'validate_${toolPrefix}',
    description: 'Validate ${args.name} command syntax',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'The ${args.name} command to validate' },
        language: { type: 'string', description: 'Language code (default: en)', default: 'en' },
      },
      required: ['query'],
    },
  },
  {
    name: 'translate_${toolPrefix}',
    description: 'Translate a ${args.name} command between languages',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'The ${args.name} command to translate' },
        from: { type: 'string', description: 'Source language code' },
        to: { type: 'string', description: 'Target language code' },
      },
      required: ['query', 'from', 'to'],
    },
  },
];

export async function handle${pascalCase(args.name)}DomainTool(
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const dsl = await getDSL();
  const query = String(args.query ?? '');
  const language = String(args.language ?? 'en');

  switch (name) {
    case 'parse_${toolPrefix}': {
      const node = dsl.parse(query, language);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ action: node.action, roles: serializeRoles(node.roles) }, null, 2),
        }],
      };
    }
    case 'compile_${toolPrefix}': {
      const result = dsl.compile(query, language);
      return {
        content: [{
          type: 'text',
          text: result.ok
            ? JSON.stringify({ code: result.code, confidence: result.metadata?.confidence }, null, 2)
            : JSON.stringify({ errors: result.errors }, null, 2),
        }],
      };
    }
    case 'validate_${toolPrefix}': {
      const result = dsl.validate(query, language);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ valid: result.valid, errors: result.errors }, null, 2),
        }],
      };
    }
    case 'translate_${toolPrefix}': {
      const from = String(args.from ?? 'en');
      const to = String(args.to ?? 'en');
      const translated = dsl.translate(query, from, to);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ translated }, null, 2),
        }],
      };
    }
    default:
      return { content: [{ type: 'text', text: \`Unknown tool: \${name}\` }] };
  }
}
`;
}

// =============================================================================
// File Writer
// =============================================================================

function writeFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  created ${path.relative(process.cwd(), filePath)}`);
}

// =============================================================================
// Main
// =============================================================================

function main(): void {
  const args = parseArgs();

  console.log(`\nScaffolding domain-${args.name}...`);
  console.log(`  Commands: ${args.commands.join(', ')}`);
  console.log(`  Languages: ${args.languages.join(', ')}`);
  console.log(`  Output: ${args.output}`);
  console.log();

  // Check if output directory already exists
  if (fs.existsSync(args.output)) {
    console.error(`Error: Output directory already exists: ${args.output}`);
    console.error('Remove it first or choose a different --output path.');
    process.exit(1);
  }

  // Write package config files
  writeFile(path.join(args.output, 'package.json'), genPackageJson(args));
  writeFile(path.join(args.output, 'tsconfig.json'), genTsconfig());
  writeFile(path.join(args.output, 'vitest.config.ts'), genVitestConfig());
  writeFile(path.join(args.output, 'tsup.config.ts'), genTsupConfig());

  // Write source files
  writeFile(path.join(args.output, 'src', 'index.ts'), genIndex(args));
  writeFile(path.join(args.output, 'src', 'schemas', 'index.ts'), genSchemas(args));
  writeFile(path.join(args.output, 'src', 'profiles', 'index.ts'), genProfiles(args));
  writeFile(path.join(args.output, 'src', 'tokenizers', 'index.ts'), genTokenizers(args));
  writeFile(
    path.join(args.output, 'src', 'generators', `${args.name}-generator.ts`),
    genCodeGenerator(args),
  );

  // Write tests
  writeFile(
    path.join(args.output, 'src', '__test__', `${args.name}-domain.test.ts`),
    genTests(args),
  );

  // Write MCP tools if requested
  if (args.mcp) {
    const mcpDir = path.resolve(args.output, '../../packages/mcp-server/src/tools');
    if (fs.existsSync(mcpDir)) {
      writeFile(path.join(mcpDir, `${args.name}-domain.ts`), genMcpTools(args));
      console.log(`\n  MCP tools written. Register in mcp-server/src/index.ts:`);
      console.log(`    import { ${camelCase(args.name)}DomainTools, handle${pascalCase(args.name)}DomainTool } from './tools/${args.name}-domain';`);
    } else {
      // External project — write MCP tools alongside
      writeFile(path.join(args.output, 'src', 'mcp-tools.ts'), genMcpTools(args));
    }
  }

  console.log(`
Done! Next steps:

  1. cd ${path.relative(process.cwd(), args.output)}
  2. npm install
  3. Fill in TODO stubs:
     - src/schemas/index.ts    — Define roles and markerOverrides for each command
     - src/profiles/index.ts   — Add translated keywords for each language
     - src/tokenizers/index.ts — Add translated keywords to tokenizer configs
     - src/generators/${args.name}-generator.ts — Implement code generation
  4. npm test                  — Run tests (some will fail until stubs are filled)
  5. npm run typecheck         — Verify TypeScript types

See the Domain Author Guide for detailed instructions:
  https://github.com/lokascript/lokascript/blob/main/packages/framework/docs/DOMAIN_AUTHOR_GUIDE.md
`);
}

main();
