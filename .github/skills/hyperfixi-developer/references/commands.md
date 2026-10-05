<!-- AUTO-GENERATED from packages/mcp-server/src/resources/content.ts -->
<!-- Do not edit directly. Run: npm run generate:skills -->

# Hyperscript Commands Reference

## DOM Manipulation

| Command                                  | Usage                          | Example                                       |
| ---------------------------------------- | ------------------------------ | --------------------------------------------- |
| `toggle`                                 | Toggle class/attribute         | `toggle .active on #menu`                     |
| `add`                                    | Add class/attribute/style      | `add .highlight to me`                        |
| `remove`                                 | Remove class/attribute/element | `remove .error from #form`                    |
| `show`                                   | Show element                   | `show #modal with *opacity`                   |
| `hide`                                   | Hide element                   | `hide me with *opacity`                       |
| `put`                                    | Set element content            | `put "Hello" into #greeting`                  |
| `append`                                 | Add to end                     | `append "<li/>" to #list`                     |
| `put … at start of` / `before` / `after` | Insert content                 | `put "<li/>" at start of #list`               |
| `swap`                                   | Exchange two values            | `swap #a's textContent with #b's textContent` |

## Data Commands

| Command     | Usage                 | Example              |
| ----------- | --------------------- | -------------------- |
| `set`       | Set variable/property | `set :count to 0`    |
| `get`       | Get value             | `get #input's value` |
| `increment` | Add 1                 | `increment :count`   |
| `decrement` | Subtract 1            | `decrement :count`   |

## Events

| Command   | Usage          | Example                   |
| --------- | -------------- | ------------------------- |
| `send`    | Dispatch event | `send refresh to #list`   |
| `trigger` | Trigger event  | `trigger submit on #form` |

## Async

| Command | Usage        | Example              |
| ------- | ------------ | -------------------- |
| `wait`  | Pause        | `wait 500ms`         |
| `fetch` | HTTP request | `fetch /api as json` |

## Control Flow

| Command        | Usage        | Example                                  |
| -------------- | ------------ | ---------------------------------------- |
| `if/else`      | Conditional  | `if me matches .active ... else ... end` |
| `repeat`       | Loop N times | `repeat 5 times ...`                     |
| `for each`     | Iterate      | `for item in items ...`                  |
| `repeat while` | While loop   | `repeat while :loading wait 100ms end`   |

## Navigation

| Command | Usage         | Example            |
| ------- | ------------- | ------------------ |
| `go`    | Navigate      | `go to /dashboard` |
| `focus` | Focus element | `focus #input`     |
| `blur`  | Blur element  | `blur me`          |

## Utility

| Command  | Usage         | Example             |
| -------- | ------------- | ------------------- |
| `log`    | Console log   | `log me`            |
| `call`   | Call function | `call myFunction()` |
| `return` | Exit handler  | `return`            |
