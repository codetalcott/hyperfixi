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
grep -c '@deprecated' packages/semantic/dist/index.d.ts                                   # 102 marked
# one name, here and in the sibling checkouts (hits inside packages/semantic/src are the package itself):
rg -n --hidden -g '!node_modules' -g '!dist' -g '!CHANGELOG*' '\bgetPatternById\b' . ../lokascript-domains \
  ../lokascript-learn ../lokascript-examples ../lokascript-lessons ../_hyper_min ../claude-plugins
```

## Counts

| | Names |
| --- | --- |
| Root exports | **296** (198 values, 98 types) |
| Keep at root | **146** |
| … imported from the root by another package, an example, a script or a sibling repo | 58 |
| … used through the browser global only | 2 |
| … documented, no consumer | 11 |
| … a type in the signature of a kept export | 53 |
| … kept with its family (command schemas, node types, extractors) | 21 |
| … unconsumed, kept after the 2026-11-13 check (`SchemaErrorCodes`) | 1 |
| Move to a subpath | **43** (24 language profiles, 7 tokenizers, 12 others) |
| Remove, marked `@deprecated` | **102** (82 values, 20 types) |
| Remove, not marked | **5** (imported from the root by semantic's own tests) |

Of the 102 marked names, 10 stay exported from `@lokascript/semantic/core` and 8 are
re-exports of `@lokascript/framework`'s own exports; each tag says so. The first pass marked 81.
On 2026-11-13 each unconsumed name was run (the last section of this file): the 16 analysis and
6 cache names were marked, and the mark came off `SchemaErrorCodes`. `./core` exports the six
cache names today; their tags do not say so, because the recommendation is to delete that code.

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
  reports a deprecation for exactly these 102 names on import from the root (checked against
  `src/index.ts` and the built `dist/index.d.ts`), and for none through `./core`.
- **Remove, not marked**: five names semantic's own tests import through `../src`. A tag would
  put a deprecation on the package's own tests; the tests can import the module instead, and
  then the name has no consumer. (The analysis and cache families were also left unmarked in
  the first pass, as the owner's call. Both were run on 2026-11-13, neither is connected to
  anything, and both are marked now: see the last section.)

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
- `getAllTranslations` (kept; mcp-server, the playground and lokascript-learn call it) returns a
  truncated translation where `translate` refuses one: `getAllTranslations('on click blarg the
  frobnicator', 'en', ['es'])` → `{ es: 'al clic', … }`. It renders without `translate`'s loss check.
- The comment over the generic extractors says they are re-exported from framework.
  `OperatorExtractor`, `PunctuationExtractor` and `getDefaultExtractors` are semantic's own
  declarations under framework's names.

## Keep at root (146)

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

### Unconsumed, kept after the 2026-11-13 check (1)

| Name | Kind | In-repo | Sibling repos | Docs | Proposal for 8.0 |
| --- | --- | --- | --- | --- | --- |
| `SchemaErrorCodes` | const | — | — | — | keep at root (mark removed) |

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

## Remove, marked `@deprecated` (102)

The last column is the recommendation from the check in the last section, which has the evidence.

| Name | Kind | In-repo | Sibling repos | Docs | Proposal for 8.0 |
| --- | --- | --- | --- | --- | --- |
| `AnalysisConfig` | type | — | — | — | delete the code (with the module) |
| `AnalysisResult` | type | — | — | — | delete the code (with the module) |
| `AnalysisWarning` | type | — | — | — | delete the code (with the module) |
| `analyze` | function | — | — | — | delete the code (with the module: 479 lines and the 276-line test) |
| `analyzeAll` | function | — | — | — | delete the code (with the module) |
| `analyzeMultiple` | function | — | — | — | delete the code (with the module) |
| `buildFromAstShape` | function | — | — | — | remove from root, keep internal |
| `CacheStats` | type | — | — | — | delete the code (with the module) |
| `canLoadLanguage` | function | — | — | — | remove from root, keep internal (the lazy bundle's global keeps it) |
| `checkAccessibility` | function | — | — | — | delete the code (with the module) |
| `checkPerformance` | function | — | — | — | delete the code (with the module) |
| `checkSchema` | function | — | — | — | delete the code (with the module) |
| `ContextAwareExtractor` | type | — | — | — | remove from root, keep internal |
| `convertExpression` | function | — | — | — | remove from root, keep internal |
| `convertLiteral` | function | — | — | — | remove from root, keep internal |
| `convertPropertyPath` | function | — | — | — | remove from root, keep internal |
| `convertReference` | function | — | — | — | remove from root, keep internal |
| `convertSelector` | function | — | — | — | remove from root, keep internal |
| `convertValue` | function | — | — | — | remove from root, keep internal |
| `createCompoundNode` | function | — | — | — | remove from root, keep internal |
| `createConditionalNode` | function | — | — | — | remove from root, keep internal |
| `createLoopNode` | function | — | — | — | remove from root, keep internal |
| `createSemanticCache` | function | — | — | — | delete the code (with the module) |
| `createTokenizerContext` | function | — | — | — | remove from root, keep internal |
| `devModeAnalyze` | function | — | — | — | delete the code (with the module) |
| `disableDevMode` | function | — | — | — | delete the code (with the module) |
| `enableDevMode` | function | — | — | — | delete the code (with the module) |
| `generateAllPatterns` | function | — | — | — | remove from root, keep internal |
| `generatePattern` | function | — | — | — | remove from root, keep internal |
| `generatePatternsForCommand` | function | — | — | — | remove from root, keep internal (and correct those instructions) |
| `generatePatternsForLanguage` | function | — | — | — | remove from root, keep internal |
| `generatePatternVariants` | function | — | — | — | remove from root, keep internal |
| `generateSimplePattern` | function | — | — | — | remove from root, keep internal |
| `GeneratorConfig` | type | — | — | — | remove from root, keep internal |
| `getCommandType` | function | — | — | — | delete the code (10 lines in `parser/semantic-parser.ts`) |
| `getDefaultExtractors` | function | — | — | — | delete the code (10 lines in `tokenizers/generic-extractors.ts`) |
| `getDefinedSchemas` | function | — | — | — | remove from root, keep internal |
| `getDevModeConfig` | function | — | — | — | delete the code (with the module) |
| `getEventHandlerPatternsForLanguage` | function | — | — | — | remove from root, keep internal |
| `getGeneratorSummary` | function | — | — | — | delete the code (25 lines and its cases in the two generator tests) |
| `getHyperscriptExtractors` | function | — | — | — | remove from root, keep internal |
| `getLoadedLanguages` | function | — | — | — | remove from root, keep internal (the lazy bundle's global keeps it) |
| `getPatternById` | function | — | — | — | delete the code (6 lines) |
| `getPatternsForLanguageAndCommand` | function | — | — | — | delete the code (9 lines in `patterns/registry.ts`) |
| `getPatternStats` | function | — | — | — | delete the code (25 lines with its `PatternStats` type) |
| `getPutPatternsForLanguage` | function | — | — | — | remove from root, keep internal |
| `getRegisteredMappers` | function | — | — | — | remove from root, keep internal |
| `getRoleMarkers` | function | — | — | — | delete the code (12 lines and four test cases) |
| `getSchemaMapper` | function | — | — | — | remove from root, keep internal |
| `getSchemasByCategory` | function | — | — | — | delete the code (6 lines and three test cases) |
| `getSupportedCommands` | function | — | — | — | delete the code (7 lines) |
| `getSupportedPatternLanguages` | function | — | — | — | delete the code (7 lines in `patterns/registry.ts`) |
| `getTogglePatternsForLanguage` | function | — | — | — | remove from root, keep internal |
| `getUnloadedLanguages` | function | — | — | — | remove from root, keep internal (the lazy bundle's global keeps it) |
| `IdentifierExtractor` | class | — | — | — | remove from root, keep internal |
| `isBlockCommand` | function | — | — | — | remove from root, keep internal |
| `isContextAwareExtractor` | function | — | — | — | remove from root, keep internal |
| `isDevModeEnabled` | function | — | — | — | delete the code (with the module) |
| `isUnifiedProfile` | function | — | — | — | delete the code (with the file) |
| `isViewTransitionBlock` | function | — | — | — | delete the code (4 lines in `types.ts`) |
| `LAZY_LOAD_LANGUAGES` | const | — | — | — | delete the code (1 line) |
| `loadLanguages` | function | — | — | — | remove from root, keep internal (the lazy bundle's global keeps it) |
| `markingStrategyToAdpositionType` | function | — | — | — | delete the code (with the file) |
| `matchBest` | function | — | — | — | delete the code (the wrapper, 8 lines) |
| `matchPattern` | function | — | — | — | delete the code (the wrapper, 8 lines in `parser/pattern-matcher.ts`) |
| `normalizeEventName` | function | — | — | — | remove from root, keep internal |
| `NumberExtractor` | class | — | — | — | remove from root, keep internal |
| `OperatorExtractor` | class | — | — | — | remove from root, keep internal (or import framework's and delete the copy (about 70 lines with `PunctuationExtractor`)) |
| `PatternMatcher` | class | — | — | — | remove from root, keep internal |
| `patternMatcher` | const | — | — | — | remove from root, keep internal |
| `PatternMatchError` | type | — | — | — | delete the code (its declaration in `types.ts`) |
| `PatternMatchResult` | type | — | — | — | remove from root, keep internal |
| `PunctuationExtractor` | class | — | — | — | remove from root, keep internal (as `OperatorExtractor`) |
| `registerLexicon` | function | — | — | — | remove from root, keep internal (`./core` keeps it for the lexicon modules; correct its doc comment) |
| `registerSchema` | function | — | — | — | delete the code (6 lines in `validators/command-validator.ts`) |
| `registerTokenizer` | function | — | — | — | delete the code (the wrapper in `tokenizers/index.ts` and `registry.ts`'s function, 10 lines) |
| `schemaRegistry` | const | — | — | — | remove from root, keep internal |
| `SchemaValidationResult` | type | — | — | — | delete the code (the alias, and write `SchemaValidation` at its two uses) |
| `SemanticCache` | class | — | — | — | delete the code (with the module: 371 lines, plus its lines in `core.ts` and `core-bridge.ts`) |
| `semanticCache` | const | — | — | — | delete the code (with the module) |
| `SemanticCacheConfig` | type | — | — | — | delete the code (with the module) |
| `semanticParser` | const | — | — | — | remove from root, keep internal |
| `SemanticParser` | type | — | — | — | remove from root, keep internal |
| `SemanticParserImpl` | class | — | — | — | remove from root, keep internal |
| `SemanticRenderer` | type | — | — | — | remove from root, keep internal |
| `SemanticRendererImpl` | class | — | — | — | remove from root, keep internal |
| `StringLiteralExtractor` | class | — | — | — | remove from root, keep internal |
| `SUPPORTED_LANGUAGES` | const | — | — | — | remove from root, keep internal |
| `toGrammaticalMarker` | function | — | — | — | delete the code (with the file) |
| `toI18nProfile` | function | — | — | — | delete the code (with the file) |
| `TokenizerContext` | type | — | — | — | remove from root, keep internal |
| `TokenStreamImpl` | class | — | — | — | remove from root, keep internal |
| `UnifiedGrammarRule` | type | — | — | — | delete the code (with the file) |
| `UnifiedLanguageProfile` | type | — | — | — | delete the code (with the file: 267 lines) |
| `UnifiedPatternMatcher` | type | — | — | — | delete the code (with the file) |
| `UnifiedPatternTransform` | type | — | — | — | delete the code (with the file) |
| `UnifiedRoleMarker` | type | — | — | — | delete the code (with the file) |
| `validateAndAdjustConfidence` | function | — | — | — | delete the code (13 lines and its `describe` block in `test/validators/command-validator.test.ts`) |
| `validateLanguageKeywords` | function | — | — | — | delete the code (17 lines and its cases in the two generator tests) |
| `WarningCode` | type | — | — | — | delete the code (with the module) |
| `WarningSeverity` | type | — | — | — | delete the code (with the module) |
| `withCache` | function | — | — | — | delete the code (with the module) |

## Remove, not marked (5)

| Name | Kind | In-repo | Sibling repos | Docs | Proposal for 8.0 |
| --- | --- | --- | --- | --- | --- |
| `getAllTranslationsWithStatus` | function | semantic's tests (1) | — | — | remove from root, keep internal (not marked: one of semantic's tests imports it from the root) |
| `getRegisteredLexicons` | function | semantic's tests (1) | — | — | remove from root, keep internal (not marked: one of semantic's tests imports it from the root) |
| `getSupportedTokenizerLanguages` | function | semantic's tests (2) | — | — | remove from root, keep internal (not marked: two of semantic's tests import it from the root) |
| `localizeEventName` | function | semantic's tests (5) | — | — | remove from root, keep internal (not marked: five of semantic's tests import it from the root) |
| `semanticRenderer` | const | semantic's tests (4) | — | — | remove from root, keep internal (not marked: semantic's tests import it from the root) |

## What each unconsumed export does (2026-11-13)

The inventory above says who imports a name. This section says what each of the 108 names with
no consumer was for, and whether it does that, so the 8.0 decision does not rest on "nobody
imports it" alone.

### How it was checked

At `7bb73010c` (the inventory commit, on `006fe5273`), macOS, Node 24.15.0, with `dist` built from
that tree. The scripts were throwaway; each row names its input and output so it can be re-run.

1. **Intent**: the doc comment on the declaration, mentions in the package's Markdown, and the
   oldest commit `git log -S<name> -- packages/semantic/src` finds.
2. **Values** were called from `packages/semantic/dist/index.cjs` on the inputs shown.
   "Reads back" means the output was parsed again in its language and rendered in English.
   Where a name is a re-export, it was compared by identity (`===`) with the other package's export.
3. **Types** were compared with the value the package produces today, or found to have none.
4. **Callers and tests**: a word search for the name in `src` (outside the entry files and the
   declaring file) and in `test/` and `src/**/*.test.ts`. "No caller" means none in `src`.
5. The three registration exports were tried end to end with a toy language and a toy command;
   the parser and renderer classes were compared with `parse`, `render` and `translate` on the
   same input.

Not run: the full semantic suite, the multilingual gates, Playwright, and the browser bundles
(what a name does on a `LokaScriptSemantic*` global was not checked). Line counts for deletions
are of the declarations as they stand, comments included, and are approximate. Nothing was
deleted: this change only moves `@deprecated` tags.

Verdicts: **works** (does what it says, shown by a run); **works, duplicate** (works, and a kept
export or another package's export does the same); **partly** (the row says what fails);
**inert** (runs and has no effect, or is a shape nothing produces); **internal** (works, the
package depends on it, and it is plumbing, not API). No name was **broken** outright (none
throws or returns a constant on valid input).

### Summary

| Verdict | Names |
| --- | --- |
| works | 27 |
| works, duplicate | 25 |
| internal | 30 |
| partly | 13 |
| inert | 13 |
| broken | 0 |

| Recommendation for 8.0 | Names |
| --- | --- |
| remove from root, keep internal | 56 |
| delete the code | 51 |
| keep at root | 1 |
| keep, fix first | 0 |

"Remove from root, keep internal" leaves the declaration and its internal uses alone and drops
the root export; where the row says `./core` exports the name, that export stays. "Delete the
code" means neither the package nor anything else needs the declaration.

What the deletions come to: `src/analysis` (479 lines) with `test/analysis/analysis.test.ts`
(276); `src/cache` (371, no test); `src/types/unified-profile.ts` (267, no test); and about
200 lines of single functions, wrappers and aliases across thirteen files, with the test cases
named in their rows.

The findings that bear on the decision:

- **The renderer class skips what makes `render` safe.** `semanticRenderer.render` writes a
  variable spelled like a structure word bare, and the text reads back as another script without
  an error (es `si + 1` → `if + 1`); for English it leaves core-only forms unrewritten. See
  "Renderer".
- **None of `registerLexicon`, `registerTokenizer`, `registerSchema` extends `parse` and
  `render` together.** The working way to add a language from the root is the kept
  `loadLanguage(code, { module })`. `registerSchema` adds no command to either.
- **Analysis is right about the events it knows and blind elsewhere**: its own doc example
  (`on hover …`) gets no warning, a script with unread words is `valid: true`, and a handler's
  body is never checked. Dev mode does nothing.
- **The cache works and is connected to nothing.**
- **The unified profile is a shape nothing produces.**
- **One name is worth keeping**: `SchemaErrorCodes` names the codes a kept function returns.

### Static analysis (16)

Added 2025-12-13 (`8c2e14c49`, "static analysis module with dev mode integration"). `src/analysis/index.ts` is 479 lines; nothing in `src` imports it but the root entry. `test/analysis/analysis.test.ts` (276 lines, imports the module, not the root) asserts real warnings for `mouseenter`, `mouseover`, `scroll`, `mousemove`, `resize` and `input`; it has no case for `hover`, for a handler body, or for unread input. mcp-server's analysis tools do not call it. If the family is kept instead, the fixes are: read an event that parses as an expression (`hover`), fail on the parser's unconsumed-input diagnostic, walk handler bodies and compound statements in `checkSchema`, skip the frequency warning when the handler has a throttle or debounce, write the suggestion in syntax the parser reads (`throttled at 100ms`), and either call `devModeAnalyze` from `parse` or drop dev mode.

| Name | Intended for | Verdict | 8.0 recommendation |
| --- | --- | --- | --- |
| `analyze` | Parse one script and return warnings: hover-only events, high-frequency events, roles the schema does not allow. | **partly.** Right: `on mouseenter show .tooltip` → `HOVER_ONLY_INTERACTION`; `on scroll add .seen to me` → `HIGH_FREQUENCY_TRIGGER` (warning); `on keyup …` → the same as info; `put into #out` → `valid: false`. Wrong: its own doc example `on hover show .tooltip` → no warning (`hover` parses as an expression, the check wants a literal); `on click blarg the frobnicator` → `valid: true`, no warnings (the parser's "3 tokens unconsumed" diagnostic is ignored); `on click add to me` → `valid: true` (a handler's body is never schema-checked); `on mouseenter add .hover then on focus add .hover` → no warning (a compound is not walked); `on scroll throttled at 100ms add .seen to me` still warns; the suggestion `on scroll throttled:100ms` parses with no throttle modifier. | delete the code (with the module: 479 lines and the 276-line test) |
| `analyzeAll` | Analyze several scripts and add cross-script conflicts. | **partly.** `['on click toggle #m', 'on click hide #m']` → `CONFLICTING_ACTIONS`; two `on click fetch …` → `POTENTIAL_RACE_CONDITION`; `['on click show #a', 'on click hide #b']` → none. Each script goes through `analyze`, so it has `analyze`'s gaps. | delete the code (with the module) |
| `analyzeMultiple` | Find conflicting handlers among parsed nodes. | **works.** The parses of `on click toggle #m` and `on click hide #m` → `CONFLICTING_ACTIONS`. Its `config` parameter is unused. | delete the code (with the module) |
| `checkAccessibility` | Warn on a hover-only handler. | **partly.** `mouseenter` and `mouseover` handlers → warning. `hover` is in its list and never matches (see `analyze`). | delete the code (with the module) |
| `checkPerformance` | Warn on a high-frequency event with no throttle. | **partly.** `scroll` → warning, `keyup` → info. It does not read the handler's modifiers, so a throttled handler gets the same warning. | delete the code (with the module) |
| `checkSchema` | Check a command's roles against its schema. | **partly.** A `put` node with no roles → two `MISSING_REQUIRED_ROLE`; a `toggle` node with a `quantity` role → `INVALID_ROLE_FOR_COMMAND`. Any event handler → `[]`: it returns before looking unless the top node is a command. | delete the code (with the module) |
| `enableDevMode` | "When enabled, every parse() call will run analysis and log warnings." | **inert.** After `enableDevMode()`, `parse('on mouseenter show .tooltip', 'en')` logs nothing: `parse` never calls `devModeAnalyze`. It sets a flag only `devModeAnalyze` reads. | delete the code (with the module) |
| `disableDevMode` | Turn dev mode off. | **inert.** Clears the same flag. | delete the code (with the module) |
| `isDevModeEnabled` | Read the dev-mode flag. | **inert.** `false`, then `true` after `enableDevMode()`: the flag is real, and gates nothing that runs. | delete the code (with the module) |
| `getDevModeConfig` | Read the dev-mode config. | **inert.** Returns what `enableDevMode` was given (`{strict: true}`). | delete the code (with the module) |
| `devModeAnalyze` | "Called internally by parser when dev mode is on." | **inert.** No caller in the package. Called by hand with dev mode on it logs the right `console.warn` line. | delete the code (with the module) |
| `AnalysisResult` | The result of `analyze`. | **works.** The shape `analyze` returns: `valid`, `warnings`, `node`. | delete the code (with the module) |
| `AnalysisWarning` | One warning. | **works.** The shape of each warning: `code`, `severity`, `message`, `suggestion`, `location`. | delete the code (with the module) |
| `AnalysisConfig` | Switches for the three checks and strict mode. | **works.** `accessibility: false` drops the hover warning; `strict: true` turns `valid` false on a warning. `analyzeMultiple` ignores it. | delete the code (with the module) |
| `WarningSeverity` | `error`, `warning` or `info`. | **works.** All three are emitted. | delete the code (with the module) |
| `WarningCode` | The seven warning codes. | **works.** All seven are emitted. `UNREACHABLE_BEHAVIOR` is what a failed parse is reported as. | delete the code (with the module) |

### Cache (6)

Added 2025-12-12 (`e53dbbf14`, "per-command validation and LRU caching") for the semantic analyzer's results; disconnected in 3.0.0 (`e144aaa62`), and the file's own comment says so. `src/cache` is 371 lines with no test and no importer but the entry files. `./core` exports the four values and the two types as well, so deleting the code is a change to `./core` in 8.0 too; the tags added here do not say "`./core` still exports it" for that reason. Timings: one run, macOS, Node 24.15.0.

| Name | Intended for | Verdict | 8.0 recommendation |
| --- | --- | --- | --- |
| `SemanticCache` | LRU cache keyed `language:input`, with optional expiry and statistics. | **works.** `maxSize: 2`: after `set a`, `set b`, `get a`, `set c` it holds `a` and `c` and counts one eviction; `ttlMs: 1` expires an entry; a `{confidence: 0}` result is not stored. It is connected to nothing: after 50 `parse` and 50 `translate` calls the default instance counts 0 hits and 0 misses. | delete the code (with the module: 371 lines, plus its lines in `core.ts` and `core-bridge.ts`) |
| `semanticCache` | The default instance. | **inert.** Nothing in the package reads or writes it. Disabling it changes nothing: 200 parses took 41 ms with it enabled, 38 ms disabled. | delete the code (with the module) |
| `createSemanticCache` | Make a cache with a config. | **works, duplicate.** Is `new SemanticCache(config)`. | delete the code (with the module) |
| `withCache` | Wrap an `(input, language)` function with a cache. | **partly.** Wrapping `parse`: 200 calls on one input took 0.4 ms against 41 ms uncached, the function ran once. A falsy result is recomputed on every call (a function returning `0` ran twice for two calls), and every caller gets the same node object. | delete the code (with the module) |
| `SemanticCacheConfig` | Cache options. | **works.** The three options `SemanticCache` reads. | delete the code (with the module) |
| `CacheStats` | Cache statistics. | **works.** The shape `getStats()` returns. | delete the code (with the module) |

### Parser and pattern matcher (10)

From the first commit of the package (2025-12-11, `d89f294d9`). `parse` is `semanticParser.parse`, so the class is what the public function runs, and it applies no check the function lacks: neither refuses anything (`translate` is where a lossy result is refused). The matcher is one stage of a parse, not a parser.

| Name | Intended for | Verdict | 8.0 recommendation |
| --- | --- | --- | --- |
| `SemanticParserImpl` | The parser class. | **internal.** Six scripts (en, ja, es; a chain, an `if … else … end`, a comment) give the same JSON through `parse`, `semanticParser.parse` and `new SemanticParserImpl().parse`. | remove from root, keep internal |
| `semanticParser` | The parser instance `parse` and `canParse` call. | **internal.** `semanticParser.canParse('toggle .a', 'en')` → `true`, `('zzz qqq', 'en')` → `false`; `supportedLanguages()` → 24. Everything on it is a kept function. | remove from root, keep internal |
| `SemanticParser` | Interface: `parse`, `canParse`, `supportedLanguages`. | **internal.** The class implements it; two source files use it as a type. | remove from root, keep internal |
| `getCommandType` | Parse and return the command. | **works, duplicate.** `toggle .a` → `toggle`; `on click toggle .a` → `on`; `toggle .a then add .b` → `compound`; `zzz qqq` → `null`. It is `parse(x).action` in a try/catch. No caller, no test. | delete the code (10 lines in `parser/semantic-parser.ts`) |
| `PatternMatcher` | Hyperscript's matcher: framework's skeleton with hyperscript's value reader. | **internal.** `new PatternMatcher().matchBest` gives the same match as the singleton. | remove from root, keep internal |
| `patternMatcher` | The matcher instance; seven parser files call it. | **internal.** `matchBest(tokenize('toggle .active on #menu', 'en'), <en toggle patterns>)` → `toggle-en-full`, the same two roles `parse` returns. | remove from root, keep internal |
| `matchPattern` | Function form of `patternMatcher.matchPattern`. | **works, duplicate.** One pattern against a token stream: `null` for `toggle-en-generated-between-pair` on `toggle .active on #menu`. No file imports the function; the parser calls the method. | delete the code (the wrapper, 8 lines in `parser/pattern-matcher.ts`) |
| `matchBest` | Function form of `patternMatcher.matchBest`. | **works, duplicate.** Matches one clause. On `on click toggle .active then add .b` with all 155 English patterns it returns `event-en-standard` having read 2 of 7 tokens: bodies, chains, role normalization and schema defaults are the parser's. No file imports the function. | delete the code (the wrapper, 8 lines) |
| `PatternMatchResult` | What a match returns. | **internal.** A real match has exactly its fields: `pattern`, `captured`, `consumedTokens`, `confidence`, `roleStarts`. `./core` exports it. | remove from root, keep internal |
| `PatternMatchError` | An error for a failed match. | **inert.** Nothing in `src` or the tests constructs or names it; a failed match is `null`. | delete the code (its declaration in `types.ts`) |

### Renderer (3)

`render` at the root is `explicit/verified-render.ts`, not the class. The class is the plain renderer underneath, and **it skips two things the public function does**, both of which change what the output means. (1) A variable spelled like a structure word of the target language: public `render` writes it in parentheses, the class writes it bare, and the bare text reads back as a different script with no error. `on click set x to si + 1 then put x into #out` → es: public `… establecer x a (si) + 1 …`, class `… establecer x a si + 1 …`, which reads back as `set x to if + 1` (and `translate(…, 'es', 'en')` returns that without refusing). `on click put length of si into #out` → es through the class reads back as `on click` alone. de `ist` reads back as `is`. (2) English: public `render` rewrites core-only forms into upstream's spelling, the class does not: `prepend "x" to #out` → public `put "x" at start of #out`, class `prepend "x" to #out`; `set @a to 1 on #x` → public `set @a of #x to 1`. That is the reason these should not be public. Separately: neither `render` nor the class refuses a lossy node (`render(parse('on click blarg the frobnicator', 'en'), 'es')` → `al clic`); only `translate` does.

| Name | Intended for | Verdict | 8.0 recommendation |
| --- | --- | --- | --- |
| `SemanticRendererImpl` | The renderer class. | **internal.** See above: same output as `render` where no name collides and the target is not English (`on click toggle .active on #menu` → ja, ar identical), different and unsafe otherwise. One test names the class in a comment. | remove from root, keep internal |
| `semanticRenderer` | The renderer instance `render` is built on. | **internal.** As the class. Four of semantic's tests import it from the root to compare the plain render with the verified one; they can import `src/explicit/renderer`. | remove from root, keep internal (not marked: semantic's tests import it from the root) |
| `SemanticRenderer` | Interface: `render`, `renderExplicit`, `supportedLanguages`. | **internal.** The class implements it and has more (`renderNoting`, `renderPlainWords`, …) that `verified-render` uses. | remove from root, keep internal |

### Registration points and validator (5)

The three `register*` exports read as extension points. Tried end to end with a toy language (`xy`: the Spanish profile with `toggle` renamed `flipar`) and a toy command (`sparkle`: the toggle schema renamed). The root has no `registerLanguage`; the root's way to add a language is the kept `loadLanguage(code, { module: { tokenizer, profile } })`, and that works: after it `parse('flipar .active', 'xy')` is a `toggle`, and `translate('on click toggle .active', 'en', 'xy')` → `en click flipar .active`. (`xy` is then in `getRegisteredLanguages()` and not in `getSupportedLanguages()`.) None of the three exports below does that job.

| Name | Intended for | Verdict | 8.0 recommendation |
| --- | --- | --- | --- |
| `registerLexicon` | Register a language's render vocabulary; "last registration wins, so a host may override". | **partly.** Internal use works: 24 lexicon modules call it at import. As an override it changes the writer and not the reader: with es `and` → `ademas` and `true` → `cierto` registered, `translate('on click if my value is empty and x is true set :n to 5 end', 'en', 'es')` writes `… ademas x es cierto …` without refusing, and that text reads back as `… is empty ademas x is cierto …`. `lexicon.events` is never read (event names have their own table), so an `events` override does nothing. | remove from root, keep internal (`./core` keeps it for the lexicon modules; correct its doc comment) |
| `registerTokenizer` | Register a custom tokenizer ("for full language support, use registerLanguage()", which the root does not export). | **partly.** Replacing a registered language's tokenizer works: a spy registered for `es` was called by `parse`. Registering one for a new code leaves the language half-registered: `xx` appears in `getRegisteredLanguages()`, `tokenize(…, 'xx')` works, `isLanguageRegistered('xx')` is `false`, and `parse` and `translate` throw "Language profile 'xx' is not registered". No caller and no test. | delete the code (the wrapper in `tokenizers/index.ts` and `registry.ts`'s function, 10 lines) |
| `registerSchema` | Register a custom command schema. | **partly.** It writes to the validator's own map. After `registerSchema('sparkle', …)`: `getValidatorSchema('sparkle')` finds it and `validateSemanticResult` uses it; `getSchema('sparkle')` and `commandSchemas.sparkle` are undefined, `parse('sparkle .active', 'en')` throws, `render` of a `sparkle` node falls back to `[sparkle patient:.active]`. Replacing `toggle`'s schema with one that has no roles leaves `parse('toggle .active')` unchanged. No caller and no test. | delete the code (6 lines in `validators/command-validator.ts`) |
| `schemaRegistry` | The validator's map of schemas. | **internal.** The live `Map` (74 entries, one per `commandSchemas` key) that `getValidatorSchema` and `validateSemanticResult` read. Exporting it lets a caller mutate it. | remove from root, keep internal |
| `validateAndAdjustConfidence` | Validate a parse result and move its confidence. | **works.** A `put` result with no arguments at 0.8 → 0.4, `valid: false`, two `MISSING_REQUIRED_ROLE`; a complete `toggle` at 0.8 stays 0.8. Nothing in the package produces the `SemanticParseResult` it takes or calls it; its tests assert which way the confidence moves. | delete the code (13 lines and its `describe` block in `test/validators/command-validator.test.ts`) |

### Languages and the loader (9)

All the lists agree: `getSupportedLanguages()`, `SUPPORTED_LANGUAGES`, `getRegisteredLanguages()`, `getSupportedTokenizerLanguages()`, `getSupportedPatternLanguages()`, `getRegisteredLexicons()` and the keys of `KNOWN_PROFILES` are the same 24 codes. The loader functions were added 2026-01-05 (`aaca4328d`, "lazy loading API") for the lazy browser bundle, which still exports them on its global (`src/browser-lazy.ts`). The root entry registers all 24 languages at import, so at the root they have nothing to do.

| Name | Intended for | Verdict | 8.0 recommendation |
| --- | --- | --- | --- |
| `SUPPORTED_LANGUAGES` | The canonical list of language codes. | **works, duplicate.** 24 codes, the same as `getSupportedLanguages()` in the same order. It is the live array: `SUPPORTED_LANGUAGES.push('zz')` makes `getSupportedLanguages()` return 25. `getSupportedLanguages()` returns a copy. | remove from root, keep internal |
| `LAZY_LOAD_LANGUAGES` | "Backward-compatible alias" of `SUPPORTED_LANGUAGES`. | **works, duplicate.** The same object (`===`). The alias exists only in `index.ts`. | delete the code (1 line) |
| `loadLanguages` | Load several languages in parallel. | **works.** `loadLanguages(['en', 'ja', 'xx'])` → `en` and `ja` `loaded: false` (already registered), `xx` an error naming the 24; with `skipIfRegistered: false`, `ja` → `loaded: true`. `test/language-loader.test.ts` asserts the same. | remove from root, keep internal (the lazy bundle's global keeps it) |
| `canLoadLanguage` | Whether a code can be loaded. | **partly.** `en` → `true`, `xx` → `false`. `pt-BR` → `false`, though `isLanguageRegistered('pt-BR')` is `true` and `parse` accepts it: it does not fall back to the base language. | remove from root, keep internal (the lazy bundle's global keeps it) |
| `getLoadedLanguages` | The languages registered so far. | **works.** 24 at the root, always. | remove from root, keep internal (the lazy bundle's global keeps it) |
| `getUnloadedLanguages` | The languages not yet registered. | **works.** `[]` at the root, always. | remove from root, keep internal (the lazy bundle's global keeps it) |
| `getSupportedPatternLanguages` | The languages that have patterns. | **works, duplicate.** The same 24. It builds every pattern of every language (6,661) to answer. Nothing calls `patterns/registry.ts`'s `getSupportedLanguages` but this export. | delete the code (7 lines in `patterns/registry.ts`) |
| `getSupportedTokenizerLanguages` | The languages that have a tokenizer. | **works, duplicate.** Is `getRegisteredLanguages()` (kept). The parser and renderer use it internally under another name. | remove from root, keep internal (not marked: two of semantic's tests import it from the root) |
| `getRegisteredLexicons` | The languages with render vocabulary, "diagnostics and tests". | **works.** 24 codes, sorted. `./core` exports it. | remove from root, keep internal (not marked: one of semantic's tests imports it from the root) |

### Patterns and event names (9)

From the first commit, except `localizeEventName` (2026-06-15, `cecf0f9d1`). The three `get<Command>PatternsForLanguage` functions return the hand-written patterns only, which is what `patterns/builders.ts` wants from them and not what the names say.

| Name | Intended for | Verdict | 8.0 recommendation |
| --- | --- | --- | --- |
| `getPatternsForLanguageAndCommand` | One language's patterns for one command, highest priority first. | **works, duplicate.** `('en', 'toggle')` → 7 patterns, priorities 105 down to 85; an unknown command or language → `[]`. This is `patterns/registry.ts`'s copy, which nothing in `src` calls; the renderer, `./core` and the browser global use `registry.ts`'s function of the same name. | delete the code (9 lines in `patterns/registry.ts`) |
| `getSupportedCommands` | The commands that have a pattern. | **works.** 70: every key of `commandSchemas` but `else`, `init`, `when`, `compound`. No caller, no test. | delete the code (7 lines) |
| `getPatternById` | Find a pattern by id. | **works.** `toggle-en-full` → the English pattern; `nope` → `undefined`. Ids are unique across all 6,661 patterns. No caller, no test. | delete the code (6 lines) |
| `getPatternStats` | Pattern counts "for debugging/tooling". | **works.** 6,661 patterns, 24 languages, 70 commands; the per-language counts sum to the total and `en` (155) equals `getPatternsForLanguage('en').length`. No caller, no test. | delete the code (25 lines with its `PatternStats` type) |
| `getTogglePatternsForLanguage` | Toggle patterns for a language. | **internal.** Hand-written ones only: en 2 (of the 7 the language reads with), es 2, ja 0, ko 0. | remove from root, keep internal |
| `getPutPatternsForLanguage` | Put patterns for a language. | **internal.** Hand-written ones only: en 7, es 4, ja 3; an unknown language → `[]`. | remove from root, keep internal |
| `getEventHandlerPatternsForLanguage` | Event-handler patterns for a language. | **internal.** Hand-written ones only: en 3, es 6, ja 1, sw 5. | remove from root, keep internal |
| `normalizeEventName` | "Normalize an event name to English." | **partly.** `('クリック', 'ja')`, `('clic', 'es')`, `('Klick', 'de')` → `click`. A word not in the table is lowercased and returned: `('Clic', 'es')` → `clic`, `('myEvent', 'en')` → `myevent`, `('htmx:afterSwap', 'ja')` → `htmx:afterswap`. The parser does not send it custom names (`parse('on myEvent toggle .a', 'en')` keeps `myEvent`), so the two internal callers are unaffected. | remove from root, keep internal |
| `localizeEventName` | An English event name in the language's word, or unchanged where that would not read back. | **internal.** `click` → `クリック` (ja), `clic` (es), `Klick` (de); `nosuch` and an unknown language pass through. For `click`, `submit`, `keyup`, `mouseenter`, `change` and `load` in all 24 languages, `normalizeEventName(localizeEventName(e, L), L)` is `e` (144 of 144). The renderer calls it. | remove from root, keep internal (not marked: five of semantic's tests import it from the root) |

### Generators, schemas and profile queries (14)

The generator functions date from 2025-12-11 (`1abbbd5c0`, "pattern generator for language profiles and command schemas") and have been wrappers over `@lokascript/framework`'s `createSchemaPatternGenerator` since the domains rethink. `generators.test.ts` and `generated-patterns.test.ts` import them from the module and assert ids, priorities and counts.

| Name | Intended for | Verdict | 8.0 recommendation |
| --- | --- | --- | --- |
| `GeneratorConfig` | Generator options. | **works, duplicate.** An alias of framework's `SchemaPatternConfig`; two generator files use it. | remove from root, keep internal |
| `generatePattern` | One pattern for a schema in a language. | **works, duplicate.** `(toggleSchema, spanishProfile)` → `toggle-es-generated`: `alternar` (alternatives `conmutar`, `toggle`), `{patient}`, optional `en {destination}`. Framework's generator, typed with hyperscript's names. Tests call it; `src` does not. | remove from root, keep internal |
| `generateSimplePattern` | The variant with no optional roles. | **works, duplicate.** `(toggleSchema, japaneseProfile)` → `toggle-ja-generated-simple`, `{patient} を 切り替え`. One test calls it; `src` does not. | remove from root, keep internal |
| `generatePatternVariants` | All variants of a schema in a language. | **internal.** `(toggleSchema, japaneseProfile)` → 6 patterns, priorities 105 to 80. The Spanish ones match `alternar .active en #menu` with `patient` and `destination`. | remove from root, keep internal |
| `generatePatternsForLanguage` | Every generated pattern of a language. | **internal.** es → 176 of the 205 patterns the language reads with (the rest are hand-written). `patterns/builders.ts` calls it; `./core` exports it. | remove from root, keep internal |
| `generatePatternsForCommand` | A schema's patterns across profiles. | **works.** `(toggleSchema)` → 126 patterns in 24 languages; `(toggleSchema, [spanishProfile])` → 5. Three tests call it; `src` does not, except the text of the add-a-command instructions in `language-building-schema.ts`, which tells the reader to add it to a `generatedPatterns` array that `patterns/index.ts` no longer has. | remove from root, keep internal (and correct those instructions) |
| `generateAllPatterns` | Every generated pattern of every profile. | **works.** 5,899 patterns in 24 languages. Two tests call it; `src` does not. | remove from root, keep internal |
| `getGeneratorSummary` | A summary of what can be generated. | **partly.** Languages (24) and commands (69) are right. `totalPatterns` is 3,310, an estimate of two per command per language; the generator makes 5,899. | delete the code (25 lines and its cases in the two generator tests) |
| `validateLanguageKeywords` | Which schemas a profile has no keyword for. | **works.** es → 0 missing of 69; en → `unless` (the English profile has no `unless` keyword; `parse('toggle .a unless x', 'en')` still reads it, by the hand-written `unless-en-basic` pattern); a profile with only `toggle` → 68 missing. No caller outside two tests. | delete the code (17 lines and its cases in the two generator tests) |
| `getRoleMarkers` | A language's role markers, or one role's (2026-07-07, `71fdd73ce`, for the framework↔semantic bridge). | **works, duplicate.** `('ja', 'patient')` → `を`, after; `('ja')` equals `tryGetProfile('ja').roleMarkers`; an unknown language → `{}`. `profile-queries.test.ts` asserts those. No caller. | delete the code (12 lines and four test cases) |
| `getSchemasByCategory` | The schemas of one category. | **works.** dom-class 3, dom-content 19, variable 12, event 3, async 7, control-flow 22, navigation 4; an unknown category → `[]`. No caller outside one test. | delete the code (6 lines and three test cases) |
| `getDefinedSchemas` | The schemas patterns are generated from. | **internal.** 69 of the 74: not `else`, `viewTransition`, `init`, `when`, `compound`. The generator calls it. | remove from root, keep internal |
| `SchemaValidationResult` | The result for one schema. | **works, duplicate.** An alias of `SchemaValidation`, which is kept. | delete the code (the alias, and write `SchemaValidation` at its two uses) |
| `SchemaErrorCodes` | The table of machine-readable codes schema validation reports (2026-01-10, `51d5859c7`). | **works.** Every `code` that `validateAllSchemas(commandSchemas)` and `validateCommandSchema(<a schema with an optional five-type patient>)` return is a value of this table (`SCHEMA_AMBIGUOUS_TYPE_LITERAL_SELECTOR`, `SCHEMA_TOO_MANY_EXPECTED_TYPES`, `SCHEMA_NO_REQUIRED_ROLES`). `SchemaValidationItem.code` is typed `string`, so this is the only name a caller of the kept `validateCommandSchema` (mcp-server, lokascript-domains) has for a code. | keep at root (mark removed) |

### AST builder helpers (9)

The converters came with the AST builder (2025-12-16, `d82888290`); `getSchemaMapper` and `buildFromAstShape` with the schema-driven mappers (2026-07-31, `01fb4a682`). All are steps of the kept `buildAST`.

| Name | Intended for | Verdict | 8.0 recommendation |
| --- | --- | --- | --- |
| `convertValue` | A semantic value → an AST expression node. | **internal.** A `#a` selector → `{type: 'selector', value: '#a', selectorType: 'id'}`. The mappers call it. `./core` exports it. | remove from root, keep internal |
| `convertLiteral` | A literal value → a literal node. | **internal.** `5` → `{type: 'literal', value: 5}`. Called by `convertValue` only. `./core` exports it. | remove from root, keep internal |
| `convertSelector` | A selector value → a selector node. | **internal.** `.a` → `selectorType: 'class'`. Called by `convertValue` and the scoped-query converter. `./core` exports it. | remove from root, keep internal |
| `convertReference` | A reference → an identifier node. | **internal.** `me` → `{type: 'identifier', name: 'me'}`. `./core` exports it. | remove from root, keep internal |
| `convertPropertyPath` | A property path → a member expression. | **internal.** `me`'s `value` → a `memberExpression` of two identifiers. `./core` exports it. | remove from root, keep internal |
| `convertExpression` | A raw expression → a parsed expression node. | **internal.** `x + 1` → a `binaryExpression` with positions. `./core` exports it. | remove from root, keep internal |
| `getSchemaMapper` | A mapper built from a schema's `ast` descriptor. | **internal.** `toggle` → a mapper whose node is `buildAST`'s without the `semanticRoles` field `buildAST` adds; `put` and `wait` (hand-written mappers) → `undefined`. The kept `resolveCommandMapper` calls it. | remove from root, keep internal |
| `buildFromAstShape` | Build a command node from an `AstShape`. | **internal.** The same node as `getSchemaMapper('toggle').toAST`. Called by `getSchemaMapper` only. | remove from root, keep internal |
| `getRegisteredMappers` | The explicitly registered mappers. | **works.** `wait`, `put`, `go`, `pick`, in a copy (deleting from it leaves `getCommandMapper('wait')` intact). `mapper-parity.test.ts` uses it from the module. `./core` exports it. | remove from root, keep internal |

### Tokenizer plumbing and extractors (12)

Added 2026-02-11 with the extractor registry (`b55a84956`, `64bbe4d5e`). Seven of these are `@lokascript/framework`'s own objects passed through (`===` against framework's exports); three are semantic's copies of things framework also has.

| Name | Intended for | Verdict | 8.0 recommendation |
| --- | --- | --- | --- |
| `TokenStreamImpl` | The token stream class. | **works, duplicate.** Framework's class (`===`). `tokenize()` returns an instance; the kept `TokenStream` type is its interface. | remove from root, keep internal |
| `StringLiteralExtractor` | Reads a quoted string. | **works, duplicate.** Framework's class (`===`). `"hi there" x` → `"hi there"`, length 10. | remove from root, keep internal |
| `NumberExtractor` | Reads a number, with a time unit. | **works, duplicate.** Framework's class (`===`). `300ms` → `300ms` with `hasTimeUnit`; `2.5` → `2.5`. | remove from root, keep internal |
| `IdentifierExtractor` | Reads an identifier. | **works, duplicate.** Framework's class (`===`). `foo_bar baz` → `foo_bar`. | remove from root, keep internal |
| `OperatorExtractor` | Reads an operator. | **works, duplicate.** Semantic's own class under the name of framework's. The two give the same answer on every printable ASCII character alone, doubled, and followed by `=`, `>` or `==` (470 inputs). 24 tokenizers use semantic's. | remove from root, keep internal (or import framework's and delete the copy (about 70 lines with `PunctuationExtractor`)) |
| `PunctuationExtractor` | Reads one punctuation character. | **works, duplicate.** As `OperatorExtractor`: semantic's own class, the same answers as framework's on the same 470 inputs. | remove from root, keep internal (as `OperatorExtractor`) |
| `getDefaultExtractors` | The generic extractor set. | **works, duplicate.** Semantic's copy returns five extractors; framework's function of the same name returns six (it adds `unicode-identifier`). Nothing in the package calls semantic's; the doc comment that mentions it imports framework's. | delete the code (10 lines in `tokenizers/generic-extractors.ts`) |
| `getHyperscriptExtractors` | The hyperscript extractor set, in the order they must run. | **internal.** `url`, `event-modifier`, `variable-ref`, `css-selector`. 24 tokenizers register it. | remove from root, keep internal |
| `TokenizerContext` | What a context-aware extractor is given. | **works, duplicate.** Framework's type. `createTokenizerContext` returns its seven members. | remove from root, keep internal |
| `ContextAwareExtractor` | An extractor that takes a context. | **works, duplicate.** Framework's type; 33 files of the package implement or use it. | remove from root, keep internal |
| `isContextAwareExtractor` | Type guard for the above. | **works, duplicate.** Framework's function (`===`). `false` for the nine generic and hyperscript extractors, `true` for three of the Korean tokenizer's. | remove from root, keep internal |
| `createTokenizerContext` | Build a context from a tokenizer. | **works, duplicate.** Framework's function (`===`). From the Spanish tokenizer: `lookupKeyword('alternar')` → `toggle`. | remove from root, keep internal |

### Unified language profile (9)

Added 2025-12-13 (`1bf4024b9`, "Add UnifiedLanguageProfile type") to merge semantic's profile with `@lokascript/i18n`'s. The merge went another way (a language's grammar is in `framework/languages`), and `src/types/unified-profile.ts` (267 lines) is imported by nothing but the root entry. No test.

| Name | Intended for | Verdict | 8.0 recommendation |
| --- | --- | --- | --- |
| `UnifiedLanguageProfile` | One profile type for parsing and generation. | **inert.** No value in the package has this shape: all 24 real profiles lack `morphology` and `canonicalOrder`. | delete the code (with the file: 267 lines) |
| `UnifiedRoleMarker` | A role marker in that profile. | **inert.** A real `roleMarkers` entry fits it (`primary`, `position`, `alternatives`), and nothing is typed with it. | delete the code (with the file) |
| `UnifiedGrammarRule` | A grammar rule in that profile (`GrammarRule` in the file). | **inert.** No profile has `rules`; nothing references the type. | delete the code (with the file) |
| `UnifiedPatternMatcher` | A rule's matcher (`PatternMatcher` in the file; not the parser's class). | **inert.** Referenced only by `UnifiedGrammarRule`. | delete the code (with the file) |
| `UnifiedPatternTransform` | A rule's transform. | **inert.** Referenced only by `UnifiedGrammarRule`. | delete the code (with the file) |
| `markingStrategyToAdpositionType` | Map semantic's marking strategy to i18n's adposition type. | **works.** `preposition` → `preposition`; `postposition`, `particle`, `case-suffix` → `postposition`; anything else → `none`. No caller. | delete the code (with the file) |
| `toGrammaticalMarker` | A role marker → i18n's marker. | **works.** ja `patient` → `{form: 'を', role: 'patient', position: 'postposition', required: false}`. No caller. | delete the code (with the file) |
| `toI18nProfile` | A unified profile → i18n's `LanguageProfile`. | **partly.** Given the real Japanese profile it returns the markers and no `morphology` or `canonicalOrder`, both required by i18n's type. It is right only for an input nothing produces. No caller. | delete the code (with the file) |
| `isUnifiedProfile` | Type guard for a unified profile. | **inert.** `false` for all 24 profiles in `KNOWN_PROFILES`. | delete the code (with the file) |

### Node factories and guards (5)

The factories are how the parser builds these nodes; their siblings `createCommandNode` and `createEventHandler` are in "Move to a subpath" above and the five go wherever those do. `render` does not check a node a caller built by hand.

| Name | Intended for | Verdict | 8.0 recommendation |
| --- | --- | --- | --- |
| `createCompoundNode` | A chain of statements (2025-12-13, `b7e8ea528`). | **internal.** Two parsed commands → `toggle .a then add .b` (en), `.aを 切り替え それから .bを 追加` (ja); the same fields as the parse of that chain. Five parser files call it. | remove from root, keep internal |
| `createConditionalNode` | An `if` with its branches. | **internal.** → `if x > 1 toggle .a else add .b end` (en), `si x > 1 alternar .a sino agregar .b fin` (es). The clause walker calls it. | remove from root, keep internal |
| `createLoopNode` | A loop node (2025-12-16, `a55ebbfde`). | **internal.** With the roles the parser passes (`quantity` and an implicit `loopType`) → `repeat 3 times toggle .a end`. With `quantity` alone, as its signature invites, → `repeat 3 toggle .a end`, which the engine rejects ("Expected 'times'"). | remove from root, keep internal |
| `isBlockCommand` | Guard: a `tell` or view-transition block with its body (2026-10-05, `5df979412`). | **internal.** `tell #x add .a end` → `true`; a plain command and a `repeat` loop → `false`. The renderer, the upstream-spelling rewrite and the parser call it. | remove from root, keep internal |
| `isViewTransitionBlock` | Guard: a `start view transition … end` block (2026-10-05, `afea6518c`). | **works.** `start view transition add .a end` → `true`; a `tell` block → `false`. No caller, no test. | delete the code (4 lines in `types.ts`) |

### Translations with status (1)

| Name | Intended for | Verdict | 8.0 recommendation |
| --- | --- | --- | --- |
| `getAllTranslationsWithStatus` | `getAllTranslations` that also says which languages failed and why (2026-07-24, `9ea513c3a`, a downstream request). | **works.** `('toggle .active', 'en')` → 24 languages and `explicit`, the same texts as `getAllTranslations`, `failed: {}`; with targets `['ja', 'xx']`, `failed.xx` is the "not registered" message where `getAllTranslations` drops `xx` silently. It reports render errors only: `('on click blarg the frobnicator', 'en', ['es'])` → `es: 'al clic'`, `failed: {}`, where `translate` refuses. `./core` exports it. | remove from root, keep internal (not marked: one of semantic's tests imports it from the root) |
