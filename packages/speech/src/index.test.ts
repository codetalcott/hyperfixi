/**
 * `speak` on @hyperfixi/engine: parsed by the module this package exports, run with the Web
 * Speech API mocked (happy-dom has none).
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { api, everything, register } from '@hyperfixi/engine';
import { speak } from './index';

/** What the mocked `speechSynthesis.speak` received, in order. */
const spoken: MockUtterance[] = [];

class MockUtterance {
  rate = 1;
  pitch = 1;
  volume = 1;
  voice: { name: string } | null = null;
  onend: (() => void) | null = null;
  constructor(readonly text: string) {}
}

const voices = [{ name: 'Alice' }, { name: 'Bob' }];

/** End the oldest utterance still speaking, as the browser does when it finishes. */
function finish(): void {
  const next = spoken.find(u => u.onend);
  const end = next?.onend;
  if (next) next.onend = null;
  end?.();
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0));

const parseErrors = (source: string) => api.parse(source).errors.map(e => e.message);

describe('speak', () => {
  it('is not a command until the module is registered', () => {
    register(...everything);
    expect(parseErrors('speak "hi"').length).toBeGreaterThan(0);
  });

  describe('registered', () => {
    beforeAll(() => {
      register(speak);
      Object.assign(globalThis, {
        SpeechSynthesisUtterance: MockUtterance,
        speechSynthesis: {
          getVoices: () => voices,
          speak: (u: MockUtterance) => void spoken.push(u),
        },
      });
    });
    afterEach(() => {
      while (spoken.some(u => u.onend)) finish();
      spoken.length = 0;
      document.body.innerHTML = '';
    });

    it('parses its options, each after its own `with`', () => {
      expect(parseErrors('speak "hi"')).toEqual([]);
      expect(parseErrors('speak "hi" with rate 1.5 with pitch 0.8')).toEqual([]);
      expect(parseErrors('speak "hi" with voice "Alice" with volume 1')).toEqual([]);
      expect(parseErrors('speak "a" + "b" with rate 2 then log 1')).toEqual([]);
    });

    it('names the options it knows when one is wrong', () => {
      const [message] = parseErrors('speak "hi" with tone 2');
      expect(message).toBeDefined();
      for (const option of ['voice', 'rate', 'pitch', 'volume']) expect(message).toContain(option);
    });

    it('speaks the text with the options set on the utterance', async () => {
      const done = api.evaluate(
        'speak "Hello" with rate 1.5 with pitch 0.8 with volume 0.5 with voice "Bob"'
      );
      await settle();
      expect(spoken).toHaveLength(1);
      const [u] = spoken;
      expect(u).toMatchObject({ text: 'Hello', rate: 1.5, pitch: 0.8, volume: 0.5 });
      expect(u?.voice).toBe(voices[1]);
      finish();
      await done;
    });

    it('ignores a voice that is not installed', async () => {
      const done = api.evaluate('speak "Hi" with voice "Nobody"');
      await settle();
      expect(spoken[0]?.voice).toBeNull();
      finish();
      await done;
    });

    it('waits for the utterance to end before the next command', async () => {
      document.body.innerHTML =
        "<button _=\"on click speak 'first' then put 'spoken' into me\">go</button>";
      const button = document.querySelector('button')!;
      api.processNode(button);
      button.click();
      await settle();
      expect(spoken.map(u => u.text)).toEqual(['first']);
      expect(button.textContent).toBe('go');
      finish();
      await settle();
      expect(button.textContent).toBe('spoken');
    });
  });
});
