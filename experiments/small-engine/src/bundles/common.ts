/** The everyday set: class and attribute changes, content, variables, conditions, events, waiting. */
import { halt, ifCommand } from '../commands/control';
import { add, remove, toggle } from '../commands/dom';
import { hideShow } from '../commands/dom-more';
import { send, wait } from '../commands/events';
import { get_, log, pseudoCommand } from '../commands/misc';
import { increment, put, set } from '../commands/setters';
import { boot, register } from '../engine';
import { on } from '../on';

// prettier-ignore
register(on, add, remove, toggle, hideShow, set, put, increment, ifCommand, halt, send, wait, log, get_, pseudoCommand);
boot();
