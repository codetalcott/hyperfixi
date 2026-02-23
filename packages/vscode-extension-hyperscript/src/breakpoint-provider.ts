/**
 * Breakpoint Provider — maps VS Code source line breakpoints to
 * hyperscript command-name breakpoints.
 *
 * When a user sets a breakpoint on a line like:
 *   <button _="on click toggle .active then add .done">
 *
 * This provider extracts the command names from the `_="..."` attribute
 * and sends them to the debug server as command breakpoints.
 */

import * as vscode from 'vscode';

// Common hyperscript command keywords (used to extract from source lines)
const COMMAND_KEYWORDS = new Set([
  'toggle',
  'add',
  'remove',
  'set',
  'put',
  'get',
  'call',
  'send',
  'trigger',
  'take',
  'log',
  'show',
  'hide',
  'transition',
  'settle',
  'wait',
  'fetch',
  'go',
  'throw',
  'halt',
  'return',
  'exit',
  'repeat',
  'for',
  'if',
  'unless',
  'increment',
  'decrement',
  'append',
  'tell',
  'measure',
]);

/**
 * Extract hyperscript command names from a source line.
 *
 * Given a line like: `<button _="on click toggle .active then add .done">`
 * Returns: ['toggle', 'add']
 */
export function extractCommandsFromLine(lineText: string): string[] {
  const commands: string[] = [];

  // Find _="..." attribute content
  const attrMatch = lineText.match(/_\s*=\s*["']([^"']+)["']/);
  if (!attrMatch) {
    // Also check for script type="text/hyperscript"
    const scriptMatch = lineText.match(/<script[^>]*type\s*=\s*["']text\/hyperscript["'][^>]*>/);
    if (scriptMatch) {
      // The hyperscript content is on subsequent lines — for inline scripts,
      // check if this line itself has command keywords
      return extractCommandKeywords(lineText);
    }
    // Check if this is inside a hyperscript block (just keywords on the line)
    return extractCommandKeywords(lineText);
  }

  const attrContent = attrMatch[1];
  return extractCommandKeywords(attrContent);
}

function extractCommandKeywords(text: string): string[] {
  const commands: string[] = [];
  // Tokenize and find command keywords
  const words = text.split(/[\s,]+/);
  for (const word of words) {
    const lower = word.toLowerCase();
    if (COMMAND_KEYWORDS.has(lower)) {
      commands.push(lower);
    }
  }
  return commands;
}

/**
 * BreakpointTracker — tracks active breakpoints and provides
 * command-name resolution for the debug adapter.
 */
export class BreakpointTracker implements vscode.Disposable {
  private breakpointMap = new Map<string, Map<number, string[]>>(); // file → line → commands
  private disposables: vscode.Disposable[] = [];

  constructor() {
    // Watch for breakpoint changes
    this.disposables.push(
      vscode.debug.onDidChangeBreakpoints(e => {
        this.onBreakpointsChanged(e);
      })
    );
  }

  /**
   * Get command names for a breakpoint at the given file and line.
   */
  getCommandsForBreakpoint(filePath: string, line: number): string[] {
    return this.breakpointMap.get(filePath)?.get(line) || [];
  }

  /**
   * Resolve command names for all current breakpoints in a document.
   */
  async resolveForDocument(document: vscode.TextDocument): Promise<void> {
    const filePath = document.uri.fsPath;
    const lineMap = new Map<number, string[]>();

    for (let i = 0; i < document.lineCount; i++) {
      const lineText = document.lineAt(i).text;
      const commands = extractCommandsFromLine(lineText);
      if (commands.length > 0) {
        lineMap.set(i + 1, commands); // VS Code lines are 1-indexed in DAP
      }
    }

    this.breakpointMap.set(filePath, lineMap);
  }

  private onBreakpointsChanged(e: vscode.BreakpointsChangeEvent): void {
    // When breakpoints are added, resolve their source lines
    for (const bp of e.added) {
      if (bp instanceof vscode.SourceBreakpoint) {
        const uri = bp.location.uri;
        const line = bp.location.range.start.line;

        vscode.workspace.openTextDocument(uri).then(doc => {
          const lineText = doc.lineAt(line).text;
          const commands = extractCommandsFromLine(lineText);

          if (commands.length > 0) {
            if (!this.breakpointMap.has(uri.fsPath)) {
              this.breakpointMap.set(uri.fsPath, new Map());
            }
            this.breakpointMap.get(uri.fsPath)!.set(line + 1, commands);
          }
        });
      }
    }

    // Clean up removed breakpoints
    for (const bp of e.removed) {
      if (bp instanceof vscode.SourceBreakpoint) {
        const uri = bp.location.uri;
        const line = bp.location.range.start.line;
        this.breakpointMap.get(uri.fsPath)?.delete(line + 1);
      }
    }
  }

  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
