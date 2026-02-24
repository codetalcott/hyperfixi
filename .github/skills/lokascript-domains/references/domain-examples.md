# Domain Examples

## SQL

```
compile_sql({ query: "select name from users", language: "en" })
  => "SELECT name FROM users"

translate_sql({ query: "select name from users", from: "en", to: "ja" })

validate_sql({ query: "select name from users where age > 18", language: "en" })
  => { valid: true, errors: [] }
```

## BDD

```
compile_bdd({ scenario: "given #button exists", language: "en" })
  => Playwright test with expect(locator).toBeVisible()

compile_bdd({ scenario: "when I click #submit then #result is visible", language: "en" })
  => Multi-step Playwright test
```

## JSX

```
compile_jsx({ code: "element button with class primary", language: "en" })
  => <button className="primary" />

compile_jsx({ code: "component Counter with state count", language: "en" })
  => Full React component with useState
```

## Todo

```
compile_todo({ command: "add buy groceries priority high", language: "en" })
  => { action: "add", task: "buy groceries", priority: "high" }
```

## BehaviorSpec

```
compile_behaviorspec({ spec: "given page /login when I type admin into #user then #submit is enabled", language: "en" })
  => Playwright interaction test with page navigation
```

## LLM Prompts

```
compile_llm({ command: "ask claude to summarize #article as bullets" })
  => LLMPromptSpec JSON

execute_llm({ command: "ask what is the capital of France" })
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
