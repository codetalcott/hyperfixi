# @hyperfixi/speech

Web Speech API + `prompt()` plugin for [hyperfixi](https://github.com/codetalcott/hyperfixi). Adds three commands from upstream `_hyperscript 0.9.90`:

| Command                                   | Purpose                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `speak "<text>" [with <option> <value>]*` | Speaks the text via `window.speechSynthesis`. Optional rate/pitch/voice/volume.                   |
| `ask "<prompt>" [with default "<value>"]` | Calls `window.prompt()` and writes the answer to `result` and `it`.                               |
| `answer with "<value>"`                   | Sets `result` and `it` to the value without prompting — useful for scripted flows and test mocks. |

## Install

```ts
import { createRuntime, installPlugin } from '@hyperfixi/core';
import { speechPlugin } from '@hyperfixi/speech';

const runtime = createRuntime();
installPlugin(runtime, speechPlugin);
```

Re-installing is safe: the plugin registers idempotent command keywords with the parser and replaces the existing command implementations in the runtime registry with identical ones.

## `speak`

```hyperscript
speak "Welcome back"
speak "Hello" with rate 1.5 with pitch 0.8
speak "Bonjour" with voice "Google français"
speak "Loud and clear" with volume 1 with rate 1.2
```

Options (all optional, any combination, in any order):

| Option   | Type   | Notes                                                                                                                  |
| -------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| `rate`   | number | Forwarded to `SpeechSynthesisUtterance.rate`. Browser default 1; valid range typically 0.1 – 10.                       |
| `pitch`  | number | Forwarded to `SpeechSynthesisUtterance.pitch`. Browser default 1; valid range typically 0 – 2.                         |
| `volume` | number | Forwarded to `SpeechSynthesisUtterance.volume`. Browser default 1; valid range 0 – 1.                                  |
| `voice`  | string | Matched against `speechSynthesis.getVoices()` by `.name`. If no voice matches, the utterance uses the browser default. |

Side effects: `context.result` is set to `true` on success, `false` when the Web Speech API is unavailable (Node, restricted contexts). The command never throws on missing browser support — it silently no-ops so the surrounding handler can keep running.

## `ask`

```hyperscript
ask "What's your name?"
put result into #greeting

ask "Username?" with default "guest"
```

Calls `window.prompt(text, defaultValue?)`. The user's answer is written to **both** `context.result` and `context.it`, so the natural follow-up is `put it into ...` or `put result into ...`.

When `window.prompt` isn't available (headless / Node), the command returns `null` without setting `result` — let callers detect "no UI" by checking the value before using it.

## `answer`

```hyperscript
answer with "programmatic value"
-- result and it are now "programmatic value"

answer "bare form also works"
-- the leading `with` is optional
```

`answer` is the scripted counterpart to `ask` — no UI, just sets `result` and `it` to the given value. Useful for:

- Stubbing user input in tests (`answer with "Test User"` to drive a flow that normally reads from `ask`)
- Forwarding a value through `result` without an intermediate `put` step

## Notes on browser support

- `speechSynthesis` is widely available but [voices load asynchronously on some browsers](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices). If `with voice "<name>"` doesn't apply, the named voice may not yet be in `getVoices()`; the utterance falls through to the browser default.
- iOS Safari requires a user gesture (tap/click) before `speechSynthesis.speak()` will produce audio. Calling `speak` from a `DOMContentLoaded` handler will silently fail there — wire it to a button click instead.
- `window.prompt()` is blocked by some browsers in cross-origin iframes; `ask` will return `null` in those contexts.

## API exports

- `speechPlugin` (default export): the `HyperfixiPlugin` to pass to `installPlugin`.
- `speakCommand`, `askCommand`, `answerCommand`: the individual command implementations, exported for advanced wiring (e.g., registering against a custom registry).
- Types: `SpeakCommandInput`, `AskCommandInput`, `AnswerCommandInput`.

## License

MIT
