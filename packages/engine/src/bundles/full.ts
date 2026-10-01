/** The whole language. A bundle is the list of modules passed to `register()`. */
import { boot, register } from '../engine';
import { everything } from '../everything';

register(...everything);
boot();
