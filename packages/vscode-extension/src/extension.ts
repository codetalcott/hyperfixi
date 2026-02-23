/**
 * Hyperscript Language Support
 *
 * Provides language support for _hyperscript and LokaScript,
 * plus interactive debug session management via WebSocket.
 */

import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node';
import { DebugClient, SerializedSnapshot } from './debug-client';
import { HyperFixiDebugAdapter } from './debug-adapter';
import { BreakpointTracker } from './breakpoint-provider';

let client: LanguageClient | undefined;
let debugClient: DebugClient | undefined;
let outputChannel: vscode.OutputChannel | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;
let breakpointTracker: BreakpointTracker | undefined;

export function activate(context: vscode.ExtensionContext): void {
  // ── Language Server ───────────────────────────────────────────────
  const serverModule = context.asAbsolutePath('dist/server.mjs');

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

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'html' },
      { scheme: 'file', language: 'hyperscript' },
      { scheme: 'file', pattern: '**/*.hs' },
    ],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.hs'),
    },
    initializationOptions: {
      language: vscode.workspace.getConfiguration('lokascript').get('language', 'en'),
    },
  };

  client = new LanguageClient(
    'lokascript',
    'Hyperscript Language Server',
    serverOptions,
    clientOptions
  );

  client.start();

  // ── Debug Infrastructure ──────────────────────────────────────────
  const config = vscode.workspace.getConfiguration('lokascript');
  const wsUrl = config.get<string>('debug.url', 'ws://localhost:9229');

  debugClient = new DebugClient(wsUrl);
  outputChannel = vscode.window.createOutputChannel('HyperFixi Debugger');

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  statusBarItem.show();
  updateStatusBar('disconnected');

  // Wire debug events
  debugClient.on('connected', () => {
    updateStatusBar('connected');
    outputChannel!.appendLine(`[${timestamp()}] Connected to debug server at ${wsUrl}`);
    outputChannel!.show(true);
  });

  debugClient.on('disconnected', () => {
    updateStatusBar('disconnected');
    outputChannel!.appendLine(`[${timestamp()}] Disconnected from debug server`);
  });

  debugClient.on('paused', (snapshot: SerializedSnapshot) => {
    updateStatusBar('paused', snapshot);
    logSnapshot('PAUSED', snapshot);
  });

  debugClient.on('resumed', () => {
    updateStatusBar('connected');
    outputChannel!.appendLine(`[${timestamp()}] RESUMED`);
  });

  debugClient.on('snapshot', (snapshot: SerializedSnapshot) => {
    const verbose = vscode.workspace
      .getConfiguration('lokascript')
      .get<boolean>('debug.verbose', false);
    if (verbose) {
      logSnapshot('STEP', snapshot);
    }
  });

  // ── Commands ──────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('lokascript.restartServer', async () => {
      if (client) {
        await client.stop();
        await client.start();
        vscode.window.showInformationMessage('Hyperscript Language Server restarted');
      }
    }),

    vscode.commands.registerCommand('lokascript.debug.connect', () => {
      const url = vscode.workspace
        .getConfiguration('lokascript')
        .get<string>('debug.url', 'ws://localhost:9229');
      debugClient!.setUrl(url);
      debugClient!.connect();
    }),

    vscode.commands.registerCommand('lokascript.debug.disconnect', () => {
      debugClient!.disconnect();
    }),

    vscode.commands.registerCommand('lokascript.debug.continue', () => {
      debugClient!.sendContinue();
    }),

    vscode.commands.registerCommand('lokascript.debug.pause', () => {
      debugClient!.sendPause();
    }),

    vscode.commands.registerCommand('lokascript.debug.stepOver', () => {
      debugClient!.sendStepOver();
    }),

    vscode.commands.registerCommand('lokascript.debug.stepInto', () => {
      debugClient!.sendStepInto();
    }),

    vscode.commands.registerCommand('lokascript.debug.stepOut', () => {
      debugClient!.sendStepOut();
    })
  );

  // ── Configuration changes ─────────────────────────────────────────
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('lokascript')) {
        vscode.window.showInformationMessage(
          'Hyperscript configuration changed. Some settings may require a server restart.'
        );
      }
      if (e.affectsConfiguration('lokascript.debug.url') && debugClient?.isConnected()) {
        const newUrl = vscode.workspace
          .getConfiguration('lokascript')
          .get<string>('debug.url', 'ws://localhost:9229');
        debugClient.disconnect();
        debugClient.setUrl(newUrl);
        debugClient.connect();
      }
    })
  );

  // Auto-connect if configured
  if (config.get<boolean>('debug.autoConnect', false)) {
    debugClient.connect();
  }

  // ── DAP (Debug Adapter Protocol) ──────────────────────────────────
  breakpointTracker = new BreakpointTracker();

  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory('hyperfixi', {
      createDebugAdapterDescriptor(): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
        return new vscode.DebugAdapterInlineImplementation(new HyperFixiDebugAdapter());
      },
    }),
    breakpointTracker
  );

  // ── Cleanup ───────────────────────────────────────────────────────
  context.subscriptions.push({
    dispose() {
      debugClient?.dispose();
      outputChannel?.dispose();
      statusBarItem?.dispose();
    },
  });
}

export function deactivate(): Thenable<void> | undefined {
  debugClient?.dispose();
  if (!client) {
    return undefined;
  }
  return client.stop();
}

// ── Helpers ───────────────────────────────────────────────────────────

function updateStatusBar(
  state: 'disconnected' | 'connected' | 'paused',
  snapshot?: SerializedSnapshot
): void {
  if (!statusBarItem) return;

  switch (state) {
    case 'disconnected':
      statusBarItem.text = '$(debug-disconnect) HyperFixi Debug';
      statusBarItem.tooltip = 'Click to connect to debug server';
      statusBarItem.command = 'lokascript.debug.connect';
      statusBarItem.backgroundColor = undefined;
      break;

    case 'connected':
      statusBarItem.text = '$(debug-start) HyperFixi: Running';
      statusBarItem.tooltip = 'Click to pause execution';
      statusBarItem.command = 'lokascript.debug.pause';
      statusBarItem.backgroundColor = undefined;
      break;

    case 'paused':
      statusBarItem.text = `$(debug-pause) Paused: ${snapshot?.commandName ?? '...'}`;
      statusBarItem.tooltip = 'Click to continue execution';
      statusBarItem.command = 'lokascript.debug.continue';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      break;
  }
}

function logSnapshot(label: string, snapshot: SerializedSnapshot): void {
  if (!outputChannel) return;

  outputChannel.appendLine(`[${timestamp()}] ${label} at: ${snapshot.commandName}`);
  if (snapshot.element) {
    outputChannel.appendLine(`  Element: ${snapshot.element}`);
  }
  outputChannel.appendLine(`  Depth: ${snapshot.depth}, Index: ${snapshot.index}`);

  const vars = snapshot.variables;
  if (vars && Object.keys(vars).length > 0) {
    outputChannel.appendLine('  Variables:');
    for (const [key, value] of Object.entries(vars)) {
      outputChannel.appendLine(`    ${key}: ${formatValue(value)}`);
    }
  }
}

function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function timestamp(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}
