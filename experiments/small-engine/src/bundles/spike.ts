/** The spike's bundle: every module written so far. A bundle is the list of modules passed to `use()`. */
import { halt, ifCommand, returnCommand, throwCommand } from '../commands/control';
import { add, remove, toggle } from '../commands/dom';
import { append, hideShow, make, measure, openClose, swap, take, targetCommands } from '../commands/dom-more';
import { send, wait } from '../commands/events';
import { loopControl, repeat, tell } from '../commands/loops';
import { get_, log, pseudoCommand } from '../commands/misc';
import { defaultCommand, increment, put, set } from '../commands/setters';
import { conversions } from '../conversions';
import { boot, use } from '../engine';
import { expressionsExtra } from '../expressions-extra';
import { behavior, def, init, install, setFeature } from '../features';
import { on } from '../on';

use(
  // features
  on, def, init, behavior, install, setFeature,
  // expressions
  conversions, expressionsExtra,
  // commands
  add, remove, toggle, hideShow, take, measure, targetCommands, openClose, make, append, swap,
  set, defaultCommand, increment, put,
  ifCommand, repeat, loopControl, tell, halt, returnCommand, throwCommand,
  send, wait, log, get_, pseudoCommand
);
boot();
