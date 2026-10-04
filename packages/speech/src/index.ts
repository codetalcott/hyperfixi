/**
 * @hyperfixi/speech — the `speak` command, as a module for `@hyperfixi/engine`.
 *
 *   speak <text> [with voice <name>] [with rate <n>] [with pitch <n>] [with volume <n>]
 *
 * Upstream _hyperscript's command (0.9.90): the text is spoken through the Web Speech API,
 * and the command waits until the utterance ends. A voice that is not installed is ignored.
 *
 * ```ts
 * import { boot, everything, register } from '@hyperfixi/engine';
 * import { speak } from '@hyperfixi/speech';
 *
 * register(...everything, speak);
 * boot();
 * ```
 *
 * `ask` (a prompt) and `answer` (an alert, or a confirm with `with <a> or <b>`) are upstream
 * commands the engine already has (its `askAnswer` module).
 *
 * Until 4.0 this package was a plugin for `@hyperfixi/core`'s runtime (`speechPlugin`), whose
 * `ask` / `answer` differed from upstream's: `answer with "text"` set the result without a
 * dialog. It is now written the way an engine module is, from outside the engine: a function
 * that adds a rule to the grammar it is given.
 */

import { expr, type Cmd, type Ctx, type Expr, type Grammar } from '@hyperfixi/engine';

/** The options `speak` takes, each after its own `with`. */
const OPTIONS = ['voice', 'rate', 'pitch', 'volume'] as const;
type SpeakOption = (typeof OPTIONS)[number];

export interface SpeakNode extends Cmd {
  type: 'speakCommand';
  text: Expr;
  voice?: Expr;
  rate?: Expr;
  pitch?: Expr;
  volume?: Expr;
}

/** The `speak` command. Pass it to `register`. */
export function speak(g: Grammar): void {
  g.commands.speak = (p, _keyword, start) => {
    const text = expr(p);
    const options: Partial<Record<SpeakOption, Expr>> = {};
    while (p.match('with')) {
      const option = OPTIONS.find(name => p.match(name));
      if (!option) return p.expected(...OPTIONS);
      options[option] = expr(p);
    }
    const node: SpeakNode = {
      type: 'speakCommand',
      text,
      ...options,
      start,
      end: p.endPos(),
      run: ctx => say(node, ctx),
    };
    return node;
  };
}

async function say(node: SpeakNode, ctx: Ctx): Promise<void> {
  const [text, voice, rate, pitch, volume] = await Promise.all(
    [node.text, node.voice, node.rate, node.pitch, node.volume].map(e => e?.ev(ctx))
  );
  const utterance = new SpeechSynthesisUtterance(String(text));
  if (voice) {
    const match = speechSynthesis.getVoices().find(v => v.name === voice);
    if (match) utterance.voice = match;
  }
  if (rate != null) utterance.rate = Number(rate);
  if (pitch != null) utterance.pitch = Number(pitch);
  if (volume != null) utterance.volume = Number(volume);
  await new Promise<void>(resolve => {
    utterance.onend = () => resolve();
    speechSynthesis.speak(utterance);
  });
}

export default speak;
