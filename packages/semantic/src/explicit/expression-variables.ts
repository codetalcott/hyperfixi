/**
 * The names an English expression reads. The renderer writes a variable as
 * spelled where its localized word would read back as another variable
 * (`value + 1`, es `valor + 1`; was OPEN_ITEMS P49), and a property name where
 * the reader would not bring its localized word back (`my children`, es
 * `mi hijos`).
 */
import { parseExpression } from '../ast-builder/expression-parser/parser';
import { tokenize } from '../tokenizers';
import { loneKeywordKind } from '../parser/utils/expression-lexicon';

const variableNameMemo = new Map<string, boolean>();

/**
 * Is `name`, alone where a value stands, a variable in English? An identifier
 * is (`value`, `index`), and so is a keyword the reader takes for one there: a
 * structure word, a verb or an event name (`when`, `input`). Other keywords
 * are vocabulary: a reference (`it`), a positional word (`closest`).
 */
export function isVariableName(name: string): boolean {
  let known = variableNameMemo.get(name);
  if (known === undefined) {
    const tokens = tokenize(name, 'en').tokens;
    const only = tokens.length === 1 ? tokens[0] : undefined;
    known = !!only && (only.kind === 'identifier' || !!loneKeywordKind(only));
    variableNameMemo.set(name, known);
  }
  return known;
}

/**
 * An English expression's names: its VARIABLES, each identifier of its parse
 * that is not a property, a method or a conversion's type, and that is a
 * variable name (above); and its PROPERTIES, the names it reads off a value
 * (`children` in `my children`, `#a's children`, `the children of #a`), not a
 * computed index (`arr[i]`).
 */
export function expressionNames(raw: string): { variables: Set<string>; properties: Set<string> } {
  const variables = new Set<string>();
  const properties = new Set<string>();
  const parsed = parseExpression(raw);
  if (!parsed.success || !parsed.node) return { variables, properties };
  const walk = (expr: unknown, key: string | undefined, computed: boolean): void => {
    if (Array.isArray(expr)) {
      for (const item of expr) walk(item, key, false);
      return;
    }
    if (!expr || typeof expr !== 'object') return;
    const n = expr as { type?: string; name?: string; computed?: boolean };
    if (n.type === 'identifier' && typeof n.name === 'string') {
      if (key === 'property' && !computed) properties.add(n.name);
      else if (key !== 'property' && key !== 'targetType' && isVariableName(n.name)) {
        variables.add(n.name);
      }
    }
    for (const [k, v] of Object.entries(expr)) {
      if (v && typeof v === 'object') walk(v, k, k === 'property' && n.computed === true);
    }
  };
  walk(parsed.node, undefined, false);
  return { variables, properties };
}

