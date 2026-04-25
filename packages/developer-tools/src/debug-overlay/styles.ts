/**
 * Debug overlay CSS — injected into Shadow DOM for isolation.
 * Dark theme matching browser DevTools aesthetic.
 */

export const OVERLAY_CSS = `
:host {
  --dbg-bg: #1e1e2e;
  --dbg-bg-alt: #282840;
  --dbg-border: #3e3e5e;
  --dbg-text: #cdd6f4;
  --dbg-text-dim: #7f849c;
  --dbg-accent: #89b4fa;
  --dbg-green: #a6e3a1;
  --dbg-yellow: #f9e2af;
  --dbg-red: #f38ba8;
  --dbg-orange: #fab387;
  --dbg-font: 'SF Mono', 'Fira Code', 'JetBrains Mono', 'Menlo', monospace;
  --dbg-font-size: 12px;

  all: initial;
  position: fixed;
  bottom: 12px;
  right: 12px;
  z-index: 2147483647;
  font-family: var(--dbg-font);
  font-size: var(--dbg-font-size);
  color: var(--dbg-text);
  line-height: 1.4;
}

.debugger-panel {
  background: var(--dbg-bg);
  border: 1px solid var(--dbg-border);
  border-radius: 8px;
  width: 380px;
  max-height: 500px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
}

/* ── Header ── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--dbg-bg-alt);
  border-bottom: 1px solid var(--dbg-border);
  cursor: move;
  user-select: none;
}

.header-title {
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--dbg-accent);
}

.header-status {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 600;
}

.header-status.paused {
  background: var(--dbg-yellow);
  color: #1e1e2e;
}

.header-status.running {
  background: var(--dbg-green);
  color: #1e1e2e;
}

.close-btn {
  background: none;
  border: none;
  color: var(--dbg-text-dim);
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
  line-height: 1;
}

.close-btn:hover {
  color: var(--dbg-red);
}

/* ── Controls ── */
.controls {
  display: flex;
  gap: 2px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--dbg-border);
}

.ctrl-btn {
  background: var(--dbg-bg-alt);
  border: 1px solid var(--dbg-border);
  color: var(--dbg-text);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-family: var(--dbg-font);
  transition: background 0.1s;
}

.ctrl-btn:hover {
  background: var(--dbg-border);
}

.ctrl-btn:active {
  background: var(--dbg-accent);
  color: var(--dbg-bg);
}

.ctrl-btn .shortcut {
  color: var(--dbg-text-dim);
  font-size: 9px;
  margin-left: 4px;
}

/* ── Command List ── */
.command-section {
  padding: 6px 10px;
  border-bottom: 1px solid var(--dbg-border);
  max-height: 140px;
  overflow-y: auto;
}

.section-label {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--dbg-text-dim);
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.command-line {
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
}

.command-line.current {
  background: rgba(137, 180, 250, 0.15);
  border-left: 2px solid var(--dbg-accent);
  color: var(--dbg-accent);
  font-weight: 600;
}

.command-line.past {
  color: var(--dbg-text-dim);
}

.command-line.future {
  color: var(--dbg-text);
}

/* ── Variables ── */
.variables-section {
  padding: 6px 10px;
  border-bottom: 1px solid var(--dbg-border);
  max-height: 160px;
  overflow-y: auto;
}

.var-row {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
  gap: 8px;
}

.var-name {
  color: var(--dbg-orange);
  flex-shrink: 0;
}

.var-value {
  color: var(--dbg-green);
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.var-value.element-ref {
  color: var(--dbg-accent);
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;
}

.var-value.element-ref:hover {
  color: var(--dbg-yellow);
}

/* ── Timeline ── */
.timeline-section {
  padding: 8px 10px;
}

.timeline-bar {
  height: 6px;
  background: var(--dbg-bg-alt);
  border-radius: 3px;
  position: relative;
  cursor: pointer;
}

.timeline-progress {
  height: 100%;
  background: var(--dbg-accent);
  border-radius: 3px;
  transition: width 0.15s;
}

.timeline-label {
  font-size: 10px;
  color: var(--dbg-text-dim);
  margin-top: 4px;
  display: flex;
  justify-content: space-between;
}

/* ── Collapsed State ── */
.debugger-panel.collapsed .command-section,
.debugger-panel.collapsed .variables-section,
.debugger-panel.collapsed .timeline-section {
  display: none;
}

.debugger-panel.collapsed {
  width: auto;
}

/* ── Scrollbar ── */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--dbg-border);
  border-radius: 3px;
}
`;
