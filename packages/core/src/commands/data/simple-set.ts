/**
 * Simple SET Command Implementation for debugging
 * Minimal implementation to isolate the core issue
 */

import { debug } from '../../utils/debug';

export class SimpleSetCommand {
  name = 'set' as const;

  async execute(context: any, ...args: unknown[]): Promise<unknown> {
    debug.command('SIMPLE SET COMMAND CALLED - THIS SHOULD BE VISIBLE');
    debug.command('SIMPLE SET: Args received:', args);
    debug.command('SIMPLE SET: Context me:', context.me?.tagName);
    debug.command('SIMPLE SET: Args length:', args.length);
    debug.command(
      'SIMPLE SET: Args details:',
      args.map((arg, i) => ({ index: i, type: typeof arg, value: arg }))
    );

    try {
      // Simple case: expect 2 args [target, value]
      if (args.length >= 2) {
        const [targetArg, valueArg] = args;
        debug.command('Target arg:', targetArg, 'Type:', typeof targetArg);
        debug.command('Value arg:', valueArg, 'Type:', typeof valueArg);

        // Extract target name
        let target: string;
        if (typeof targetArg === 'string') {
          target = targetArg;
        } else if (targetArg && typeof targetArg === 'object' && 'name' in targetArg) {
          target = (targetArg as any).name;
        } else if (targetArg && typeof targetArg === 'object' && 'target' in targetArg) {
          target = (targetArg as any).target;
        } else {
          target = String(targetArg);
        }

        // Extract value
        let value: unknown;
        if (valueArg && typeof valueArg === 'object' && 'value' in valueArg) {
          value = (valueArg as any).value;
        } else {
          value = valueArg;
        }

        debug.command('Final target:', target, 'Final value:', value);

        // Set the variable in local context
        if (!context.locals) {
          context.locals = new Map();
        }
        context.locals.set(target, value);
        Object.assign(context, { it: value });

        debug.command('SET successful:', target, '=', value);
        return value;
      } else {
        throw new Error(`Simple SET: Expected 2+ args, got ${args.length}`);
      }
    } catch (error) {
      console.error('❌ Simple SET failed:', error);
      throw error;
    }
  }
}

export function createSimpleSetCommand(): SimpleSetCommand {
  return new SimpleSetCommand();
}
