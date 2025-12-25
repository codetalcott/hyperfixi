/**
 * Interactive demo component for pattern detail pages.
 * Renders a live example with the pattern's hyperscript attached.
 */

import type { Pattern } from '../db';

/**
 * Escape HTML special characters for display in code blocks.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface PatternDemoProps {
  pattern: Pattern;
}

/**
 * Extract element IDs referenced in hyperscript code.
 * Matches #id patterns but excludes property access like #id.innerText
 */
function extractReferencedIds(code: string): string[] {
  const matches = [...code.matchAll(/#([a-zA-Z][\w-]*)/g)];
  return [...new Set(matches.map(m => m[1]))];
}

/**
 * Get the trigger event from hyperscript code.
 */
function getTriggerEvent(code: string): string {
  const match = code.match(/^on\s+(\w+)/);
  return match?.[1] || 'click';
}

/**
 * Render a context element for a referenced ID.
 */
function ContextElement({ id, pattern }: { id: string; pattern: Pattern }) {
  // Common element types based on ID naming conventions
  if (id === 'code') {
    return (
      <code id="code" class="demo-code">
        {pattern.rawCode}
      </code>
    );
  }
  if (id.includes('counter') || id.includes('count')) {
    return (
      <span id={id} class="demo-counter">
        0
      </span>
    );
  }
  if (id.includes('output') || id.includes('result')) {
    return (
      <div id={id} class="demo-output">
        Output appears here
      </div>
    );
  }
  if (id.includes('modal') || id.includes('dialog')) {
    return (
      <div id={id} class="demo-modal">
        Modal content
      </div>
    );
  }
  if (id.includes('menu') || id.includes('nav')) {
    return (
      <nav id={id} class="demo-menu">
        Menu items
      </nav>
    );
  }
  if (id.includes('input') || id.includes('field')) {
    return <input id={id} type="text" class="demo-input" placeholder={`#${id}`} />;
  }
  if (id.includes('list')) {
    return (
      <ul id={id} class="demo-list">
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
    );
  }
  // Default: generic div
  return (
    <div id={id} class="demo-element">
      #{id}
    </div>
  );
}

/**
 * Interactive demo for a pattern.
 */
export function PatternDemo({ pattern }: PatternDemoProps) {
  const ids = extractReferencedIds(pattern.rawCode);
  const triggerEvent = getTriggerEvent(pattern.rawCode);

  // Determine the appropriate trigger element
  const isInputTrigger = ['input', 'change', 'keydown', 'keyup', 'keypress'].includes(triggerEvent);

  return (
    <section class="pattern-demo">
      <h2>Example</h2>

      <p class="muted">
        Add this pattern to any HTML element using the <code>_</code> attribute:
      </p>

      <div class="usage-example">
        <div class="code-block-wrapper">
          <pre class="code-block">{
            escapeHtml(`<button _="${pattern.rawCode}">\n  Click me\n</button>`)
          }</pre>
          <button
            class="copy-btn"
            data-code={`<button _="${pattern.rawCode}">\n  Click me\n</button>`}
            _="on click
               call navigator.clipboard.writeText(my @data-code)
               put 'Copied!' into me
               add .copied to me
               wait 2s
               put 'Copy' into me
               remove .copied from me"
          >
            Copy
          </button>
        </div>
      </div>

      <div class="demo-sandbox">
        {/* Context elements for referenced IDs */}
        {ids.length > 0 && (
          <div class="demo-context">
            {ids.map(id => (
              <ContextElement id={id} pattern={pattern} />
            ))}
          </div>
        )}

        {/* Demo trigger element */}
        <div class="demo-trigger">
          {isInputTrigger ? (
            <input
              type="text"
              class="demo-input"
              placeholder="Type here..."
              _={pattern.rawCode}
            />
          ) : (
            <button class="btn demo-button" _={pattern.rawCode}>
              Click Me
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
