#!/usr/bin/env node

/**
 * HyperFixi CLI Tool
 * Command-line interface for HyperFixi development
 */

import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';
import inquirer from 'inquirer';
import * as fs from 'fs-extra';
import * as path from 'path';
import { createProject, createComponent, createTemplate } from './generator';
import { analyzeProject, analyzeFile } from './analyzer';
import { startDevServer } from './dev-server';
import { buildProject } from './builder';
import type { ScaffoldOptions, ProjectConfig } from './types';

const program = new Command();

/**
 * CLI version and info
 */
program.name('hyperfixi').alias('hfx').description('HyperFixi Developer Tools').version('0.1.0');

/**
 * Create new project command
 */
program
  .command('create <name>')
  .description('Create a new HyperFixi project')
  .option('-t, --template <template>', 'Project template', 'basic')
  .option('-d, --description <description>', 'Project description')
  .option('-a, --author <author>', 'Project author')
  .option('-l, --license <license>', 'Project license', 'MIT')
  .option('--typescript', 'Use TypeScript', false)
  .option('--testing', 'Include testing setup', false)
  .option('--linting', 'Include linting setup', false)
  .option('--git', 'Initialize git repository', true)
  .option('--no-install', 'Skip package installation')
  .action(async (name: string, options: any) => {
    const spinner = ora('Creating project...').start();

    try {
      const scaffoldOptions: ScaffoldOptions = {
        template: options.template,
        name,
        description: options.description,
        author: options.author,
        license: options.license,
        features: [],
        typescript: options.typescript,
        testing: options.testing,
        linting: options.linting,
        git: options.git,
        install: !options.noInstall,
      };

      // Interactive prompts for additional configuration
      if (!options.template || options.template === 'basic') {
        const answers = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'features',
            message: 'Select features to include:',
            choices: [
              { name: 'Multi-tenant support', value: 'multi-tenant' },
              { name: 'Analytics', value: 'analytics' },
              { name: 'Progressive enhancement', value: 'progressive-enhancement' },
              { name: 'Internationalization', value: 'i18n' },
              { name: 'SSR support', value: 'ssr' },
            ],
          },
        ]);

        scaffoldOptions.features = answers.features;
      }

      spinner.text = 'Generating project files...';
      await createProject(scaffoldOptions);

      spinner.succeed('Project created successfully!');

      // Display success message
      console.log(
        boxen(
          chalk.green(`🎉 Successfully created ${name}!`) +
            '\n\n' +
            chalk.white('Next steps:') +
            '\n' +
            chalk.gray(`  cd ${name}`) +
            '\n' +
            chalk.gray('  npm run dev') +
            '\n\n' +
            chalk.white('Documentation:') +
            '\n' +
            chalk.gray('  https://hyperfixi.dev/docs'),
          {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'green',
          }
        )
      );
    } catch (error) {
      spinner.fail('Failed to create project');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

/**
 * Generate component command
 */
program
  .command('generate:component <name>')
  .alias('g:c')
  .description('Generate a new component')
  .option('-d, --description <description>', 'Component description')
  .option('-c, --category <category>', 'Component category', 'custom')
  .option('--typescript', 'Generate TypeScript version', false)
  .action(async (name: string, options: any) => {
    const spinner = ora('Generating component...').start();

    try {
      await createComponent({
        name,
        description: options.description,
        category: options.category,
        typescript: options.typescript,
      });

      spinner.succeed(`Component ${name} generated successfully!`);
    } catch (error) {
      spinner.fail('Failed to generate component');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

/**
 * Analyze project command
 */
program
  .command('analyze [path]')
  .description('Analyze HyperScript code in project')
  .option('-r, --recursive', 'Analyze recursively', false)
  .option('-f, --format <format>', 'Output format', 'table')
  .option('-o, --output <file>', 'Output file')
  .action(async (targetPath: string = '.', options: any) => {
    const spinner = ora('Analyzing project...').start();

    try {
      const results = await analyzeProject(targetPath, {
        recursive: options.recursive,
        format: options.format,
      });

      spinner.succeed('Analysis complete!');

      if (options.output) {
        await fs.writeFile(options.output, JSON.stringify(results, null, 2));
        console.log(chalk.green(`Analysis saved to ${options.output}`));
      } else {
        // Display results in console
        console.log('\n' + chalk.bold('Analysis Results:'));
        console.log(chalk.gray('─'.repeat(50)));

        for (const result of results) {
          console.log(chalk.blue(`📁 ${result.file}`));
          console.log(`   Scripts: ${result.scripts.length}`);
          console.log(`   Elements: ${result.elements.length}`);
          console.log(`   Complexity: ${result.complexity}`);

          if (result.issues.length > 0) {
            console.log(`   Issues: ${chalk.red(result.issues.length)}`);
            result.issues.forEach(issue => {
              const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
              console.log(`     ${icon} ${issue.message} (${issue.line}:${issue.column})`);
            });
          }
          console.log();
        }
      }
    } catch (error) {
      spinner.fail('Analysis failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

/**
 * Development server command
 */
program
  .command('dev')
  .description('Start development server')
  .option('-p, --port <port>', 'Server port', '3000')
  .option('-h, --host <host>', 'Server host', 'localhost')
  .option('--no-open', "Don't open browser")
  .option('--no-livereload', 'Disable live reload')
  .action(async (options: any) => {
    const spinner = ora('Starting development server...').start();

    try {
      const config = {
        port: parseInt(options.port),
        host: options.host,
        open: options.open !== false,
        livereload: options.livereload !== false,
      };

      await startDevServer(config);
      spinner.succeed(`Development server started at http://${config.host}:${config.port}`);
    } catch (error) {
      spinner.fail('Failed to start development server');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

/**
 * Build command
 */
program
  .command('build')
  .description('Build project for production')
  .option('-o, --output <path>', 'Output directory', 'dist')
  .option('--minify', 'Minify output', false)
  .option('--sourcemap', 'Generate source maps', false)
  .option('--analyze', 'Analyze bundle', false)
  .action(async (options: any) => {
    const spinner = ora('Building project...').start();

    try {
      const result = await buildProject({
        output: options.output,
        minify: options.minify,
        sourcemap: options.sourcemap,
        analyze: options.analyze,
      });

      spinner.succeed('Build completed successfully!');

      console.log('\n' + chalk.bold('Build Results:'));
      console.log(chalk.gray('─'.repeat(30)));

      result.files.forEach(file => {
        const size = (file.size / 1024).toFixed(2);
        console.log(`📦 ${chalk.blue(file.path)} ${chalk.gray(`(${size} KB)`)}`);
      });

      if (result.warnings.length > 0) {
        console.log('\n' + chalk.yellow('Warnings:'));
        result.warnings.forEach(warning => {
          console.log(`⚠️  ${warning}`);
        });
      }

      console.log(`\n✨ Built in ${result.metadata.timestamp - Date.now()}ms`);
    } catch (error) {
      spinner.fail('Build failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

/**
 * Test command
 */
program
  .command('test')
  .description('Run tests')
  .option('-w, --watch', 'Watch mode', false)
  .option('-c, --coverage', 'Generate coverage report', false)
  .option('--browser <browser>', 'Browser for testing', 'chromium')
  .option('--pattern <pattern>', 'Test file pattern', '**/*.test.{js,ts,html}')
  .action(async (options: any) => {
    const spinner = ora('Running tests...').start();

    try {
      // Try to use vitest if available
      const { spawn } = await import('child_process');

      const args = ['vitest', 'run'];
      if (options.watch) args[1] = 'watch';
      if (options.coverage) args.push('--coverage');

      spinner.text = 'Running vitest...';

      const proc = spawn('npx', args, {
        stdio: 'inherit',
        shell: true,
      });

      await new Promise<void>((resolve, reject) => {
        proc.on('close', code => {
          if (code === 0) {
            spinner.succeed('All tests passed!');
            resolve();
          } else {
            spinner.fail(`Tests failed with code ${code}`);
            reject(new Error(`Tests failed with code ${code}`));
          }
        });
        proc.on('error', reject);
      });
    } catch (error) {
      spinner.fail('Tests failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

/**
 * Visual builder command
 */
program
  .command('builder')
  .description('Start visual builder')
  .option('-p, --port <port>', 'Builder port', '8000')
  .option('--no-open', "Don't open browser")
  .action(async (options: any) => {
    const spinner = ora('Starting visual builder...').start();

    try {
      const { VisualBuilderServer } = await import('./builder');

      const port = parseInt(options.port, 10);
      const builder = new VisualBuilderServer({
        port,
        livereload: true,
        open: options.open !== false,
      });

      await builder.start();
      spinner.succeed(`Visual builder started at http://localhost:${port}`);

      // Keep process running
      console.log(chalk.gray('\nPress Ctrl+C to stop'));
    } catch (error) {
      spinner.fail('Failed to start visual builder');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

/**
 * Migrate command
 */
program
  .command('migrate <from> <to>')
  .description('Migrate from one version to another')
  .option('--dry-run', 'Show what would be changed', false)
  .option('--backup', 'Create backup before migration', true)
  .option('--verbose', 'Show detailed output', false)
  .action(async (from: string, to: string, options: any) => {
    const spinner = ora(`Migrating from ${from} to ${to}...`).start();

    try {
      const { HyperFixiMigrator } = await import('./migrator');

      const migrator = new HyperFixiMigrator({
        dryRun: options.dryRun,
        backup: options.backup,
        verbose: options.verbose,
      });

      if (options.dryRun) {
        spinner.text = 'Running dry-run migration...';
      }

      const result = await migrator.migrate(from, to);

      if (result.success) {
        spinner.succeed(
          `Migration completed! ${result.filesChanged}/${result.filesProcessed} files changed (${result.totalChanges} changes)`
        );

        if (result.backupPath) {
          console.log(chalk.gray(`  Backup created at: ${result.backupPath}`));
        }

        if (result.warnings.length > 0) {
          console.log(chalk.yellow('\nWarnings:'));
          result.warnings.forEach(w => console.log(chalk.yellow(`  - ${w}`)));
        }

        if (options.verbose && result.results.length > 0) {
          console.log(chalk.gray('\nChanged files:'));
          for (const fileResult of result.results) {
            if (fileResult.changes.length > 0) {
              console.log(chalk.blue(`  ${fileResult.file}`));
              for (const change of fileResult.changes) {
                console.log(chalk.gray(`    Line ${change.line}: ${change.rule}`));
              }
            }
          }
        }
      } else {
        spinner.fail('Migration failed');
        result.errors.forEach(e => console.error(chalk.red(`  - ${e}`)));
        process.exit(1);
      }
    } catch (error) {
      spinner.fail('Migration failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

/**
 * Template management commands
 */
const templateCmd = program.command('template').description('Manage project templates');

templateCmd
  .command('list')
  .description('List available templates')
  .action(async () => {
    console.log(chalk.bold('Available templates:'));
    console.log(chalk.gray('─'.repeat(30)));

    const templates = [
      { name: 'basic', description: 'Basic HyperFixi project' },
      { name: 'multi-tenant', description: 'Multi-tenant application' },
      { name: 'analytics', description: 'Project with analytics' },
      { name: 'e-commerce', description: 'E-commerce application' },
      { name: 'blog', description: 'Blog/CMS application' },
    ];

    templates.forEach(template => {
      console.log(`📋 ${chalk.blue(template.name)} - ${template.description}`);
    });
  });

templateCmd
  .command('create <name>')
  .description('Create a new template')
  .option('-d, --description <description>', 'Template description')
  .action(async (name: string, options: any) => {
    const spinner = ora('Creating template...').start();

    try {
      await createTemplate({
        name,
        description: options.description,
      });

      spinner.succeed(`Template ${name} created successfully!`);
    } catch (error) {
      spinner.fail('Failed to create template');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

/**
 * Doctor command - check project health
 */
program
  .command('doctor')
  .description('Check project health and configuration')
  .action(async () => {
    const spinner = ora('Running diagnostics...').start();

    try {
      const issues: string[] = [];
      const warnings: string[] = [];

      // Check for package.json
      if (!(await fs.pathExists('package.json'))) {
        issues.push('package.json not found');
      }

      // Check for HyperFixi config
      const configExists =
        (await fs.pathExists('hyperfixi.config.js')) ||
        (await fs.pathExists('hyperfixi.config.ts'));
      if (!configExists) {
        warnings.push('No HyperFixi configuration found');
      }

      // Check Node.js version
      const nodeVersion = process.version;
      if (
        !nodeVersion.startsWith('v16') &&
        !nodeVersion.startsWith('v18') &&
        !nodeVersion.startsWith('v20')
      ) {
        warnings.push(`Node.js ${nodeVersion} may not be supported`);
      }

      spinner.stop();

      console.log(chalk.bold('🔍 Project Health Check'));
      console.log(chalk.gray('─'.repeat(30)));

      if (issues.length === 0) {
        console.log(chalk.green('✅ No critical issues found'));
      } else {
        console.log(chalk.red('❌ Critical Issues:'));
        issues.forEach(issue => console.log(`   • ${issue}`));
      }

      if (warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        warnings.forEach(warning => console.log(`   • ${warning}`));
      }

      console.log(chalk.blue('\n💡 Recommendations:'));
      console.log('   • Run "hyperfixi analyze" to check code quality');
      console.log('   • Use "hyperfixi test" to run tests');
      console.log('   • Keep dependencies up to date');
    } catch (error) {
      spinner.fail('Health check failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

/**
 * Global error handler
 */
process.on('uncaughtException', error => {
  console.error(chalk.red('Uncaught exception:'), error);
  process.exit(1);
});

process.on('unhandledRejection', reason => {
  console.error(chalk.red('Unhandled rejection:'), reason);
  process.exit(1);
});

/**
 * Parse command line arguments
 */
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
