# Complex Patterns Strategy

## Current State (from Discovery)

```
Complexity Distribution:
  simple-command: 18    ✅ Supported
  simple-event: 17      ✅ Supported
  chained-command: 9    ❌ Not supported
  multi-line-event: 22  ⚠️ Partial (first line only)
  behavior-install: 1   ⚠️ Basic support
  behavior-def: 2       ❌ Not supported
  def-function: 2       ❌ Not supported
  complex: 45           ❌ Not supported

Parse Coverage: 51% → Target: 80%+
```

## Complexity Hierarchy

### Level 1: Simple Commands (Current ✅)

```hyperscript
toggle .active
add .foo to .bar
send myEvent to #target
```

### Level 2: Event Handlers with Simple Body (Current ✅)

```hyperscript
on click toggle .active
on mouseenter add .hover
```

### Level 3: Chained Commands (TODO)

```hyperscript
toggle .active then wait 500ms then remove me
on click add .loading then fetch /api then remove .loading
```

**Strategy**: Extend SemanticNode with `next` field for chaining

```typescript
interface CommandSemanticNode {
  kind: 'command';
  action: ActionType;
  roles: Map<string, SemanticValue>;
  next?: SemanticNode; // For 'then' chaining
}
```

### Level 4: Multi-line Event Bodies (TODO)

```hyperscript
on click
  add .loading
  fetch /api as json
  put it into me
  remove .loading
end
```

**Strategy**: Parse as compound node

```typescript
interface CompoundSemanticNode {
  kind: 'compound';
  statements: SemanticNode[];
}
```

### Level 5: Behaviors (TODO)

#### 5a: Install Command (basic support exists)

```hyperscript
install Draggable
install Removable(removeButton: #close)
```

#### 5b: Behavior Definition

```hyperscript
behavior Removable
  on click
    remove me
  end
end

behavior Draggable(handle)
  on mousedown from handle
    ...
  end
end
```

**Strategy**: Behavior Template Pattern

```typescript
interface BehaviorSemanticNode {
  kind: 'behavior';
  name: string;
  parameters?: Array<{ name: string; default?: SemanticValue }>;
  body: SemanticNode[]; // Event handlers, init blocks
}
```

### Level 6: Definitions (TODO)

```hyperscript
def greet(name)
  return "Hello, " + name
end
```

**Strategy**: Similar to behaviors

```typescript
interface DefSemanticNode {
  kind: 'def';
  name: string;
  parameters: string[];
  body: SemanticNode[];
}
```

---

## Implementation Plan

### Phase 1: Chained Commands

1. Add `then` parsing to event-handler patterns
2. Extend SemanticNode with `next` field
3. Update renderer to handle chains
4. Validate: 9 examples should now parse

### Phase 2: Multi-line Bodies

1. Add compound node type
2. Parse indented blocks as compound
3. Handle `end` keyword
4. Validate: 22 examples improve

### Phase 3: Behaviors

1. Add behavior node type
2. Parse behavior definitions with body
3. Parse install with parameters
4. Validate: 3 examples should parse

### Phase 4: Coverage Gaps

Focus on commands with low success rates:

- `set`: Missing variable assignment patterns
- `log`: Missing expression variants
- `get`: Need property access patterns
- `focus`/`blur`: Missing target variants

---

## Multilingual Considerations

### Behavior Names

Behavior names are PascalCase identifiers - keep unchanged across languages:

```
en: install Draggable
ja: Draggable を インストール
ar: ثبّت Draggable
```

### Chaining Keywords

The `then` keyword needs translation:

```
en: toggle .active then wait 1s
es: alternar .active entonces esperar 1s
ja: .active を 切り替え それから 1秒 待つ
ar: بدّل .active ثم انتظر 1 ثانية
```

### Block Keywords

```
en: on click ... end
ja: クリック したら ... 終わり
es: al click ... fin
ar: عندما click ... نهاية
```

---

## Integration with Database

### Store Complex Patterns

```sql
-- Add complexity field to pattern_translations
ALTER TABLE pattern_translations ADD COLUMN complexity TEXT;

-- Track which patterns have bodies
ALTER TABLE pattern_translations ADD COLUMN has_body INTEGER DEFAULT 0;
```

### Validation Workflow

1. Generate translations (current sync script)
2. Run validation (pattern-discovery.ts --validate)
3. Mark `verified_parses` for passing translations
4. Log failures for pattern improvement

### Quality Metrics

```sql
SELECT
  language,
  SUM(verified_parses) as verified,
  COUNT(*) as total,
  ROUND(100.0 * SUM(verified_parses) / COUNT(*), 1) as pct
FROM pattern_translations
GROUP BY language;
```

---

## Files to Modify

| File                                | Changes                                    |
| ----------------------------------- | ------------------------------------------ |
| `src/types.ts`                      | Add CompoundNode, BehaviorNode, next field |
| `src/parser/semantic-parser.ts`     | Handle chaining, blocks                    |
| `src/patterns/event-handler/*.ts`   | Add 'then' support                         |
| `src/explicit/renderer.ts`          | Render chains, compounds                   |
| `src/generators/command-schemas.ts` | Add chaining metadata                      |

---

## Success Criteria

- [ ] Parse coverage: 51% → 80%+
- [ ] Chained commands: 0/9 → 9/9
- [ ] Multi-line events: partial → full
- [ ] Behavior definitions: 0/2 → 2/2
- [ ] Translation validation: 84-99% → 95%+
