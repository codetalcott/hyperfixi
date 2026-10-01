/** Size probe: the engine with the `on` feature and no commands. */
import { boot, use } from '../engine';
import { on } from '../on';

use(on);
boot();
