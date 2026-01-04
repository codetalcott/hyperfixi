/**
 * Compiled Generator
 *
 * Generates minimal runtime code from compiled handlers.
 * No parser needed - all hyperscript is pre-compiled to JS.
 *
 * Target: ~500 bytes gzipped for simple handlers
 */

import type { CompiledHandler } from './compiler';

export interface CompiledBundleOptions {
  /** Compiled handlers */
  handlers: CompiledHandler[];

  /** Whether any handler needs locals */
  needsLocals: boolean;

  /** Whether any handler needs globals */
  needsGlobals: boolean;

  /** Global variable name */
  globalName?: string;

  /** Enable htmx integration */
  htmx?: boolean;

  /** Include source maps / debug info */
  debug?: boolean;
}

/**
 * Generate a source map table showing original hyperscript → compiled handler ID.
 * Included in bundle header when debug mode is enabled.
 */
function generateSourceMapTable(handlers: CompiledHandler[]): string {
  if (handlers.length === 0) return '';

  const lines = [
    ' *',
    ' * Handler Source Map:',
    ' * ┌─────────────────────────────────────────────────────────────────┐',
  ];

  for (const h of handlers) {
    const original = h.original.replace(/\n/g, ' ').slice(0, 40);
    const truncated = original.length < h.original.length ? original + '...' : original;
    lines.push(` * │ ${h.id.padEnd(20)} ← ${truncated.padEnd(40)} │`);
  }

  lines.push(' * └─────────────────────────────────────────────────────────────────┘');
  lines.push(' *');

  return lines.join('\n');
}

/**
 * Generate minimal runtime bundle from compiled handlers
 */
export function generateCompiledBundle(options: CompiledBundleOptions): string {
  const {
    handlers,
    needsLocals,
    needsGlobals,
    globalName = 'hyperfixi',
    htmx = false,
    debug = false,
  } = options;

  // Generate handler map with optional debug comments
  const handlerEntries = handlers.map(h => {
    const isAsync = h.code.includes('await');
    const fn = isAsync
      ? `async(m,e,y)=>{${h.code}}`
      : `(m,e,y)=>{${h.code}}`;

    if (debug) {
      // Include original hyperscript as comment for debugging
      const escapedOriginal = h.original.replace(/\*/g, '\\*').replace(/\n/g, ' ');
      return `\n  /* ${escapedOriginal} */\n  ${h.id}:${fn}`;
    }
    return `${h.id}:${fn}`;
  });

  // Generate event registration for each handler
  const registrations = handlers.map(h => {
    const modsCode = generateModifiersCode(h);
    return `    case '${h.id}': r(el,'${h.event}',H.${h.id}${modsCode}); break;`;
  });

  const localsCode = needsLocals ? 'const L={};' : '';
  const globalsCode = needsGlobals ? 'const G={};' : '';

  // Generate source map table for debug mode
  const sourceMapTable = debug ? generateSourceMapTable(handlers) : '';

  return `/**
 * HyperFixi Compiled Bundle (Auto-Generated)
 *
 * Pre-compiled hyperscript - no runtime parser needed!
 * Handlers: ${handlers.length}
 *
 * DO NOT EDIT - Regenerate with build.
${sourceMapTable} */

${localsCode}${globalsCode}
const H={${handlerEntries.join(',')}};

function r(el,ev,fn${hasModifiers(handlers) ? ',m' : ''}){
  let h=fn;
${generateModifierWrappers(handlers)}
  el.addEventListener(ev,h${hasOnce(handlers) ? ',{once:m?.o}' : ''});
}

function init(root=document){
  root.querySelectorAll('[data-h]').forEach(el=>{
    switch(el.dataset.h){
${registrations.join('\n')}
    }
  });
}

${htmx ? `document.addEventListener('htmx:afterSettle',e=>init(e.detail?.target));` : ''}

const api={
  version:'1.0.0-compiled',
  commands:${JSON.stringify(handlers.map(h => h.id))},
  init,
  process:init,
};

if(typeof window!=='undefined'){
  window.${globalName}=api;
  window._hyperscript=api;
  document.readyState==='loading'
    ?document.addEventListener('DOMContentLoaded',()=>init())
    :init();
}

export default api;
export{api,init};
`;
}

/**
 * Generate modifiers code for a handler registration
 */
function generateModifiersCode(h: CompiledHandler): string {
  const mods: string[] = [];

  if (h.modifiers.prevent) mods.push('p:1');
  if (h.modifiers.stop) mods.push('s:1');
  if (h.modifiers.once) mods.push('o:1');
  if (h.modifiers.debounce) mods.push(`d:${h.modifiers.debounce}`);
  if (h.modifiers.throttle) mods.push(`t:${h.modifiers.throttle}`);

  if (mods.length === 0) return '';
  return `,{${mods.join(',')}}`;
}

/**
 * Check if any handler has modifiers
 */
function hasModifiers(handlers: CompiledHandler[]): boolean {
  return handlers.some(h =>
    h.modifiers.prevent ||
    h.modifiers.stop ||
    h.modifiers.once ||
    h.modifiers.debounce ||
    h.modifiers.throttle
  );
}

/**
 * Check if any handler has .once modifier
 */
function hasOnce(handlers: CompiledHandler[]): boolean {
  return handlers.some(h => h.modifiers.once);
}

/**
 * Generate modifier wrapper code
 */
function generateModifierWrappers(handlers: CompiledHandler[]): string {
  const lines: string[] = [];

  if (handlers.some(h => h.modifiers.prevent || h.modifiers.stop)) {
    lines.push(`  if(m?.p||m?.s){const _h=h;h=e=>{m.p&&e.preventDefault();m.s&&e.stopPropagation();_h(e.currentTarget,e,e.target)};}`);
  }

  if (handlers.some(h => h.modifiers.debounce)) {
    lines.push(`  if(m?.d){let t;const _h=h;h=e=>{clearTimeout(t);t=setTimeout(()=>_h(e.currentTarget,e,e.target),m.d)};}`);
  }

  if (handlers.some(h => h.modifiers.throttle)) {
    lines.push(`  if(m?.t){let l=0;const _h=h;h=e=>{const n=Date.now();if(n-l>=m.t){l=n;_h(e.currentTarget,e,e.target)}};}`);
  }

  return lines.join('\n');
}

/**
 * Generate the HTML transformer output
 *
 * Transforms: <button _="on click toggle .active">
 * To:         <button data-h="click_toggle_3a2b">
 */
export function generateTransformMap(handlers: CompiledHandler[]): Map<string, string> {
  const map = new Map<string, string>();

  for (const h of handlers) {
    map.set(h.original, h.id);
  }

  return map;
}

/**
 * Handler manifest entry for debugging
 */
export interface HandlerManifestEntry {
  /** Semantic handler ID (e.g., click_toggle_3a2b) */
  id: string;
  /** Event that triggers this handler */
  event: string;
  /** Primary command */
  command: string;
  /** Original hyperscript source */
  original: string;
  /** Compiled JavaScript code */
  compiled: string;
  /** Event modifiers */
  modifiers: {
    prevent?: boolean;
    stop?: boolean;
    once?: boolean;
    debounce?: number;
    throttle?: number;
  };
}

/**
 * Generate a JSON manifest for debugging.
 * Can be written to a separate file or used in devtools.
 *
 * @example
 * // In vite plugin:
 * const manifest = generateManifest(handlers);
 * fs.writeFileSync('hyperfixi-manifest.json', JSON.stringify(manifest, null, 2));
 */
export function generateManifest(handlers: CompiledHandler[]): HandlerManifestEntry[] {
  return handlers.map(h => {
    // Extract command from semantic ID (click_toggle_3a2b → toggle)
    const parts = h.id.split('_');
    const command = parts.length >= 2 ? parts[1] : 'unknown';

    return {
      id: h.id,
      event: h.event,
      command,
      original: h.original,
      compiled: h.code,
      modifiers: h.modifiers,
    };
  });
}

/**
 * Generate a human-readable debug report.
 * Useful for console output or log files.
 */
export function generateDebugReport(handlers: CompiledHandler[]): string {
  const lines = [
    '╔══════════════════════════════════════════════════════════════════╗',
    '║           HyperFixi Compiled Handlers Debug Report              ║',
    '╠══════════════════════════════════════════════════════════════════╣',
    '',
  ];

  for (const h of handlers) {
    lines.push(`┌── ${h.id} ──────────────────────────────────────────────`);
    lines.push(`│ Event:    ${h.event}`);
    lines.push(`│ Original: ${h.original}`);
    lines.push(`│ Compiled: ${h.code}`);
    if (Object.values(h.modifiers).some(Boolean)) {
      const mods = Object.entries(h.modifiers)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      lines.push(`│ Modifiers: ${mods}`);
    }
    lines.push('└─────────────────────────────────────────────────────────────');
    lines.push('');
  }

  lines.push('╚══════════════════════════════════════════════════════════════════╝');

  return lines.join('\n');
}
