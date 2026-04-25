/**
 * Init Block Pre-Rendering
 *
 * Analyzes init blocks for pure/static DOM writes and applies them directly
 * to the HTML template at build time, eliminating flash-of-empty-content.
 *
 * Pure commands are those that:
 * - Write to the DOM (put, add class, remove class, set attribute)
 * - Target a statically-known #id selector
 * - Use literal values (not variables, expressions, or function calls)
 *
 * Pre-rendered commands are stripped from the init block in the output HTML.
 * Impure commands remain for normal runtime execution.
 */

import type {
  ASTNode,
  CommandNode,
  SelectorNode,
  LiteralNode,
  PreRenderResult,
} from '../types/aot-types.js';

// =============================================================================
// PURITY ANALYSIS
// =============================================================================

/**
 * A command classified as pure and safe to pre-render.
 */
export interface PureCommand {
  type: 'addClass' | 'removeClass' | 'putContent' | 'setAttribute';
  /** CSS ID selector target (without #) */
  targetId: string;
  /** Value to apply */
  value: string;
  /** For setAttribute: attribute name */
  attrName?: string;
}

/**
 * Classify a command as pure (pre-renderable) or impure.
 * Only #id targets are supported — class/complex selectors are left for runtime.
 */
export function classifyCommand(node: ASTNode): PureCommand | null {
  if (node.type !== 'command') return null;
  const cmd = node as CommandNode;

  switch (cmd.name) {
    case 'add':
      return classifyAddCommand(cmd);
    case 'remove':
      return classifyRemoveCommand(cmd);
    case 'put':
      return classifyPutCommand(cmd);
    case 'set':
      return classifySetCommand(cmd);
    default:
      return null;
  }
}

function getIdTarget(cmd: CommandNode): string | null {
  if (!cmd.target) return null;
  if (cmd.target.type !== 'selector') return null;
  const sel = (cmd.target as SelectorNode).value;
  if (!sel.startsWith('#')) return null;
  return sel.slice(1);
}

function classifyAddCommand(cmd: CommandNode): PureCommand | null {
  const targetId = getIdTarget(cmd);
  if (!targetId) return null;

  const args = cmd.args ?? [];
  if (args.length === 0) return null;

  const arg = args[0];
  if (arg.type !== 'selector') return null;
  const val = (arg as SelectorNode).value;
  if (!val.startsWith('.')) return null;

  return { type: 'addClass', targetId, value: val.slice(1) };
}

function classifyRemoveCommand(cmd: CommandNode): PureCommand | null {
  const targetId = getIdTarget(cmd);
  if (!targetId) return null;

  const args = cmd.args ?? [];
  if (args.length === 0) return null;

  const arg = args[0];
  if (arg.type !== 'selector') return null;
  const val = (arg as SelectorNode).value;
  if (!val.startsWith('.')) return null;

  return { type: 'removeClass', targetId, value: val.slice(1) };
}

function classifyPutCommand(cmd: CommandNode): PureCommand | null {
  const targetId = getIdTarget(cmd);
  if (!targetId) return null;

  const args = cmd.args ?? [];
  if (args.length === 0) return null;

  const arg = args[0];
  if (arg.type !== 'literal') return null;
  const val = (arg as LiteralNode).value;
  if (typeof val !== 'string') return null;

  return { type: 'putContent', targetId, value: val };
}

function classifySetCommand(cmd: CommandNode): PureCommand | null {
  // Only support set @attr to 'value' form
  const targetId = getIdTarget(cmd);
  if (!targetId) return null;

  const args = cmd.args ?? [];
  if (args.length < 2) return null;

  // First arg should be identifier starting with @
  const attrArg = args[0];
  if (attrArg.type !== 'identifier') return null;
  const attrValue = (attrArg as { value?: string }).value;
  if (!attrValue || !attrValue.startsWith('@')) return null;
  const attrName = attrValue.slice(1);

  // Second arg should be literal value
  const valArg = args[1];
  if (valArg.type !== 'literal') return null;
  const val = (valArg as LiteralNode).value;
  if (typeof val !== 'string' && typeof val !== 'number') return null;

  return { type: 'setAttribute', targetId, value: String(val), attrName };
}

/**
 * Classify all commands in an init block as pure or impure.
 */
export function classifyInitCommands(commands: ASTNode[]): {
  pure: { index: number; command: PureCommand }[];
  impure: { index: number; node: ASTNode }[];
} {
  const pure: { index: number; command: PureCommand }[] = [];
  const impure: { index: number; node: ASTNode }[] = [];

  for (let i = 0; i < commands.length; i++) {
    const classified = classifyCommand(commands[i]);
    if (classified) {
      pure.push({ index: i, command: classified });
    } else {
      impure.push({ index: i, node: commands[i] });
    }
  }

  return { pure, impure };
}

// =============================================================================
// HTML MUTATION
// =============================================================================

/**
 * Apply a pure command to an HTML string, modifying the target element in-place.
 * Returns the modified HTML, or the original if the target element was not found.
 */
export function applyPureCommand(html: string, cmd: PureCommand): string {
  switch (cmd.type) {
    case 'addClass':
      return addClassToElement(html, cmd.targetId, cmd.value);
    case 'removeClass':
      return removeClassFromElement(html, cmd.targetId, cmd.value);
    case 'putContent':
      return putContentIntoElement(html, cmd.targetId, cmd.value);
    case 'setAttribute':
      return setAttributeOnElement(html, cmd.targetId, cmd.attrName!, cmd.value);
    default:
      return html;
  }
}

/**
 * Find an element by ID in HTML and apply a transform to its opening tag.
 * Returns original HTML if element not found.
 */
function transformElementById(
  html: string,
  id: string,
  transform: (openingTag: string) => string
): string {
  // Match opening tag containing id="<id>"
  const idPattern = new RegExp(`(<[^>]*\\bid=["']${escapeRegExp(id)}["'][^>]*>)`, 'i');
  const match = html.match(idPattern);
  if (!match) return html;

  return html.replace(match[1], transform(match[1]));
}

function addClassToElement(html: string, id: string, className: string): string {
  return transformElementById(html, id, tag => {
    const classMatch = tag.match(/\bclass=["']([^"']*)["']/i);
    if (classMatch) {
      const existing = classMatch[1];
      const classes = existing.split(/\s+/).filter(Boolean);
      if (!classes.includes(className)) {
        classes.push(className);
      }
      return tag.replace(classMatch[0], `class="${classes.join(' ')}"`);
    }
    // No existing class attribute — add one before the closing >
    return tag.replace(/>$/, ` class="${className}">`);
  });
}

function removeClassFromElement(html: string, id: string, className: string): string {
  return transformElementById(html, id, tag => {
    const classMatch = tag.match(/\bclass=["']([^"']*)["']/i);
    if (!classMatch) return tag;
    const classes = classMatch[1].split(/\s+/).filter(c => c !== className);
    if (classes.length === 0) {
      return tag.replace(classMatch[0], '').replace(/\s+>/, '>');
    }
    return tag.replace(classMatch[0], `class="${classes.join(' ')}"`);
  });
}

function putContentIntoElement(html: string, id: string, content: string): string {
  // Match opening tag, then capture everything until matching closing tag
  const idPattern = new RegExp(
    `(<[a-zA-Z][^>]*\\bid=["']${escapeRegExp(id)}["'][^>]*>)((?:(?!<\\/[a-zA-Z]).)*?)(<\\/[a-zA-Z][^>]*>)`,
    'is'
  );
  const match = html.match(idPattern);
  if (!match) return html;

  return html.replace(match[0], `${match[1]}${escapeHtml(content)}${match[3]}`);
}

function setAttributeOnElement(html: string, id: string, attrName: string, value: string): string {
  return transformElementById(html, id, tag => {
    const attrPattern = new RegExp(`\\b${escapeRegExp(attrName)}=["'][^"']*["']`, 'i');
    const attrMatch = tag.match(attrPattern);
    if (attrMatch) {
      return tag.replace(attrMatch[0], `${attrName}="${escapeHtml(value)}"`);
    }
    return tag.replace(/>$/, ` ${attrName}="${escapeHtml(value)}">`);
  });
}

// =============================================================================
// UTILITIES
// =============================================================================

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Pre-render pure init commands into an HTML template.
 *
 * @param html - The HTML template string
 * @param initCommands - Parsed commands from an init block
 * @returns Modified HTML, remaining impure commands, and count of pre-rendered commands
 */
export function preRenderInitBlock(html: string, initCommands: ASTNode[]): PreRenderResult {
  const { pure, impure } = classifyInitCommands(initCommands);

  let modifiedHtml = html;
  let preRenderedCount = 0;

  for (const { command } of pure) {
    const before = modifiedHtml;
    modifiedHtml = applyPureCommand(modifiedHtml, command);
    if (modifiedHtml !== before) {
      preRenderedCount++;
    }
  }

  return {
    html: modifiedHtml,
    remainingInitCommands: impure.map(i => i.node),
    preRenderedCount,
  };
}
