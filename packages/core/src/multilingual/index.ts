/**
 * `@hyperfixi/core/multilingual` — hyperscript in 24 languages, as text.
 *
 * Four functions over `@lokascript/semantic`:
 * - `parse(code, lang)`: a semantic node, or null
 * - `render(node, lang)`: that node as hyperscript in a language
 * - `translate(code, from, to)`: the two together
 * - `schemaRoleInferrer`: schema-driven role inference for `fromCoreAST`,
 *   which takes it by injection so the AST tooling need not depend on the
 *   front end
 *
 * Text is the interchange: a translation is hyperscript a host reads, as
 * `@lokascript/hyperscript-adapter` hands it to `@hyperfixi/engine` or to
 * upstream _hyperscript. The `MultilingualHyperscript` class, whose
 * `parseToAST` built core's AST directly from a semantic parse, was removed in
 * Phase C2 of the engine cutover (4.0); the language list it carried is
 * semantic's `getSupportedLanguages()`.
 *
 * @example
 * ```typescript
 * import { parse, render, translate } from '@hyperfixi/core/multilingual';
 *
 * const node = await parse('#button の .active を 切り替え', 'ja');
 * const arabic = node && (await render(node, 'ar'));
 * const english = await translate('alternar .active', 'es', 'en');
 * ```
 */
export { parse, render, translate } from './bridge';
export { schemaRoleInferrer } from './schema-roles';
