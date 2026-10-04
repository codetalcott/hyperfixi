# @hyperfixi/speech

The `speak` command for [`@hyperfixi/engine`](../engine/README.md): upstream `_hyperscript`'s
command (0.9.90), as an engine module. It speaks text through the Web Speech API and waits until
the utterance ends.

```hyperscript
speak "Welcome back"
speak "Hello" with rate 1.5 with pitch 0.8
speak "Bonjour" with voice "Google français"
speak "Saved" then put "done" into #status    -- `put` runs once the speech has ended
```

## Install

An engine is the list of modules passed to `register`; add `speak` to it:

```ts
import { boot, everything, register } from '@hyperfixi/engine';
import { speak } from '@hyperfixi/speech';

register(...everything, speak);
boot();
```

The script-tag bundle (`hyperfixi-hs.js`) is a fixed set of modules and does not include it.

## Options

Each option follows its own `with`, in any order:

| Option   | Notes                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------- |
| `voice`  | Matched against `speechSynthesis.getVoices()` by `.name`. A voice that is not installed is ignored. |
| `rate`   | `SpeechSynthesisUtterance.rate`. Browser default 1; valid range typically 0.1 – 10.                 |
| `pitch`  | `SpeechSynthesisUtterance.pitch`. Browser default 1; valid range typically 0 – 2.                   |
| `volume` | `SpeechSynthesisUtterance.volume`. Browser default 1; valid range 0 – 1.                            |

Another word after `with` is a parse error that names the four.

## `ask` and `answer`

Upstream's two dialog commands are in the engine already (its `askAnswer` module, part of
`everything`): `ask "Name?"` prompts and puts the reply in `it`; `answer "Saved"` alerts;
`answer "Save?" with "Yes" or "No"` confirms and puts the choice in `it`.

## Notes on browser support

- Voices [load asynchronously on some browsers](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices):
  a `with voice` given before they load falls through to the default.
- iOS Safari speaks only after a user gesture: run `speak` from a click handler, not on load.
- Where the Web Speech API is missing, `speak` fails the way upstream's does (the handler
  reports the error).

## Exports

- `speak` (also the default export): the module, `(grammar) => void`.
- `SpeakNode`: the type of the parsed command.

## 4.0

Until 4.0 this package was a plugin for `@hyperfixi/core`'s runtime: `speechPlugin`, installed with
`installPlugin`, with its own `ask` (`with default …`) and `answer with "x"`, which set the result
without a dialog. Core's runtime is gone; upstream's `ask` / `answer` are the engine's, and `speak`
behaves as upstream's does (it waits for the speech to end, and no longer sets `result`).

## License

MIT
