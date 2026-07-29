/**
 * PrependCommand
 *
 * Adds content to the START of a string, array, Set, or HTML element — the
 * mirror of `append`. See `insertion-base.ts` for the shared dispatch order.
 *
 * This is a hyperfixi EXTENSION: upstream _hyperscript has no `prepend` command,
 * only `put <content> at the start of <target>`. Semantics are `append`'s with
 * the insertion end flipped (afterbegin / Array.unshift / prefix concat); Sets
 * are unordered so `add` is used at either end.
 *
 * Syntax:
 *   prepend <content>
 *   prepend <content> to <target>
 */

import {
  ContentInsertionCommand,
  type InsertionCommandInput,
  type InsertionCommandOutput,
} from './insertion-base';
import { commandMeta, command, createFactory, type CommandMetadata } from '../decorators';

export type PrependCommandInput = InsertionCommandInput;
export type PrependCommandOutput = InsertionCommandOutput;

@command({ name: 'prepend', category: 'content' })
export class PrependCommand extends ContentInsertionCommand {
  static readonly metadata = commandMeta({
    description: 'Add content to the start of a string, array, Set, or HTML element',
    syntax: ['prepend <content>', 'prepend <content> to <target>'],
    examples: [
      'prepend "Hello"',
      'prepend "World" to greeting',
      'prepend item to myArray',
      'prepend "<p>First</p>" to #content',
    ],
    sideEffects: ['data-mutation', 'dom-mutation'],
    category: 'content',
    compatibility: 'lokascript-extension',
  });

  get metadata() {
    return PrependCommand.metadata;
  }

  declare readonly name: string;

  constructor() {
    super('prepend');
  }
}

export const createPrependCommand = createFactory(PrependCommand);
export default PrependCommand;
