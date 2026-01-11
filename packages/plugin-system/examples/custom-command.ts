/**
 * Custom Command Example
 * Demonstrates how to create advanced custom commands
 */

import {
  optimizedRegistry,
  RuntimeBridge,
  type CommandPlugin,
  type RuntimeContext,
  type ParseContext,
  type CommandNode,
  PluginExecutionError,
} from '@hyperfixi/plugin-system';

/**
 * Example 1: Simple Animate Command
 * Usage: _="on click animate fadeIn 300ms"
 */
const AnimateCommand: CommandPlugin = {
  type: 'command',
  name: 'animate',
  pattern: /^animate$/i,

  execute: async (ctx: RuntimeContext) => {
    const { element, args } = ctx;
    const [animation, duration = '300ms'] = args;

    const keyframes = getKeyframes(animation);
    if (!keyframes) {
      throw new PluginExecutionError('animate', `Unknown animation: ${animation}`, {
        element,
        action: `animate ${args.join(' ')}`,
      });
    }

    const durationMs = parseDuration(duration);

    await element.animate(keyframes, {
      duration: durationMs,
      easing: 'ease-out',
      fill: 'forwards',
    }).finished;
  },
};

function getKeyframes(animation: string): Keyframe[] | null {
  const animations: Record<string, Keyframe[]> = {
    fadeIn: [{ opacity: 0 }, { opacity: 1 }],
    fadeOut: [{ opacity: 1 }, { opacity: 0 }],
    slideIn: [{ transform: 'translateX(-100%)' }, { transform: 'translateX(0)' }],
    slideOut: [{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }],
    bounce: [
      { transform: 'scale(1)' },
      { transform: 'scale(1.1)' },
      { transform: 'scale(1)' },
    ],
    shake: [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-10px)' },
      { transform: 'translateX(10px)' },
      { transform: 'translateX(-10px)' },
      { transform: 'translateX(0)' },
    ],
  };
  return animations[animation] || null;
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(ms|s)?$/);
  if (!match) return 300;

  const value = parseInt(match[1], 10);
  const unit = match[2] || 'ms';
  return unit === 's' ? value * 1000 : value;
}

/**
 * Example 2: Fetch Command with Custom Parser
 * Usage: _="on click fetch /api/data as json then put result into #target"
 */
const FetchCommand: CommandPlugin = {
  type: 'command',
  name: 'fetch',
  pattern: /^fetch$/i,

  // Custom parser for complex syntax
  parse: (ctx: ParseContext): CommandNode | null => {
    // This would integrate with the actual parser
    // For demo purposes, showing the structure
    return {
      type: 'command',
      name: 'fetch',
      args: [],
      position: { start: ctx.position, end: ctx.position },
    } as CommandNode;
  },

  execute: async (ctx: RuntimeContext) => {
    const { element, args, modifiers } = ctx;
    const [url] = args;

    if (!url) {
      throw new PluginExecutionError('fetch', 'URL is required', { element });
    }

    const response = await fetch(url);

    // Check for 'as' modifier
    const format = modifiers.get('as')?.values().next().value || 'text';

    let result: any;
    switch (format) {
      case 'json':
        result = await response.json();
        break;
      case 'html':
        result = await response.text();
        break;
      default:
        result = await response.text();
    }

    // Store result in element's data
    (element as any)._hyperfixi_result = result;

    // Dispatch event for chaining
    element.dispatchEvent(
      new CustomEvent('fetch:complete', { detail: { result } })
    );
  },
};

/**
 * Example 3: Debounced Command
 * Usage: _="on input debounce 300ms then fetch /search?q=${value}"
 */
const DebounceCommand: CommandPlugin = {
  type: 'command',
  name: 'debounce',
  pattern: /^debounce$/i,

  execute: async (ctx: RuntimeContext) => {
    const { element, args } = ctx;
    const [delay = '300ms'] = args;

    const delayMs = parseDuration(delay);
    const existing = (element as any)._debounce_timeout;

    if (existing) {
      clearTimeout(existing);
    }

    // Return a promise that resolves after delay
    await new Promise<void>((resolve) => {
      (element as any)._debounce_timeout = setTimeout(() => {
        delete (element as any)._debounce_timeout;
        resolve();
      }, delayMs);
    });
  },
};

/**
 * Example 4: Conditional Command
 * Usage: _="on click if me has .loading halt end"
 */
const HaltCommand: CommandPlugin = {
  type: 'command',
  name: 'halt',
  pattern: /^halt$/i,

  execute: async (ctx: RuntimeContext) => {
    // Halt stops execution of the current command chain
    // This is achieved by throwing a special "halt" error
    // that the runtime recognizes and handles gracefully
    const error = new Error('HALT');
    (error as any).isHalt = true;
    throw error;
  },
};

/**
 * Using the Runtime Bridge for execution
 */
export function setupWithRuntimeBridge() {
  const bridge = new RuntimeBridge({
    enableHooks: true,
    debug: true,
    executionTimeout: 5000,
  });

  // Register all commands
  bridge.registerCommand(AnimateCommand);
  bridge.registerCommand(FetchCommand);
  bridge.registerCommand(DebounceCommand);
  bridge.registerCommand(HaltCommand);

  // Example: Execute animate on a button
  const button = document.querySelector('button');
  if (button) {
    button.addEventListener('click', async () => {
      const result = await bridge.executeCommand('animate', button, [
        'bounce',
        '500ms',
      ]);

      if (result.success) {
        console.log(`Animation completed in ${result.duration}ms`);
      } else {
        console.error('Animation failed:', result.error?.message);
      }
    });
  }

  return bridge;
}

// Export for testing
export { AnimateCommand, FetchCommand, DebounceCommand, HaltCommand };
