# Domain Examples

## SQL

```
compile_sql({ query: "select name from users", language: "en" })
  => "SELECT name FROM users"

translate_sql({ query: "select name from users", from: "en", to: "ja" })

validate_sql({ query: "select name from users where age > 18", language: "en" })
  => { valid: true, errors: [] }
```

## Todo

```
compile_todo({ command: "add buy groceries priority high", language: "en" })
  => { action: "add", task: "buy groceries", priority: "high" }
```

## BehaviorSpec

One step per line, under a `test "<name>"` header (bdd's `given #x exists` reads too):

```
compile_behaviorspec({ scenario: "test \"Login\"\n  given page /login\n  when user types 'admin' into #user\n  when user clicks on #submit\n  expect #result appears", language: "en" })
  => test('Login', …): page.goto('/login'), fill('admin'), click(), expect(…).toBeVisible()

compile_behaviorspec({ scenario: "given #button exists", language: "en" })
  => await expect(page.locator('#button')).toBeAttached();
```

Check the output has every step: in `@lokascript/domains` 5.0.1, a line of a multi-line spec that does not
parse is dropped with `ok: true` (`then #result is visible`, `when I click #submit`), and `given page <url>`
followed by more text on the same line reads that text as part of the URL.

## LLM Prompts

```
compile_llm({ command: "ask claude to summarize #article as bullets" })
  => LLMPromptSpec JSON

execute_llm({ command: 'ask "what is the capital of France"' })  // a question of several words is quoted
  => Compiles + executes via MCP sampling
```

## FlowScript

```
compile_flow({ pipeline: "fetch /api/users as json into #list" })
  => fetch().then(r => r.json()).then(data => { ... })

compile_flow({ pipeline: "poll /api/status every 5s until result.done" })
  => Polling loop with interval and termination condition
```

## Voice

```
compile_voice({ command: "click #submit", language: "en" })
  => DOM click interaction

compile_voice({ command: "scroll to #footer", language: "en" })
  => Scroll-into-view command
```

## Server Route Extraction

```
extract_routes({ html: '<button _="on click fetch /api/users">Load</button>' })
  => [{ method: "GET", path: "/api/users" }]

generate_server_routes({ html: "...", framework: "express" })
  => Express route scaffolding with stubs
```
