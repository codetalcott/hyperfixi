# @lokascript/domain-bdd

Multilingual Given/When/Then specification DSL built on `@lokascript/framework`.
Parses BDD scenarios in 8 languages and compiles them to Playwright test source.

```typescript
import { createBDDDSL } from '@lokascript/domain-bdd';

const dsl = createBDDDSL();
dsl.compile('given page "https://example.com"', 'en');
```

## Relationship to domain-behaviorspec

The two packages share an output medium (both generate Playwright) but sit in
different lanes:

- **domain-bdd** (this package) — _specification authoring_: Given/When/Then
  scenario grammar, feature blocks, the Gherkin mental model.
- **domain-behaviorspec** — _direct interaction-test authoring_: `test`/
  `expect`/`after` commands with negation, written as the test itself rather
  than as a scenario about it.

The duplication between them (two Playwright generators, two 8-language vocab
tables) is acknowledged; consolidation is tracked for the `lokascript-domains`
repo, where the domain family is being consolidated — not here, mid-extraction.
