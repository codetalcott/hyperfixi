#!/usr/bin/env node
// Builds dist/: the library entry (ESM) and each browser bundle in src/bundles/ (readable and
// minified; a script-tag product's own name is the minified file), and prints the bundles' sizes. Declarations are emitted by `tsc` after this.
import { build } from 'esbuild';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'));
const shared = {
  bundle: true,
  target: 'es2022',
  logLevel: 'error',
  define: { __ENGINE_VERSION__: JSON.stringify(version) },
};

await build({
  ...shared,
  entryPoints: [join(here, 'src/index.ts')],
  format: 'esm',
  outfile: join(here, 'dist/index.js'),
});

const PRODUCTS = ['hyperfixi-hs'];
const entries = readdirSync(join(here, 'src/bundles')).filter(f => f.endsWith('.ts'));
for (const entry of entries) {
  const name = entry.replace('.ts', '');
  const bundle = { ...shared, entryPoints: [join(here, 'src/bundles', entry)], format: 'iife' };
  // A script-tag product is minified under its own name, as core's `hyperfixi.js` is: the
  // name a page loads is the small file. Its readable build is `<name>.dev.js`.
  const product = PRODUCTS.includes(name);
  const readable = product ? `${name}.dev.js` : `${name}.js`;
  const minified = product ? `${name}.js` : `${name}.min.js`;
  await build({ ...bundle, outfile: join(here, 'dist', readable) });
  await build({ ...bundle, minify: true, outfile: join(here, 'dist', minified) });
  printSize(name, minified);
}

// Extensions: `src/ext/<name>.ts` exports a module named `<name>`, whose value imports come
// from `../kit` only. `ext/<name>.esm.js` takes the kit from `@hyperfixi/engine`, the user's one
// engine. `ext/<name>.js` (minified; readable: `.dev.js`) is for a script tag after the engine:
// it takes the kit from the page's engine (`_hyperscript.kit`) instead of carrying a copy,
// registers its module once per page, and warns when no engine was loaded before it.
const KIT = join(here, 'src/kit');
const kitBuild = await build({
  entryPoints: [`${KIT}.ts`],
  bundle: true,
  format: 'esm',
  write: false,
  metafile: true,
  logLevel: 'error',
});
const kitNames = Object.values(kitBuild.metafile.outputs)[0].exports;
// Each read is pure, so a file keeps only the names its extension uses.
const shim =
  'const kit = (globalThis._hyperscript && globalThis._hyperscript.kit) || {};\n' +
  'const read = name => kit[name];\n' +
  kitNames.map(n => `export const ${n} = /* @__PURE__ */ read('${n}');`).join('\n');

/** `../kit` from an extension → `@hyperfixi/engine` (esm) or the page's kit (script tag). */
const kitPlugin = format => ({
  name: 'kit',
  setup(b) {
    b.onResolve({ filter: /^\.\.?\// }, args => {
      if (!args.importer.startsWith(join(here, 'src/ext'))) return;
      const target = resolve(args.resolveDir, args.path).replace(/\.ts$/, '');
      if (target === KIT)
        return format === 'esm'
          ? { path: '@hyperfixi/engine', external: true }
          : { path: 'kit', namespace: 'kit' };
      if (!target.startsWith(join(here, 'src/ext')))
        return {
          errors: [{ text: `an extension imports values from '../kit' only, not '${args.path}'` }],
        };
    });
    b.onLoad({ filter: /.*/, namespace: 'kit' }, () => ({ contents: shim, loader: 'js' }));
  },
});

const extensions = existsSync(join(here, 'src/ext'))
  ? readdirSync(join(here, 'src/ext')).filter(f => f.endsWith('.ts'))
  : [];
for (const entry of extensions) {
  const name = entry.replace('.ts', '');
  const source = join(here, 'src/ext', entry);
  await build({
    ...shared,
    entryPoints: [source],
    format: 'esm',
    plugins: [kitPlugin('esm')],
    outfile: join(here, 'dist/ext', `${name}.esm.js`),
  });
  const page = `import { ${name} as module } from './${relative(here, source)}';
const hs = globalThis._hyperscript;
if (!hs || !hs.register)
  console.warn('[hyperfixi] ext/${name}.js needs @hyperfixi/engine (hyperfixi-hs.js), loaded before it');
else if (!hs.kit)
  // The engine of a bundle built from ESM (the Vite plugin's) carries no kit: it registers
  // extensions from ESM.
  console.warn("[hyperfixi] ext/${name}.js needs hyperfixi-hs.js; with the Vite plugin, list it: extensions: ['${name}']");
else if (!hs.extensions.has('${name}')) {
  hs.extensions.add('${name}');
  hs.register(module);
}`;
  const tag = {
    ...shared,
    stdin: { contents: page, resolveDir: here, loader: 'js', sourcefile: `ext/${name}.js` },
    format: 'iife',
    plugins: [kitPlugin('iife')],
  };
  await build({ ...tag, outfile: join(here, 'dist/ext', `${name}.dev.js`) });
  await build({ ...tag, minify: true, outfile: join(here, 'dist/ext', `${name}.js`) });
  printSize(`ext/${name}`, `ext/${name}.js`);
}

function printSize(name, file) {
  const min = readFileSync(join(here, 'dist', file));
  const gz = gzipSync(min, { level: 9 }).length;
  console.log(
    `${name.padEnd(10)} ${String(min.length).padStart(7)} min  ${String(gz).padStart(6)} gz`
  );
}
