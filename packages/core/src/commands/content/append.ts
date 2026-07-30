/**
 * AppendCommand
 *
 * Adds content to the end of a string, array, Set, or HTML element.
 * Semantics follow upstream _hyperscript's `append`; see `insertion-base.ts`
 * for the dispatch order and the two deliberate divergences (multi-element
 * targets, writable attribute/property targets).
 *
 * Syntax:
 *   append <content>
 *   append <content> to <target>
 */

import {
  ContentInsertionCommand,
  type InsertionCommandInput,
  type InsertionCommandOutput,
} from './insertion-base';
import { commandMeta, command, createFactory, type CommandMetadata } from '../decorators';

export type AppendCommandInput = InsertionCommandInput;
export type AppendCommandOutput = InsertionCommandOutput;

@command({ name: 'append' })
export class AppendCommand extends ContentInsertionCommand {
  static readonly metadata = commandMeta({
    description: 'Add content to the end of a string, array, Set, or HTML element',
    syntax: ['append <content>', 'append <content> to <target>'],
    examples: [
      'append "Hello"',
      'append "World" to greeting',
      'append item to myArray',
      'append "<p>New</p>" to #content',
      'append " (edited)" to #title\'s textContent',
    ],
    sideEffects: ['data-mutation', 'dom-mutation'],
    category: 'content',
    compatibility: 'standard',
  });

  get metadata() {
    return AppendCommand.metadata;
  }

  declare readonly name: string;

  constructor() {
    super('append');
  }
}

export const createAppendCommand = createFactory(AppendCommand);
export default AppendCommand;
