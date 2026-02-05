/**
 * Hyperscript Language Support
 *
 * Provides language support for _hyperscript and LokaScript.
 */

import * as vscode from 'vscode';

import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export function activate(context: vscode.ExtensionContext): void {
  // Path to the language server module (bundled into extension's dist folder)
  const serverModule = context.asAbsolutePath('dist/server.mjs');

  // Use command transport (not module) because the server is ESM with top-level await.
  // Spawning `node` directly supports ESM, while Electron's fork() may not.
  // The .mjs extension ensures Node treats it as ESM regardless of package.json.
  const serverOptions: ServerOptions = {
    run: {
      command: 'node',
      args: [serverModule, '--stdio'],
    },
    debug: {
      command: 'node',
      args: ['--nolazy', '--inspect=6009', serverModule, '--stdio'],
    },
  };

  // Client options
  const clientOptions: LanguageClientOptions = {
    // Register the server for HTML documents (where _="..." attributes live)
    documentSelector: [
      { scheme: 'file', language: 'html' },
      { scheme: 'file', language: 'hyperscript' },
      { scheme: 'file', pattern: '**/*.hs' },
    ],
    synchronize: {
      // Notify the server about file changes to hyperscript files
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.hs'),
    },
    initializationOptions: {
      language: vscode.workspace.getConfiguration('lokascript').get('language', 'en'),
    },
  };

  // Create the language client and start it
  client = new LanguageClient(
    'lokascript',
    'Hyperscript Language Server',
    serverOptions,
    clientOptions
  );

  // Start the client (also launches the server)
  client.start();

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('lokascript.restartServer', async () => {
      if (client) {
        await client.stop();
        await client.start();
        vscode.window.showInformationMessage('Hyperscript Language Server restarted');
      }
    })
  );

  // Watch for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('lokascript')) {
        // The server will pick up configuration changes via the standard LSP mechanism
        vscode.window.showInformationMessage(
          'Hyperscript configuration changed. Some settings may require a server restart.'
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
