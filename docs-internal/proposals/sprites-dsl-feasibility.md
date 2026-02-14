# Sprites DSL Feasibility Study

**Date:** 2026-02-14
**Status:** Research / Proposal
**References:** `@lokascript/framework`, `@lokascript/domain-sql`

---

## 1. Executive Summary

This document evaluates the feasibility of building a **multilingual Sprites DSL** on top of `@lokascript/framework`, following the proven pattern established by `@lokascript/domain-sql`. The DSL would allow developers to manage [Fly.io Sprites](https://sprites.dev/) — persistent, stateful Firecracker microVMs with checkpoint/restore — using natural-language commands in multiple human languages.

**Verdict: Highly feasible.** The Sprites API maps cleanly to a command/role schema model. The SQL DSL proves the framework handles SVO/SOV/VSO word orders, and Sprites operations (create, exec, checkpoint, restore, delete) are semantically simpler than SQL. Code generation targets would be either the Sprites REST API (curl/fetch) or the official TypeScript SDK.

---

## 2. What Are Fly.io Sprites?

Sprites are **persistent, stateful Linux microVMs** launched by Fly.io in January 2026 at [sprites.dev](https://sprites.dev/). Built on AWS Firecracker, they provide:

| Feature | Detail |
|---|---|
| **Creation** | ~1-12 seconds to a fresh VM |
| **Storage** | 100 GB durable ext4 on NVMe, backed by object storage |
| **Scale-to-zero** | Auto-sleep after ~30s inactivity; sub-second wake |
| **Checkpoint/Restore** | ~300ms checkpoint, ~1s restore; last 5 accessible at `/.sprite/checkpoints` |
| **Sessions** | Detachable TTY sessions (WebSocket); survive disconnect |
| **Services** | Background processes that auto-restart on wake |
| **Network policies** | DNS-based allow/deny rules for outbound traffic |
| **TCP tunnels** | WebSocket proxy to internal ports |
| **Public URLs** | Instant HTTPS via Fly's Anycast network (port 8080) |

### Primary use cases
1. **AI coding agent sandboxes** — Safe, persistent dev environments for Claude Code, Codex, etc.
2. **Untrusted code execution** — Firecracker-level VM isolation with a programmatic JSON API.
3. **Dev environments** — Full Linux VMs that sleep when idle and wake instantly.

### API surface

REST API at `https://api.sprites.dev/v1/` with Bearer token auth. Key operations:

| Endpoint | Method | Operation |
|---|---|---|
| `/v1/sprites` | POST | Create sprite |
| `/v1/sprites` | GET | List sprites |
| `/v1/sprites/{name}` | GET | Get sprite details |
| `/v1/sprites/{name}` | PUT | Update settings |
| `/v1/sprites/{name}` | DELETE | Delete sprite |
| `/v1/sprites/{name}/exec` | WSS/POST | Execute command |
| `/v1/sprites/{name}/checkpoints` | POST | Create checkpoint |
| `/v1/sprites/{name}/checkpoints` | GET | List checkpoints |
| `/v1/sprites/{name}/checkpoints/{id}` | POST | Restore checkpoint |
| `/v1/sprites/{name}/services` | POST/GET | Manage services |
| `/v1/sprites/{name}/policy/network` | POST | Set network policies |
| `/v1/sprites/{name}/proxy` | WSS | TCP tunnel |
| `/v1/sprites/{name}/fs/...` | Various | Filesystem operations |

Official SDKs: **TypeScript** and **Go** (Python and Elixir planned).

---

## 3. SQL DSL Pattern (Reference Implementation)

The `@lokascript/domain-sql` package demonstrates the framework's DSL creation pattern:

```
schemas/index.ts       → Command schemas (defineCommand + defineRole)
tokenizers/index.ts    → Per-language tokenizers (extend BaseTokenizer)
profiles/index.ts      → Per-language pattern generation profiles
generators/sql-gen.ts  → Code generator (SemanticNode → SQL string)
index.ts               → Assembly via createMultilingualDSL()
__test__/              → Tests
```

### Key abstractions

1. **CommandSchema** — Language-neutral semantic structure: action + roles with types, positions, marker overrides
2. **LanguageTokenizer** — Classifies tokens (keyword/identifier/literal/operator) per language
3. **PatternGenLanguageProfile** — Keywords + word order for pattern generation
4. **CodeGenerator** — `generate(node: SemanticNode) → string` transforms AST to target language

The SQL DSL supports 4 languages (EN, ES, JA, AR) across 3 word orders (SVO, SOV, VSO) with 4 commands (SELECT, INSERT, UPDATE, DELETE).

---

## 4. Proposed Sprites DSL Design

### 4.1 Command Schemas

The Sprites API maps to **8 core commands**:

#### `create` — Create a new sprite

| Role | Required | Types | Description |
|---|---|---|---|
| `target` | yes | identifier | Sprite name |
| `options` | no | expression | CPU/RAM/region config |

```
EN (SVO): create my-sprite
ES (SVO): crear mi-sprite
JA (SOV): my-sprite を 作成
AR (VSO): أنشئ my-sprite
```

#### `delete` — Delete a sprite

| Role | Required | Types | Description |
|---|---|---|---|
| `target` | yes | identifier | Sprite name |

```
EN: delete my-sprite
ES: eliminar mi-sprite
JA: my-sprite を 削除
AR: احذف my-sprite
```

#### `exec` — Execute a command in a sprite

| Role | Required | Types | Description |
|---|---|---|---|
| `command` | yes | expression | Shell command to run |
| `target` | yes | identifier | Sprite name |

```
EN: exec "npm install" in my-sprite
ES: ejecutar "npm install" en mi-sprite
JA: my-sprite で "npm install" を 実行
AR: نفّذ "npm install" في my-sprite
```

#### `checkpoint` — Create a checkpoint

| Role | Required | Types | Description |
|---|---|---|---|
| `target` | yes | identifier | Sprite name |
| `label` | no | expression | Checkpoint label |

```
EN: checkpoint my-sprite
ES: guardar punto de mi-sprite
JA: my-sprite を チェックポイント
AR: أنشئ نقطة حفظ my-sprite
```

#### `restore` — Restore from a checkpoint

| Role | Required | Types | Description |
|---|---|---|---|
| `target` | yes | identifier | Sprite name |
| `source` | yes | identifier | Checkpoint ID |

```
EN: restore my-sprite from cp_abc123
ES: restaurar mi-sprite de cp_abc123
JA: cp_abc123 から my-sprite を 復元
AR: استعد my-sprite من cp_abc123
```

#### `list` — List sprites or checkpoints

| Role | Required | Types | Description |
|---|---|---|---|
| `resource` | no | identifier | "sprites" or "checkpoints" |
| `target` | no | identifier | Sprite name (for checkpoints) |

```
EN: list sprites
EN: list checkpoints of my-sprite
ES: listar sprites
JA: スプライト を 一覧
AR: اعرض sprites
```

#### `upload` — Upload a file to a sprite

| Role | Required | Types | Description |
|---|---|---|---|
| `source` | yes | expression | Local file path |
| `target` | yes | identifier | Sprite name |
| `destination` | no | expression | Remote path |

```
EN: upload ./app.js to my-sprite
ES: subir ./app.js a mi-sprite
JA: ./app.js を my-sprite に アップロード
AR: ارفع ./app.js إلى my-sprite
```

#### `service` — Manage background services

| Role | Required | Types | Description |
|---|---|---|---|
| `action` | yes | identifier | "add" / "remove" / "list" |
| `command` | no | expression | Service command string |
| `target` | yes | identifier | Sprite name |

```
EN: service add "node server.js" in my-sprite
ES: servicio agregar "node server.js" en mi-sprite
JA: my-sprite に "node server.js" サービス 追加
AR: أضف خدمة "node server.js" في my-sprite
```

### 4.2 Code Generation Targets

The code generator would transform `SemanticNode` → one of:

#### Target A: REST API (curl/fetch)

```typescript
// Input:  "create my-sprite"
// Output:
fetch("https://api.sprites.dev/v1/sprites", {
  method: "POST",
  headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ name: "my-sprite" })
})
```

#### Target B: TypeScript SDK

```typescript
// Input:  "exec 'npm install' in my-sprite"
// Output:
await sprites.exec("my-sprite", { command: "npm install" })
```

#### Target C: CLI commands

```bash
# Input:  "checkpoint my-sprite"
# Output:
sprite api -s my-sprite /checkpoints -X POST
```

Multiple generators could coexist — the `CodeGenerator` interface is pluggable.

### 4.3 Language Coverage

Starting with the same 4 languages as the SQL DSL (EN, ES, JA, AR) covers all 3 word orders. Additional languages can be added incrementally following the framework pattern.

| Language | Word Order | Script | Complexity |
|---|---|---|---|
| English | SVO | Latin | Baseline |
| Spanish | SVO | Latin | Low (same structure as EN) |
| Japanese | SOV | Mixed | Medium (postpositions: を, で, に, から) |
| Arabic | VSO | Arabic | Medium (RTL, verb-first) |

---

## 5. Implementation Mapping

### 5.1 File Structure

Following the `domain-sql` pattern exactly:

```
packages/domain-sprites/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts                          # createSpritesDSL() factory
│   ├── schemas/
│   │   └── index.ts                      # 8 command schemas
│   ├── tokenizers/
│   │   └── index.ts                      # 4 language tokenizers
│   ├── profiles/
│   │   └── index.ts                      # 4 language profiles
│   ├── generators/
│   │   ├── rest-generator.ts             # SemanticNode → fetch() calls
│   │   ├── sdk-generator.ts              # SemanticNode → TypeScript SDK
│   │   └── cli-generator.ts              # SemanticNode → sprite CLI commands
│   └── __test__/
│       └── sprites-domain.test.ts        # Comprehensive tests
```

### 5.2 Schema Definitions (Draft)

```typescript
import { defineCommand, defineRole } from '@lokascript/framework';

export const createSchema = defineCommand({
  action: 'create',
  description: 'Create a new Sprite VM',
  category: 'lifecycle',
  primaryRole: 'target',
  roles: [
    defineRole({
      role: 'target',
      description: 'Sprite name',
      required: true,
      expectedTypes: ['identifier'],
      svoPosition: 1,
      sovPosition: 1,
    }),
    defineRole({
      role: 'options',
      description: 'Configuration options (CPU, RAM, etc.)',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 0,
      sovPosition: 0,
      markerOverride: { en: 'with', es: 'con', ja: 'で', ar: 'مع' },
    }),
  ],
});

export const execSchema = defineCommand({
  action: 'exec',
  description: 'Execute a command in a Sprite',
  category: 'operation',
  primaryRole: 'command',
  roles: [
    defineRole({
      role: 'command',
      description: 'Shell command to execute',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 1,
    }),
    defineRole({
      role: 'target',
      description: 'Target sprite',
      required: true,
      expectedTypes: ['identifier'],
      svoPosition: 1,
      sovPosition: 2,
      markerOverride: { en: 'in', es: 'en', ja: 'で', ar: 'في' },
    }),
  ],
});

export const checkpointSchema = defineCommand({
  action: 'checkpoint',
  description: 'Create a checkpoint of the Sprite state',
  category: 'snapshot',
  primaryRole: 'target',
  roles: [
    defineRole({
      role: 'target',
      description: 'Sprite to checkpoint',
      required: true,
      expectedTypes: ['identifier'],
      svoPosition: 1,
      sovPosition: 1,
    }),
  ],
});

export const restoreSchema = defineCommand({
  action: 'restore',
  description: 'Restore a Sprite from a checkpoint',
  category: 'snapshot',
  primaryRole: 'target',
  roles: [
    defineRole({
      role: 'target',
      description: 'Sprite to restore',
      required: true,
      expectedTypes: ['identifier'],
      svoPosition: 2,
      sovPosition: 1,
    }),
    defineRole({
      role: 'source',
      description: 'Checkpoint ID to restore from',
      required: true,
      expectedTypes: ['identifier'],
      svoPosition: 1,
      sovPosition: 2,
      markerOverride: { en: 'from', es: 'de', ja: 'から', ar: 'من' },
    }),
  ],
});
```

### 5.3 Code Generator (Draft — REST Target)

```typescript
import type { SemanticNode, CodeGenerator } from '@lokascript/framework';

function extractValue(value: { raw?: string; value?: string | number }): string {
  if (value.raw !== undefined) return String(value.raw);
  if (value.value !== undefined) return String(value.value);
  return '';
}

function generateCreate(node: SemanticNode): string {
  const target = node.roles.get('target');
  const name = target ? extractValue(target as any) : 'my-sprite';
  return `POST /v1/sprites { "name": "${name}" }`;
}

function generateExec(node: SemanticNode): string {
  const target = node.roles.get('target');
  const command = node.roles.get('command');
  const name = target ? extractValue(target as any) : 'my-sprite';
  const cmd = command ? extractValue(command as any) : 'bash';
  return `POST /v1/sprites/${name}/exec { "command": "${cmd}" }`;
}

function generateCheckpoint(node: SemanticNode): string {
  const target = node.roles.get('target');
  const name = target ? extractValue(target as any) : 'my-sprite';
  return `POST /v1/sprites/${name}/checkpoints`;
}

function generateRestore(node: SemanticNode): string {
  const target = node.roles.get('target');
  const source = node.roles.get('source');
  const name = target ? extractValue(target as any) : 'my-sprite';
  const cpId = source ? extractValue(source as any) : 'latest';
  return `POST /v1/sprites/${name}/checkpoints/${cpId}`;
}

export const spritesRestGenerator: CodeGenerator = {
  generate(node: SemanticNode): string {
    switch (node.action) {
      case 'create': return generateCreate(node);
      case 'delete': return generateDelete(node);
      case 'exec':   return generateExec(node);
      case 'checkpoint': return generateCheckpoint(node);
      case 'restore':    return generateRestore(node);
      case 'list':       return generateList(node);
      case 'upload':     return generateUpload(node);
      case 'service':    return generateService(node);
      default: throw new Error(`Unknown Sprites command: ${node.action}`);
    }
  },
};
```

---

## 6. Feasibility Analysis

### 6.1 Framework Fit — Excellent

| Requirement | Framework Support | Notes |
|---|---|---|
| Command/action model | `defineCommand()` + `defineRole()` | Direct mapping from Sprites operations |
| Multilingual keywords | `PatternGenLanguageProfile` | Same pattern as SQL DSL |
| Word order (SVO/SOV/VSO) | `PatternMatcher` + `GrammarTransformer` | Proven by SQL DSL with 3 word orders |
| Role markers (from/in/to) | `markerOverride` on `RoleSpec` | Per-language prepositions/postpositions |
| Code generation | `CodeGenerator` interface | Pluggable; can target REST, SDK, or CLI |
| Tokenization | `BaseTokenizer` + `getDefaultExtractors()` | Sprites identifiers are simpler than SQL |
| Validation | `validate()` method | Free from framework |
| Translation | `translate()` method | Free from GrammarTransformer |

### 6.2 Complexity Comparison

| Aspect | SQL DSL | Sprites DSL | Advantage |
|---|---|---|---|
| Number of commands | 4 | 8 | More commands, but each is simpler |
| Roles per command | 2-3 | 1-3 | Comparable |
| Value types | columns, tables, conditions, operators | names, paths, commands, IDs | Sprites values are simpler (no expressions) |
| Code gen complexity | SQL syntax with clauses | REST endpoints with JSON | Sprites is more uniform |
| Tokenization | SQL keywords + operators | Action keywords + identifiers | Sprites is simpler |

**The Sprites domain is semantically simpler than SQL.** Most commands have 1-2 roles (target + optional argument). There are no complex expressions, nested clauses, or operator precedence concerns.

### 6.3 Challenges and Mitigations

| Challenge | Severity | Mitigation |
|---|---|---|
| Quoted string arguments (shell commands) | Low | `getDefaultExtractors()` handles quoted strings |
| File paths with slashes | Low | Tokenizer can treat paths as single tokens |
| Hyphenated sprite names | Low | Tokenizer treats `my-sprite` as single identifier |
| Async operations (WebSocket exec) | Medium | Code gen can emit `await`; DSL itself is sync parse |
| Authentication tokens | N/A | Code gen includes placeholder; not a DSL concern |
| Multi-word compound commands (`service add`) | Medium | Use `action` + `sub-action` role, or flatten to `service-add` |

### 6.4 Effort Estimate

Based on the SQL DSL as reference:

| Component | SQL DSL LOC | Sprites DSL (est.) | Notes |
|---|---|---|---|
| Schemas | 155 | ~250 | 8 commands vs 4 |
| Tokenizers | 225 | ~200 | Simpler keyword sets |
| Profiles | 87 | ~100 | Same 4 languages |
| Code generator | 99 | ~180 | 8 commands, but simpler per-command |
| Entry point | 94 | ~100 | Same pattern |
| Tests | 253 | ~350 | More commands to cover |
| **Total** | **~913** | **~1,180** | ~30% more code, mostly from more commands |

---

## 7. Usage Examples

### 7.1 English (SVO)

```typescript
import { createSpritesDSL } from '@lokascript/domain-sprites';

const sprites = createSpritesDSL();

// Lifecycle
sprites.compile('create my-dev-env', 'en');
// → POST /v1/sprites { "name": "my-dev-env" }

sprites.compile('delete my-dev-env', 'en');
// → DELETE /v1/sprites/my-dev-env

// Execution
sprites.compile('exec "npm test" in my-dev-env', 'en');
// → POST /v1/sprites/my-dev-env/exec { "command": "npm test" }

// Snapshots
sprites.compile('checkpoint my-dev-env', 'en');
// → POST /v1/sprites/my-dev-env/checkpoints

sprites.compile('restore my-dev-env from cp_abc123', 'en');
// → POST /v1/sprites/my-dev-env/checkpoints/cp_abc123

// Files
sprites.compile('upload ./app.js to my-dev-env', 'en');
// → PUT /v1/sprites/my-dev-env/fs/app.js [file content]
```

### 7.2 Japanese (SOV)

```typescript
sprites.compile('my-dev-env を 作成', 'ja');
// → POST /v1/sprites { "name": "my-dev-env" }

sprites.compile('my-dev-env で "npm test" を 実行', 'ja');
// → POST /v1/sprites/my-dev-env/exec { "command": "npm test" }

sprites.compile('cp_abc123 から my-dev-env を 復元', 'ja');
// → POST /v1/sprites/my-dev-env/checkpoints/cp_abc123
```

### 7.3 Arabic (VSO)

```typescript
sprites.compile('أنشئ my-dev-env', 'ar');
// → POST /v1/sprites { "name": "my-dev-env" }

sprites.compile('نفّذ "npm test" في my-dev-env', 'ar');
// → POST /v1/sprites/my-dev-env/exec { "command": "npm test" }

sprites.compile('استعد my-dev-env من cp_abc123', 'ar');
// → POST /v1/sprites/my-dev-env/checkpoints/cp_abc123
```

### 7.4 Cross-Language Equivalence

```typescript
// All produce the same SemanticNode:
const en = sprites.parse('create my-sprite', 'en');
const es = sprites.parse('crear mi-sprite', 'es');
const ja = sprites.parse('my-sprite を 作成', 'ja');
const ar = sprites.parse('أنشئ my-sprite', 'ar');

// en.action === es.action === ja.action === ar.action === 'create'
// All have role 'target' with value 'my-sprite' (or 'mi-sprite' for ES)
```

---

## 8. Integration Opportunities

### 8.1 MCP Server Integration

Following the SQL DSL's MCP integration (`packages/mcp-server/src/tools/sql-domain.ts`), a Sprites MCP tool would let AI agents manage VMs through natural language:

```typescript
// MCP tool: manage_sprite
{
  name: "manage_sprite",
  description: "Manage Fly.io Sprites using natural language commands",
  inputSchema: {
    type: "object",
    properties: {
      command: { type: "string", description: "Natural language command" },
      language: { type: "string", default: "en" },
      execute: { type: "boolean", default: false }
    }
  }
}
```

### 8.2 HyperFixi Browser Integration

Sprites commands could be used in hyperscript event handlers for dev tool UIs:

```html
<!-- Dev dashboard with hyperscript + Sprites DSL -->
<button _="on click sprite-create 'my-env' then put result into #status">
  Create Environment
</button>

<button _="on click sprite-checkpoint 'my-env' then put result into #status">
  Save Checkpoint
</button>
```

### 8.3 Vite Plugin Extension

The vite-plugin could detect Sprites DSL usage in HTML attributes and include the Sprites command module in the generated bundle.

---

## 9. Comparison: Sprites DSL vs. Raw API

| Aspect | Raw REST API | Sprites DSL |
|---|---|---|
| Learning curve | Must learn endpoint paths, JSON schemas | Natural-language commands |
| Multilingual | English-only API | 4+ languages |
| Validation | Runtime HTTP errors | Compile-time semantic validation |
| Discoverability | Read API docs | Autocomplete-friendly command names |
| Code generation | Manual fetch/curl construction | Automatic from parsed intent |
| Agent-friendly | Requires prompt engineering for API format | Natural language in, structured API out |

---

## 10. Risks and Open Questions

1. **Sprites API stability** — The API is at `v001-rc30` (release candidate). Breaking changes are possible. Mitigation: Version-pin the code generator; schema layer is API-agnostic.

2. **Compound commands** — `service add`, `service remove`, `list checkpoints` involve sub-actions. The framework's current `action` field is a single string. Options:
   - Flatten: `service-add`, `service-remove`, `list-checkpoints`
   - Use a `sub-action` role
   - Model as separate commands: `addService`, `removeService`

3. **Async execution model** — `exec` via WebSocket is inherently async with streaming output. The DSL can parse the intent synchronously, but the code generator must emit async patterns.

4. **File upload semantics** — `upload` requires reading a local file, which is a side effect beyond what a DSL parser typically handles. The code generator should emit the API call structure, leaving actual file I/O to the runtime.

5. **Network policy rules** — Complex structured data (allow/deny lists) may push the boundaries of what a single-line DSL command can express. Consider a multi-line or config-file mode for policies.

---

## 11. Recommendation

**Proceed with implementation.** The Sprites DSL is a strong fit for the framework:

- The domain is simpler than SQL, reducing implementation risk
- The framework provides all necessary abstractions (schemas, tokenizers, profiles, code gen)
- The SQL DSL serves as a proven, copy-able template
- Multi-language support from day one is a differentiator vs. the English-only `sprite` CLI
- MCP integration makes it immediately useful for AI agent workflows
- Estimated at ~1,200 LOC, achievable in a single focused effort

### Suggested phased approach

**Phase 1 — Core DSL (MVP):**
- 4 commands: `create`, `delete`, `exec`, `checkpoint`
- 2 languages: English + Japanese (covers SVO + SOV)
- 1 code generator: REST API

**Phase 2 — Full command set:**
- Add `restore`, `list`, `upload`, `service`
- Add Spanish + Arabic (covers all 3 word orders)
- Add TypeScript SDK generator

**Phase 3 — Integration:**
- MCP server tool
- CLI generator
- Vite plugin detection

---

## 12. Appendix: Sprites Keyword Table

| Action | English | Spanish | Japanese | Arabic |
|---|---|---|---|---|
| create | create | crear | 作成 | أنشئ |
| delete | delete | eliminar | 削除 | احذف |
| exec | exec / run | ejecutar | 実行 | نفّذ |
| checkpoint | checkpoint | guardar | チェックポイント | نقطة حفظ |
| restore | restore | restaurar | 復元 | استعد |
| list | list | listar | 一覧 | اعرض |
| upload | upload | subir | アップロード | ارفع |
| service | service | servicio | サービス | خدمة |
| in | in | en | で | في |
| from | from | de | から | من |
| to | to | a | に | إلى |
| with | with | con | で | مع |
