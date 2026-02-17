/**
 * _hyperscript Language Support for VS Code
 *
 * Provides language support for original _hyperscript.
 * Uses the language server in 'hyperscript' mode (no multilingual, no LokaScript extensions).
 */

import * as vscode from 'vscode';

import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export function activate(context: vscode.ExtensionContext): void {
  // Path to the language server module (bundled into extension's dist folder)
  const serverModule = context.asAbsolutePath('dist/server.mjs');

  // Use command transport (not module) because the server is ESM with top-level await.
  const serverOptions: ServerOptions = {
    run: {
      command: 'node',
      args: [serverModule, '--stdio'],
      options: {
        env: {
          ...process.env,
          HYPERSCRIPT_LS_DEFAULT_MODE: 'hyperscript',
        },
      },
    },
    debug: {
      command: 'node',
      args: ['--nolazy', '--inspect=6009', serverModule, '--stdio'],
      options: {
        env: {
          ...process.env,
          HYPERSCRIPT_LS_DEFAULT_MODE: 'hyperscript',
        },
      },
    },
  };

  // Client options
  const clientOptions: LanguageClientOptions = {
    // Register for HTML documents (where _="..." attributes live)
    documentSelector: [
      { scheme: 'file', language: 'html' },
      { scheme: 'file', language: 'hyperscript' },
      { scheme: 'file', pattern: '**/*.hs' },
    ],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.hs'),
    },
    initializationOptions: {
      // Force hyperscript mode — no multilingual
      language: 'en',
    },
  };

  // Create the language client and start it
  client = new LanguageClient(
    'hyperscript',
    '_hyperscript Language Server',
    serverOptions,
    clientOptions
  );

  // Start the client (also launches the server)
  client.start();

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('hyperscript.restartServer', async () => {
      if (client) {
        await client.stop();
        await client.start();
        vscode.window.showInformationMessage('_hyperscript Language Server restarted');
      }
    })
  );

  // Watch for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('hyperscript')) {
        vscode.window.showInformationMessage(
          '_hyperscript configuration changed. Some settings may require a server restart.'
        );
      }
    })
  );
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
