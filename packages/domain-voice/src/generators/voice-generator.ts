/**
 * Voice/Accessibility Code Generator
 *
 * Transforms semantic AST nodes into executable JavaScript snippets
 * for DOM manipulation, navigation, and accessibility actions.
 */

import type { CodeGenerator, SemanticNode } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

// =============================================================================
// String Escaping
// =============================================================================

function esc(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/`/g, '\\`')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\$/g, '\\$');
}

// =============================================================================
// Shared Element-Finding Helper (injected into generated code)
// Self-initializing guard: safe to include multiple times, defines only once.
// =============================================================================

const FIND_EL = [
  `if(!window._findEl){window._findEl=function(q,root){`,
  `  root=root||document;`,
  `  if(q.startsWith('#')||q.startsWith('.')||q.includes('[')){`,
  `    try{return root.querySelector(q)}catch(e){}`,
  `  }`,
  `  var el=root.querySelector('[aria-label="'+q+'"]');`,
  `  if(el)return el;`,
  `  el=root.querySelector('[role="'+q+'"]');`,
  `  if(el)return el;`,
  `  var c=root.querySelectorAll('button,a,input,[role="button"],[tabindex]');`,
  `  var lq=q.toLowerCase();`,
  `  for(var i=0;i<c.length;i++){`,
  `    if((c[i].textContent||'').toLowerCase().includes(lq))return c[i];`,
  `    if((c[i].getAttribute('aria-label')||'').toLowerCase().includes(lq))return c[i];`,
  `  }`,
  `  return null;`,
  `}}`,
].join('');

// =============================================================================
// i18n Word Sets (all 8 languages)
// =============================================================================

const SELECT_ALL_WORDS = new Set(['all', 'todo', '全て', '全部', 'الكل', '전체', 'hepsi', 'tout']);
const TAB_WORDS = new Set(['tab', 'pestaña', 'タブ', '탭', '标签', 'sekme', 'onglet']);
const DIALOG_WORDS = new Set([
  'dialog',
  'modal',
  'diálogo',
  'ダイアログ',
  '대화상자',
  '对话框',
  'diyalog',
  'dialogue',
]);
const PAGE_WORDS = new Set(['page', 'página', 'ページ', 'الصفحة', '페이지', '页面', 'sayfa']);

// =============================================================================
// Per-Command Generators
// =============================================================================

function generateNavigate(node: SemanticNode): string {
  const dest = extractRoleValue(node, 'destination');
  if (!dest) return '// navigate: missing destination';
  if (dest.startsWith('/') || dest.startsWith('http')) {
    return `window.location.href = '${esc(dest)}';`;
  }
  return [
    FIND_EL,
    `var el = _findEl('${esc(dest)}');`,
    `if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });`,
    `else window.location.hash = '${esc(dest)}';`,
  ].join('\n');
}

function generateClick(node: SemanticNode): string {
  const patient = extractRoleValue(node, 'patient');
  if (!patient) return '// click: missing target';
  return [FIND_EL, `var el = _findEl('${esc(patient)}');`, `if (el) el.click();`].join('\n');
}

function generateType(node: SemanticNode): string {
  const text = extractRoleValue(node, 'patient');
  if (!text) return '// type: missing text';
  const dest = extractRoleValue(node, 'destination');
  const target = dest
    ? `_findEl('${esc(dest)}') || document.activeElement`
    : `document.activeElement`;
  return [
    FIND_EL,
    `var el = ${target};`,
    `if (el && ('value' in el || el.isContentEditable)) {`,
    `  if ('value' in el) { el.value = (el.value || '') + '${esc(text)}'; }`,
    `  else { el.textContent = (el.textContent || '') + '${esc(text)}'; }`,
    `  el.dispatchEvent(new Event('input', { bubbles: true }));`,
    `}`,
  ].join('\n');
}

function generateScroll(node: SemanticNode): string {
  const manner = (extractRoleValue(node, 'manner') || 'down').toLowerCase();
  const quantity = extractRoleValue(node, 'quantity');
  const px = quantity ? parseInt(quantity, 10) || 300 : 300;

  switch (manner) {
    case 'up':
      return `window.scrollBy({ top: -${px}, behavior: 'smooth' });`;
    case 'down':
      return `window.scrollBy({ top: ${px}, behavior: 'smooth' });`;
    case 'left':
      return `window.scrollBy({ left: -${px}, behavior: 'smooth' });`;
    case 'right':
      return `window.scrollBy({ left: ${px}, behavior: 'smooth' });`;
    case 'top':
      return `window.scrollTo({ top: 0, behavior: 'smooth' });`;
    case 'bottom':
      return `window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });`;
    default:
      return `window.scrollBy({ top: ${px}, behavior: 'smooth' });`;
  }
}

function generateRead(node: SemanticNode): string {
  const patient = extractRoleValue(node, 'patient');
  if (!patient) return '// read: missing target';
  return [
    FIND_EL,
    `var el = _findEl('${esc(patient)}');`,
    `if (el && el.textContent) {`,
    `  var utterance = new SpeechSynthesisUtterance(el.textContent);`,
    `  speechSynthesis.speak(utterance);`,
    `}`,
  ].join('\n');
}

function generateZoom(node: SemanticNode): string {
  const manner = (extractRoleValue(node, 'manner') || 'in').toLowerCase();
  if (manner === 'reset') {
    return [
      `document.documentElement.dataset.zoom = '1';`,
      `document.documentElement.style.transform = '';`,
    ].join('\n');
  }
  const factor = manner === 'out' ? 0.9 : 1.1;
  return [
    `var s = parseFloat(document.documentElement.dataset.zoom || '1');`,
    `s = Math.round(s * ${factor} * 100) / 100;`,
    `document.documentElement.dataset.zoom = s;`,
    `document.documentElement.style.transform = 'scale(' + s + ')';`,
    `document.documentElement.style.transformOrigin = 'top left';`,
  ].join('\n');
}

function generateSelect(node: SemanticNode): string {
  const patient = extractRoleValue(node, 'patient');
  if (!patient) return '// select: missing target';
  const target = SELECT_ALL_WORDS.has(patient) ? 'document.body' : `_findEl('${esc(patient)}')`;
  const lines = SELECT_ALL_WORDS.has(patient) ? [] : [FIND_EL];
  lines.push(
    `var el = ${target};`,
    `if (el) {`,
    `  var range = document.createRange();`,
    `  range.selectNodeContents(el);`,
    `  var sel = window.getSelection();`,
    `  sel.removeAllRanges();`,
    `  sel.addRange(range);`,
    `}`
  );
  return lines.join('\n');
}

function generateBack(node: SemanticNode): string {
  const quantity = extractRoleValue(node, 'quantity');
  const n = quantity ? parseInt(quantity, 10) || 1 : 1;
  return `history.go(-${n});`;
}

function generateForward(node: SemanticNode): string {
  const quantity = extractRoleValue(node, 'quantity');
  const n = quantity ? parseInt(quantity, 10) || 1 : 1;
  return `history.go(${n});`;
}

function generateFocus(node: SemanticNode): string {
  const patient = extractRoleValue(node, 'patient');
  if (!patient) return '// focus: missing target';
  return [FIND_EL, `var el = _findEl('${esc(patient)}');`, `if (el) el.focus();`].join('\n');
}

function generateClose(node: SemanticNode): string {
  const patient = extractRoleValue(node, 'patient') || '';
  if (TAB_WORDS.has(patient)) {
    return `window.close();`;
  }
  if (DIALOG_WORDS.has(patient)) {
    return `var d = document.querySelector('dialog[open]'); if (d) d.close();`;
  }
  // Default: try to close any open dialog or modal
  return [
    `var d = document.querySelector('dialog[open]');`,
    `if (d) { d.close(); }`,
    `else {`,
    `  var m = document.querySelector('[role="dialog"], .modal.show, .modal.open');`,
    `  if (m) m.remove();`,
    `}`,
  ].join('\n');
}

function generateOpen(node: SemanticNode): string {
  const patient = extractRoleValue(node, 'patient');
  if (!patient) return '// open: missing target';
  if (patient.startsWith('/') || patient.startsWith('http')) {
    return `window.open('${esc(patient)}', '_blank');`;
  }
  return [FIND_EL, `var el = _findEl('${esc(patient)}');`, `if (el) el.click();`].join('\n');
}

function generateSearch(node: SemanticNode): string {
  const query = extractRoleValue(node, 'patient');
  if (!query) return '// search: missing query';
  const dest = extractRoleValue(node, 'destination');
  if (dest && PAGE_WORDS.has(dest)) {
    // window.find() is non-standard but no standard alternative exists for "find in page"
    return `window.find('${esc(query)}');`;
  }
  const selector = dest
    ? `'${esc(dest)}'`
    : `'input[type="search"], [role="searchbox"], input[name="q"], input[name="search"]'`;
  return [
    `var searchInput = document.querySelector(${selector});`,
    `if (searchInput) {`,
    `  searchInput.value = '${esc(query)}';`,
    `  searchInput.dispatchEvent(new Event('input', { bubbles: true }));`,
    `  if (searchInput.form) searchInput.form.submit();`,
    `}`,
  ].join('\n');
}

function generateHelp(node: SemanticNode): string {
  const topic = extractRoleValue(node, 'patient');
  const commands = [
    'navigate',
    'click',
    'type',
    'scroll',
    'read',
    'zoom',
    'select',
    'back',
    'forward',
    'focus',
    'close',
    'open',
    'search',
    'help',
  ];
  if (topic) {
    return `console.log('Help: ${esc(topic)}');`;
  }
  return `console.log('Available commands: ${commands.join(', ')}');`;
}

// =============================================================================
// Public Code Generator
// =============================================================================

export const voiceCodeGenerator: CodeGenerator = {
  generate(node: SemanticNode): string {
    switch (node.action) {
      case 'navigate':
        return generateNavigate(node);
      case 'click':
        return generateClick(node);
      case 'type':
        return generateType(node);
      case 'scroll':
        return generateScroll(node);
      case 'read':
        return generateRead(node);
      case 'zoom':
        return generateZoom(node);
      case 'select':
        return generateSelect(node);
      case 'back':
        return generateBack(node);
      case 'forward':
        return generateForward(node);
      case 'focus':
        return generateFocus(node);
      case 'close':
        return generateClose(node);
      case 'open':
        return generateOpen(node);
      case 'search':
        return generateSearch(node);
      case 'help':
        return generateHelp(node);
      default:
        return `// Unknown voice command: ${node.action}`;
    }
  },
};
