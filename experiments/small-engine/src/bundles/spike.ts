/** The spike's bundle: core, `on`, and the commands the spike set covers. */
import { ifCommand, halt, returnCommand, throwCommand } from '../commands/control';
import { add, remove, toggle } from '../commands/dom';
import { send, wait } from '../commands/events';
import { get_, log, pseudoCommand } from '../commands/misc';
import { increment, put, set } from '../commands/setters';
import { conversions } from '../conversions';
import { boot, use } from '../engine';
import { expressionsExtra } from '../expressions-extra';
import { on } from '../on';

use(on, conversions, expressionsExtra, add, remove, toggle, set, increment, put, ifCommand, halt, returnCommand, throwCommand, send, wait, log, get_, pseudoCommand);
boot();
