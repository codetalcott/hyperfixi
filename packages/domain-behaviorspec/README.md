# @lokascript/domain-behaviorspec

Multilingual interaction-testing DSL built on `@lokascript/framework`. Write
Playwright tests directly in natural language — 8 languages, `test`/`given`/
`when`/`expect`/`after` commands with negation — and compile to Playwright
test blocks.

```typescript
import { createBehaviorSpecDSL } from '@lokascript/domain-behaviorspec';

const dsl = createBehaviorSpecDSL();
dsl.compile('expect #result contains "saved"', 'en');
```

## Relationship to domain-bdd

The two packages share an output medium (both generate Playwright) but sit in
different lanes:

- **domain-bdd** — _specification authoring_: Given/When/Then scenario
  grammar, feature blocks, the Gherkin mental model.
- **domain-behaviorspec** (this package) — _direct interaction-test
  authoring_: you write the test itself, not a scenario about it; the wider
  role vocabulary (10 semantic roles, URL/viewport/selector tokenization)
  exists to express assertions precisely.

The duplication between them (two Playwright generators, two 8-language vocab
tables) is acknowledged; consolidation is tracked for the `lokascript-domains`
repo, where the domain family is being consolidated — not here, mid-extraction.
