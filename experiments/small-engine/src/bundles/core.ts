/** Size probe: the engine with the `on` feature and no commands. */
import { boot, register } from '../engine';
import { on } from '../on';

register(on);
boot();
