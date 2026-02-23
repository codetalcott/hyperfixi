/**
 * Template Inventory — Server
 *
 * Express + WebSocket server that scans a project directory for
 * hyperscript/htmx snippets and serves an interactive HTML dashboard.
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';
import open from 'open';

import { extractSnippetsFromFile, extractSnippetsFromProject } from './extractor';
import { updateSnippetInFile, StaleFileError, ContentMismatchError } from './editor';
import type { Snippet, InventorySummary, InventoryConfig, SnippetCategory } from './types';

/**
 * Inventory Server — scans templates and serves an interactive dashboard.
 */
export class InventoryServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private wss: WebSocketServer;
  private watcher?: chokidar.FSWatcher;
  private config: InventoryConfig;
  private snippetStore: Map<string, Snippet> = new Map();
  private selfWrites = new Set<string>();
  private rescanTimers = new Map<string, NodeJS.Timeout>();

  constructor(config: InventoryConfig) {
    this.config = config;
    this.app = express();
    this.app.use(express.json());
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.setupRoutes();
  }

  /** Start the server: scan, serve, watch. */
  async start(): Promise<void> {
    // Initial scan
    const snippets = await extractSnippetsFromProject(this.config.projectDir, {
      include: this.config.include,
      exclude: this.config.exclude,
    });
    for (const s of snippets) {
      this.snippetStore.set(s.id, s);
    }

    // Start HTTP server
    await new Promise<void>(resolve => {
      this.server.listen(this.config.port, () => resolve());
    });

    const url = `http://localhost:${this.config.port}`;
    const summary = this.computeSummary();
    console.log(`\nTemplate Inventory ready at ${url}`);
    console.log(`  ${summary.totalSnippets} snippets across ${summary.totalFiles} files\n`);

    // Watch for file changes
    if (this.config.watch) {
      this.startWatching();
    }

    // Open browser
    if (this.config.open) {
      open(url).catch(() => {});
    }
  }

  /** Stop the server and file watcher. */
  async stop(): Promise<void> {
    this.watcher?.close();
    for (const timer of this.rescanTimers.values()) clearTimeout(timer);
    this.wss.close();
    this.server.close();
  }

  // ---------------------------------------------------------------------------
  // Routes
  // ---------------------------------------------------------------------------

  private setupRoutes(): void {
    // Serve the HTML dashboard
    this.app.get('/', (_req, res) => {
      res.type('html').send(generateInventoryHTML(this.config.projectDir));
    });

    // GET /api/snippets — filtered list
    this.app.get('/api/snippets', (req, res) => {
      let snippets = [...this.snippetStore.values()];

      // Filter by category
      const category = req.query.category as string | undefined;
      if (category) {
        snippets = snippets.filter(s => s.category === category);
      }

      // Filter by command
      const command = req.query.command as string | undefined;
      if (command) {
        snippets = snippets.filter(s => s.commands.includes(command));
      }

      // Filter by file
      const file = req.query.file as string | undefined;
      if (file) {
        snippets = snippets.filter(s => s.relativePath.includes(file));
      }

      // Search
      const search = req.query.search as string | undefined;
      if (search) {
        const q = search.toLowerCase();
        snippets = snippets.filter(
          s =>
            s.value.toLowerCase().includes(q) ||
            s.relativePath.toLowerCase().includes(q) ||
            s.attributeName.toLowerCase().includes(q) ||
            s.commands.some(c => c.includes(q)) ||
            s.events.some(e => e.includes(q))
        );
      }

      // Sort by file, then line
      snippets.sort((a, b) => a.relativePath.localeCompare(b.relativePath) || a.line - b.line);

      res.json(serializeSnippets(snippets));
    });

    // GET /api/summary
    this.app.get('/api/summary', (_req, res) => {
      res.json(this.computeSummary());
    });

    // GET /api/snippet/:id — single snippet with file context
    this.app.get('/api/snippet/:id', (req, res) => {
      const snippet = this.snippetStore.get(req.params.id);
      if (!snippet) return res.status(404).json({ error: 'Snippet not found' });

      // Read surrounding lines for context
      let context: string[] = [];
      try {
        const lines = fs.readFileSync(snippet.filePath, 'utf-8').split('\n');
        const start = Math.max(0, snippet.line - 4);
        const end = Math.min(lines.length, snippet.line + 6);
        context = lines.slice(start, end).map((l, i) => `${start + i + 1}: ${l}`);
      } catch {
        /* skip */
      }

      res.json({ ...serializeSnippet(snippet), context });
    });

    // PUT /api/snippet/:id — edit a snippet
    this.app.put('/api/snippet/:id', async (req, res) => {
      const snippet = this.snippetStore.get(req.params.id);
      if (!snippet) return res.status(404).json({ error: 'Snippet not found' });

      const { value } = req.body;
      if (typeof value !== 'string') {
        return res.status(400).json({ error: 'Missing "value" in request body' });
      }

      try {
        // Track this as a self-write so chokidar doesn't double-scan
        this.selfWrites.add(snippet.filePath);

        const updated = await updateSnippetInFile(snippet, value, this.config.projectDir);

        // Re-scan the whole file and update store
        await this.rescanFile(snippet.filePath);

        res.json(serializeSnippet(updated));
      } catch (err) {
        if (err instanceof StaleFileError) {
          // Rescan and return conflict
          await this.rescanFile(snippet.filePath);
          return res.status(409).json({ error: err.message });
        }
        if (err instanceof ContentMismatchError) {
          await this.rescanFile(snippet.filePath);
          return res.status(409).json({ error: err.message });
        }
        return res.status(500).json({ error: String(err) });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // File Watching
  // ---------------------------------------------------------------------------

  private startWatching(): void {
    const globs = [
      '**/*.html',
      '**/*.htm',
      '**/*.djhtml',
      '**/*.jinja',
      '**/*.j2',
      '**/*.erb',
      '**/*.php',
      '**/*.vue',
      '**/*.svelte',
      '**/*.jsx',
      '**/*.tsx',
      '**/*.hbs',
      '**/*.ejs',
      '**/*.astro',
    ].map(g => path.join(this.config.projectDir, g));

    this.watcher = chokidar.watch(globs, {
      ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/venv/**'],
      ignoreInitial: true,
    });

    this.watcher.on('change', (filePath: string) => {
      this.debouncedRescan(filePath);
    });

    this.watcher.on('add', (filePath: string) => {
      this.debouncedRescan(filePath);
    });

    this.watcher.on('unlink', (filePath: string) => {
      // Remove snippets for deleted file
      const toRemove: string[] = [];
      for (const [id, s] of this.snippetStore) {
        if (s.filePath === filePath) toRemove.push(id);
      }
      for (const id of toRemove) this.snippetStore.delete(id);

      const relPath = path.relative(this.config.projectDir, filePath);
      this.broadcast({ type: 'file-removed', filePath: relPath });
    });
  }

  private debouncedRescan(filePath: string): void {
    // Skip self-initiated writes (we already rescanned)
    if (this.selfWrites.has(filePath)) {
      this.selfWrites.delete(filePath);
      return;
    }

    // Debounce: clear any pending rescan for this file
    const existing = this.rescanTimers.get(filePath);
    if (existing) clearTimeout(existing);

    this.rescanTimers.set(
      filePath,
      setTimeout(async () => {
        this.rescanTimers.delete(filePath);
        await this.rescanFile(filePath);
      }, 300)
    );
  }

  private async rescanFile(filePath: string): Promise<void> {
    // Remove old snippets for this file
    const toRemove: string[] = [];
    for (const [id, s] of this.snippetStore) {
      if (s.filePath === filePath) toRemove.push(id);
    }
    for (const id of toRemove) this.snippetStore.delete(id);

    // Re-extract
    try {
      const snippets = extractSnippetsFromFile(filePath, this.config.projectDir);
      for (const s of snippets) {
        this.snippetStore.set(s.id, s);
      }

      const relPath = path.relative(this.config.projectDir, filePath);
      this.broadcast({
        type: 'file-changed',
        filePath: relPath,
        snippets: serializeSnippets(snippets),
        summary: this.computeSummary(),
      });
    } catch {
      // File may have been deleted between events
    }
  }

  // ---------------------------------------------------------------------------
  // WebSocket
  // ---------------------------------------------------------------------------

  private broadcast(message: object): void {
    const data = JSON.stringify(message);
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  private computeSummary(): InventorySummary {
    const snippets = [...this.snippetStore.values()];
    const files = new Set(snippets.map(s => s.filePath));
    const byCategory: Record<string, number> = {};
    const byCommand: Record<string, number> = {};
    const byEvent: Record<string, number> = {};
    const byElementType: Record<string, number> = {};

    for (const s of snippets) {
      byCategory[s.category] = (byCategory[s.category] ?? 0) + 1;
      byElementType[s.elementType] = (byElementType[s.elementType] ?? 0) + 1;
      for (const cmd of s.commands) {
        byCommand[cmd] = (byCommand[cmd] ?? 0) + 1;
      }
      for (const evt of s.events) {
        byEvent[evt] = (byEvent[evt] ?? 0) + 1;
      }
    }

    return {
      totalFiles: files.size,
      totalSnippets: snippets.length,
      byCategory,
      byCommand,
      byEvent,
      byElementType,
    };
  }
}

// ---------------------------------------------------------------------------
// Serialization helpers (Sets -> Arrays for JSON)
// ---------------------------------------------------------------------------

function serializeSnippet(s: Snippet) {
  return { ...s };
}

function serializeSnippets(snippets: Snippet[]) {
  return snippets.map(serializeSnippet);
}

// ---------------------------------------------------------------------------
// Inline HTML Dashboard
// ---------------------------------------------------------------------------

function generateInventoryHTML(projectDir: string): string {
  const projectName = path.basename(projectDir);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Template Inventory &mdash; ${escapeHTML(projectName)}</title>
  <style>
    :root {
      --bg: #1a1a2e;
      --surface: #16213e;
      --surface-hover: #1c2a4a;
      --border: #2a3a5a;
      --text: #e0e0e0;
      --text-muted: #8892a4;
      --accent: #4fc3f7;
      --accent-dim: #2a6a8a;
      --hs-color: #bb86fc;
      --htmx-color: #4fc3f7;
      --fixi-color: #66bb6a;
      --danger: #ef5350;
      --success: #66bb6a;
      --warning: #ffa726;
      --radius: 6px;
      --sidebar-width: 260px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 20px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .header h1 { font-size: 16px; font-weight: 600; }
    .header .stats { color: var(--text-muted); font-size: 13px; }
    .header .status {
      margin-left: auto;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--success);
      display: inline-block;
    }
    .status-dot.disconnected { background: var(--danger); }

    /* Layout */
    .layout { display: flex; flex: 1; overflow: hidden; }

    /* Sidebar */
    .sidebar {
      width: var(--sidebar-width);
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      flex-shrink: 0;
    }
    .sidebar section { padding: 12px 16px; border-bottom: 1px solid var(--border); }
    .sidebar h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .sidebar label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      padding: 3px 0;
      cursor: pointer;
    }
    .sidebar label:hover { color: var(--accent); }
    .sidebar select {
      width: 100%;
      padding: 6px 8px;
      background: var(--bg);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 13px;
    }
    .stat-item {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      padding: 2px 0;
    }
    .stat-item .count { color: var(--accent); font-weight: 600; }

    /* Main content */
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Search bar */
    .search-bar {
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .search-bar input {
      width: 100%;
      padding: 8px 12px;
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 14px;
      outline: none;
    }
    .search-bar input:focus { border-color: var(--accent); }
    .search-bar input::placeholder { color: var(--text-muted); }

    /* Snippet list */
    .snippet-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px 20px 40px;
    }

    /* Group header */
    .group-header {
      padding: 8px 0 4px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      margin-top: 16px;
      display: flex;
      justify-content: space-between;
    }
    .group-header:first-child { margin-top: 4px; }
    .group-header .group-count { color: var(--accent); }

    /* Snippet card */
    .snippet {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      margin-top: 6px;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .snippet:hover { border-color: var(--accent-dim); }
    .snippet.expanded { border-color: var(--accent); }

    .snippet-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      font-size: 13px;
      min-height: 36px;
    }
    .snippet-location {
      color: var(--accent);
      font-size: 12px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .snippet-attr {
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 3px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .snippet-attr.hyperscript { background: rgba(187, 134, 252, 0.2); color: var(--hs-color); }
    .snippet-attr.htmx-request { background: rgba(79, 195, 247, 0.2); color: var(--htmx-color); }
    .snippet-attr.htmx-swap,
    .snippet-attr.htmx-target,
    .snippet-attr.htmx-trigger,
    .snippet-attr.htmx-other { background: rgba(79, 195, 247, 0.15); color: var(--htmx-color); }
    .snippet-attr.fixi { background: rgba(102, 187, 106, 0.2); color: var(--fixi-color); }

    .snippet-preview {
      color: var(--text-muted);
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }

    /* Expanded body */
    .snippet-body {
      display: none;
      border-top: 1px solid var(--border);
      padding: 12px;
    }
    .snippet.expanded .snippet-body { display: block; }

    .snippet-body pre {
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 13px;
      line-height: 1.5;
      background: var(--bg);
      padding: 12px;
      border-radius: var(--radius);
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .snippet-actions {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }
    .btn {
      padding: 5px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--bg);
      color: var(--text);
      font-size: 12px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .btn:hover { border-color: var(--accent); color: var(--accent); }
    .btn.primary { background: var(--accent); color: #000; border-color: var(--accent); }
    .btn.primary:hover { opacity: 0.9; }
    .btn.danger { color: var(--danger); }
    .btn.danger:hover { border-color: var(--danger); }

    /* Edit mode */
    .edit-textarea {
      width: 100%;
      min-height: 80px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 13px;
      line-height: 1.5;
      background: var(--bg);
      color: var(--text);
      border: 1px solid var(--accent);
      border-radius: var(--radius);
      padding: 12px;
      resize: vertical;
      outline: none;
    }

    .edit-hint {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 6px;
    }

    /* Element tag context */
    .snippet-element {
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 11px;
      color: var(--text-muted);
      padding: 4px 12px 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      border-top: 1px solid var(--border);
    }

    /* Toast notifications */
    .toast-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 1000;
    }
    .toast {
      padding: 10px 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 13px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: toast-in 0.3s ease;
    }
    .toast.success { border-color: var(--success); }
    .toast.error { border-color: var(--danger); }
    .toast.info { border-color: var(--accent); }
    @keyframes toast-in { from { transform: translateY(20px); opacity: 0; } }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted);
    }
    .empty-state h2 { font-size: 18px; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Template Inventory</h1>
    <span class="stats" id="header-stats"></span>
    <div class="status">
      <span class="status-dot" id="status-dot"></span>
      <span id="status-text">Connected</span>
    </div>
  </div>

  <div class="layout">
    <div class="sidebar">
      <section>
        <h3>Group By</h3>
        <select id="group-select">
          <option value="file" selected>File</option>
          <option value="category">Type (HS / HTMX)</option>
          <option value="command">Command</option>
          <option value="event">Event</option>
          <option value="element">Element</option>
        </select>
      </section>

      <section>
        <h3>Filter by Type</h3>
        <div id="category-filters"></div>
      </section>

      <section>
        <h3>Summary</h3>
        <div id="summary-stats"></div>
      </section>
    </div>

    <div class="main">
      <div class="search-bar">
        <input type="text" id="search-input" placeholder="Search snippets..." />
      </div>
      <div class="snippet-list" id="snippet-list"></div>
    </div>
  </div>

  <div class="toast-container" id="toast-container"></div>

  <script>
    // =====================================================================
    // State
    // =====================================================================
    let allSnippets = [];
    let summary = {};
    let groupBy = 'file';
    let searchQuery = '';
    let activeCategories = new Set();
    let expandedIds = new Set();
    let editingId = null;

    // =====================================================================
    // API
    // =====================================================================
    async function fetchSnippets(params = {}) {
      const url = new URL('/api/snippets', location.origin);
      for (const [k, v] of Object.entries(params)) {
        if (v) url.searchParams.set(k, v);
      }
      const res = await fetch(url);
      return res.json();
    }

    async function fetchSummary() {
      const res = await fetch('/api/summary');
      return res.json();
    }

    async function saveSnippet(id, value) {
      const res = await fetch('/api/snippet/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }
      return res.json();
    }

    // =====================================================================
    // WebSocket
    // =====================================================================
    let ws;
    function connectWS() {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(protocol + '//' + location.host);

      ws.onopen = () => {
        document.getElementById('status-dot').classList.remove('disconnected');
        document.getElementById('status-text').textContent = 'Connected';
      };

      ws.onclose = () => {
        document.getElementById('status-dot').classList.add('disconnected');
        document.getElementById('status-text').textContent = 'Disconnected';
        setTimeout(connectWS, 2000);
      };

      ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'file-changed') {
          toast('File updated: ' + msg.filePath, 'info');
          refreshData();
        } else if (msg.type === 'file-removed') {
          toast('File removed: ' + msg.filePath, 'info');
          refreshData();
        }
      };
    }

    // =====================================================================
    // Rendering
    // =====================================================================
    function escapeHTML(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function categoryLabel(cat) {
      const labels = {
        'hyperscript': 'Hyperscript',
        'htmx-request': 'hx-request',
        'htmx-swap': 'hx-swap',
        'htmx-target': 'hx-target',
        'htmx-trigger': 'hx-trigger',
        'htmx-other': 'hx-other',
        'fixi': 'Fixi',
      };
      return labels[cat] || cat;
    }

    function renderFilters() {
      const container = document.getElementById('category-filters');
      const cats = ['hyperscript', 'htmx-request', 'htmx-swap', 'htmx-target', 'htmx-trigger', 'htmx-other', 'fixi'];

      container.innerHTML = cats.map(cat => {
        const count = (summary.byCategory || {})[cat] || 0;
        if (count === 0) return '';
        const checked = activeCategories.size === 0 || activeCategories.has(cat);
        return '<label><input type="checkbox" value="' + cat + '" ' +
          (checked ? 'checked' : '') + '> ' +
          categoryLabel(cat) + ' (' + count + ')</label>';
      }).join('');

      container.querySelectorAll('input').forEach(cb => {
        cb.addEventListener('change', () => {
          if (cb.checked) {
            activeCategories.add(cb.value);
          } else {
            activeCategories.delete(cb.value);
          }
          // If all are checked, treat as "no filter"
          const allCats = container.querySelectorAll('input');
          const allChecked = [...allCats].every(c => c.checked);
          if (allChecked) activeCategories.clear();
          renderSnippets();
        });
      });
    }

    function renderSummary() {
      const stats = document.getElementById('summary-stats');
      const headerStats = document.getElementById('header-stats');

      headerStats.textContent =
        summary.totalSnippets + ' snippets in ' + summary.totalFiles + ' files';

      let html = '<div class="stat-item"><span>Total snippets</span><span class="count">' +
        summary.totalSnippets + '</span></div>';
      html += '<div class="stat-item"><span>Files</span><span class="count">' +
        summary.totalFiles + '</span></div>';

      // Top commands
      const commands = Object.entries(summary.byCommand || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
      if (commands.length) {
        html += '<h3 style="margin-top:12px">Top Commands</h3>';
        for (const [cmd, count] of commands) {
          html += '<div class="stat-item"><span>' + cmd + '</span><span class="count">' + count + '</span></div>';
        }
      }

      stats.innerHTML = html;
    }

    function getFilteredSnippets() {
      let items = allSnippets;
      if (activeCategories.size > 0) {
        items = items.filter(s => activeCategories.has(s.category));
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        items = items.filter(s =>
          s.value.toLowerCase().includes(q) ||
          s.relativePath.toLowerCase().includes(q) ||
          s.attributeName.toLowerCase().includes(q) ||
          (s.commands || []).some(c => c.includes(q)) ||
          (s.events || []).some(e => e.includes(q))
        );
      }
      return items;
    }

    function groupSnippets(snippets) {
      const groups = new Map();
      for (const s of snippets) {
        let key;
        switch (groupBy) {
          case 'file': key = s.relativePath; break;
          case 'category': key = categoryLabel(s.category); break;
          case 'command':
            if (s.commands && s.commands.length) {
              for (const cmd of s.commands) {
                const arr = groups.get(cmd) || [];
                arr.push(s);
                groups.set(cmd, arr);
              }
              continue;
            }
            key = '(no commands)';
            break;
          case 'event':
            if (s.events && s.events.length) {
              for (const evt of s.events) {
                const arr = groups.get(evt) || [];
                arr.push(s);
                groups.set(evt, arr);
              }
              continue;
            }
            key = '(no events)';
            break;
          case 'element': key = '<' + s.elementType + '>'; break;
          default: key = s.relativePath;
        }
        const arr = groups.get(key) || [];
        arr.push(s);
        groups.set(key, arr);
      }
      return groups;
    }

    function renderSnippets() {
      const container = document.getElementById('snippet-list');
      const filtered = getFilteredSnippets();

      if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><h2>No snippets found</h2>' +
          '<p>Try adjusting your search or filters.</p></div>';
        return;
      }

      const groups = groupSnippets(filtered);
      let html = '';

      for (const [groupName, snippets] of groups) {
        html += '<div class="group-header"><span>' + escapeHTML(groupName) +
          '</span><span class="group-count">' + snippets.length + '</span></div>';

        for (const s of snippets) {
          const isExpanded = expandedIds.has(s.id);
          const isEditing = editingId === s.id;
          const preview = s.value.replace(/\\n/g, ' ').slice(0, 80);
          const vsCodeUrl = 'vscode://file/' + encodeURI(s.filePath) + ':' + s.line + ':' + s.column;

          html += '<div class="snippet' + (isExpanded ? ' expanded' : '') +
            '" data-id="' + s.id + '">';

          // Header (always visible)
          html += '<div class="snippet-header" onclick="toggleSnippet(\\''+s.id+'\\')\">';
          html += '<span class="snippet-location">' + escapeHTML(s.relativePath) + ':' + s.line + '</span>';
          html += '<span class="snippet-attr ' + s.category + '">' + escapeHTML(s.attributeName) + '</span>';
          html += '<span class="snippet-preview">' + escapeHTML(preview) + '</span>';
          html += '</div>';

          // Expanded body
          html += '<div class="snippet-body">';

          if (isEditing) {
            html += '<textarea class="edit-textarea" id="edit-' + s.id + '">' +
              escapeHTML(s.value) + '</textarea>';
            html += '<div class="edit-hint">Ctrl+S / Cmd+S to save, Escape to cancel</div>';
            html += '<div class="snippet-actions">';
            html += '<button class="btn primary" onclick="saveEdit(\\''+s.id+'\\')">Save</button>';
            html += '<button class="btn" onclick="cancelEdit()">Cancel</button>';
            html += '</div>';
          } else {
            html += '<pre>' + escapeHTML(s.value) + '</pre>';
            html += '<div class="snippet-actions">';
            html += '<button class="btn" onclick="startEdit(\\''+s.id+'\\'); event.stopPropagation();">Edit</button>';
            html += '<a class="btn" href="' + vsCodeUrl + '" onclick="event.stopPropagation();">Open in VS Code</a>';
            html += '</div>';
          }

          html += '</div>'; // snippet-body
          html += '</div>'; // snippet
        }
      }

      container.innerHTML = html;

      // Focus textarea if editing
      if (editingId) {
        const ta = document.getElementById('edit-' + editingId);
        if (ta) {
          ta.focus();
          ta.addEventListener('keydown', handleEditKeydown);
        }
      }
    }

    // =====================================================================
    // Interactions
    // =====================================================================
    function toggleSnippet(id) {
      if (editingId) return; // Don't collapse while editing
      if (expandedIds.has(id)) {
        expandedIds.delete(id);
      } else {
        expandedIds.add(id);
      }
      renderSnippets();
    }

    function startEdit(id) {
      expandedIds.add(id);
      editingId = id;
      renderSnippets();
    }

    function cancelEdit() {
      editingId = null;
      renderSnippets();
    }

    async function saveEdit(id) {
      const ta = document.getElementById('edit-' + id);
      if (!ta) return;
      const newValue = ta.value;

      try {
        await saveSnippet(id, newValue);
        editingId = null;
        toast('Saved successfully', 'success');
        await refreshData();
      } catch (err) {
        toast(err.message, 'error');
        if (err.message.includes('modified') || err.message.includes('mismatch')) {
          editingId = null;
          await refreshData();
        }
      }
    }

    function handleEditKeydown(e) {
      if (e.key === 'Escape') {
        cancelEdit();
      }
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        saveEdit(editingId);
      }
    }

    // =====================================================================
    // Toast
    // =====================================================================
    function toast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      const el = document.createElement('div');
      el.className = 'toast ' + type;
      el.textContent = message;
      container.appendChild(el);
      setTimeout(() => el.remove(), 4000);
    }

    // =====================================================================
    // Data loading
    // =====================================================================
    async function refreshData() {
      const [snippets, sum] = await Promise.all([fetchSnippets(), fetchSummary()]);
      allSnippets = snippets;
      summary = sum;
      renderFilters();
      renderSummary();
      renderSnippets();
    }

    // =====================================================================
    // Event listeners
    // =====================================================================
    document.getElementById('group-select').addEventListener('change', (e) => {
      groupBy = e.target.value;
      renderSnippets();
    });

    let searchTimer;
    document.getElementById('search-input').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        searchQuery = e.target.value;
        renderSnippets();
      }, 150);
    });

    // =====================================================================
    // Init
    // =====================================================================
    refreshData();
    connectWS();
  </script>
</body>
</html>`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
