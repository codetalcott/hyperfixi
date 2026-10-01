/** A page that only toggles, adds and removes classes: `on` plus three commands. */
import { add, remove, toggle } from '../commands/dom';
import { boot, register } from '../engine';
import { on } from '../on';

register(on, add, remove, toggle);
boot();
