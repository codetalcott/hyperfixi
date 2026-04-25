# Defining a Vocabulary for a New LSE Domain

This guide is for DSL authors building a new imperative command DSL on top of LSE. It explains how to pick action and role names for your domain — when to reuse names from existing vocabularies, when to invent new ones, and how to avoid the traps.

If you haven't read [vocabularies.md](vocabularies.md) yet, read it first. This guide assumes familiarity with the two-layer model (Layer A = universal infrastructure, Layer B = per-domain vocabulary) and the existing vocabularies catalogued there.

## The six-step process

1. **Identify your actions.** What imperative verbs does your domain support?
2. **Identify participants.** For each action, what arguments does it take?
3. **Name each participant with a role.** Reuse or invent — see guidance below.
4. **Avoid stretched reuse.** Don't reuse a role name to mean something different.
5. **Document your vocabulary** in `vocabularies.md` so future authors can see your choices.
6. **Test structural conformance.** Your vocabulary should round-trip through the wire format with zero errors.

The meat of this guide is in step 3 (reuse vs. invent) and step 4 (stretched reuse). The rest is mechanical.

## Step 1 — Identify your actions

Actions are the verbs at the start of each bracket command. They are the top-level categorization of what your DSL can do.

**Good action names:**

- **Short imperative verbs**: `toggle`, `select`, `fetch`, `render`, `add`, `remove`
- **Domain-natural terms**: `given` / `when` / `then` for BDD; `element` / `component` / `state` for JSX
- **Match how your users describe the operation**: if QA engineers say "given the button is visible," don't force them to say "assert visibility of button" just to fit an existing vocabulary

**Avoid:**

- **Noun phrases**: `element-creator`, `data-selector`. LSE actions are verbs.
- **Overlap with Layer A keywords**: don't name an action `if`, `repeat`, `for`, `while`, or the other control-flow keywords. Layer A reserves these for conditional/loop node kinds.
- **Adjectival modifiers**: `quick-toggle`, `async-fetch`. Use flags (`+async`) or modifiers in the value positions instead.

## Step 2 — Identify participants

For each action, list the arguments it takes. These are the participants in the command.

**Example: building a calendar DSL.** For a `schedule` action, what participants does it take?

- What's being scheduled? (an event title)
- When? (a datetime)
- Where? (a location — room, url, etc.)
- Who? (attendees)
- How long? (duration)
- Any constraints? (recurrence, priority)

Each of these is a potential role. Now name them.

## Step 3 — Naming roles: reuse vs. invent

This is the central decision. The guidance is simple to state and subtle to apply:

> **Reuse a Layer A reference role name when your participant genuinely means the same thing. Invent a new name when the meaning diverges — even slightly.**

The Layer A reference vocabulary (UI-behavior / Fillmore-inspired) has six core roles:

| Role          | Reference meaning        |
| ------------- | ------------------------ |
| `patient`     | The thing being acted on |
| `destination` | Where to put / target    |
| `source`      | Where to get from        |
| `condition`   | Filter / guard           |
| `instrument`  | Tool or means used       |
| `quantity`    | How many / how much      |

For each participant in your new action, ask: **does this participant fill one of these thematic roles in a way a linguist would recognize?**

### Worked example 1: Calendar `schedule` action (mostly reuse)

Going through our calendar participants:

- **Event title** — this is "what to create," which is `patient` in Fillmore terms (the entity being brought into existence). **Reuse: `patient`.** Actually, hmm — `patient` in hyperscript means "the element being modified," not "the thing being created." Let me think again. For a hyperscript `add` command, `add .highlight to #box` has `patient: .highlight` (the thing being added) and `destination: #box` (where it goes). So `patient` does cover "thing being created/added." **Reuse: `patient`.**
- **When (datetime)** — this is temporal location, not a source or destination. Fillmore has a "time" role, but Layer A reference doesn't expose it. **Invent: `when`** (or `time`, or `at`).
- **Where (location)** — this is physical location. Not `source` (that's origin), not `destination` (that's target-of-action). **Invent: `location`** or **reuse: `destination`** (stretch — location is close to destination for an event that "happens at" a place).
- **Attendees (who)** — these are participants in the event. Fillmore has "agent" and "experiencer" roles, but neither is in Layer A reference. **Invent: `attendees`.**
- **Duration** — Fillmore's "quantity" is meant for counting/amounts, but "how long" is a temporal quantity. **Reuse: `quantity`** (with a `dataType: duration` literal), or **invent: `duration`** for clarity.
- **Recurrence rule** — a pattern for repetition. No Fillmore analog. **Invent: `recurrence`.**
- **Priority** — a constraint/modifier, not a participant. This is a flag candidate: **use `+high-priority`** or a `priority:high` role.

Resulting schema:

```text
[schedule patient:"Team standup" when:2026-04-15T09:00 location:"Room 3B" attendees:@team duration:30m recurrence:weekly +high-priority]
```

**Note what happened:** only one role was cleanly reusable (`patient`). The rest either needed invention (`attendees`, `recurrence`), had an awkward reuse option (`destination` for location), or needed a judgment call (`duration` vs `quantity`). This is normal — most new domains reuse 1–2 Layer A roles and invent the rest.

### Worked example 2: SQL SELECT (contested reuse)

From the real domain-sql schema:

```text
[select columns:name,email source:users condition:age>25]
```

Going through the participants:

- **columns** — "which fields to retrieve." Is this a `patient` (thing being acted on)? The table is the thing being acted on; the columns are the projection specifier. Fillmore's `patient` is too coarse to capture "which attributes of the patient to extract." **Invent: `columns`.**
- **source** — "the table to read from." This is clean: data comes from a source. **Reuse: `source`.** ✓
- **condition** — "which rows to include." This is a filter. **Reuse: `condition`.** ✓

So SELECT has one invention (`columns`) and two clean reuses. That's a good ratio.

Now look at **UPDATE**, where the same vocabulary runs into trouble:

```text
[update source:users values:{age:26} condition:id=1]
```

- **source** — wait, the table is being **modified**, not read from. `source` means "where data comes from," but in UPDATE the table is where data is **going to**. This is a stretched reuse — the original author picked `source` to match SELECT, but the meaning diverged.
- **values** — "new column values." No Fillmore analog. **Invent: `values`.**
- **condition** — "which rows to update." Clean filter. **Reuse: `condition`.** ✓

**The `source` in UPDATE is a warning sign.** It should probably have been `target` or `subject`. It works because LSE's wire format doesn't enforce semantic consistency across vocabularies — but it makes the vocabulary harder to reason about. If you're writing a linter that says "find all commands that read from a table," you'd look for `source:` and get both SELECT and UPDATE, conflating reading with writing.

**Lesson:** reusing a Layer A role name with a subtly different meaning is worse than inventing a new name. The slight divergence compounds: a human reading both SELECT and UPDATE sees `source:users` and has to remember two different meanings.

### Worked example 3: JSX `element` action (clean-slate invention)

From the real domain-jsx schema:

```text
[element tag:div props:className children:"Hello"]
```

Going through the participants:

- **tag** — "what kind of element to create." Is this a `patient`? No — `patient` in a case-grammar sense means "the entity affected by the action." A `div` isn't affected, it's the _type_ of the thing being created. Fillmore has no "type" role. **Invent: `tag`.**
- **props** — "attributes to attach." No Fillmore role for "collection of attributes on a thing." **Invent: `props`.**
- **children** — "nested elements." Fillmore has no mereological ("part of") role. **Invent: `children`.**

**Zero reuses.** And that's correct — JSX describes tree construction, which is a structural/compositional domain, not an event-participation domain. Trying to force `tag` into `patient` or `children` into `destination` would produce a vocabulary that lied about what JSX is.

**Lesson:** clean-slate invention is the right move when your domain has no participants that map onto Fillmore's event-participant model. JSX, BDD's `target`/`state`, and SQL's `columns` are all examples.

### The rule of thumb

Given a participant in a new action, answer this question honestly:

> **"Does this participant fill this thematic role the way `<the role's reference meaning>` does?"**

- If the answer is "yes, exactly" — reuse.
- If the answer is "close enough, you'll know what I mean" — **don't reuse**. Invent a new name. The slight gap will bite you later.
- If the answer is "no, this is a different concept" — invent.

When in doubt, **invent**. Invention costs one extra name in your vocabulary and costs nothing to the protocol. Stretched reuse costs clarity forever.

## Step 4 — Avoid stretched reuse

Stretched reuse is the single biggest trap. It happens when you reuse a role name because it's _close_ to what you mean, not because it's what you mean.

**Signs you're about to stretch:**

- You find yourself thinking "well, `source` isn't quite right, but it's close enough"
- You're reusing a name to match a pattern you established elsewhere (e.g., "all my commands use `source` because that's the SQL convention," even though some of them don't read from anywhere)
- You're worried about vocabulary bloat, so you're consolidating multiple distinct concepts into one role name
- A future linter that filters commands by role name would misclassify your command

**The fix is always the same: invent a new name.** Vocabulary size is not a constraint. There is no penalty for a larger vocabulary. There is a real penalty for a role name that means two different things in two contexts.

**Cautionary example from the existing codebase:** domain-sql uses `source` in UPDATE and DELETE commands, where the table is being modified rather than read from. This is a known stretched reuse (documented in [vocabularies.md](vocabularies.md#sql-vocabulary) as "contested"). A future revision may rename these to `target` or `subject`. Don't repeat this pattern in new vocabularies.

## Step 5 — Document your vocabulary

Add an entry to [vocabularies.md](vocabularies.md) under "Other in-repo vocabularies" (or a dedicated section if your vocabulary is large). The entry should include:

1. **Name and purpose** — one-sentence description of what the vocabulary is for
2. **Actions** — list of command names
3. **Roles** — table of role names with meanings and examples
4. **Divergence rationale** — for any non-obvious naming decisions, especially where you reused a Layer A role name in a new context or invented a new name
5. **Source file pointer** — `packages/your-domain/src/schemas/` or equivalent

You don't need to write a treatise. A paragraph per non-obvious decision is fine.

## Step 6 — Test structural conformance

Your vocabulary should produce wire-format-conformant JSON. The test is mechanical:

```typescript
import { toProtocolJSON, validateProtocolJSON, fromProtocolJSON } from '@lokascript/intent';

const dsl = createYourDSL();
const node = dsl.parse('your representative command', 'en');
const json = toProtocolJSON(node);
const diagnostics = validateProtocolJSON(json);

// Must have zero errors:
console.assert(!diagnostics.some(d => d.severity === 'error'));

// Must round-trip:
const roundtrip = fromProtocolJSON(json);
console.assert(JSON.stringify(toProtocolJSON(roundtrip)) === JSON.stringify(json));
```

If this passes, your vocabulary is structurally conformant. The protocol does not check role names — it only checks node kinds, value shapes, and tree structure. So any role name you choose will work; the validation is entirely about Layer A structure.

The Stage 1 audit of the existing 9 in-repo DSLs confirmed all 9 pass this test. Your vocabulary should too.

## Summary checklist

Before shipping a new vocabulary, verify:

- [ ] Actions are short imperative verbs
- [ ] Action names don't collide with Layer A keywords (`if`, `repeat`, `for`, `while`, etc.)
- [ ] Every participant in every action has a role name
- [ ] Reused Layer A role names are used with their original reference meaning, not stretched
- [ ] Invented role names don't collide with Layer A reference names (don't invent your own `patient` with a different meaning)
- [ ] Vocabulary is documented in `vocabularies.md` with divergence rationale for non-obvious choices
- [ ] Representative commands round-trip through the wire format with zero errors

If every box is checked, you have a working LSE vocabulary.

## Further reading

- [vocabularies.md](vocabularies.md) — catalog of existing vocabularies (UI-behavior, SQL, JSX, BDD, etc.)
- [../spec/README.md](../spec/README.md) — the spec overview, including the two-layer model
- [../spec/wire-format.md](../spec/wire-format.md) — the JSON wire format your vocabulary must conform to
- [../spec/lokascript-explicit-syntax.abnf](../spec/lokascript-explicit-syntax.abnf) — the formal grammar
