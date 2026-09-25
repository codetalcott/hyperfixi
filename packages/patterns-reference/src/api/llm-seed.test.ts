/**
 * The LLM example seed (scripts/seed-llm-examples.ts) over the real corpus.
 *
 * It used to fill regex templates per category as well: 275 of their 327 rows
 * shared a prompt with DIFFERENT code ("When clicked, perform the action" had
 * 87 completions). And the Sortable row's usage line passed `handle:`, a
 * parameter Sortable does not have (it takes `dragClass`).
 */

import { describe, expect, it } from 'vitest';
import { SEED_EXAMPLES } from '../../scripts/init-db';
import { generatePrompts } from '../../scripts/seed-llm-examples';
import { removableSchema } from '../../../behaviors/src/schemas/removable.schema';
import { draggableSchema } from '../../../behaviors/src/schemas/draggable.schema';
import { sortableSchema } from '../../../behaviors/src/schemas/sortable.schema';
import { resizableSchema } from '../../../behaviors/src/schemas/resizable.schema';

const seeded = SEED_EXAMPLES.flatMap(example => generatePrompts(example));

describe('LLM example seed', () => {
  it('prompts each pattern with its description, then its title if that differs', () => {
    for (const example of SEED_EXAMPLES) {
      expect(
        generatePrompts(example).map(row => row.prompt),
        example.id
      ).toEqual(
        example.title === example.description
          ? [example.description]
          : [example.description, example.title]
      );
    }
  });

  it('never gives one prompt to two different programs', () => {
    const programs = new Map<string, Set<string>>();
    for (const row of seeded) {
      const codes = programs.get(row.prompt) ?? new Set<string>();
      codes.add(row.completion);
      programs.set(row.prompt, codes);
    }
    const shared = [...programs].filter(([, codes]) => codes.size > 1).map(([prompt]) => prompt);
    expect(shared).toEqual([]);
  });

  it("names only a behavior's own parameters in a usage line", () => {
    const schemas = new Map(
      [removableSchema, draggableSchema, sortableSchema, resizableSchema].map(s => [s.name, s])
    );
    let usageLines = 0;
    for (const example of SEED_EXAMPLES) {
      for (const [, name, args] of example.description.matchAll(/install (\w+)\(([^)]*)\)/g)) {
        const parameters = schemas.get(name!)?.parameters.map(p => p.name);
        expect(parameters, `${example.id}: ${name}`).toBeDefined();
        for (const [, arg] of args!.matchAll(/(\w+)\s*:/g)) {
          expect(parameters, `${example.id}: ${name}(${arg}: …)`).toContain(arg);
        }
        usageLines++;
      }
    }
    expect(usageLines).toBe(4);
  });
});
