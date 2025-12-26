/**
 * Semantic syntax highlighting for hyperscript code blocks.
 *
 * Uses semantic roles from @hyperfixi/semantic for meaningful highlighting:
 * - action: Commands/verbs (toggle, add, remove, fetch, set, etc.)
 * - agent: The entity performing the action (me, target, it)
 * - patient: What's being acted upon (CSS selectors, attributes)
 * - event: Event triggers (click, keydown, submit)
 * - condition: Conditional keywords (if, else, when)
 * - modifier: Adverbs/modifiers (debounced, throttled, once)
 * - literal: Strings, numbers, durations
 * - structure: Control flow (on, end, then, from)
 */

// Semantic role categories for hyperscript tokens
const ACTIONS = new Set([
  // DOM manipulation
  'add', 'remove', 'toggle', 'set', 'put', 'get', 'take',
  'append', 'prepend', 'show', 'hide', 'transition',
  // Navigation/fetching
  'fetch', 'go', 'push', 'replace', 'morph', 'swap', 'process',
  // Control flow
  'call', 'return', 'halt', 'throw', 'trigger', 'send', 'log',
  'make', 'install', 'init', 'settle', 'wait',
  // Repeat actions
  'increment', 'decrement',
]);

const EVENTS = new Set([
  'click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mouseout',
  'mousemove', 'mouseenter', 'mouseleave', 'contextmenu',
  'keydown', 'keyup', 'keypress', 'input', 'change', 'submit', 'reset',
  'focus', 'blur', 'focusin', 'focusout',
  'scroll', 'resize', 'load', 'unload', 'error', 'abort',
  'drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop',
  'touchstart', 'touchend', 'touchmove', 'touchcancel',
  'animationstart', 'animationend', 'animationiteration',
  'transitionstart', 'transitionend', 'transitionrun', 'transitioncancel',
  'pointerdown', 'pointerup', 'pointermove', 'pointerover', 'pointerout',
  'wheel', 'copy', 'cut', 'paste', 'select',
  'intersection', 'mutation',
]);

const AGENTS = new Set([
  'me', 'my', 'I', 'it', 'its', 'you', 'your', 'result', 'target', 'detail',
  'body', 'window', 'document', 'event',
]);

const CONDITIONS = new Set([
  'if', 'else', 'unless', 'when', 'while', 'until',
  'and', 'or', 'not', 'no', 'is', 'am', 'are', 'was', 'be',
  'matches', 'contains', 'exists', 'empty',
]);

const MODIFIERS = new Set([
  'debounced', 'throttled', 'once', 'async', 'immediately',
  'first', 'last', 'next', 'previous', 'random', 'closest', 'parent',
  'innerHTML', 'innerText', 'outerHTML', 'textContent', 'value',
]);

const STRUCTURE = new Set([
  'on', 'every', 'from', 'end', 'then', 'def', 'behavior', 'worker',
  'repeat', 'for', 'in', 'forever', 'try', 'catch', 'finally',
  'into', 'to', 'with', 'at', 'as', 'by', 'using', 'url', 'partials',
  'the', 'a', 'an', 'view',
]);

// Semantic roles map to CSS classes
type SemanticRole = 'action' | 'agent' | 'patient' | 'event' | 'condition' | 'modifier' | 'structure' | 'literal' | 'comment' | 'text';

interface Token {
  role: SemanticRole;
  value: string;
}

/**
 * Tokenize hyperscript code using semantic roles.
 */
function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    const remaining = code.slice(i);

    // Comments (-- to end of line)
    if (remaining.startsWith('--')) {
      const end = remaining.indexOf('\n');
      const comment = end === -1 ? remaining : remaining.slice(0, end);
      tokens.push({ role: 'comment', value: comment });
      i += comment.length;
      continue;
    }

    // Strings (single or double quoted)
    const stringMatch = remaining.match(/^(['"`])(?:\\.|[^\\])*?\1/);
    if (stringMatch) {
      tokens.push({ role: 'literal', value: stringMatch[0] });
      i += stringMatch[0].length;
      continue;
    }

    // Numbers with optional units (e.g., 2s, 300ms, 50px)
    const numberMatch = remaining.match(/^\d+(?:\.\d+)?(?:s|ms|px|em|rem|%|vh|vw)?/);
    if (numberMatch) {
      tokens.push({ role: 'literal', value: numberMatch[0] });
      i += numberMatch[0].length;
      continue;
    }

    // CSS selectors (#id, .class) - these are "patients" being acted upon
    const selectorMatch = remaining.match(/^[#.]\w[\w-]*/);
    if (selectorMatch) {
      tokens.push({ role: 'patient', value: selectorMatch[0] });
      i += selectorMatch[0].length;
      continue;
    }

    // Attribute selectors [attr]
    const attrMatch = remaining.match(/^\[[\w-]+(?:=[^\]]+)?\]/);
    if (attrMatch) {
      tokens.push({ role: 'patient', value: attrMatch[0] });
      i += attrMatch[0].length;
      continue;
    }

    // @ attribute references
    const atRefMatch = remaining.match(/^@[\w-]+/);
    if (atRefMatch) {
      tokens.push({ role: 'patient', value: atRefMatch[0] });
      i += atRefMatch[0].length;
      continue;
    }

    // Operators
    const operatorMatch = remaining.match(/^(?:===?|!==?|<=?|>=?|&&|\|\||[+\-*/])/);
    if (operatorMatch) {
      tokens.push({ role: 'text', value: operatorMatch[0] });
      i += operatorMatch[0].length;
      continue;
    }

    // Punctuation
    if ('()[]{}:,'.includes(code[i])) {
      tokens.push({ role: 'text', value: code[i] });
      i++;
      continue;
    }

    // Words (categorize by semantic role)
    const wordMatch = remaining.match(/^[a-zA-Z_][\w-]*/);
    if (wordMatch) {
      const word = wordMatch[0];
      const lowerWord = word.toLowerCase();

      if (ACTIONS.has(lowerWord)) {
        tokens.push({ role: 'action', value: word });
      } else if (EVENTS.has(lowerWord)) {
        tokens.push({ role: 'event', value: word });
      } else if (AGENTS.has(word) || AGENTS.has(lowerWord)) {
        tokens.push({ role: 'agent', value: word });
      } else if (CONDITIONS.has(lowerWord)) {
        tokens.push({ role: 'condition', value: word });
      } else if (MODIFIERS.has(lowerWord)) {
        tokens.push({ role: 'modifier', value: word });
      } else if (STRUCTURE.has(lowerWord)) {
        tokens.push({ role: 'structure', value: word });
      } else if (['true', 'false', 'null', 'undefined', 'nothing'].includes(lowerWord)) {
        tokens.push({ role: 'literal', value: word });
      } else {
        tokens.push({ role: 'text', value: word });
      }
      i += word.length;
      continue;
    }

    // Whitespace and other characters
    tokens.push({ role: 'text', value: code[i] });
    i++;
  }

  return tokens;
}

/**
 * Render syntax-highlighted hyperscript code using semantic roles.
 */
export function HyperscriptCode({ code }: { code: string }) {
  const tokens = tokenize(code);

  return (
    <code class="hyperscript-code">
      {tokens.map(token => {
        if (token.role === 'text') {
          return token.value;
        }
        return <span class={`hs-${token.role}`}>{token.value}</span>;
      })}
    </code>
  );
}

/**
 * Render a code block with syntax highlighting and optional copy button.
 */
export function CodeBlock({ code, showCopy = true }: { code: string; showCopy?: boolean }) {
  return (
    <div class="code-block-wrapper">
      <pre class="code-block">
        <HyperscriptCode code={code} />
      </pre>
      {showCopy && (
        <button
          class="copy-btn"
          data-code={code}
          _="on click
             writeText(my @data-code) on navigator.clipboard
             put 'Copied!' into me
             add .copied to me
             wait 2s
             put 'Copy' into me
             remove .copied from me"
        >
          Copy
        </button>
      )}
    </div>
  );
}
