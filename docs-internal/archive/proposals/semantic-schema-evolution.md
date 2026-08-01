# Semantic Schema Evolution Proposal

## Executive Summary

This proposal outlines the evolution of lokascript's semantic schema to support:

1. **Multi-actor systems** via an activated `agent` role
2. **Multi-target code generation** beyond JavaScript
3. **Extended execution contexts** (server, IoT, AI agents)

The semantic-first architecture positions lokascript as a **universal intent language** that can target multiple runtimes while maintaining a single, human-readable syntax.

---

## Part 1: Role Schema Evolution

### Current State (Updated)

The semantic schema now defines **11 thematic roles**, organized into three categories:

**Core Thematic Roles** (from linguistic theory):

| Role        | Status   | Description              | Example                  |
| ----------- | -------- | ------------------------ | ------------------------ |
| action      | Active   | Command verb (implicit)  | toggle, put, fetch       |
| agent       | Reserved | Who performs action      | server, claude, me       |
| patient     | Active   | Primary object of action | .active, #counter        |
| source      | Active   | Origin of data/content   | from #input, from URL    |
| destination | Active   | Target location          | into #output, on #button |
| event       | Active   | Trigger for handlers     | click, input, keydown    |
| condition   | Active   | Boolean expressions      | if x > 5                 |

**Quantitative Roles** (answer "how much/long"):

| Role     | Status  | Description    | Example                   |
| -------- | ------- | -------------- | ------------------------- |
| quantity | Active  | Numeric amount | by 5, 3 times             |
| duration | **NEW** | Time span      | for 5 seconds, over 500ms |

**Adverbial Roles** (answer "how/by what means"):

| Role   | Status      | Description              | Example               |
| ------ | ----------- | ------------------------ | --------------------- |
| method | **NEW**     | Protocol/technique       | as GET, via websocket |
| style  | **RENAMED** | Visual/behavioral manner | with fade, smoothly   |

**Removed Roles**:

- `instrument` - Never used, overlapped with method/quantity
- `manner` - Split into more specific roles (duration, method, style)

### Proposed Evolution

#### Phase 1: Activate Agent Role

**Goal**: Enable explicit specification of who/what performs an action.

```typescript
// packages/semantic/src/types.ts - Extended AgentValue
export type AgentValue =
  | ReferenceValue // me, you, it, self
  | SelectorValue // #element, .component
  | ServiceIdentifier // NEW: server, worker, claude
  | RemoteIdentifier // NEW: peer:id, device:name
  | DelegateIdentifier; // NEW: on-behalf-of:user

export interface ServiceIdentifier {
  readonly type: 'service';
  readonly value: string; // 'server' | 'worker' | 'claude' | custom
  readonly endpoint?: string; // Optional URL/address
  readonly capabilities?: string[]; // What this agent can do
}

export interface RemoteIdentifier {
  readonly type: 'remote';
  readonly protocol: string; // 'peer' | 'device' | 'socket'
  readonly address: string; // Identifier within protocol
}

export interface DelegateIdentifier {
  readonly type: 'delegate';
  readonly principal: AgentValue; // Who we're acting for
  readonly scope?: string[]; // Allowed actions
}
```

**Pattern Support**:

```typescript
// English: "server fetch /api/data into #result"
{
  id: 'fetch-en-agent',
  template: [
    { type: 'role', role: 'agent', optional: true },
    { type: 'literal', value: 'fetch' },
    { type: 'role', role: 'source' },
    { type: 'group', optional: true, tokens: [
      { type: 'literal', value: 'into' },
      { type: 'role', role: 'destination' },
    ]},
  ],
}

// Japanese: "サーバー が /api/data を #result に 取得"
{
  id: 'fetch-ja-agent',
  template: [
    { type: 'role', role: 'agent' },
    { type: 'literal', value: 'が' },  // subject marker
    { type: 'role', role: 'source' },
    { type: 'literal', value: 'を' },
    { type: 'role', role: 'destination' },
    { type: 'literal', value: 'に' },
    { type: 'literal', value: '取得' },
  ],
}
```

#### Phase 2: Add Missing Roles

**New roles for expanded capabilities**:

| Role          | Purpose                  | Example                      |
| ------------- | ------------------------ | ---------------------------- |
| `beneficiary` | Who benefits from action | "fetch data for user"        |
| `duration`    | Time span                | "show message for 5 seconds" |
| `frequency`   | Repetition rate          | "poll every 30 seconds"      |
| `constraint`  | Limitations              | "fetch with timeout 5000"    |
| `fallback`    | Error recovery           | "fetch or use cached"        |

```typescript
// Extended SemanticRole type
export type SemanticRole =
  // Existing (core thematic)
  | 'action'
  | 'agent'
  | 'patient'
  | 'source'
  | 'destination'
  | 'instrument'
  | 'event'
  | 'condition'
  | 'quantity'
  | 'manner'
  // New (extended)
  | 'beneficiary' // for whom
  | 'duration' // how long
  | 'frequency' // how often
  | 'constraint' // with what limits
  | 'fallback'; // on failure
```

#### Phase 3: Role Composition

**Allow roles to contain structured data**:

```typescript
// Compound destination with options
{
  role: 'destination',
  value: {
    type: 'compound',
    target: { type: 'selector', value: '#output' },
    position: 'append',      // before | after | replace | append
    transition: 'fade',      // animation
  }
}

// Conditional agent selection
{
  role: 'agent',
  value: {
    type: 'conditional',
    condition: { type: 'expression', raw: 'navigator.onLine' },
    ifTrue: { type: 'service', value: 'server' },
    ifFalse: { type: 'service', value: 'worker' },
  }
}
```

---

## Part 2: Multi-Target Code Generation

### Architecture Overview

```
                    ┌─────────────────────────────────────┐
                    │         Semantic IR (Invariant)     │
                    │  SemanticNode with roles + metadata │
                    └──────────────────┬──────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │  JS Generator   │    │  SQL Generator  │    │  LLM Generator  │
    │  (Browser/Node) │    │  (Database)     │    │  (AI Prompts)   │
    └─────────────────┘    └─────────────────┘    └─────────────────┘
              │                        │                        │
              ▼                        ▼                        ▼
         JavaScript              SQL Queries              Prompt Text
```

### Generator Interface

```typescript
// packages/semantic/src/generators/base.ts

export interface CodeGenerator<TOutput = string> {
  /** Unique identifier for this generator */
  readonly id: string;

  /** Target platform/language */
  readonly target: GeneratorTarget;

  /** Generate code from semantic node */
  generate(node: SemanticNode, context: GeneratorContext): TOutput;

  /** Check if this generator supports the given node */
  supports(node: SemanticNode): boolean;

  /** Get required capabilities for execution */
  requiredCapabilities(node: SemanticNode): Capability[];
}

export type GeneratorTarget =
  | 'javascript' // Browser/Node.js
  | 'typescript' // With type annotations
  | 'sql' // Database queries
  | 'graphql' // API queries
  | 'rest' // HTTP requests
  | 'llm-prompt' // AI model prompts
  | 'state-machine' // XState/statecharts
  | 'workflow' // Temporal/workflow engines
  | 'hardware' // IoT/embedded
  | 'test' // Test assertions
  | 'documentation'; // Human-readable docs

export interface GeneratorContext {
  /** Available runtime capabilities */
  capabilities: Set<Capability>;

  /** Variable bindings in scope */
  scope: Map<string, TypeInfo>;

  /** Target-specific options */
  options: Record<string, unknown>;

  /** Error handling strategy */
  errorStrategy: 'throw' | 'return' | 'log' | 'ignore';
}
```

### Target 1: JavaScript (Current)

```typescript
// packages/semantic/src/generators/javascript.ts

export class JavaScriptGenerator implements CodeGenerator<string> {
  readonly id = 'javascript';
  readonly target = 'javascript';

  generate(node: SemanticNode, ctx: GeneratorContext): string {
    switch (node.action) {
      case 'toggle':
        return this.generateToggle(node, ctx);
      case 'put':
        return this.generatePut(node, ctx);
      case 'fetch':
        return this.generateFetch(node, ctx);
      // ... other commands
    }
  }

  private generateToggle(node: SemanticNode, ctx: GeneratorContext): string {
    const patient = node.roles.get('patient');
    const destination = node.roles.get('destination') ?? { type: 'reference', value: 'me' };

    const targetExpr = this.valueToJS(destination, ctx);
    const classExpr = this.valueToJS(patient, ctx);

    return `${targetExpr}.classList.toggle(${classExpr})`;
  }

  private generateFetch(node: SemanticNode, ctx: GeneratorContext): string {
    const source = node.roles.get('source');
    const destination = node.roles.get('destination');
    const agent = node.roles.get('agent');

    // Agent determines execution context
    if (agent?.type === 'service' && agent.value === 'server') {
      return this.generateServerFetch(node, ctx);
    }

    return `fetch(${this.valueToJS(source, ctx)})
      .then(r => r.json())
      .then(data => { ${destination ? `${this.valueToJS(destination, ctx)}.innerHTML = data` : ''} })`;
  }
}
```

### Target 2: SQL Generator

**Use case**: Data manipulation commands that target databases.

```typescript
// packages/semantic/src/generators/sql.ts

export class SQLGenerator implements CodeGenerator<SQLQuery> {
  readonly id = 'sql';
  readonly target = 'sql';

  generate(node: SemanticNode, ctx: GeneratorContext): SQLQuery {
    switch (node.action) {
      case 'put':
        return this.generateInsertOrUpdate(node, ctx);
      case 'get':
        return this.generateSelect(node, ctx);
      case 'remove':
        return this.generateDelete(node, ctx);
      case 'increment':
      case 'decrement':
        return this.generateUpdate(node, ctx);
    }
  }

  private generateSelect(node: SemanticNode, ctx: GeneratorContext): SQLQuery {
    const source = node.roles.get('source'); // table
    const patient = node.roles.get('patient'); // columns
    const condition = node.roles.get('condition');

    return {
      sql: `SELECT ${this.columnsToSQL(patient)} FROM ${this.tableToSQL(source)}${
        condition ? ` WHERE ${this.conditionToSQL(condition)}` : ''
      }`,
      params: this.extractParams(node),
      type: 'select',
    };
  }

  private generateInsertOrUpdate(node: SemanticNode, ctx: GeneratorContext): SQLQuery {
    const patient = node.roles.get('patient'); // data
    const destination = node.roles.get('destination'); // table
    const condition = node.roles.get('condition');

    if (condition) {
      // UPDATE with WHERE
      return {
        sql: `UPDATE ${this.tableToSQL(destination)} SET ${this.dataToSQL(patient)} WHERE ${this.conditionToSQL(condition)}`,
        params: this.extractParams(node),
        type: 'update',
      };
    }

    // INSERT
    return {
      sql: `INSERT INTO ${this.tableToSQL(destination)} ${this.dataToInsertSQL(patient)}`,
      params: this.extractParams(node),
      type: 'insert',
    };
  }
}

interface SQLQuery {
  sql: string;
  params: unknown[];
  type: 'select' | 'insert' | 'update' | 'delete';
}
```

**Semantic hyperscript → SQL examples**:

```hyperscript
get users from database where age > 18
→ SELECT * FROM users WHERE age > 18

put {name: "Alice", age: 30} into users
→ INSERT INTO users (name, age) VALUES ('Alice', 30)

increment views on posts where id is postId
→ UPDATE posts SET views = views + 1 WHERE id = ?

remove from sessions where expired is true
→ DELETE FROM sessions WHERE expired = true
```

### Target 3: LLM Prompt Generator

**Use case**: Generate structured prompts for AI models.

```typescript
// packages/semantic/src/generators/llm-prompt.ts

export class LLMPromptGenerator implements CodeGenerator<LLMPrompt> {
  readonly id = 'llm-prompt';
  readonly target = 'llm-prompt';

  generate(node: SemanticNode, ctx: GeneratorContext): LLMPrompt {
    switch (node.action) {
      case 'ask':
        return this.generateAsk(node, ctx);
      case 'tell':
        return this.generateTell(node, ctx);
      case 'summarize':
        return this.generateSummarize(node, ctx);
      case 'translate':
        return this.generateTranslate(node, ctx);
      case 'analyze':
        return this.generateAnalyze(node, ctx);
    }
  }

  private generateAsk(node: SemanticNode, ctx: GeneratorContext): LLMPrompt {
    const patient = node.roles.get('patient'); // The question
    const source = node.roles.get('source'); // Context/document
    const manner = node.roles.get('manner'); // Style
    const agent = node.roles.get('agent'); // Which model
    const constraint = node.roles.get('constraint'); // Limits

    return {
      model: this.resolveModel(agent),
      messages: [
        { role: 'system', content: this.buildSystemPrompt(manner, constraint) },
        ...(source ? [{ role: 'user', content: `Context:\n${this.resolveContent(source)}` }] : []),
        { role: 'user', content: this.resolveContent(patient) },
      ],
      options: this.buildOptions(constraint),
    };
  }

  private generateSummarize(node: SemanticNode, ctx: GeneratorContext): LLMPrompt {
    const patient = node.roles.get('patient'); // Content to summarize
    const manner = node.roles.get('manner'); // bullets, paragraph, tl;dr
    const quantity = node.roles.get('quantity'); // length limit

    const style = this.mannerToStyle(manner);
    const lengthHint = quantity ? `in ${this.quantityToWords(quantity)}` : '';

    return {
      model: this.defaultModel(ctx),
      messages: [
        {
          role: 'system',
          content: `You are a summarization assistant. Provide ${style} summaries${lengthHint}.`,
        },
        { role: 'user', content: `Summarize the following:\n\n${this.resolveContent(patient)}` },
      ],
      options: {},
    };
  }
}

interface LLMPrompt {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  options: {
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
  };
}
```

**Semantic hyperscript → LLM examples**:

```hyperscript
ask claude "What are the key themes?" from #article-content as bullets
→ {
    model: "claude-3-opus",
    messages: [
      { role: "system", content: "Respond using bullet points." },
      { role: "user", content: "Context:\n[article content]" },
      { role: "user", content: "What are the key themes?" }
    ]
  }

summarize #document in 3 sentences
→ Prompt requesting 3-sentence summary

tell assistant "Review this code" from #editor manner:thorough
→ Code review prompt with detailed analysis instructions

translate #paragraph from english to japanese
→ Translation prompt with language pair
```

### Target 4: State Machine Generator

**Use case**: Generate XState/statechart definitions from event handlers.

```typescript
// packages/semantic/src/generators/state-machine.ts

export class StateMachineGenerator implements CodeGenerator<StateMachineDefinition> {
  readonly id = 'state-machine';
  readonly target = 'state-machine';

  generate(node: SemanticNode, ctx: GeneratorContext): StateMachineDefinition {
    // Collect all event handlers from compound nodes
    const handlers = this.collectEventHandlers(node);

    // Infer states from conditions and transitions
    const states = this.inferStates(handlers);

    // Build transition map
    const transitions = this.buildTransitions(handlers, states);

    return {
      id: ctx.options.machineId ?? 'lokascript-machine',
      initial: states[0]?.name ?? 'idle',
      states: Object.fromEntries(states.map(s => [s.name, this.stateToXState(s, transitions)])),
    };
  }

  private stateToXState(state: InferredState, transitions: TransitionMap): XStateNode {
    return {
      on: Object.fromEntries(
        transitions
          .get(state.name)
          ?.map(t => [t.event, { target: t.target, actions: t.actions }]) ?? []
      ),
      entry: state.entryActions,
      exit: state.exitActions,
    };
  }
}

// Example input (multiple event handlers)
const semanticNodes = [
  // on click when not playing -> toggle .playing, set state to "playing"
  // on click when playing -> toggle .playing, set state to "paused"
  // on ended -> remove .playing, set state to "idle"
];

// Generated XState machine
const machine = {
  id: 'player',
  initial: 'idle',
  states: {
    idle: {
      on: { CLICK: { target: 'playing', actions: ['togglePlaying'] } },
    },
    playing: {
      on: {
        CLICK: { target: 'paused', actions: ['togglePlaying'] },
        ENDED: { target: 'idle', actions: ['removePlaying'] },
      },
    },
    paused: {
      on: { CLICK: { target: 'playing', actions: ['togglePlaying'] } },
    },
  },
};
```

### Target 5: REST/GraphQL Generator

**Use case**: Generate API calls from semantic commands.

```typescript
// packages/semantic/src/generators/rest.ts

export class RESTGenerator implements CodeGenerator<RESTRequest> {
  readonly id = 'rest';
  readonly target = 'rest';

  generate(node: SemanticNode, ctx: GeneratorContext): RESTRequest {
    // Map hyperscript commands to HTTP methods
    const methodMap: Record<ActionType, HttpMethod> = {
      'get': 'GET',
      'fetch': 'GET',
      'put': 'PUT',
      'set': 'PATCH',
      'remove': 'DELETE',
      'send': 'POST',
      'append': 'POST',
    };

    const method = methodMap[node.action] ?? 'GET';
    const source = node.roles.get('source');
    const patient = node.roles.get('patient');

    return {
      method,
      url: this.resolveURL(source, ctx),
      headers: this.buildHeaders(node, ctx),
      body: method !== 'GET' ? this.serializeBody(patient) : undefined,
      query: method === 'GET' ? this.buildQueryParams(patient) : undefined,
    };
  }
}

// Semantic hyperscript → REST
// get users from /api/users where role is "admin"
→ GET /api/users?role=admin

// put {name: "New Name"} into /api/users/123
→ PUT /api/users/123 with body {"name": "New Name"}

// send notification to /api/notifications
→ POST /api/notifications with body from notification variable
```

### Target 6: Test Assertion Generator

**Use case**: Generate test code from semantic descriptions.

```typescript
// packages/semantic/src/generators/test.ts

export class TestGenerator implements CodeGenerator<TestAssertion> {
  readonly id = 'test';
  readonly target = 'test';

  generate(node: SemanticNode, ctx: GeneratorContext): TestAssertion {
    switch (node.action) {
      case 'assert':
        return this.generateAssertion(node, ctx);
      case 'expect':
        return this.generateExpectation(node, ctx);
      case 'verify':
        return this.generateVerification(node, ctx);
    }
  }

  private generateExpectation(node: SemanticNode, ctx: GeneratorContext): TestAssertion {
    const patient = node.roles.get('patient');     // What to check
    const condition = node.roles.get('condition'); // Expected state
    const manner = node.roles.get('manner');       // Matcher type

    return {
      framework: ctx.options.framework ?? 'vitest',
      code: `expect(${this.valueToJS(patient)}).${this.conditionToMatcher(condition, manner)}`,
      description: this.generateDescription(node),
    };
  }
}

// Semantic hyperscript → Test assertions
// expect #button to have .active
→ expect(document.querySelector('#button')).toHaveClass('active')

// assert count equals 5
→ expect(count).toBe(5)

// verify #list contains "Item 1"
→ expect(document.querySelector('#list').textContent).toContain('Item 1')
```

---

## Part 3: Generator Registry and Composition

### Registry Pattern

```typescript
// packages/semantic/src/generators/registry.ts

export class GeneratorRegistry {
  private generators = new Map<string, CodeGenerator>();
  private targetMap = new Map<GeneratorTarget, CodeGenerator[]>();

  register(generator: CodeGenerator): void {
    this.generators.set(generator.id, generator);

    const existing = this.targetMap.get(generator.target) ?? [];
    existing.push(generator);
    this.targetMap.set(generator.target, existing);
  }

  generate(node: SemanticNode, target: GeneratorTarget, context: GeneratorContext): unknown {
    const generators = this.targetMap.get(target) ?? [];
    const suitable = generators.find(g => g.supports(node));

    if (!suitable) {
      throw new Error(`No generator for ${node.action} targeting ${target}`);
    }

    return suitable.generate(node, context);
  }

  // Generate for multiple targets
  generateMulti(
    node: SemanticNode,
    targets: GeneratorTarget[],
    context: GeneratorContext
  ): Map<GeneratorTarget, unknown> {
    return new Map(targets.map(t => [t, this.generate(node, t, context)]));
  }
}

// Usage
const registry = new GeneratorRegistry();
registry.register(new JavaScriptGenerator());
registry.register(new SQLGenerator());
registry.register(new LLMPromptGenerator());
registry.register(new RESTGenerator());

// Same semantic node, different outputs
const node = parse('get users from /api/users where active is true', 'en');

const jsCode = registry.generate(node, 'javascript', ctx);
// → fetch('/api/users?active=true').then(...)

const sqlQuery = registry.generate(node, 'sql', ctx);
// → SELECT * FROM users WHERE active = true

const restReq = registry.generate(node, 'rest', ctx);
// → { method: 'GET', url: '/api/users', query: { active: 'true' } }
```

### Composition: Multi-Target Execution

```typescript
// packages/semantic/src/runtime/multi-target.ts

export class MultiTargetRuntime {
  constructor(
    private registry: GeneratorRegistry,
    private executors: Map<GeneratorTarget, Executor>
  ) {}

  async execute(node: SemanticNode, context: RuntimeContext): Promise<ExecutionResult> {
    // Determine best target based on agent and capabilities
    const target = this.selectTarget(node, context);

    // Generate code for target
    const generated = this.registry.generate(node, target, context);

    // Execute with appropriate executor
    const executor = this.executors.get(target);
    return executor.execute(generated, context);
  }

  private selectTarget(node: SemanticNode, ctx: RuntimeContext): GeneratorTarget {
    const agent = node.roles.get('agent');

    // Agent-based routing
    if (agent?.type === 'service') {
      switch (agent.value) {
        case 'server':
          return 'rest';
        case 'database':
          return 'sql';
        case 'claude':
        case 'gpt':
        case 'assistant':
          return 'llm-prompt';
      }
    }

    // Capability-based fallback
    if (ctx.capabilities.has('dom')) return 'javascript';
    if (ctx.capabilities.has('sql')) return 'sql';

    return 'javascript'; // Default
  }
}
```

---

## Part 4: New Command Schemas for Extended Targets

### AI/LLM Commands

```typescript
// packages/semantic/src/generators/command-schemas.ts

export const askSchema: CommandSchema = {
  action: 'ask',
  description: 'Ask an AI agent a question',
  category: 'ai',
  primaryRole: 'patient',
  roles: [
    { role: 'patient', description: 'The question or prompt', required: true },
    { role: 'agent', description: 'Which AI model (claude, gpt, etc)', required: false },
    { role: 'source', description: 'Context or document to reference', required: false },
    { role: 'destination', description: 'Where to put the response', required: false },
    { role: 'manner', description: 'Response style (bullets, json, etc)', required: false },
    { role: 'constraint', description: 'Token limit, temperature, etc', required: false },
  ],
};

export const summarizeSchema: CommandSchema = {
  action: 'summarize',
  description: 'Summarize content using AI',
  category: 'ai',
  primaryRole: 'patient',
  roles: [
    { role: 'patient', description: 'Content to summarize', required: true },
    { role: 'quantity', description: 'Length (sentences, words, paragraphs)', required: false },
    { role: 'manner', description: 'Format (bullets, paragraph, tl;dr)', required: false },
    { role: 'destination', description: 'Where to put summary', required: false },
  ],
};

export const analyzeSchema: CommandSchema = {
  action: 'analyze',
  description: 'Analyze content for patterns, sentiment, etc',
  category: 'ai',
  primaryRole: 'patient',
  roles: [
    { role: 'patient', description: 'Content to analyze', required: true },
    { role: 'manner', description: 'Analysis type (sentiment, entities, etc)', required: true },
    { role: 'destination', description: 'Where to put results', required: false },
  ],
};
```

### Database Commands

```typescript
export const querySchema: CommandSchema = {
  action: 'query',
  description: 'Query a database',
  category: 'database',
  primaryRole: 'source',
  roles: [
    { role: 'source', description: 'Table or collection', required: true },
    { role: 'patient', description: 'Columns/fields to select', required: false },
    { role: 'condition', description: 'WHERE clause', required: false },
    { role: 'quantity', description: 'LIMIT', required: false },
    { role: 'manner', description: 'ORDER BY', required: false },
    { role: 'destination', description: 'Result binding', required: false },
  ],
};

export const insertSchema: CommandSchema = {
  action: 'insert',
  description: 'Insert data into database',
  category: 'database',
  primaryRole: 'patient',
  roles: [
    { role: 'patient', description: 'Data to insert', required: true },
    { role: 'destination', description: 'Table or collection', required: true },
  ],
};
```

### Workflow Commands

```typescript
export const scheduleSchema: CommandSchema = {
  action: 'schedule',
  description: 'Schedule future execution',
  category: 'workflow',
  primaryRole: 'patient',
  roles: [
    { role: 'patient', description: 'Action to schedule', required: true },
    { role: 'quantity', description: 'When (delay or cron)', required: true },
    { role: 'frequency', description: 'Repeat interval', required: false },
    { role: 'condition', description: 'Cancel condition', required: false },
  ],
};

export const pipelineSchema: CommandSchema = {
  action: 'pipeline',
  description: 'Chain multiple actions with data flow',
  category: 'workflow',
  primaryRole: 'patient',
  roles: [
    { role: 'source', description: 'Initial input', required: true },
    { role: 'patient', description: 'Processing steps', required: true },
    { role: 'destination', description: 'Final output', required: false },
    { role: 'fallback', description: 'Error handler', required: false },
  ],
};
```

---

## Part 5: Implementation Roadmap

### Phase 1: Foundation (2-3 weeks)

- [ ] Extend `AgentValue` type with service/remote identifiers
- [ ] Add new roles (beneficiary, duration, frequency, constraint, fallback)
- [ ] Create `CodeGenerator` interface and registry
- [ ] Refactor current JS output as `JavaScriptGenerator`

### Phase 2: Core Generators (3-4 weeks)

- [ ] Implement `SQLGenerator` for database commands
- [ ] Implement `RESTGenerator` for API calls
- [ ] Implement `TestGenerator` for test assertions
- [ ] Add generator selection logic based on agent role

### Phase 3: AI Integration (2-3 weeks)

- [ ] Implement `LLMPromptGenerator`
- [ ] Add AI command schemas (ask, summarize, analyze, translate)
- [ ] Create patterns for AI commands in all 4 languages
- [ ] Build executor for LLM API calls

### Phase 4: Advanced Targets (4-6 weeks)

- [ ] Implement `StateMachineGenerator` for XState
- [ ] Implement `WorkflowGenerator` for Temporal/similar
- [ ] Add GraphQL generator
- [ ] IoT/hardware target exploration

### Phase 5: Runtime Composition (2-3 weeks)

- [ ] Build `MultiTargetRuntime` with dynamic routing
- [ ] Implement capability-based target selection
- [ ] Add agent delegation and multi-hop execution
- [ ] Documentation and examples

---

## Appendix: Example Workflows

### Example 1: Full-Stack Data Flow

```hyperscript
-- User submits form
on submit from #user-form
  -- Validate on client
  validate #user-form

  -- Send to server
  server put formData into /api/users

  -- Server triggers database insert
  database insert formData into users

  -- AI generates welcome message
  claude ask "Write a welcome message for ${formData.name}" as friendly
    put result into #welcome-message

  -- Update UI
  show #success-message with fade
```

### Example 2: AI-Powered Analysis

```hyperscript
on click from #analyze-button
  -- Get content
  take text from #article

  -- Parallel AI analysis
  async
    claude analyze text as sentiment put result into #sentiment
    claude summarize text in 3 bullets put result into #summary
    claude ask "Extract key entities" from text as json put result into #entities

  -- Show results
  show #analysis-panel
```

### Example 3: Database Dashboard

```hyperscript
on load
  -- Fetch aggregated stats
  database query orders
    where created > today - 7 days
    as count, sum(total)
    put result into stats

  -- Update charts
  put stats.count into #order-count
  put stats.total into #revenue-total

  -- Real-time updates
  every 30 seconds
    database query orders where created > lastCheck
    append result to #recent-orders
```

---

## Conclusion

This proposal outlines a path from lokascript's current browser-focused JavaScript output to a **universal semantic execution platform**. By:

1. **Activating the agent role** for multi-actor systems
2. **Adding new roles** for temporal and constraint concepts
3. **Implementing the generator pattern** for multi-target output
4. **Creating domain-specific generators** (SQL, LLM, REST, etc.)

...lokascript can become a **human-readable intent language** that bridges the gap between natural language and executable code across diverse platforms.

The semantic schema's linguistic foundation makes it particularly well-suited for this evolution, as thematic roles are universal concepts that map naturally to different execution domains.
