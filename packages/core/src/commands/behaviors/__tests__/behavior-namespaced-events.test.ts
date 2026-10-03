/**
 * Core's parser reads namespaced event names (`on custom:activate`) in a behavior.
 *
 * This file used to also compile every @hyperfixi/behaviors source with core's parser.
 * Those sources are written in upstream's idioms for @hyperfixi/engine since 2026-10-03
 * (`on click from (triggerEl or me)`, which core does not read), and the behaviors
 * package runs them on the engine in its own suite; core is not their host.
 */
import { describe, it, expect } from 'vitest';
import { hyperscript } from '../../../api/hyperscript-api';

describe('behavior parser: namespaced events', () => {
  it('should parse on foo:bar event handlers in behaviors', () => {
    const code = `behavior Test()
  on custom:activate
    set x to 1
  end
  on custom:deactivate
    set x to 0
  end
end`;
    const result = hyperscript.compileSync(code, { traditional: true });
    expect(result.ok, `Failed: ${JSON.stringify(result.errors)}`).toBe(true);

    const ast = result.ast as any;
    expect(ast.type).toBe('behavior');
    expect(ast.eventHandlers).toHaveLength(2);
    expect(ast.eventHandlers[0].event).toBe('custom:activate');
    expect(ast.eventHandlers[1].event).toBe('custom:deactivate');
  });

  it('should parse namespaced events alongside regular events', () => {
    const code = `behavior Test()
  on click
    set x to 1
  end
  on modal:close
    set x to 0
  end
end`;
    const result = hyperscript.compileSync(code, { traditional: true });
    expect(result.ok, `Failed: ${JSON.stringify(result.errors)}`).toBe(true);

    const ast = result.ast as any;
    expect(ast.eventHandlers).toHaveLength(2);
    expect(ast.eventHandlers[0].event).toBe('click');
    expect(ast.eventHandlers[1].event).toBe('modal:close');
  });
});
