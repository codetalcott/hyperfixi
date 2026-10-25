/** The whole language. A bundle is the list of modules passed to `register()`. */
import { api, boot, register } from '../engine';
import { everything } from '../everything';
import * as kit from '../kit';

register(...everything);
// What an extension file loaded after this bundle calls (`dist/ext/<name>.js`), as
// `_hyperscript.kit`. Only this bundle carries it: on the engine's own `api` it would keep the
// kit's functions in every bundle, used or not (~0.25 KB gzipped, measured 2026-10-25).
Object.assign(api, { kit });
boot();
