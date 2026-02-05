/**
 * AOT Compiler CLI
 *
 * Command-line interface for compiling hyperscript to JavaScript.
 */

import { Command } from 'commander';
import { glob } from 'fast-glob';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AOTCompiler } from '../compiler/aot-compiler.js';
import type { ExtractedScript } from '../types/aot-types.js';

// =============================================================================
// CLI SETUP
// =============================================================================

const program = new Command();

program
  .name('lokascript-aot')
  .description('Ahead-of-Time compiler for LokaScript/hyperscript')
  .version('1.0.0');

// =============================================================================
// COMPILE COMMAND
// =============================================================================

program
  .command('compile')
  .description('Compile hyperscript files to JavaScript')
  .argument('<input>', 'Input file or glob pattern')
  .option('-o, --output <dir>', 'Output directory', './dist')
  .option('--format <format>', 'Output format (esm|cjs|iife)', 'esm')
  .option('--minify', 'Minify output')
  .option('--sourcemap', 'Generate source maps')
  .option('--language <lang>', 'Default language for semantic parsing', 'en')
  .option('--optimization <level>', 'Optimization level (0|1|2)', '2')
  .option('--watch', 'Watch for changes')
  .option('--debug', 'Enable debug output')
  .action(
    async (
      input: string,
      options: {
        output: string;
        format: 'esm' | 'cjs' | 'iife';
        minify?: boolean;
        sourcemap?: boolean;
        language: string;
        optimization: string;
        watch?: boolean;
        debug?: boolean;
      }
    ) => {
      const compiler = new AOTCompiler();

      const compileOptions = {
        language: options.language,
        debug: options.debug,
        optimizationLevel: parseInt(options.optimization, 10) as 0 | 1 | 2,
        codegen: {
          mode: options.format,
          minify: options.minify ?? false,
          sourceMaps: options.sourcemap ?? false,
        },
      };

      async function compileFiles(): Promise<void> {
        const files = await glob(input, { absolute: true });

        if (files.length === 0) {
          console.log('No files matched the pattern:', input);
          return;
        }

        console.log(`Compiling ${files.length} file(s)...`);

        let totalScripts = 0;
        let totalCompiled = 0;
        let totalFallbacks = 0;

        for (const file of files) {
          const source = await fs.readFile(file, 'utf-8');
          const scripts = compiler.extract(source, file);

          if (scripts.length === 0) {
            if (options.debug) {
              console.log(`  ${path.relative(process.cwd(), file)}: no hyperscript found`);
            }
            continue;
          }

          totalScripts += scripts.length;

          const result = compiler.compile(scripts, compileOptions);

          totalCompiled += result.stats.compiled;
          totalFallbacks += result.stats.fallbacks;

          // Determine output path
          const relativePath = path.relative(process.cwd(), file);
          const outPath = path.join(
            options.output,
            relativePath.replace(/\.(html|vue|svelte|jsx|tsx)$/, '.hs.js')
          );

          // Write output
          await fs.mkdir(path.dirname(outPath), { recursive: true });
          await fs.writeFile(outPath, result.code);

          console.log(
            `  ${relativePath} → ${path.relative(process.cwd(), outPath)} ` +
              `(${result.stats.compiled}/${scripts.length} compiled, ${result.code.length} bytes)`
          );

          // Report fallbacks
          if (result.fallbacks.length > 0 && options.debug) {
            for (const fallback of result.fallbacks) {
              console.log(
                `    ⚠ Fallback: "${fallback.script.slice(0, 40)}..." - ${fallback.reason}`
              );
            }
          }
        }

        console.log('');
        console.log(`Summary: ${totalCompiled}/${totalScripts} scripts compiled`);
        if (totalFallbacks > 0) {
          console.log(`         ${totalFallbacks} scripts need runtime fallback`);
        }
      }

      await compileFiles();

      // Watch mode
      if (options.watch) {
        console.log('\nWatching for changes...');
        const chokidar = await import('chokidar').catch(() => null);

        if (!chokidar) {
          console.error('Watch mode requires chokidar. Install with: npm install chokidar');
          process.exit(1);
        }

        const watcher = chokidar.watch(input, { ignoreInitial: true });

        watcher.on('change', async (filePath: string) => {
          console.log(`\nFile changed: ${filePath}`);
          compiler.reset();
          await compileFiles();
        });

        watcher.on('add', async (filePath: string) => {
          console.log(`\nFile added: ${filePath}`);
          compiler.reset();
          await compileFiles();
        });
      }
    }
  );

// =============================================================================
// ANALYZE COMMAND
// =============================================================================

program
  .command('analyze')
  .description('Analyze hyperscript usage without compiling')
  .argument('<input>', 'Input file or glob pattern')
  .option('--json', 'Output as JSON')
  .option('--verbose', 'Show detailed information')
  .action(async (input: string, options: { json?: boolean; verbose?: boolean }) => {
    const compiler = new AOTCompiler();
    const files = await glob(input, { absolute: true });

    if (files.length === 0) {
      console.log('No files matched the pattern:', input);
      return;
    }

    const analysis = {
      files: files.length,
      scripts: 0,
      commands: new Set<string>(),
      events: new Set<string>(),
      selectors: new Set<string>(),
      variables: {
        locals: new Set<string>(),
        globals: new Set<string>(),
      },
      errors: [] as Array<{ file: string; error: string }>,
      fileDetails: [] as Array<{ file: string; scripts: number; commands: string[] }>,
    };

    for (const file of files) {
      try {
        const source = await fs.readFile(file, 'utf-8');
        const scripts = compiler.extract(source, file);

        analysis.scripts += scripts.length;

        const fileCommands = new Set<string>();

        for (const script of scripts) {
          const ast = compiler.parse(script.code);
          if (!ast) {
            analysis.errors.push({
              file,
              error: `Failed to parse: ${script.code.slice(0, 50)}...`,
            });
            continue;
          }

          const result = compiler.analyze(ast);

          result.commandsUsed.forEach(c => {
            analysis.commands.add(c);
            fileCommands.add(c);
          });
          result.dependencies.eventTypes.forEach(e => analysis.events.add(e));
          result.dependencies.domQueries.forEach(s => analysis.selectors.add(s));
          result.variables.locals.forEach((_, name) => analysis.variables.locals.add(name));
          result.variables.globals.forEach((_, name) => analysis.variables.globals.add(name));
        }

        if (options.verbose) {
          analysis.fileDetails.push({
            file: path.relative(process.cwd(), file),
            scripts: scripts.length,
            commands: Array.from(fileCommands),
          });
        }
      } catch (error) {
        analysis.errors.push({
          file: path.relative(process.cwd(), file),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            ...analysis,
            commands: Array.from(analysis.commands),
            events: Array.from(analysis.events),
            selectors: Array.from(analysis.selectors),
            variables: {
              locals: Array.from(analysis.variables.locals),
              globals: Array.from(analysis.variables.globals),
            },
          },
          null,
          2
        )
      );
    } else {
      console.log('\nAnalysis Results:');
      console.log(`  Files scanned: ${analysis.files}`);
      console.log(`  Scripts found: ${analysis.scripts}`);
      console.log(`  Commands used: ${Array.from(analysis.commands).sort().join(', ')}`);
      console.log(`  Events: ${Array.from(analysis.events).sort().join(', ')}`);

      if (analysis.selectors.size > 0) {
        console.log(`  Selectors: ${analysis.selectors.size} unique`);
        if (options.verbose) {
          Array.from(analysis.selectors)
            .slice(0, 10)
            .forEach(s => {
              console.log(`    - ${s}`);
            });
          if (analysis.selectors.size > 10) {
            console.log(`    ... and ${analysis.selectors.size - 10} more`);
          }
        }
      }

      if (analysis.variables.locals.size > 0) {
        console.log(`  Local variables: ${Array.from(analysis.variables.locals).join(', ')}`);
      }
      if (analysis.variables.globals.size > 0) {
        console.log(`  Global variables: ${Array.from(analysis.variables.globals).join(', ')}`);
      }

      if (options.verbose && analysis.fileDetails.length > 0) {
        console.log('\nPer-file details:');
        for (const detail of analysis.fileDetails) {
          console.log(`  ${detail.file}: ${detail.scripts} scripts`);
          if (detail.commands.length > 0) {
            console.log(`    Commands: ${detail.commands.join(', ')}`);
          }
        }
      }

      if (analysis.errors.length > 0) {
        console.log(`\nErrors: ${analysis.errors.length}`);
        for (const error of analysis.errors) {
          console.log(`  ${error.file}: ${error.error}`);
        }
      }
    }
  });

// =============================================================================
// EXTRACT COMMAND
// =============================================================================

program
  .command('extract')
  .description('Extract hyperscript from files without compiling')
  .argument('<input>', 'Input file or glob pattern')
  .option('--json', 'Output as JSON')
  .action(async (input: string, options: { json?: boolean }) => {
    const compiler = new AOTCompiler();
    const files = await glob(input, { absolute: true });

    if (files.length === 0) {
      console.log('No files matched the pattern:', input);
      return;
    }

    const allScripts: Array<ExtractedScript & { file: string }> = [];

    for (const file of files) {
      const source = await fs.readFile(file, 'utf-8');
      const scripts = compiler.extract(source, file);

      for (const script of scripts) {
        allScripts.push({
          ...script,
          file: path.relative(process.cwd(), file),
        });
      }
    }

    if (options.json) {
      console.log(JSON.stringify(allScripts, null, 2));
    } else {
      console.log(`Found ${allScripts.length} hyperscript snippets:\n`);

      for (const script of allScripts) {
        console.log(`[${script.file}:${script.location.line}]`);
        console.log(`  ${script.code.slice(0, 80)}${script.code.length > 80 ? '...' : ''}`);
        if (script.elementId) {
          console.log(`  Element: #${script.elementId}`);
        } else if (script.elementSelector) {
          console.log(`  Selector: ${script.elementSelector}`);
        }
        console.log('');
      }
    }
  });

// =============================================================================
// BUNDLE COMMAND
// =============================================================================

program
  .command('bundle')
  .description('Generate a minimal runtime bundle based on usage')
  .argument('<input>', 'Input file or glob pattern')
  .option('-o, --output <file>', 'Output file', './dist/lokascript-aot-runtime.js')
  .option('--format <format>', 'Output format (esm|cjs|iife)', 'esm')
  .action(async (input: string, options: { output: string; format: 'esm' | 'cjs' | 'iife' }) => {
    const compiler = new AOTCompiler();
    const files = await glob(input, { absolute: true });

    if (files.length === 0) {
      console.log('No files matched the pattern:', input);
      return;
    }

    // Collect all required helpers
    const requiredHelpers = new Set<string>();
    requiredHelpers.add('createContext'); // Always needed
    requiredHelpers.add('ready'); // For binding

    for (const file of files) {
      const source = await fs.readFile(file, 'utf-8');
      const scripts = compiler.extract(source, file);

      for (const script of scripts) {
        const ast = compiler.parse(script.code);
        if (!ast) continue;

        const analysis = compiler.analyze(ast);
        analysis.dependencies.runtimeHelpers.forEach(h => requiredHelpers.add(h));
      }
    }

    console.log(`Required runtime helpers: ${Array.from(requiredHelpers).join(', ')}`);
    console.log(`\nGenerating minimal bundle with ${requiredHelpers.size} helpers...`);

    // Generate bundle (would normally tree-shake the runtime)
    // For now, output the import statement users would need
    const helpers = Array.from(requiredHelpers).sort();

    let bundle: string;

    if (options.format === 'esm') {
      bundle = `// Minimal AOT runtime for your project
// Generated by lokascript-aot

export { ${helpers.join(', ')} } from '@lokascript/aot-compiler/runtime';
`;
    } else if (options.format === 'cjs') {
      bundle = `// Minimal AOT runtime for your project
// Generated by lokascript-aot

const runtime = require('@lokascript/aot-compiler/runtime');
module.exports = {
  ${helpers.map(h => `${h}: runtime.${h}`).join(',\n  ')}
};
`;
    } else {
      bundle = `// Minimal AOT runtime for your project
// Generated by lokascript-aot

(function(global) {
  // Runtime helpers would be inlined here
  global.lokascriptRuntime = { /* ${helpers.join(', ')} */ };
})(typeof window !== 'undefined' ? window : global);
`;
    }

    await fs.mkdir(path.dirname(options.output), { recursive: true });
    await fs.writeFile(options.output, bundle);

    console.log(`Bundle written to: ${options.output}`);
    console.log(`Bundle size: ${bundle.length} bytes`);
  });

// =============================================================================
// RUN CLI
// =============================================================================

program.parse();
