/**
 * @hyperfixi/speech — Web Speech API + prompt() plugin for hyperfixi.
 *
 * Adds three commands from upstream _hyperscript 0.9.90:
 *
 *   speak "text" [with rate N] [with pitch N] [with voice "Name"]
 *   ask "prompt"                   → context.result = user's answer
 *   answer with "text"             → context.result = text (scripted)
 *
 * Installation:
 *
 * ```ts
 * import { createRuntime, installPlugin } from '@hyperfixi/core';
 * import { speechPlugin } from '@hyperfixi/speech';
 *
 * const runtime = createRuntime();
 * installPlugin(runtime, speechPlugin);
 * ```
 */

import type { HyperfixiPlugin, HyperfixiPluginContext } from '@hyperfixi/core';
import { speakCommand, askCommand, answerCommand } from './commands';

export { speakCommand, askCommand, answerCommand };
export type { SpeakCommandInput, AskCommandInput, AnswerCommandInput } from './commands';

/**
 * Plugin object for one-shot installation. Registers three command keywords
 * with the parser and three command implementations with the runtime.
 *
 * Idempotent: re-installing in the same process is a no-op for the parser
 * (keywords are Set-based) and replaces the existing command implementations
 * with identical ones in the runtime registry.
 */
export const speechPlugin: HyperfixiPlugin = {
  name: '@hyperfixi/speech',
  install({ commandRegistry, parserExtensions }: HyperfixiPluginContext) {
    parserExtensions.registerCommand('speak');
    parserExtensions.registerCommand('ask');
    parserExtensions.registerCommand('answer');
    commandRegistry.register(speakCommand as never);
    commandRegistry.register(askCommand as never);
    commandRegistry.register(answerCommand as never);
  },
};

export default speechPlugin;
