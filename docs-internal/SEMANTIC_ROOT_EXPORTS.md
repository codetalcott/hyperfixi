# `@lokascript/semantic`: the root entry's exports and who imports them

Measured 2026-11-13 at `006fe5273` (origin/main), macOS, Node 24.15.0, TypeScript 5.9.3,
ripgrep 15.1.0. An inventory for the 8.0 cut of the root entry (`packages/semantic/src/index.ts`).
The owner's decision: inventory now, `@deprecated` in the next minor, removal in 8.0. Nothing is
removed by the change that added this file.

**What this cannot see: anyone who installs the package from npm.** Every "no consumer" below
means no import in this repository or in the sibling checkouts listed under "How it was measured".

Re-check (delete this file when 8.0 has made the cut):

```bash
npm run build --prefix packages/semantic   # intent and framework built first
node -e "console.log(Object.keys(require('./packages/semantic/dist/index.cjs')).length)"  # 198 values
grep -c '@deprecated' packages/semantic/dist/index.d.ts                                   # 81 marked
# one name, here and in the sibling checkouts (hits inside packages/semantic/src are the package itself):
rg -n --hidden -g '!node_modules' -g '!dist' -g '!CHANGELOG*' '\bgetPatternById\b' . ../lokascript-domains \
  ../lokascript-learn ../lokascript-examples ../lokascript-lessons ../_hyper_min ../claude-plugins
```

## Counts

| | Names |
| --- | --- |
| Root exports | **296** (198 values, 98 types) |
| Keep at root | **145** |
| … imported from the root by another package, an example, a script or a sibling repo | 58 |
| … used through the browser global only | 2 |
| … documented, no consumer | 11 |
| … a type in the signature of a kept export | 53 |
| … kept with its family (command schemas, node types, extractors) | 21 |
| Move to a subpath | **43** (24 language profiles, 7 tokenizers, 12 others) |
| Remove, marked `@deprecated` | **81** (68 values, 13 types) |
| Remove, not marked (the owner's call first) | **27** (16 analysis, 6 cache, 5 used by semantic's own tests) |

Of the 81 marked names, 10 stay exported from `@lokascript/semantic/core` and 8 are
re-exports of `@lokascript/framework`'s own exports; each tag says so.

## How it was measured

The scripts were throwaway and are not in the repository; the steps are enough to repeat them.

1. **The names.** After `npm run build` for intent, framework and semantic, the TypeScript
   compiler API (`checker.getExportsOfModule` on `src/index.ts`, each alias resolved to its
   declaration) gave 296 names with their kinds. The same call on `dist/index.d.ts` gave the
   same 296. `src/core.ts`, `src/fidelity.ts`, `src/browser.ts`, `src/languages/en.ts` and
   `src/lexicons/en.ts` were read the same way, and a root name counts as "also at" a subpath
   only when both resolve to the same declaration.
2. **The importers.** Every text file `rg --files --hidden` lists (no `node_modules`, `dist`,
   `.git`, lockfiles or source maps; 21,641 files) in this repository and in `~/projects/`
   `lokascript-domains` (`80be401`), `lokascript-learn` (`1fd316b`), `lokascript-examples`
   (`fe04cf5`), `lokascript-lessons` (`00534cd`), `_hyper_min` (`e831d59`), `claude-plugins`
   (`ebfbab3`), `loka-js`, `hypermedia-systems-i18n` and `business-expert` was scanned for:
   `import` / `export … from` / `require()` / `import()` of `@lokascript/semantic` (root) and of each
   subpath, relative paths that resolve to semantic's `src/index.ts` or `dist/index.*`, namespace
   imports and their member accesses, and `LokaScriptSemantic*.<name>` (also through a variable
   the global was assigned to). `rg -l '@lokascript/semantic|LokaScriptSemantic' ~/projects`
   found no other project that references the package. `ideas/` (notes) was read and not
   counted.
3. **The shapes a regex cannot follow.** Ten files hold the module in a variable
   (`typeof import('@lokascript/semantic')`, a namespace passed to a function: mcp-server's
   tools, core's `multilingual/index.ts`, language-server's `server.ts`, release-smoke's
   `node-smoke.mjs`); there, every member access on a variable named like the module counts.
4. **A second pass, independent of the first.** For every name with no importer, a plain word
   search in each of the 647 files outside `packages/semantic` that mention the package. Each
   hit was read: all were same-named declarations of another package (framework, intent, i18n and
   patterns-reference declare their own `createLiteral`, `TokenStream`, `bengaliProfile`,
   `getPatternById`, …), prose, or the browser global's type declarations.
5. **Docs.** A name is "documented" when a Markdown file under `packages/semantic`, `docs/`, a
   package README or the docs site (`_hyper_min/sites`) imports it from the package or names it
   as the package's API. Changelogs, `CLAUDE.md`, `docs-internal/` and plan files do not count.
   `packages/semantic` has no `llms.txt`.
6. **Signature types.** For every export that stays, the checker walked its type (parameters,
   returns, public properties, type references written in interface and alias declarations);
   a root type reached that way is kept, since removing it would leave a kept function's
   parameter or result without a name.
7. **Emitted declarations.** No `dist/**/*.d.ts` of another package in the main checkout
   contains `import("@lokascript/semantic").<name>`, so no dependent's inferred types name a
   root export that its source does not import.

## The rules behind the proposals

- **Keep**: any importer outside `packages/semantic` (source or test), a use through the browser
  global, documentation, or a place in a kept export's signature.
- **A family is decided together.** Ten language profiles are imported from the root by
  lokascript-learn (one file, `shared/morphology/role-markers.ts`), one of them also by i18n;
  five command schemas by lokascript-domains. The unused siblings are not marked: half a family deprecated
  reads as a mistake. Profiles are proposed to move as a whole (each is already exported from
  `./languages/<code>`); schemas to stay.
- **Move**: no root importer, and the name is already exported from a subpath that is its
  natural home. Not marked.
- **Remove, marked**: no importer anywhere, no documentation, not in a kept signature or family.
  The tag is on the export specifier in `src/index.ts`, not on the declaration: the declarations
  are used inside the package and from `./core`, and only the root export is going. TypeScript
  reports a deprecation for exactly these 81 names on import from the root (checked against
  `src/index.ts` and the built `dist/index.d.ts`), and for none through `./core`.
- **Remove, not marked**: three groups where the measurement says "no consumer" and something
  else says wait.
  - *Analysis* (16): `src/analysis` has its own tests and no importer; `analyze()` appears in a
    sketch in `packages/semantic/docs/NOVEL_APPLICATIONS.md`. mcp-server's analysis tools do not
    call it.
  - *Cache* (6): nothing imports `src/cache` but the two entry files, in the package or out of
    it, and it has no test. An earlier review recorded these as used by the adapter's lite bundle
    and core's browser tests; this measurement found no such use (the lite bundle reads
    `parse`, `render`, `translate`, `createSemanticAnalyzer` and `getSupportedLanguages` off the
    global, and the analyzer does not import the cache). Left unmarked until that is settled.
  - *Semantic's own tests* (5): the tests import these through `../src`; they can import
    the module instead, and then the name has no consumer.

## Found on the way

- `createSemanticAnalyzer` is **not** a root export, and not a `./core` export either: only the
  browser global has it. `packages/semantic/docs/SEMANTIC_NODES.md` imports it from the root,
  and the header of `src/core.ts` and a comment in `tsup.config.ts` import it from `./core`.
- `packages/framework/docs/EXTRACTORS.md` imports three extractors from
  `@lokascript/semantic/tokenizers/extractors`, a subpath the `exports` map does not have.
- `packages/patterns-reference/src/semantic-bridge.ts` feature-tests
  `semantic.registerPatternsSource`. `src/registry.ts` defines it and no entry exports it, so
  the bridge always takes its "standalone mode" branch.
- `./browser` declares `dist/index.d.ts` as its types. The global has 73 members; 19 of them are not
  root exports (`createSemanticAnalyzer`, `getProfile`, `registeredLanguageProfiles` and 16 tokenizers), and 242 root exports are not on
  the global. `@hyperfixi/types-browser` types the global by hand.
- The root's `getPatternsForLanguage` and `getPatternsForLanguageAndCommand` are
  `src/patterns/registry.ts`'s; `./core` and the browser global export `src/registry.ts`'s
  functions under the same names.
- `./core` exports 9 names the root does not: `HandcraftedPatterns`, `HandcraftedSource`, `getProfile`, `getRepeatPatternsForLanguage`, `mergeProfiles`, `registerHandcrafted`, `registerLanguage`, `registerPatterns`, `setPatternGenerator`.
- The comment over the generic extractors says they are re-exported from framework.
  `OperatorExtractor`, `PunctuationExtractor` and `getDefaultExtractors` are semantic's own
  declarations under framework's names.

## Keep at root (145)

### Imported from the root (60)

| Name | Kind | In-repo | Sibling repos | Docs | Proposal for 8.0 |
| --- | --- | --- | --- | --- | --- |
| `addSchema` | const | — | lokascript-domains | — | keep at root |
| `buildAST` | function | language-server, mcp-server; semantic's tests (36) | — | lokascript-docs: api/index.md, lokascript-docs: guide/installation.md, lokascript-docs: guide/semantic-parser/index.md (+1) | keep at root |
| `calculateTranslationConfidence` | function | patterns-reference (tests) | — | — | keep at root |
| `canParse` | function | patterns-reference; browser global: core, docs, semantic test pages; semantic's tests (15) | — | lokascript-docs: api/index.md, lokascript-docs: cookbook/index.md, lokascript-docs: guide/semantic-parser/index.md (+1) | keep at root |
| `CommandSchema` | type | — | lokascript-learn | — | keep at root |
| `commandSchemas` | const | mcp-server, testing-framework; i18n (tests) | — | — | keep at root |
| `EventHandlerSemanticNode` | type | — | lokascript-learn | — | keep at root |
| `eventNameTranslations` | const | testing-framework; semantic's tests (3) | — | — | keep at root |
| `fillSchemaDefaults` | function | testing-framework; semantic's tests (1) | — | — | keep at root |
| `findNameCollisions` | function | compilation-service, language-server; semantic's tests (1) | — | — | keep at root |
| `findTranslationCollisions` | function | compilation-service; semantic's tests (2) | — | — | keep at root |
| `findTranslationLoss` | function | hyperscript-adapter; from `./core`: hyperscript-adapter, vite-plugin | — | — | keep at root |
| `formatValidationResults` | function | mcp-server | — | — | keep at root |
| `fromExplicit` | function | browser global: core, semantic test pages; semantic's tests (1) | — | — | keep at root: consumer through the browser global only |
| `fromSemanticAST` | function | language-server, mcp-server | — | — | keep at root |
| `getAllTranslations` | function | mcp-server, playground; browser global: core, docs, semantic test pages; from `./core`: lokascript-learn; semantic's tests (2) | — | lokascript-docs: api/index.md, lokascript-docs: cookbook/index.md | keep at root |
| `getEventLocalizationDenylist` | function | testing-framework; semantic's tests (1) | — | — | keep at root |
| `getKeywordTranslations` | function | language-server, mcp-server | — | — | keep at root |
| `getLexicon` | function | testing-framework; i18n (tests); semantic's tests (4) | — | — | keep at root |
| `getPatternsForLanguage` | function | testing-framework; browser global: semantic test pages; semantic's tests (1) | — | — | keep at root |
| `getRegisteredLanguages` | function | language-server, mcp-server; browser global: core, examples, semantic test pages; semantic's tests (2) | — | — | keep at root |
| `getSchema` | function | mcp-server | lokascript-learn | — | keep at root |
| `getSOVEventMarkers` | function | testing-framework | — | — | keep at root |
| `getSupportedLanguages` | function | hyperscript-adapter; browser global: core, examples, docs, semantic test pages; semantic's tests (31) | — | lokascript-docs: api/index.md, lokascript-docs: cookbook/index.md, lokascript-docs: guide/installation.md (+1) | keep at root |
| `getTokenizer` | function | testing-framework; i18n (tests); semantic's tests (5) | — | — | keep at root |
| `getValidationStats` | function | mcp-server | — | — | keep at root |
| `getValidatorSchema` | function | mcp-server | — | — | keep at root |
| `hideSchema` | const | — | lokascript-domains | — | keep at root |
| `isExplicitSyntax` | function | compilation-service; browser global: core, semantic test pages | — | — | keep at root |
| `isLanguageRegistered` | function | hyperscript-adapter, language-server, mcp-server; from `./core`: hyperscript-adapter, vite-plugin | — | — | keep at root |
| `isLanguageSupported` | function | i18n | — | — | keep at root |
| `KeywordTranslation` | type | mcp-server; apps/profile-editor/src/partials/keyword-row.tsx | — | — | keep at root |
| `KNOWN_PROFILES` | const | mcp-server, testing-framework; i18n, patterns-reference (tests); examples/release-smoke; apps/profile-editor/src/profile-loader.ts; semantic's tests (1) | — | — | keep at root |
| `LanguageProfile` | type | mcp-server; i18n, patterns-reference (tests); apps/profile-editor/src/profile-loader.ts; semantic's tests (1) | lokascript-learn | — | keep at root |
| `LossyTranslationError` | class | hyperscript-adapter; from `./core`: hyperscript-adapter; semantic's tests (2) | — | lokascript-docs: api/index.md, semantic/README.md | keep at root |
| `nameCollision` | function | testing-framework; semantic's tests (1) | — | — | keep at root |
| `NameCollisionFinding` | type | language-server; semantic's tests (1) | — | — | keep at root |
| `parse` | function | patterns-reference, testing-framework; intent-element (tests); browser global: core, docs, examples, lokascript-examples, semantic test pages, types-browser; from `./core`: lokascript-learn; semantic's tests (214) | lokascript-learn | lokascript-docs: api/index.md, lokascript-docs: guide/installation.md, lokascript-docs: guide/semantic-parser/index.md (+3) | keep at root |
| `parseExplicit` | function | compilation-service; browser global: examples; semantic's tests (2) | — | — | keep at root |
| `parseSemantic` | function | compilation-service, core, hyperscript-adapter, language-server, mcp-server, playground, testing-framework; patterns-reference, vite-plugin (tests); examples/release-smoke; browser global: core; semantic's tests (36) | — | — | keep at root |
| `removeSchema` | const | — | lokascript-domains | — | keep at root |
| `render` | function | compilation-service, core, hyperscript-adapter, mcp-server, playground, testing-framework; intent-element, patterns-reference, vite-plugin (tests); browser global: docs, core, examples; from `./core`: hyperscript-adapter, vite-plugin; semantic's tests (126) | lokascript-learn | lokascript-docs: api/index.md | keep at root |
| `renderExplicit` | function | playground; semantic's tests (3) | — | lokascript-docs: api/index.md | keep at root |
| `RoleMarker` | type | apps/profile-editor/src/partials/marker-row.tsx | lokascript-learn | — | keep at root |
| `RoleSpec` | type | — | lokascript-learn | — | keep at root |
| `roundTrip` | function | browser global: core, semantic test pages; semantic's tests (1) | — | semantic/docs/SEMANTIC_NODES.md | keep at root: consumer through the browser global only |
| `SemanticNode` | type | core, testing-framework; patterns-reference (tests); from `./core`: lokascript-learn; semantic's tests (1) | lokascript-learn | — | keep at root |
| `SemanticRole` | type | patterns-reference | — | — | keep at root |
| `SemanticValue` | type | patterns-reference (tests); from `./core`: lokascript-learn | lokascript-learn | — | keep at root |
| `showSchema` | const | — | lokascript-domains | — | keep at root |
| `toExplicit` | function | mcp-server; browser global: core, examples, semantic test pages; from `./core`: lokascript-learn; semantic's tests (1) | — | — | keep at root |
| `toggleSchema` | const | — | lokascript-domains | — | keep at root |
| `tokenize` | function | i18n, testing-framework; browser global: core, docs, semantic test pages; semantic's tests (51) | — | — | keep at root |
| `translate` | function | compilation-service, core, hyperscript-adapter, hyperscript-tools-i18n, mcp-server, testing-framework; framework, patterns-reference (tests); examples/release-smoke; browser global: _hyper_min, docs, core, examples, semantic test pages, types-browser; from `./core`: hyperscript-adapter, lokascript-learn, vite-plugin; semantic's tests (104) | lokascript-learn | lokascript-docs: api/index.md, lokascript-docs: cookbook/index.md, lokascript-docs: guide/grammar/index.md (+6) | keep at root |
| `TranslateOptions` | type | core | — | — | keep at root |
| `tryGetProfile` | function | language-server, mcp-server, testing-framework; browser global: examples; semantic's tests (18) | lokascript-learn | — | keep at root |
| `validateAllSchemas` | function | mcp-server | — | — | keep at root |
| `validateCommandSchema` | function | mcp-server | lokascript-domains | packages/framework/docs/DOMAIN_AUTHOR_GUIDE.md | keep at root |
| `validateSemanticResult` | function | compilation-service | — | — | keep at root |
| `VERSION` | const | hyperscript-adapter; examples/release-smoke; browser global: examples; semantic's tests (1) | — | — | keep at root |

### Documented, no consumer (11)

| Name | Kind | In-repo | Sibling repos | Docs | Proposal for 8.0 |
| --- | --- | --- | --- | --- | --- |
| `CommandNode` | type | — | — | semantic/LANGUAGE_BUNDLES.md (return type of buildAST) | keep at root: documented, no consumer |
| `CssSelectorExtractor` | class | — | — | packages/framework/docs/EXTRACTORS.md (same nonexistent subpath) | keep at root: documented, no consumer |
| `DEFAULT_CONFIDENCE_THRESHOLD` | const | — | — | lokascript-docs: api/index.md | keep at root: documented, no consumer |
| `EventModifierExtractor` | class | — | — | packages/framework/docs/EXTRACTORS.md (imported from '@lokascript/semantic/tokenizers/extractors', a subpath the exports map does not have) | keep at root: documented, no consumer |
| `getCommandMapper` | function | — | — | semantic/README.md | keep at root: documented, no consumer |
| `HIGH_CONFIDENCE_THRESHOLD` | const | — | — | lokascript-docs: api/index.md | keep at root: documented, no consumer |
| `LanguageToken` | type | — | — | semantic/LANGUAGE_BUNDLES.md (return type of tokenize) | keep at root: documented, no consumer |
| `loadLanguage` | function | — | — | semantic/BUNDLE-STRATEGY.md | keep at root: documented, no consumer |
| `registerCommandMapper` | function | — | — | semantic/README.md | keep at root: documented, no consumer |
| `resolveCommandMapper` | function | — | — | semantic/README.md | keep at root: documented, no consumer |
| `UrlExtractor` | class | — | — | packages/framework/docs/EXTRACTORS.md (same nonexistent subpath) | keep at root: documented, no consumer |

### Types in the signature of a kept export (53)

| Name | Kind | In-repo | Sibling repos | Docs | Proposal for 8.0 |
| --- | --- | --- | --- | --- | --- |
| `ActionType` | type | — | — | — | keep at root: type in the signature of a kept export (`CommandSchema`, `EventHandlerSemanticNode`) |
| `ASTNode` | type | — | — | — | keep at root: type in the signature of a kept export (`CommandNode`, `buildAST`) |
| `AstShape` | type | — | — | — | keep at root: type in the signature of a kept export (`CommandSchema`, `addSchema`) |
| `BlockNode` | type | — | — | — | keep at root: type in the signature of a kept export (`getCommandMapper`, `registerCommandMapper`) |
| `BuildASTResult` | type | — | — | — | keep at root: type in the signature of a kept export (`buildAST`) |
| `CommandCategory` | type | — | — | — | keep at root: type in the signature of a kept export (`CommandSchema`, `addSchema`) |
| `CommandMapper` | type | — | — | — | keep at root: type in the signature of a kept export (`getCommandMapper`, `registerCommandMapper`) |
| `CommandMapperResult` | type | — | — | — | keep at root: type in the signature of a kept export (`getCommandMapper`, `registerCommandMapper`) |
| `CommandSemanticNode` | type | — | — | — | keep at root: type in the signature of a kept export (`getCommandMapper`, `registerCommandMapper`) |
| `ConfidenceResult` | type | — | — | — | keep at root: type in the signature of a kept export (`calculateTranslationConfidence`) |
| `EventModifiers` | type | — | — | — | keep at root: type in the signature of a kept export (`EventHandlerSemanticNode`) |
| `ExpressionValue` | type | — | — | — | keep at root: type in the signature of a kept export (`CommandSchema`, `EventHandlerSemanticNode`) |
| `ExtractionResult` | type | — | — | — | keep at root: type in the signature of a kept export (`CssSelectorExtractor`, `EventModifierExtractor`) |
| `ExtractionRule` | type | — | — | — | keep at root: type in the signature of a kept export (`getPatternsForLanguage`, `loadLanguage`) |
| `ExtractionRules` | type | — | — | — | keep at root: type in the signature of a kept export (`getPatternsForLanguage`, `loadLanguage`) |
| `GroupPatternToken` | type | — | — | — | keep at root: type in the signature of a kept export (`getPatternsForLanguage`, `loadLanguage`) |
| `InterchangeEventModifiers` | type | — | — | — | keep at root: type in the signature of a kept export (`fromSemanticAST`) |
| `InterchangeNode` | type | — | — | — | keep at root: type in the signature of a kept export (`fromSemanticAST`) |
| `LanguageLexicon` | type | — | — | — | keep at root: type in the signature of a kept export (`getLexicon`) |
| `LanguageModule` | type | — | — | — | keep at root: type in the signature of a kept export (`loadLanguage`) |
| `LanguagePattern` | type | — | — | — | keep at root: type in the signature of a kept export (`getPatternsForLanguage`, `loadLanguage`) |
| `LanguageTokenizer` | type | — | — | — | keep at root: type in the signature of a kept export (`getTokenizer`, `loadLanguage`) |
| `LiteralPatternToken` | type | — | — | — | keep at root: type in the signature of a kept export (`getPatternsForLanguage`, `loadLanguage`) |
| `LiteralValue` | type | — | — | — | keep at root: type in the signature of a kept export (`CommandSchema`, `EventHandlerSemanticNode`) |
| `LoadLanguageOptions` | type | — | — | — | keep at root: type in the signature of a kept export (`loadLanguage`) |
| `LoadLanguageResult` | type | — | — | — | keep at root: type in the signature of a kept export (`loadLanguage`) |
| `MarkingStrategy` | type | — | — | — | keep at root: type in the signature of a kept export (`KNOWN_PROFILES`, `LanguageProfile`) |
| `NameCollision` | type | — | — | — | keep at root: type in the signature of a kept export (`NameCollisionFinding`, `findNameCollisions`) |
| `ParseWithConfidenceResult` | type | — | — | — | keep at root: type in the signature of a kept export (`parseSemantic`) |
| `PatternConstraints` | type | — | — | — | keep at root: type in the signature of a kept export (`getPatternsForLanguage`, `loadLanguage`) |
| `PatternTemplate` | type | — | — | — | keep at root: type in the signature of a kept export (`getPatternsForLanguage`, `loadLanguage`) |
| `PatternToken` | type | — | — | — | keep at root: type in the signature of a kept export (`getPatternsForLanguage`, `loadLanguage`) |
| `PossessiveConfig` | type | — | — | — | keep at root: type in the signature of a kept export (`KNOWN_PROFILES`, `LanguageProfile`) |
| `PropertyPathValue` | type | — | — | — | keep at root: type in the signature of a kept export (`CommandSchema`, `EventHandlerSemanticNode`) |
| `ReferenceValue` | type | — | — | — | keep at root: type in the signature of a kept export (`CommandSchema`, `EventHandlerSemanticNode`) |
| `RolePatternToken` | type | — | — | — | keep at root: type in the signature of a kept export (`getPatternsForLanguage`, `loadLanguage`) |
| `SchemaValidation` | type | — | — | — | keep at root: type in the signature of a kept export (`formatValidationResults`, `getValidationStats`) |
| `SchemaValidationItem` | type | — | — | — | keep at root: type in the signature of a kept export (`formatValidationResults`, `getValidationStats`) |
| `SchemaValidationSeverity` | type | — | — | — | keep at root: type in the signature of a kept export (`formatValidationResults`, `getValidationStats`) |
| `SelectorValue` | type | — | — | — | keep at root: type in the signature of a kept export (`CommandSchema`, `EventHandlerSemanticNode`) |
| `SourcePosition` | type | — | — | — | keep at root: type in the signature of a kept export (`CommandSchema`, `EventHandlerSemanticNode`) |
| `StreamMark` | type | — | — | — | keep at root: type in the signature of a kept export (`getTokenizer`, `loadLanguage`) |
| `TokenizationConfig` | type | — | — | — | keep at root: type in the signature of a kept export (`KNOWN_PROFILES`, `LanguageProfile`) |
| `TokenKind` | type | — | — | — | keep at root: type in the signature of a kept export (`LanguageToken`, `getTokenizer`) |
| `TokenStream` | type | — | — | — | keep at root: type in the signature of a kept export (`getTokenizer`, `loadLanguage`) |
| `TranslationLoss` | type | — | — | — | keep at root: type in the signature of a kept export (`LossyTranslationError`, `findTranslationLoss`) |
| `TranslationLossKind` | type | — | — | — | keep at root: type in the signature of a kept export (`LossyTranslationError`, `findTranslationLoss`) |
| `ValidationError` | type | — | — | — | keep at root: type in the signature of a kept export (`validateSemanticResult`) |
| `ValidationResult` | type | — | — | — | keep at root: type in the signature of a kept export (`validateSemanticResult`) |
| `VerbConfig` | type | — | — | — | keep at root: type in the signature of a kept export (`KNOWN_PROFILES`, `LanguageProfile`) |
| `VerbForm` | type | — | — | — | keep at root: type in the signature of a kept export (`KNOWN_PROFILES`, `KeywordTranslation`) |
| `WaitAlternative` | type | — | — | — | keep at root: type in the signature of a kept export (`getCommandMapper`, `registerCommandMapper`) |
| `WordOrder` | type | — | — | — | keep at root: type in the signature of a kept export (`KNOWN_PROFILES`, `LanguageProfile`) |

### Kept with a family (21)

| Name | Kind | In-repo | Sibling repos | Docs | Proposal for 8.0 |
| --- | --- | --- | --- | --- | --- |
| `appendSchema` | const | — | — | — | keep at root (family): command schemas, 5 of 15 imported by lokascript-domains |
| `BlockCommandSemanticNode` | type | — | — | — | keep at root (family): semantic node types |
| `CommandSequenceNode` | type | — | — | — | keep at root (family): AST node types buildAST returns |
| `CompoundSemanticNode` | type | — | — | — | keep at root (family): semantic node types |
| `ConditionalNode` | type | — | — | — | keep at root (family): AST node types buildAST returns |
| `ConditionalSemanticNode` | type | — | — | — | keep at root (family): semantic node types |
| `decrementSchema` | const | — | — | — | keep at root (family): command schemas, 5 of 15 imported by lokascript-domains |
| `EventHandlerNode` | type | — | — | — | keep at root (family): AST node types buildAST returns |
| `fetchSchema` | const | — | — | — | keep at root (family): command schemas, 5 of 15 imported by lokascript-domains |
| `incrementSchema` | const | — | — | — | keep at root (family): command schemas, 5 of 15 imported by lokascript-domains |
| `LoopSemanticNode` | type | — | — | — | keep at root (family): semantic node types |
| `LoopVariant` | type | — | — | — | keep at root (family): semantic node types |
| `onSchema` | const | — | — | — | keep at root (family): command schemas, 5 of 15 imported by lokascript-domains |
| `prependSchema` | const | — | — | — | keep at root (family): command schemas, 5 of 15 imported by lokascript-domains |
| `putSchema` | const | — | — | — | keep at root (family): command schemas, 5 of 15 imported by lokascript-domains |
| `SemanticMetadata` | type | — | — | — | keep at root (family): semantic node types |
| `setSchema` | const | — | — | — | keep at root (family): command schemas, 5 of 15 imported by lokascript-domains |
| `triggerSchema` | const | — | — | — | keep at root (family): command schemas, 5 of 15 imported by lokascript-domains |
| `VariableRefExtractor` | class | — | — | — | keep at root (family): hyperscript extractors, the other three are documented |
| `ViewTransitionSemanticNode` | type | — | — | — | keep at root (family): semantic node types |
| `waitSchema` | const | — | — | — | keep at root (family): command schemas, 5 of 15 imported by lokascript-domains |

## Move to a subpath (43)

Not marked. The ten profiles with a root importer need that importer repointed first
(lokascript-learn's `role-markers.ts`, i18n's `dictionaries/derive.ts`); `KNOWN_PROFILES` and
`tryGetProfile` stay at the root for code that wants a profile by language code.

| Name | Kind | In-repo | Sibling repos | Docs | Proposal for 8.0 |
| --- | --- | --- | --- | --- | --- |
| `arabicProfile` | const | from `./languages/ar`: lokascript-domains | lokascript-learn | — | move to `./languages/ar` (already exported there) |
| `arabicTokenizer` | const | — | — | — | move to `./languages/ar` (already exported there); tokenizers, none imported from the root; also on the browser global |
| `ASTBuilder` | class | — | — | — | move to `./browser` (already a member of the global); member of the browser global, no consumer |
| `ASTBuilderOptions` | type | — | — | — | move with `ASTBuilder`; type in the signature of a moved export |
| `bengaliProfile` | const | — | — | — | move to `./languages/bn` (already exported there) |
| `chineseProfile` | const | from `./languages/zh`: lokascript-domains | lokascript-learn | — | move to `./languages/zh` (already exported there) |
| `chineseTokenizer` | const | — | — | — | move to `./languages/zh` (already exported there); tokenizers, none imported from the root; also on the browser global |
| `createCommandNode` | function | — | — | — | move to `./browser` (already a member of the global); member of the browser global, no consumer |
| `createEventHandler` | function | — | — | — | move to `./browser` (already a member of the global); member of the browser global, no consumer |
| `createLiteral` | function | — | — | — | move to `./browser` (already a member of the global); member of the browser global, no consumer |
| `createPropertyPath` | function | — | — | — | move to `./browser` (already a member of the global); member of the browser global, no consumer |
| `createReference` | function | — | — | — | move to `./browser` (already a member of the global); member of the browser global, no consumer |
| `createSelector` | function | — | — | — | move to `./browser` (already a member of the global); member of the browser global, no consumer |
| `englishProfile` | const | from `./languages/en`: lokascript-domains | lokascript-learn | — | move to `./languages/en` (already exported there) |
| `englishTokenizer` | const | — | — | — | move to `./languages/en` (already exported there); tokenizers, none imported from the root; also on the browser global |
| `frenchProfile` | const | from `./languages/fr`: lokascript-domains | lokascript-learn | — | move to `./languages/fr` (already exported there) |
| `germanProfile` | const | from `./languages/de`: lokascript-domains | lokascript-learn | — | move to `./languages/de` (already exported there) |
| `hebrewProfile` | const | — | — | — | move to `./languages/he` (already exported there) |
| `hindiProfile` | const | — | — | — | move to `./languages/hi` (already exported there) |
| `indonesianProfile` | const | — | — | — | move to `./languages/id` (already exported there) |
| `italianProfile` | const | — | — | — | move to `./languages/it` (already exported there) |
| `japaneseProfile` | const | i18n; from `./languages/ja`: lokascript-domains | lokascript-learn | — | move to `./languages/ja` (already exported there) |
| `japaneseTokenizer` | const | — | — | — | move to `./languages/ja` (already exported there); tokenizers, none imported from the root; also on the browser global |
| `koreanProfile` | const | from `./languages/ko`: lokascript-domains | lokascript-learn | — | move to `./languages/ko` (already exported there) |
| `koreanTokenizer` | const | — | — | — | move to `./languages/ko` (already exported there); tokenizers, none imported from the root; also on the browser global |
| `malayProfile` | const | — | — | — | move to `./languages/ms` (already exported there) |
| `parseAny` | function | — | — | — | move to `./browser` (already a member of the global); member of the browser global, no consumer |
| `parseWithConfidence` | function | from `./core`: hyperscript-adapter, vite-plugin; semantic's tests (2) | — | — | move to `./core` (already exported there); imported from the subpath only (hyperscript-adapter, vite-plugin) |
| `polishProfile` | const | — | — | — | move to `./languages/pl` (already exported there) |
| `portugueseProfile` | const | from `./languages/pt`: lokascript-domains | lokascript-learn | — | move to `./languages/pt` (already exported there) |
| `quechuaProfile` | const | — | — | — | move to `./languages/qu` (already exported there) |
| `russianProfile` | const | from `./languages/ru`: lokascript-domains | — | — | move to `./languages/ru` (already exported there) |
| `spanishProfile` | const | from `./languages/es`: lokascript-domains | lokascript-learn | — | move to `./languages/es` (already exported there) |
| `spanishTokenizer` | const | — | — | — | move to `./languages/es` (already exported there); tokenizers, none imported from the root; also on the browser global |
| `swahiliProfile` | const | — | — | — | move to `./languages/sw` (already exported there) |
| `tagalogProfile` | const | — | — | — | move to `./languages/tl` (already exported there) |
| `thaiProfile` | const | — | — | — | move to `./languages/th` (already exported there) |
| `turkishProfile` | const | from `./languages/tr`: lokascript-domains | lokascript-learn | — | move to `./languages/tr` (already exported there) |
| `turkishTokenizer` | const | — | — | — | move to `./languages/tr` (already exported there); tokenizers, none imported from the root; also on the browser global |
| `ukrainianProfile` | const | — | — | — | move to `./languages/uk` (already exported there) |
| `validateTranslation` | function | — | — | — | move to `./browser` (already a member of the global); member of the browser global, no consumer |
| `ValueExtractor` | type | — | — | — | move with `arabicTokenizer`, `chineseTokenizer`, `englishTokenizer`; type in the signature of a moved export |
| `vietnameseProfile` | const | — | — | — | move to `./languages/vi` (already exported there) |

## Remove, marked `@deprecated` (81)

| Name | Kind | In-repo | Sibling repos | Docs | Proposal for 8.0 |
| --- | --- | --- | --- | --- | --- |
| `buildFromAstShape` | function | — | — | — | remove |
| `canLoadLanguage` | function | — | — | — | remove |
| `ContextAwareExtractor` | type | — | — | — | remove; `@lokascript/framework` exports it |
| `convertExpression` | function | — | — | — | remove from the root; `./core` keeps it |
| `convertLiteral` | function | — | — | — | remove from the root; `./core` keeps it |
| `convertPropertyPath` | function | — | — | — | remove from the root; `./core` keeps it |
| `convertReference` | function | — | — | — | remove from the root; `./core` keeps it |
| `convertSelector` | function | — | — | — | remove from the root; `./core` keeps it |
| `convertValue` | function | — | — | — | remove from the root; `./core` keeps it |
| `createCompoundNode` | function | — | — | — | remove |
| `createConditionalNode` | function | — | — | — | remove |
| `createLoopNode` | function | — | — | — | remove |
| `createTokenizerContext` | function | — | — | — | remove; `@lokascript/framework` exports it |
| `generateAllPatterns` | function | — | — | — | remove |
| `generatePattern` | function | — | — | — | remove |
| `generatePatternsForCommand` | function | — | — | — | remove |
| `generatePatternsForLanguage` | function | — | — | — | remove from the root; `./core` keeps it |
| `generatePatternVariants` | function | — | — | — | remove |
| `generateSimplePattern` | function | — | — | — | remove |
| `GeneratorConfig` | type | — | — | — | remove |
| `getCommandType` | function | — | — | — | remove |
| `getDefaultExtractors` | function | — | — | — | remove |
| `getDefinedSchemas` | function | — | — | — | remove |
| `getEventHandlerPatternsForLanguage` | function | — | — | — | remove |
| `getGeneratorSummary` | function | — | — | — | remove |
| `getHyperscriptExtractors` | function | — | — | — | remove |
| `getLoadedLanguages` | function | — | — | — | remove |
| `getPatternById` | function | — | — | — | remove |
| `getPatternsForLanguageAndCommand` | function | — | — | — | remove |
| `getPatternStats` | function | — | — | — | remove |
| `getPutPatternsForLanguage` | function | — | — | — | remove |
| `getRegisteredMappers` | function | — | — | — | remove from the root; `./core` keeps it |
| `getRoleMarkers` | function | — | — | — | remove |
| `getSchemaMapper` | function | — | — | — | remove |
| `getSchemasByCategory` | function | — | — | — | remove |
| `getSupportedCommands` | function | — | — | — | remove |
| `getSupportedPatternLanguages` | function | — | — | — | remove |
| `getTogglePatternsForLanguage` | function | — | — | — | remove |
| `getUnloadedLanguages` | function | — | — | — | remove |
| `IdentifierExtractor` | class | — | — | — | remove; `@lokascript/framework` exports it |
| `isBlockCommand` | function | — | — | — | remove |
| `isContextAwareExtractor` | function | — | — | — | remove; `@lokascript/framework` exports it |
| `isUnifiedProfile` | function | — | — | — | remove |
| `isViewTransitionBlock` | function | — | — | — | remove |
| `LAZY_LOAD_LANGUAGES` | const | — | — | — | remove |
| `loadLanguages` | function | — | — | — | remove |
| `markingStrategyToAdpositionType` | function | — | — | — | remove |
| `matchBest` | function | — | — | — | remove |
| `matchPattern` | function | — | — | — | remove |
| `normalizeEventName` | function | — | — | — | remove |
| `NumberExtractor` | class | — | — | — | remove; `@lokascript/framework` exports it |
| `OperatorExtractor` | class | — | — | — | remove |
| `patternMatcher` | const | — | — | — | remove |
| `PatternMatcher` | class | — | — | — | remove |
| `PatternMatchError` | type | — | — | — | remove |
| `PatternMatchResult` | type | — | — | — | remove from the root; `./core` keeps it |
| `PunctuationExtractor` | class | — | — | — | remove |
| `registerLexicon` | function | — | — | — | remove from the root; `./core` keeps it |
| `registerSchema` | function | — | — | — | remove |
| `registerTokenizer` | function | — | — | — | remove |
| `SchemaErrorCodes` | const | — | — | — | remove |
| `schemaRegistry` | const | — | — | — | remove |
| `SchemaValidationResult` | type | — | — | — | remove |
| `semanticParser` | const | — | — | — | remove |
| `SemanticParser` | type | — | — | — | remove |
| `SemanticParserImpl` | class | — | — | — | remove |
| `SemanticRenderer` | type | — | — | — | remove |
| `SemanticRendererImpl` | class | — | — | — | remove |
| `StringLiteralExtractor` | class | — | — | — | remove; `@lokascript/framework` exports it |
| `SUPPORTED_LANGUAGES` | const | — | — | — | remove |
| `toGrammaticalMarker` | function | — | — | — | remove |
| `toI18nProfile` | function | — | — | — | remove |
| `TokenizerContext` | type | — | — | — | remove; `@lokascript/framework` exports it |
| `TokenStreamImpl` | class | — | — | — | remove; `@lokascript/framework` exports it |
| `UnifiedGrammarRule` | type | — | — | — | remove |
| `UnifiedLanguageProfile` | type | — | — | — | remove |
| `UnifiedPatternMatcher` | type | — | — | — | remove |
| `UnifiedPatternTransform` | type | — | — | — | remove |
| `UnifiedRoleMarker` | type | — | — | — | remove |
| `validateAndAdjustConfidence` | function | — | — | — | remove |
| `validateLanguageKeywords` | function | — | — | — | remove |

## Remove, not marked (27)

| Name | Kind | In-repo | Sibling repos | Docs | Proposal for 8.0 |
| --- | --- | --- | --- | --- | --- |
| `AnalysisConfig` | type | — | — | — | remove (as a family; not marked): no consumer; `analyze` appears in a sketch in packages/semantic/docs/NOVEL_APPLICATIONS.md |
| `AnalysisResult` | type | — | — | — | remove (as a family; not marked): no consumer; `analyze` appears in a sketch in packages/semantic/docs/NOVEL_APPLICATIONS.md |
| `AnalysisWarning` | type | — | — | — | remove (as a family; not marked): no consumer; `analyze` appears in a sketch in packages/semantic/docs/NOVEL_APPLICATIONS.md |
| `analyze` | function | — | — | — | remove (as a family; not marked): no consumer; `analyze` appears in a sketch in packages/semantic/docs/NOVEL_APPLICATIONS.md |
| `analyzeAll` | function | — | — | — | remove (as a family; not marked): no consumer; `analyze` appears in a sketch in packages/semantic/docs/NOVEL_APPLICATIONS.md |
| `analyzeMultiple` | function | — | — | — | remove (as a family; not marked): no consumer; `analyze` appears in a sketch in packages/semantic/docs/NOVEL_APPLICATIONS.md |
| `CacheStats` | type | — | — | — | remove (not marked): no consumer found; an earlier review recorded these as used, which this measurement could not reproduce |
| `checkAccessibility` | function | — | — | — | remove (as a family; not marked): no consumer; `analyze` appears in a sketch in packages/semantic/docs/NOVEL_APPLICATIONS.md |
| `checkPerformance` | function | — | — | — | remove (as a family; not marked): no consumer; `analyze` appears in a sketch in packages/semantic/docs/NOVEL_APPLICATIONS.md |
| `checkSchema` | function | — | — | — | remove (as a family; not marked): no consumer; `analyze` appears in a sketch in packages/semantic/docs/NOVEL_APPLICATIONS.md |
| `createSemanticCache` | function | — | — | — | remove (not marked): no consumer found; an earlier review recorded these as used, which this measurement could not reproduce |
| `devModeAnalyze` | function | — | — | — | remove (as a family; not marked): no consumer; `analyze` appears in a sketch in packages/semantic/docs/NOVEL_APPLICATIONS.md |
| `disableDevMode` | function | — | — | — | remove (as a family; not marked): no consumer; `analyze` appears in a sketch in packages/semantic/docs/NOVEL_APPLICATIONS.md |
| `enableDevMode` | function | — | — | — | remove (as a family; not marked): no consumer; `analyze` appears in a sketch in packages/semantic/docs/NOVEL_APPLICATIONS.md |
| `getAllTranslationsWithStatus` | function | semantic's tests (1) | — | — | remove (not marked): semantic's own tests only (1 file) |
| `getDevModeConfig` | function | — | — | — | remove (as a family; not marked): no consumer; `analyze` appears in a sketch in packages/semantic/docs/NOVEL_APPLICATIONS.md |
| `getRegisteredLexicons` | function | semantic's tests (1) | — | — | remove (not marked): semantic's own tests only (1 file) |
| `getSupportedTokenizerLanguages` | function | semantic's tests (2) | — | — | remove (not marked): semantic's own tests only (2 files) |
| `isDevModeEnabled` | function | — | — | — | remove (as a family; not marked): no consumer; `analyze` appears in a sketch in packages/semantic/docs/NOVEL_APPLICATIONS.md |
| `localizeEventName` | function | semantic's tests (5) | — | — | remove (not marked): semantic's own tests only (5 files) |
| `semanticCache` | const | — | — | — | remove (not marked): no consumer found; an earlier review recorded these as used, which this measurement could not reproduce |
| `SemanticCache` | class | — | — | — | remove (not marked): no consumer found; an earlier review recorded these as used, which this measurement could not reproduce |
| `SemanticCacheConfig` | type | — | — | — | remove (not marked): no consumer found; an earlier review recorded these as used, which this measurement could not reproduce |
| `semanticRenderer` | const | semantic's tests (4) | — | — | remove (not marked): semantic's own tests only (4 files) |
| `WarningCode` | type | — | — | — | remove (as a family; not marked): no consumer; `analyze` appears in a sketch in packages/semantic/docs/NOVEL_APPLICATIONS.md |
| `WarningSeverity` | type | — | — | — | remove (as a family; not marked): no consumer; `analyze` appears in a sketch in packages/semantic/docs/NOVEL_APPLICATIONS.md |
| `withCache` | function | — | — | — | remove (not marked): no consumer found; an earlier review recorded these as used, which this measurement could not reproduce |
