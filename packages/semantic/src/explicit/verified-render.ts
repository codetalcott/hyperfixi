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
import { parenthesizeCollidingNames, readAlike, readsAs } from '../name-collisions';
import { semanticRenderer, type NativeWordKind } from './renderer';
import { toForeignSpelling, toUpstreamSpelling } from './upstream-spelling';

/**
 * Render a semantic node in the specified language: the plain render, unless
 * it would be read back as something else and the render with its colliding
 * variables in parentheses, or with every variable written as spelled, is not.
 */
export function render(written: SemanticNode, language: string): string {
  if (language === 'en') return semanticRenderer.render(toUpstreamSpelling(written), language);
  if (!tryGetProfile(language)) return semanticRenderer.render(written, language);
  const node = toForeignSpelling(written);
  semanticRenderer.takeNativeWords();
  let text = renderReadable(node, language);
  let wrote = semanticRenderer.takeNativeWords();
  if (!wrote.size || readsAs(text, language, node)) return text;
  // A pronoun in the case its marker takes (es `en mí`, N3) must read back as
  // the nominative does; where it does not, the nominative, as before.
  let plain: NativeWordKind[] = ['value'];
  if (wrote.has('case')) {
    const nominative = semanticRenderer.renderPlainWords(
      () => renderReadable(node, language),
      ['case']
    );
    const nominativeWrote = semanticRenderer.takeNativeWords();
    if (!readAlike(text, nominative, language)) {
      text = nominative;
      wrote = nominativeWrote;
      plain = ['value', 'case'];
    }
  }
  // A value's grammar word in the language's own can read as something else:
  // a query's `in` as a marker the command wants (es `obtener valor de primero
  // <input/> en yo` read `en yo` as get's `on me`), a conversion's `as` as a
  // marker (ko `로`) or as `is` (th `เป็น` before a type it does not list).
  // There the words are written in English's, which every reader takes.
  if (!wrote.has('value') || readsAs(text, language, node)) return text;
  return semanticRenderer.renderPlainWords(() => renderReadable(node, language), plain);
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
