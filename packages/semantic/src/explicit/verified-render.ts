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
 * `i`. A variable the renderer wrote in the language's own word (a word that
 * alone reads back as the same value) is re-read the same way, and written as
 * spelled where its neighbours change it (vi `đặt` + `giá trị` is `set`; P49).
 */
import type { SemanticNode } from '../types';
import { tryGetProfile } from '../registry';
import { parenthesizeCollidingNames, readsAs } from '../name-collisions';
import { semanticRenderer } from './renderer';
import { toUpstreamSpelling } from './upstream-spelling';

/**
 * Render a semantic node in the specified language: the plain render, unless
 * it would be read back as something else and the render with its colliding
 * variables in parentheses, or with every variable written as spelled, is not.
 */
export function render(node: SemanticNode, language: string): string {
  if (language === 'en') return semanticRenderer.render(toUpstreamSpelling(node), language);
  if (!tryGetProfile(language)) return semanticRenderer.render(node, language);
  semanticRenderer.takeNativeQueryIn();
  const text = renderReadable(node, language);
  // A query's scope in the language's own `in` (es `<button/> en yo`) can read
  // as a marker the command wants (es `obtener valor de primero <input/> en
  // yo` read `en yo` as get's `on me`); there it is written with English's,
  // which every reader takes.
  if (!semanticRenderer.takeNativeQueryIn() || readsAs(text, language, node)) return text;
  return semanticRenderer.renderEnglishQueryIn(() => renderReadable(node, language));
}

function renderReadable(node: SemanticNode, language: string): string {
  let wrapped = false;
  const guard = (raw: string): string => {
    const out = parenthesizeCollidingNames(raw, language);
    if (out !== raw) wrapped = true;
    return out;
  };
  const { text: guarded, localizedVariable } = semanticRenderer.renderNoting(node, language, guard);
  // No colliding variable, and none in the language's own word: the render is the plain one.
  if (!wrapped && !localizedVariable) return guarded;
  const plain = wrapped ? semanticRenderer.render(node, language) : guarded;
  if (readsAs(plain, language, node)) return plain;
  if (wrapped && readsAs(guarded, language, node)) return guarded;
  // A variable in the language's own word can fuse with its neighbours (vi
  // `đặt` + `giá trị` is `set`): spelled, it is the name (P49).
  if (localizedVariable) {
    const spelled = semanticRenderer.renderSpellingVariables(
      node,
      language,
      wrapped ? guard : undefined
    );
    if (readsAs(spelled, language, node)) return spelled;
  }
  return plain;
}
