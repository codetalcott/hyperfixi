# Security Policy

## Supported versions

Fixes go into the latest release line. The packages are versioned together, so that is the
newest major of `@hyperfixi/*`, `@lokascript/*` and `@hyperscript-tools/*` on npm. Older majors
do not get fixes; [MIGRATION.md](./MIGRATION.md) has the steps between them.

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's private vulnerability reporting:
[github.com/codetalcott/hyperfixi/security/advisories/new](https://github.com/codetalcott/hyperfixi/security/advisories/new).

Say what you found, how to reproduce it, and which package and version. This is a small project
with one maintainer: expect an acknowledgement within a week, and a fix or a plan as fast as the
problem warrants.

## What to treat as code

Most questions about this project's security come down to one fact: **hyperscript is code.**

- **A `_`, `script` or `data-script` attribute runs.** So does a `<script type="text/hyperscript">`
  block. Never build one from input you do not control, exactly as you would not build a
  `<script>` or an `onclick` from it. Escaping for HTML is not enough: the text is parsed as a
  program after the browser has unescaped it.
- **The `js` command and feature evaluate JavaScript** (`new Function`), and are the only place
  the engine does. A page with a Content Security Policy that forbids `unsafe-eval` cannot use
  them; the rest of the engine does not need it.
- **`put`, `append`, `morph` and templates insert markup.** A value from outside that reaches
  one of them is inserted as HTML. Write `put it into #out's textContent` for text.
- **A `fetch` URL built from input** is a request the user's browser makes, with the cookies it
  would send.
- **Translation does not change any of this.** `@lokascript/hyperscript-adapter` translates a
  script to English and hands it to the engine; a script in any language is still a script.

## Running what you did not write

- **`<lse-intent>`** (`@hyperfixi/intent-element`) runs an intent described in JSON. Without an
  `allow` attribute the JSON is trusted as the page author's code. With one, only the listed
  actions run and every value must be a plain token; that mode is for JSON from outside, such as
  a model's output. Its [README](./packages/intent-element/README.md) states the limits.
- **`@hyperfixi/mcp-server`** runs on your machine over stdio and is as trusted as the agent
  calling it. Its validation and translation tools parse text and run nothing. Tools outside the
  default set go further: `scan_inventory` reads files under a directory the caller names, and
  the `grail_*` tools run the shell commands written in a `grail.yaml` in the server's working
  directory. Do not start the server inside a repository you do not trust.
- **`@hyperfixi/server-bridge`** generates server code from the routes it finds in HTML. Review
  what it writes, and run it only on HTML you trust.

## For contributors

- `main` is protected: changes land by pull request with the required checks green.
- Dependabot opens dependency updates; secret scanning is on.
- Releases are published from CI with npm provenance.
