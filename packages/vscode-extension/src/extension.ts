/**
 * Hyperscript Language Support
 *
 * Provides language support for _hyperscript and LokaScript.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node';

let client: LanguageClient | undefined;
let outputChannel: vscode.OutputChannel | undefined;
let inventoryProcess: cp.ChildProcess | undefined;

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
      // Push the `lokascript` section to the server on change. Without this,
      // vscode-languageclient sends `didChangeConfiguration` with
      // `settings: null` and the server never saw mode/language/maxDiagnostics.
      // (The server also supports the pull model via workspace/configuration.)
      configurationSection: 'lokascript',
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

  outputChannel = vscode.window.createOutputChannel('Hyperscript Inventory');

  // ── Commands ──────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('lokascript.showInMyLanguage', () => showInMyLanguage()),
    vscode.commands.registerCommand('lokascript.restartServer', async () => {
      if (client) {
        await client.stop();
        await client.start();
        vscode.window.showInformationMessage('Hyperscript Language Server restarted');
      }
    }),

    vscode.commands.registerCommand('lokascript.inventory', async () => {
      // Pick target directory
      let targetDir: string | undefined;
      const workspaceFolders = vscode.workspace.workspaceFolders;

      if (workspaceFolders && workspaceFolders.length === 1) {
        targetDir = workspaceFolders[0].uri.fsPath;
      } else if (workspaceFolders && workspaceFolders.length > 1) {
        const picked = await vscode.window.showWorkspaceFolderPick({
          placeHolder: 'Select folder to scan for hyperscript/htmx usage',
        });
        targetDir = picked?.uri.fsPath;
      }

      if (!targetDir) {
        const picked = await vscode.window.showOpenDialog({
          canSelectFolders: true,
          canSelectFiles: false,
          canSelectMany: false,
          title: 'Select project directory to scan',
        });
        if (picked?.[0]) targetDir = picked[0].fsPath;
      }

      if (!targetDir) return;

      // Kill existing inventory process
      if (inventoryProcess) {
        inventoryProcess.kill();
        inventoryProcess = undefined;
      }

      const port = vscode.workspace
        .getConfiguration('lokascript')
        .get<number>('inventory.port', 4200);

      // Resolve CLI path relative to extension location in monorepo
      const cliPath = path.resolve(
        context.extensionPath,
        '..',
        'developer-tools',
        'src',
        'inventory',
        'cli.ts'
      );

      outputChannel!.appendLine(`[Inventory] Starting scan of ${targetDir} on port ${port}...`);

      inventoryProcess = cp.spawn(
        'npx',
        ['tsx', cliPath, targetDir, '--port', String(port), '--no-open'],
        { shell: true, cwd: path.resolve(context.extensionPath, '..', '..') }
      );

      let opened = false;
      inventoryProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        outputChannel!.appendLine(`[Inventory] ${text.trim()}`);
        if (!opened && text.includes('Inventory server running')) {
          opened = true;
          const url = vscode.Uri.parse(`http://localhost:${port}`);
          vscode.env.openExternal(url);
          vscode.window.showInformationMessage(
            `Template Inventory running at http://localhost:${port}`
          );
        }
      });

      inventoryProcess.stderr?.on('data', (data: Buffer) => {
        outputChannel!.appendLine(`[Inventory] ${data.toString().trim()}`);
      });

      inventoryProcess.on('exit', code => {
        outputChannel!.appendLine(`[Inventory] Process exited (code ${code})`);
        inventoryProcess = undefined;
      });

      vscode.window.showInformationMessage(`Scanning ${targetDir} for hyperscript/htmx...`);
    }),

    vscode.commands.registerCommand('lokascript.inventory.stop', () => {
      if (inventoryProcess) {
        inventoryProcess.kill();
        inventoryProcess = undefined;
        vscode.window.showInformationMessage('Template Inventory server stopped');
      } else {
        vscode.window.showInformationMessage('No inventory server running');
      }
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
    })
  );

  // ── Cleanup ───────────────────────────────────────────────────────
  context.subscriptions.push({
    dispose() {
      outputChannel?.dispose();
      inventoryProcess?.kill();
    },
  });
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

// ── Show in My Language (arc 5 slice 2) ─────────────────────────────────────

/** The 24 supported review languages (stable; mirrors the semantic package). */
const REVIEW_LANGUAGES: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'ar', label: 'العربية (Arabic)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
  { code: 'de', label: 'Deutsch (German)' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español (Spanish)' },
  { code: 'fr', label: 'Français (French)' },
  { code: 'he', label: 'עברית (Hebrew)' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'it', label: 'Italiano (Italian)' },
  { code: 'ja', label: '日本語 (Japanese)' },
  { code: 'ko', label: '한국어 (Korean)' },
  { code: 'ms', label: 'Bahasa Melayu (Malay)' },
  { code: 'pl', label: 'Polski (Polish)' },
  { code: 'pt', label: 'Português (Portuguese)' },
  { code: 'qu', label: 'Runasimi (Quechua)' },
  { code: 'ru', label: 'Русский (Russian)' },
  { code: 'sw', label: 'Kiswahili (Swahili)' },
  { code: 'th', label: 'ไทย (Thai)' },
  { code: 'tl', label: 'Tagalog' },
  { code: 'tr', label: 'Türkçe (Turkish)' },
  { code: 'uk', label: 'Українська (Ukrainian)' },
  { code: 'vi', label: 'Tiếng Việt (Vietnamese)' },
  { code: 'zh', label: '中文 (Chinese)' },
];

interface TranslateWithVerificationResult {
  ok: boolean;
  code?: string;
  verification?: {
    ok: boolean;
    faithful?: boolean;
    scores?: Record<string, number | undefined>;
    missingValues?: string[];
    missingActions?: string[];
    spuriousActions?: string[];
  };
  error?: string;
}

/**
 * Render the selected hyperscript (or the current line) in a language the
 * reviewer chooses, with the fidelity badge, in a Markdown preview beside the
 * editor. Backed by the server's `lokascript/translateWithVerification`
 * custom request; the badge comes from the same scorer as the multilingual CI
 * ratchet, so "structurally exact" here means what it means there.
 */
async function showInMyLanguage(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || !client) {
    vscode.window.showWarningMessage('Open a file containing hyperscript first.');
    return;
  }

  const code = editor.selection.isEmpty
    ? editor.document.lineAt(editor.selection.active.line).text.trim()
    : editor.document.getText(editor.selection).trim();
  if (!code) {
    vscode.window.showWarningMessage('Select the hyperscript to translate.');
    return;
  }

  const config = vscode.workspace.getConfiguration('lokascript');
  const configured = config.get<string>('reviewLanguage', '');
  let to = configured;
  if (!to) {
    const picked = await vscode.window.showQuickPick(
      REVIEW_LANGUAGES.map(l => ({ label: l.label, description: l.code })),
      { placeHolder: 'Show this hyperscript in…' }
    );
    if (!picked) return;
    to = picked.description;
  }

  const from = config.get<string>('language', 'en');
  const result = await client.sendRequest<TranslateWithVerificationResult>(
    'lokascript/translateWithVerification',
    { code, from, to }
  );

  if (!result.ok || !result.code) {
    vscode.window.showErrorMessage(`Translation failed: ${result.error ?? 'unknown error'}`);
    return;
  }

  const v = result.verification;
  const badge = !v?.ok
    ? '⚠ **Unverified** — the rendering could not be round-trip parsed; treat with care.'
    : v.faithful
      ? '✓ **Verified structurally exact** — every fidelity signal is 1.0 (same scorer as the multilingual CI gate).'
      : [
          '⚠ **Not fully faithful.**',
          v.missingActions?.length ? `Missing actions: \`${v.missingActions.join('`, `')}\`` : '',
          v.spuriousActions?.length
            ? `Spurious actions: \`${v.spuriousActions.join('`, `')}\``
            : '',
          v.missingValues?.length ? `Lost values: \`${v.missingValues.join('`, `')}\`` : '',
        ]
          .filter(Boolean)
          .join(' ');

  const langLabel = REVIEW_LANGUAGES.find(l => l.code === to)?.label ?? to;
  const content = [
    `### ${langLabel}`,
    '',
    '```hyperscript',
    result.code,
    '```',
    '',
    badge,
    '',
    `<sub>Source (${from}): \`${code}\` · deterministic grammar transformation, not LLM translation</sub>`,
  ].join('\n');

  const doc = await vscode.workspace.openTextDocument({ content, language: 'markdown' });
  await vscode.window.showTextDocument(doc, {
    viewColumn: vscode.ViewColumn.Beside,
    preview: true,
  });
}
