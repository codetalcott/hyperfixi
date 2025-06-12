
/**
 * Generated command registry from hyperscript-lsp database
 */

import type { CommandImplementation } from '@types/core';
import { AddCommand } from '@commands/dom/add';
import { AppendCommand } from '@commands/dom/append';
import { AsyncCommand } from '@commands/async/async';
import { BeepCommand } from '@commands/utility/beep';
import { BreakCommand } from '@commands/control-flow/break';
import { CallCommand } from '@commands/misc/call';
import { ContinueCommand } from '@commands/control-flow/continue';
import { DecrementCommand } from '@commands/data/decrement';
import { DefaultCommand } from '@commands/data/default';
import { FetchCommand } from '@commands/async/fetch';
import { GoCommand } from '@commands/navigation/go';
import { HaltCommand } from '@commands/control-flow/halt';
import { HideCommand } from '@commands/dom/hide';
import { IfCommand } from '@commands/control-flow/if';
import { IncrementCommand } from '@commands/data/increment';
import { JsCommand } from '@commands/advanced/js';
import { LogCommand } from '@commands/utility/log';
import { MakeCommand } from '@commands/utility/make';
import { MeasureCommand } from '@commands/utility/measure';
import { PickCommand } from '@commands/utility/pick';
import { Pseudo-commandsCommand } from '@commands/misc/pseudo-commands';
import { PutCommand } from '@commands/data/put';
import { RemoveCommand } from '@commands/dom/remove';
import { RenderCommand } from '@commands/advanced/render';
import { RepeatCommand } from '@commands/control-flow/repeat';
import { ReturnCommand } from '@commands/control-flow/return';
import { SendCommand } from '@commands/async/send';
import { SetCommand } from '@commands/data/set';
import { SettleCommand } from '@commands/advanced/settle';
import { ShowCommand } from '@commands/dom/show';
import { TakeCommand } from '@commands/utility/take';
import { TellCommand } from '@commands/utility/tell';
import { ThrowCommand } from '@commands/advanced/throw';
import { ToggleCommand } from '@commands/dom/toggle';
import { TransitionCommand } from '@commands/navigation/transition';
import { TriggerCommand } from '@commands/async/trigger';
import { WaitCommand } from '@commands/async/wait';

export const COMMAND_REGISTRY: Record<string, CommandImplementation> = {
  'add': new AddCommand(),
  'append': new AppendCommand(),
  'async': new AsyncCommand(),
  'beep': new BeepCommand(),
  'break': new BreakCommand(),
  'call': new CallCommand(),
  'continue': new ContinueCommand(),
  'decrement': new DecrementCommand(),
  'default': new DefaultCommand(),
  'fetch': new FetchCommand(),
  'go': new GoCommand(),
  'halt': new HaltCommand(),
  'hide': new HideCommand(),
  'if': new IfCommand(),
  'increment': new IncrementCommand(),
  'js': new JsCommand(),
  'log': new LogCommand(),
  'make': new MakeCommand(),
  'measure': new MeasureCommand(),
  'pick': new PickCommand(),
  'pseudo-commands': new Pseudo-commandsCommand(),
  'put': new PutCommand(),
  'remove': new RemoveCommand(),
  'render': new RenderCommand(),
  'repeat': new RepeatCommand(),
  'return': new ReturnCommand(),
  'send': new SendCommand(),
  'set': new SetCommand(),
  'settle': new SettleCommand(),
  'show': new ShowCommand(),
  'take': new TakeCommand(),
  'tell': new TellCommand(),
  'throw': new ThrowCommand(),
  'toggle': new ToggleCommand(),
  'transition': new TransitionCommand(),
  'trigger': new TriggerCommand(),
  'wait': new WaitCommand(),
};

export const getCommand = (name: string): CommandImplementation | undefined => {
  return COMMAND_REGISTRY[name];
};
