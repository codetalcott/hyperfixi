# LSE Domain Vocabularies

LSE's grammar and wire format (Layer A) are universal. Role vocabularies (Layer B) are defined per-domain. This document catalogs the vocabularies currently in use across the in-repo DSLs.

Each vocabulary is a set of **actions** (the command names after the opening bracket) and **roles** (the named arguments within a command). Vocabularies are independent: reusing a role name across vocabularies does not imply semantic compatibility. A `patient` in a UI-behavior context does not mean the same thing as a hypothetical `patient` in a medical-records context, even though they share a name.

## UI-Behavior Vocabulary (reference)

**Used by:** hyperscript (via `@hyperfixi/core`), and partially reused by domain-llm, domain-voice, domain-flow, and domain-learn.

**Grounded in:** Fillmore's case grammar (1968). Fillmore's thematic roles (agent, patient, instrument, location, source, goal) are a natural fit for imperative commands that describe actions on UI elements — hyperscript's native domain.

**Actions (partial list):** `toggle`, `add`, `remove`, `set`, `get`, `put`, `fetch`, `send`, `show`, `hide`, `log`, `wait`, `trigger`, `call`, `throw`, `make`, `measure`, `increment`, `decrement`. See `@hyperfixi/core` for the complete list.

**Core roles:**

| Role          | Meaning                  | Example               |
| ------------- | ------------------------ | --------------------- |
| `patient`     | The thing being acted on | `.active`, `#count`   |
| `destination` | Where to put / target    | `#output`, `me`       |
| `source`      | Where to get from        | `#input`, `/api/data` |
| `condition`   | Filter / guard           | `age>25`, `:count>0`  |
| `instrument`  | Tool or means used       | `with_key:enter`      |
| `quantity`    | How many / how much      | `5`, `3.14`           |

**When to use this vocabulary:** DSLs that describe imperative UI or behavior commands, where case grammar's agent-patient-location model fits the domain naturally.

## SQL Vocabulary

**Used by:** domain-sql

**Actions:** `select`, `insert`, `update`, `delete`, `column` (for DDL)

**Roles beyond Layer A reference:**

| Role          | Meaning                             | Example       |
| ------------- | ----------------------------------- | ------------- |
| `columns`     | Which columns to retrieve or define | `name, email` |
| `values`      | Values to insert or assign          | `'Alice', 30` |
| `source`      | The table (SELECT/DELETE)           | `users`       |
| `destination` | The target table (INSERT)           | `users`       |
| `condition`   | WHERE clause filter                 | `age > 25`    |

**Divergence rationale:**

- **`columns` (custom):** SQL needs to distinguish "which columns" from "which rows" from "which table." Fillmore's `patient` is too coarse to capture this — a SELECT acts on the whole result set, and no single Fillmore role cleanly names "the projection specifier."
- **`values` (custom):** The values being written in INSERT or assigned in UPDATE are not easily captured by any Fillmore role.
- **`source` in SELECT (reused cleanly):** SELECT reads data from a table. Clean source semantic.
- **`source` in UPDATE/DELETE (reused — contested):** In UPDATE and DELETE, the table is where data is modified, not where data comes from. Using `source` here is a stretch. A future revision may rename this to `target` or `subject`. See `packages/domain-sql/src/schemas/index.ts` for the current state.

## JSX Vocabulary

**Used by:** domain-jsx

**Actions:** `element`, `component`, `render`, `state`, `effect`, `fragment`

**Roles (mostly clean-slate, few Layer A reuses):**

| Role       | Meaning                     | Example                |
| ---------- | --------------------------- | ---------------------- |
| `tag`      | Element or component type   | `div`, `Button`        |
| `props`    | Attributes / properties     | `className`, `onClick` |
| `children` | Nested elements or content  | (nested LSE)           |
| `name`     | Component or state variable | `Button`, `count`      |
| `initial`  | Initial state value         | `0`, `"hello"`         |
| `callback` | Effect function body        | (nested LSE)           |
| `deps`     | Effect dependency array     | `[count]`              |

**Reused from Layer A:** `render` uses `source` (component to render) and `destination` (DOM target). Both fit cleanly.

**Divergence rationale:** JSX describes tree construction, component composition, and reactive lifecycle. None of these are thematic relationships between event participants. Case grammar has no roles for structural containment (`children`), type labels (`tag`), attribute collections (`props`), higher-order constructs whose value is itself an action (`callback`), or reactive dependencies (`deps`). Forcing these into `patient`/`destination`/`source` would have produced schemas that misrepresent what JSX is. The JSX vocabulary is a clean-slate design that matches the domain's actual conceptual structure.

## BDD Vocabulary

**Used by:** domain-bdd

**Actions:** `given`, `when`, `then`

**Roles:**

| Role             | Meaning                            | Example   |
| ---------------- | ---------------------------------- | --------- |
| `target`         | The element or subject of the step | `#button` |
| `state`          | The asserted state                 | `visible` |
| `action_type`    | The kind of action (click, hover)  | `click`   |
| `assertion`      | The check being made               | `equals`  |
| `expected_value` | The expected outcome               | `"Hello"` |

**Divergence rationale:** BDD test steps describe preconditions, actions, and assertions. `target` and `state` are testing-specific concepts. Reusing `patient` for `target` was considered but rejected because the BDD audience (QA engineers, product managers) doesn't think in case-grammar terms — and the LSE framing benefits from role names that match how domain users actually talk about their domain.

## Other in-repo vocabularies

The following vocabularies are complete and in use, but their detailed role tables are not yet documented here. See the linked source files for the authoritative schemas.

- **domain-behaviorspec** — Interaction-testing DSL. Roles include `subject`, `value`, `action`, `actor`, `assertion`, `content`, `destination`, `target`. Some Layer A reuses; several domain-specific additions for naming actors and subjects distinctly from patients. Source: `packages/domain-behaviorspec/src/schemas/`.

- **domain-flow** — Reactive data flow DSL. Actions: `fetch`, `poll`, `stream`, `throttle`, `debounce`, `map`, `filter`, `reduce`. Roles mostly reuse the Layer A reference vocabulary (`source`, `destination`, `patient`, `duration`, `instrument`, `style`). Flow is conceptually close to UI-behavior, so the reference vocabulary mostly fits. Source: `packages/domain-flow/src/schemas/`.

- **domain-llm** — LLM prompt DSL. Actions: `ask`, `summarize`, `analyze`, `translate`. Reuses Layer A roles (`patient`, `source`, `destination`, `quantity`) with domain-specific extensions for prompt metadata. Source: `packages/domain-llm/src/schemas/`.

- **domain-todo** — Todo management DSL. Actions: `add`, `complete`, `remove`, `list`. Uses domain-specific roles `item` and `list` because those are the native concepts ("add a todo item to a list"). Source: `packages/domain-todo/src/schemas/`.

- **domain-voice** — Voice command DSL. Uses the Layer A reference vocabulary directly. Voice commands ("navigate to home", "click the submit button") map cleanly to imperative UI behavior, so no divergence was needed. Source: `packages/domain-voice/src/schemas/`.

- **domain-learn** — Language-learning DSL for teaching hyperscript itself. Uses Layer A roles (`patient`, `destination`) and explicit bracket syntax as an input format. Source: `packages/domain-learn/src/schemas/`.

## Adding a new vocabulary

When building a new DSL on LSE:

1. **Identify actions.** What imperative verbs does your domain support? (SELECT, INSERT, CLICK, FETCH, RENDER, ...)
2. **Map participants to roles.** For each action, what arguments does it take? Name each argument with a role.
3. **Reuse Layer A role names where the semantic fits.** If your role really means "the thing being acted on" in a case-grammar sense, use `patient`. If it means "where something goes," use `destination`. If it means "where something comes from," use `source`. If it means "filter condition," use `condition`.
4. **Invent new role names where existing ones don't fit.** Don't stretch Fillmore roles to cover conceptually different things. SQL's `columns` and JSX's `tag` are good examples — they name concepts that case grammar doesn't have.
5. **Avoid reusing a Layer A role name with a different meaning.** The domain-sql UPDATE/DELETE use of `source` (meaning "the table being modified") is the cautionary tale. Prefer a new name like `target` or `subject` over a stretched reuse.
6. **Document your vocabulary.** Add an entry to this file so future authors can see what's been chosen and why.

The protocol does not enforce vocabulary choices. The wire format validates structure (node kinds, value shapes, tree structure) but not role names. That means a new vocabulary works with the existing four reference parsers and the conformance fixtures with no protocol changes.
