/**
 * `hyperfixi-hs.js`: the script-tag bundle. Hyperscript and nothing else: every module, no
 * htmx attributes, no other languages. It installs `window._hyperscript`, as upstream does,
 * and the same object as `window.hyperfixi`.
 */
import './full';
import { api } from '../engine';

Reflect.set(globalThis, 'hyperfixi', Reflect.get(globalThis, 'hyperfixi') ?? api);
