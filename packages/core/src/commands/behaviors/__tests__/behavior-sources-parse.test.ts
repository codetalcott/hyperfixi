/**
 * Verify that all behavior schema sources compile successfully.
 * This catches syntax errors in behavior hyperscript source before
 * they get seeded into patterns-reference.
 */
import { describe, it, expect } from 'vitest';
import { hyperscript } from '../../../api/hyperscript-api';

// Import all schema sources from the behaviors package dist (avoid rootDir violation)
import {
  toggleableSchema,
  removableSchema,
  autoDismissSchema,
  clipboardSchema,
  draggableSchema,
  clickOutsideSchema,
  scrollRevealSchema,
  tabsSchema,
  focusTrapSchema,
  sortableSchema,
  resizableSchema,
} from '../../../../../behaviors/dist/schemas/index';

const schemas = [
  toggleableSchema,
  removableSchema,
  autoDismissSchema,
  clipboardSchema,
  draggableSchema,
  clickOutsideSchema,
  scrollRevealSchema,
  tabsSchema,
  focusTrapSchema,
  sortableSchema,
  resizableSchema,
];

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

describe('behavior schema sources compile', () => {
  for (const schema of schemas) {
    it(`${schema.name} should compile`, () => {
      const result = hyperscript.compileSync(schema.source, { traditional: true });
      expect(result.ok, `${schema.name} failed: ${JSON.stringify(result.errors)}`).toBe(true);

      const ast = result.ast as any;
      expect(ast.type).toBe('behavior');
      expect(ast.name).toBe(schema.name);
    });
  }
});
