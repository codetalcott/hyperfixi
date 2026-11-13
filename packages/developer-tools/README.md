# @hyperfixi/developer-tools

Private to this repository; not published. Two things live here.

## Template inventory

Finds every hyperscript (`_`, `hx-on:*`), htmx (`hx-*`) and fixi (`fx-*`) attribute in a
project's templates, and serves a page to browse them and edit one in place.

```bash
npx tsx packages/developer-tools/src/inventory/cli.ts <directory>          # serve on :4200
npx tsx packages/developer-tools/src/inventory/cli.ts <directory> --json   # print the snippets
```

Options: `--port <n>`, `--no-open`, `--no-watch`. From code:

```ts
import { extractSnippetsFromProject, InventoryServer } from '@hyperfixi/developer-tools';

const snippets = await extractSnippetsFromProject('./templates');
```

An edit is written back only if the file is unchanged since the scan (`StaleFileError`,
`ContentMismatchError`).

## Prism highlighter

`./prism-hyperscript-i18n` highlights hyperscript in any of the 24 languages, with keywords from
`@lokascript/i18n`'s dictionaries. The example pages load its browser build
(`dist/prism-hyperscript-i18n/browser.mjs`, through `examples/prism-loader.js`), which is why
CI and the release workflows build this package.

```ts
import Prism from 'prismjs';
import { registerPrismHyperfixi } from '@hyperfixi/developer-tools/prism-hyperscript-i18n';

registerPrismHyperfixi(Prism, { language: 'auto' });
```

## Development

```bash
npm run build --prefix packages/developer-tools
npm test --prefix packages/developer-tools
npm run typecheck --prefix packages/developer-tools
```

The CLI, visual builder, project generator, analyzer, dev server, profiler, migrator and bundle
analyzer this package once held were removed on 2026-11-13 (tag
`archived/developer-tools-2026-11-13`): nothing used them, and the scaffolder and profiler did
not work.
