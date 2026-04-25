# domain-sql Improvement Plan

## Review Summary

**Current State:** 100 tests passing, 0 type errors, 8 languages (EN, ES, JA, AR, KO, ZH, TR, FR).
Full multilingual SQL DSL with SVO, SOV, and VSO word orders including WHERE clause support in all languages.

### Bug Fixed

- **`generateUpdate` missing fallback** (`sql-generator.ts:31`): `extractRoleValue(node, 'values')` had no fallback default. If the `values` role was missing, output was `UPDATE table SET undefined`. Fixed with `|| 'column = value'`.

### Gaps vs. Sibling Domains (BDD & JSX)

| Feature                                | BDD           | JSX           | SQL            | Priority |
| -------------------------------------- | ------------- | ------------- | -------------- | -------- |
| Languages supported                    | 8             | 8             | 8 ✅           | Done     |
| Natural language renderer              | `renderBDD()` | `renderJSX()` | None           | High     |
| MCP translate with renderer            | Yes           | Yes           | Stub only      | High     |
| Test count                             | 95+           | 90+           | 100 ✅         | Done     |
| Compilation output assertions (non-EN) | N/A           | All 8 langs   | All 8 langs ✅ | Done     |
| Role value content assertions          | Yes           | Yes           | Yes ✅         | Done     |
| Edge case tests                        | Yes           | Yes           | Minimal        | Low      |

---

## Phase 1: Natural Language Renderer (High Priority)

Create `renderSQL()` to enable round-trip translation: parse in any language, render back to natural language in any target language.

### 1a. Create `src/generators/sql-renderer.ts`

Following the proven BDD/JSX renderer pattern:

```typescript
export function renderSQL(node: SemanticNode, language: string): string;
```

- Keyword lookup tables for all 4 (later 8) languages
- Word-order aware rendering (SVO, SOV, VSO)
- Per-action render functions: SELECT, INSERT, UPDATE, DELETE
- Export from `src/index.ts`

### 1b. Integrate Renderer into MCP `translate_sql` Tool

Update `packages/mcp-server/src/tools/sql-domain.ts`:

- Load `renderSQL` from domain-sql
- Replace the stub note with actual rendered output
- Return `{ rendered: { code, language }, sql }` matching BDD/JSX pattern

### 1c. Add Renderer Tests

- Render each command type (SELECT, INSERT, UPDATE, DELETE) to all 4 languages
- Verify word order: EN/ES (SVO), JA (SOV), AR (VSO)
- Round-trip test: parse EN → render ES → parse ES → verify same semantic structure

**Estimated:** ~150 lines of renderer + ~80 lines of tests

---

## Phase 2: Expand Language Support ✅ COMPLETE

Added 4 additional languages: **Korean (SOV), Chinese (SVO), Turkish (SOV), French (SVO)**.
All 8 languages now support full parsing + compilation including WHERE clauses.
SOV WHERE clauses (JA, KO, TR) required a framework-level fix to propagate parent stop markers into greedy roles inside optional groups (see `pattern-matcher.ts` `parentStopMarkers` parameter).

### 2a. Per Language: Profile + Tokenizer + Schema Markers

For each new language:

1. Add keyword translations in `src/profiles/index.ts`
2. Add tokenizer in `src/tokenizers/index.ts` (with `keywordExtras` for non-Latin)
3. Add marker overrides in `src/schemas/index.ts` (add `ko`, `zh`, `tr`, `fr` entries)
4. Register in `src/index.ts`

**Reference keywords:**

| Action | Korean | Chinese | Turkish  | French        |
| ------ | ------ | ------- | -------- | ------------- |
| select | 선택   | 查询    | seç      | sélectionner  |
| insert | 삽입   | 插入    | ekle     | insérer       |
| update | 갱신   | 更新    | güncelle | mettre à jour |
| delete | 삭제   | 删除    | sil      | supprimer     |
| from   | 에서   | 从      | den/dan  | de            |
| into   | 에     | 到      | e/a      | dans          |
| where  | 조건   | 条件    | koşul    | où            |
| set    | 설정   | 设置    | ayarla   | définir       |

### 2b. Add Tests for New Languages

- Parse + compile tests for each new language (same patterns as EN/ES/JA/AR)
- Cross-language semantic equivalence tests
- Update renderer for all 8 languages

### 2c. Update MCP Tool Descriptions

Update `sql-domain.ts` tool descriptions to list all 8 languages.

**Estimated:** ~200 lines of profiles/tokenizers + ~120 lines of tests

---

## Phase 3: Strengthen Test Coverage (Medium Priority)

### 3a. Compilation Output Assertions

Currently JA/AR tests only verify `.toContain('SELECT')` etc. Add exact output assertions:

```typescript
it('should compile Japanese SELECT to exact SQL', () => {
  const result = sql.compile('users から name 選択', 'ja');
  expect(result.code).toBe('SELECT name FROM users');
});
```

### 3b. Role Value Content Assertions

Current tests only check `roles.has('columns')`. Add value verification:

```typescript
const node = sql.parse('select name from users', 'en');
expect(extractRoleValue(node, 'columns')).toBe('name');
expect(extractRoleValue(node, 'source')).toBe('users');
```

### 3c. UPDATE Command Coverage

Add missing test cases:

- UPDATE with WHERE: `update users set name = Bob where id = 1`
- UPDATE compilation output assertion
- UPDATE in all 4+ languages

### 3d. Multi-Token Expression Tests

- Multi-column SELECT: `select name age from users`
- Compound WHERE: `select name from users where age > 18 and active = true`
- INSERT with multiple values

### 3e. Round-Trip Translation Tests

```typescript
it('should round-trip EN → JA → EN via renderer', () => {
  const enNode = sql.parse('select name from users', 'en');
  const jaText = renderSQL(enNode, 'ja');
  const jaNode = sql.parse(jaText, 'ja');
  expect(jaNode.action).toBe('select');
  // Verify semantic equivalence
});
```

### 3f. Edge Cases

- Very long column names
- Table names that are SQL keywords
- Empty WHERE clause values
- Unicode table/column names

**Estimated:** ~150 lines of new tests → 50+ total tests

---

## Phase 4: Polish & Consistency (Low Priority)

### 4a. Add `allProfiles` Export

Already exported but ensure it's consistently documented.

### 4b. Consistent Error Messages

Verify error messages match the pattern used by BDD/JSX domains.

### 4c. Consider Multi-Statement Support

Low priority, but if useful:

- Split on `;` delimiter (like BDD splits on `,`)
- `parseSQLBatch()` function following `parseBDDScenario()` pattern
- Generate multiple SQL statements from compound input

---

## Implementation Order

1. **Phase 1a-1c** — Renderer + MCP integration + tests (~2 hours)
2. **Phase 3a-3c** — Test strengthening (~1 hour, can be done in parallel with Phase 1)
3. **Phase 2a-2c** — Language expansion (~3 hours)
4. **Phase 3d-3f** — Advanced test cases (~1 hour)
5. **Phase 4** — Polish (optional, as-needed)

**Target end state:** 8 languages ✅, 100+ tests ✅, full renderer, complete MCP integration.
