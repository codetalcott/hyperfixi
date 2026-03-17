/**
 * Verify that all behavior schema sources compile successfully.
 * This catches syntax errors in behavior hyperscript source before
 * they get seeded into patterns-reference.
 */
import { describe, it, expect } from 'vitest';
import { hyperscript } from '../../../api/hyperscript-api';

// Import all schema sources
import { toggleableSchema } from '../../../../../behaviors/src/schemas/toggleable.schema';
import { removableSchema } from '../../../../../behaviors/src/schemas/removable.schema';
import { autoDismissSchema } from '../../../../../behaviors/src/schemas/autodismiss.schema';
import { clipboardSchema } from '../../../../../behaviors/src/schemas/clipboard.schema';
import { draggableSchema } from '../../../../../behaviors/src/schemas/draggable.schema';
import { clickOutsideSchema } from '../../../../../behaviors/src/schemas/clickoutside.schema';
import { scrollRevealSchema } from '../../../../../behaviors/src/schemas/scrollreveal.schema';
import { tabsSchema } from '../../../../../behaviors/src/schemas/tabs.schema';

const schemas = [
  toggleableSchema,
  removableSchema,
  autoDismissSchema,
  clipboardSchema,
  draggableSchema,
  clickOutsideSchema,
  scrollRevealSchema,
  tabsSchema,
];

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
