/**
 * The render every translation takes: a colliding variable in parentheses,
 * where the plain render would be misread.
 *
 * A translation writes a variable verbatim, so a variable spelled like a
 * structure word of the target language reaches its reader as the word (es
 * `si`, if). The reader tells them apart by where the word stands
 * (`parser/value-reading.ts`), and where that is not enough — de `ist` (is)
 * after an operator, fr `sur` (on) in a condition — the plain render is read
 * as something else. There, and only there, the variable is written `(ist)`,
 * which the reader fuses into one name (`registry.tokenize`). A render the
 * reader already reads right is unchanged: every loop over tr/pl `i` stays
 * `i`.
 */
import type { SemanticNode } from '../types';
import { tryGetProfile } from '../registry';
import { parenthesizeCollidingNames, readsAs } from '../name-collisions';
import { semanticRenderer } from './renderer';

/**
 * Render a semantic node in the specified language: the plain render, unless
 * it would be read back as something else and the render with its colliding
 * variables in parentheses is not.
 */
export function render(node: SemanticNode, language: string): string {
  if (language === 'en' || !tryGetProfile(language)) return semanticRenderer.render(node, language);
  let wrapped = false;
  const guarded = semanticRenderer.renderWith(node, language, raw => {
    const out = parenthesizeCollidingNames(raw, language);
    if (out !== raw) wrapped = true;
    return out;
  });
  // No colliding variable: the render is the plain one.
  if (!wrapped) return guarded;
  const plain = semanticRenderer.render(node, language);
  if (readsAs(plain, language, node)) return plain;
  return readsAs(guarded, language, node) ? guarded : plain;
}
