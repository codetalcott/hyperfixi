# lokascript (name placeholder)

This package exists only to claim the bare `lokascript` name. It exports nothing.

LokaScript is published as scoped packages:

- **[`@lokascript/semantic`](https://www.npmjs.com/package/@lokascript/semantic)** — multilingual semantic parsing (24 languages).
- **[`@hyperfixi/core`](https://www.npmjs.com/package/@hyperfixi/core)** — the LokaScript engine (`import { hyperscript } from '@hyperfixi/core'`).
- **[`@hyperfixi/vite-plugin`](https://www.npmjs.com/package/@hyperfixi/vite-plugin)** — zero-config minimal bundles for Vite projects. With the plugin active, `import 'lokascript'` resolves to a generated virtual module and this package is never loaded.

If this package's error fired inside a Vite project, the plugin is not active in your `vite.config` — that error is the diagnostic, not the disease.

Project home: [github.com/codetalcott/hyperfixi](https://github.com/codetalcott/hyperfixi)
