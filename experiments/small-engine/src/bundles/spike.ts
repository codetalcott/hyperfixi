/** The spike's bundle: every module written so far. A bundle is the list of modules passed to `register()`. */
import { settle, transition, viewTransition } from '../commands/animation';
import { halt, ifCommand, returnCommand, throwCommand } from '../commands/control';
import { add, remove, toggle } from '../commands/dom';
import {
  append,
  hideShow,
  make,
  measure,
  openClose,
  swap,
  take,
  targetCommands,
} from '../commands/dom-more';
import { send, wait } from '../commands/events';
import { js } from '../commands/js';
import { loopControl, repeat, tell } from '../commands/loops';
import { askAnswer, breakpoint, get_, log, pseudoCommand } from '../commands/misc';
import { pick } from '../commands/pick';
import { fetchCommand, go, scroll } from '../commands/platform';
import { defaultCommand, increment, put, set } from '../commands/setters';
import { conversions } from '../conversions';
import { boot, register } from '../engine';
import { expressionsExtra } from '../expressions-extra';
import { behavior, def, init, install, setFeature } from '../features';
import { on } from '../on';

// prettier-ignore
register(
  // features
  on, def, init, behavior, install, setFeature, js,
  // expressions
  conversions, expressionsExtra,
  // commands
  add, remove, toggle, hideShow, take, measure, targetCommands, openClose, make, append, swap,
  set, defaultCommand, increment, put, pick,
  ifCommand, repeat, loopControl, tell, halt, returnCommand, throwCommand,
  send, wait, fetchCommand, go, scroll, transition, settle, viewTransition,
  log, get_, pseudoCommand, askAnswer, breakpoint
);
boot();
