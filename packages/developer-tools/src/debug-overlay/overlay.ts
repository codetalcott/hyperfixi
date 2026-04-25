/**
 * Debug Overlay — browser-side debug panel for HyperFixi
 *
 * A Shadow DOM panel showing:
 *  - Step controls (continue, step over, step into, step out)
 *  - Current command highlighted in the command list
 *  - Variables inspector (it, me, locals, event)
 *  - Execution timeline with scrubber
 *  - Element highlighting on the page
 *
 * Keyboard shortcuts match Chrome DevTools:
 *  F8 = Continue, F10 = Step Over, F11 = Step Into, Shift+F11 = Step Out
 */

import type { DebugSnapshot, DebugController } from '@hyperfixi/core';
import { OVERLAY_CSS } from './styles';
import { ElementHighlighter } from './element-highlighter';

export class DebugOverlay {
  private host: HTMLDivElement;
  private shadow: ShadowRoot;
  private panel: HTMLDivElement;
  private highlighter = new ElementHighlighter();
  private controller: DebugController | null = null;
  private collapsed = false;

  // DOM references for updates
  private statusEl!: HTMLSpanElement;
  private commandListEl!: HTMLDivElement;
  private variablesEl!: HTMLDivElement;
  private timelineProgressEl!: HTMLDivElement;
  private timelineLabelEl!: HTMLDivElement;

  constructor() {
    // Create host element
    this.host = document.createElement('div');
    this.host.setAttribute('data-hyperfixi-debugger', '');
    this.shadow = this.host.attachShadow({ mode: 'open' });

    // Inject styles
    const style = document.createElement('style');
    style.textContent = OVERLAY_CSS;
    this.shadow.appendChild(style);

    // Build panel
    this.panel = document.createElement('div');
    this.panel.className = 'debugger-panel';
    this.panel.innerHTML = this.buildHTML();
    this.shadow.appendChild(this.panel);

    // Cache references
    this.statusEl = this.shadow.querySelector('.header-status')!;
    this.commandListEl = this.shadow.querySelector('.command-list')!;
    this.variablesEl = this.shadow.querySelector('.variables-list')!;
    this.timelineProgressEl = this.shadow.querySelector('.timeline-progress')!;
    this.timelineLabelEl = this.shadow.querySelector('.timeline-label')!;

    // Wire button events
    this.wireControls();
    this.wireKeyboard();

    // Show running state initially
    this.showRunning();
  }

  /** Attach to a DebugController and inject into the page */
  attach(controller: DebugController): void {
    this.controller = controller;

    controller.on('paused', snapshot => {
      if (snapshot) this.showPaused(snapshot);
    });
    controller.on('resumed', () => this.showRunning());
    controller.on('snapshot', snapshot => {
      if (snapshot) this.updateTimeline(snapshot);
    });
    controller.on('disabled', () => this.hide());

    document.body.appendChild(this.host);
  }

  /** Remove from the page */
  detach(): void {
    this.highlighter.clear();
    this.host.remove();
    this.controller = null;
  }

  /** Show the overlay */
  show(): void {
    this.host.style.display = '';
  }

  /** Hide the overlay */
  hide(): void {
    this.host.style.display = 'none';
    this.highlighter.clear();
  }

  // ─────────────────────────────────────────────────────────────
  // State Updates
  // ─────────────────────────────────────────────────────────────

  showPaused(snapshot: DebugSnapshot): void {
    this.show();
    this.statusEl.textContent = 'PAUSED';
    this.statusEl.className = 'header-status paused';

    this.updateCommandList(snapshot);
    this.updateVariables(snapshot);

    // Highlight target element
    this.highlighter.highlight(snapshot.element);
  }

  showRunning(): void {
    this.statusEl.textContent = 'RUNNING';
    this.statusEl.className = 'header-status running';
    this.highlighter.clear();
  }

  updateTimeline(snapshot: DebugSnapshot): void {
    if (!this.controller) return;
    const history = this.controller.getHistory();
    const total = history.length;
    const pct = total > 0 ? ((snapshot.index + 1) / Math.max(total, 1)) * 100 : 0;
    this.timelineProgressEl.style.width = `${Math.min(pct, 100)}%`;
    this.timelineLabelEl.textContent = `Step ${snapshot.index + 1}`;
  }

  // ─────────────────────────────────────────────────────────────
  // HTML Building
  // ─────────────────────────────────────────────────────────────

  private buildHTML(): string {
    return `
      <div class="header">
        <span class="header-title">HyperFixi Debugger</span>
        <span class="header-status running">RUNNING</span>
        <button class="close-btn" data-action="close" title="Close">&times;</button>
      </div>
      <div class="controls">
        <button class="ctrl-btn" data-action="continue" title="Continue (F8)">
          &#9654;<span class="shortcut">F8</span>
        </button>
        <button class="ctrl-btn" data-action="stepOver" title="Step Over (F10)">
          &#8631;<span class="shortcut">F10</span>
        </button>
        <button class="ctrl-btn" data-action="stepInto" title="Step Into (F11)">
          &#8615;<span class="shortcut">F11</span>
        </button>
        <button class="ctrl-btn" data-action="stepOut" title="Step Out (Shift+F11)">
          &#8613;<span class="shortcut">&#8679;F11</span>
        </button>
        <button class="ctrl-btn" data-action="pause" title="Pause">
          &#10074;&#10074;
        </button>
      </div>
      <div class="command-section">
        <div class="section-label">Commands</div>
        <div class="command-list"></div>
      </div>
      <div class="variables-section">
        <div class="section-label">Variables</div>
        <div class="variables-list"></div>
      </div>
      <div class="timeline-section">
        <div class="timeline-bar">
          <div class="timeline-progress" style="width: 0%"></div>
        </div>
        <div class="timeline-label">Ready</div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // Command & Variable Rendering
  // ─────────────────────────────────────────────────────────────

  private updateCommandList(snapshot: DebugSnapshot): void {
    if (!this.controller) return;

    const history = this.controller.getHistory();
    // Show context: last 3 commands + current
    const contextSize = 4;
    const startIdx = Math.max(0, history.length - contextSize);
    const context = history.slice(startIdx);

    this.commandListEl.innerHTML = context
      .map((s, i) => {
        const isCurrent = s.index === snapshot.index;
        const cls = isCurrent ? 'current' : i < context.length - 1 ? 'past' : 'future';
        return `<div class="command-line ${cls}">${escapeHtml(s.commandName)}</div>`;
      })
      .join('');
  }

  private updateVariables(snapshot: DebugSnapshot): void {
    const entries = Object.entries(snapshot.variables);
    this.variablesEl.innerHTML = entries
      .map(([name, value]) => {
        const isElement = typeof value === 'string' && value.startsWith('<') && value.endsWith('>');
        const valClass = isElement ? 'var-value element-ref' : 'var-value';
        return `
          <div class="var-row">
            <span class="var-name">${escapeHtml(name)}</span>
            <span class="${valClass}" ${isElement ? `data-highlight="${escapeHtml(String(value))}"` : ''}>
              ${escapeHtml(formatValue(value))}
            </span>
          </div>
        `;
      })
      .join('');

    // Wire element highlighting on click
    this.variablesEl.querySelectorAll('.element-ref').forEach(el => {
      el.addEventListener('click', () => {
        // Try to find the element by the description
        const desc = (el as HTMLElement).dataset.highlight || '';
        const match = desc.match(/^<(\w+)(?:#([\w-]+))?(?:\.([\w.-]+))?>/);
        if (match) {
          const selector = [
            match[1],
            match[2] ? `#${match[2]}` : '',
            match[3] ? `.${match[3].replace(/\./g, '.')}` : '',
          ].join('');
          const target = document.querySelector(selector);
          if (target) this.highlighter.highlight(target);
        }
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Controls Wiring
  // ─────────────────────────────────────────────────────────────

  private wireControls(): void {
    this.panel.addEventListener('click', e => {
      const target = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
      if (!target || !this.controller) return;

      const action = target.dataset.action;
      switch (action) {
        case 'continue':
          this.controller.continue();
          break;
        case 'stepOver':
          this.controller.stepOver();
          break;
        case 'stepInto':
          this.controller.stepInto();
          break;
        case 'stepOut':
          this.controller.stepOut();
          break;
        case 'pause':
          this.controller.pause();
          break;
        case 'close':
          this.hide();
          break;
      }
    });
  }

  private wireKeyboard(): void {
    document.addEventListener('keydown', e => {
      if (!this.controller || !this.controller.enabled) return;
      // Don't intercept if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case 'F8':
          e.preventDefault();
          this.controller.continue();
          break;
        case 'F10':
          e.preventDefault();
          this.controller.stepOver();
          break;
        case 'F11':
          e.preventDefault();
          if (e.shiftKey) {
            this.controller.stepOut();
          } else {
            this.controller.stepInto();
          }
          break;
      }
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    return value.length > 50 ? `"${value.slice(0, 47)}..."` : `"${value}"`;
  }
  return String(value);
}
