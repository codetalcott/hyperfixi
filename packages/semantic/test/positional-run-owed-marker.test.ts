/**
 * A positional run must not spend the role marker that terminates it.
 *
 * `matchPositionalRun` recognizes `<positional> <selector> [<marker>
 * <source-selector>]` — `last <.message/> in #chat`. Its optional source clause
 * accepts any keyword/particle/identifier that is not itself positional and not
 * a command verb, which is exactly the shape a VERB-FINAL clause puts around a
 * positional phrase sitting in a MARKED role. bn
 * `নিকটতম .card তে .expanded কে টগল` ("toggle .expanded on closest .card") read
 * `তে .expanded` as "in .expanded", so `toggle-event-bn-sov`'s
 * `[{destination} তে]` group never saw its marker, the entire run fell into
 * `{patient}`, and BOTH roles vanished. Same shape in ja/ko/tr/zh, across the
 * toggle/add/remove positional rows.
 *
 * LOCATIVE_SURFACES cannot decide it — 17 of 22 languages spell a role marker
 * and their own locative alike, so gating on the table fixes ja and not ko. The
 * decisive fact is OWNERSHIP: the enclosing pattern owes a literal at that
 * position, and the run may not spend it.
 *
 * The rule has a second half, and tr is why. tr's destination marker `e` lists
 * `in` among its suffix alternatives, so in `sonuncu <.message/> in #chat e
 * kaydırma` the run's English `in` looks owed — but the real `e` sits right
 * after `#chat`. Refusing there would break a row that worked. So the clause is
 * refused only when the marker is owed AND nothing after the source selector
 * could satisfy the same requirement.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '../src/index';
import type { CommandSemanticNode, SemanticNode } from '../src/types';

function find(node: SemanticNode | null, action: string): CommandSemanticNode | null {
  if (!node) return null;
  let found: CommandSemanticNode | null = null;
  const walk = (n: SemanticNode): void => {
    if (!found && (n as CommandSemanticNode).action === action) found = n as CommandSemanticNode;
    const rec = n as unknown as Record<string, unknown>;
    for (const key of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      const kids = rec[key];
      if (Array.isArray(kids)) kids.forEach(k => walk(k as SemanticNode));
    }
  };
  walk(node);
  return found;
}

function role(node: CommandSemanticNode | null, name: string) {
  return node?.roles.get(name as never) as
    | { type?: string; raw?: string; value?: unknown; implicit?: boolean }
    | undefined;
}

/** The captured expression text, however the value carries it. */
function text(v: { raw?: string; value?: unknown } | undefined): string | undefined {
  return v?.raw ?? (typeof v?.value === 'string' ? v.value : undefined);
}

describe('the run stops at the marker its pattern owes', () => {
  // `toggle .expanded on closest .card` — the positional fills `destination`,
  // and the marker after it belongs to the enclosing pattern, not to the run.
  const cases: ReadonlyArray<readonly [string, string]> = [
    ['bn', 'ক্লিক তে নিকটতম .card তে .expanded কে টগল'],
    ['ja', 'クリック を で 最も近い .card に .expanded を 切り替え'],
    ['ko', '클릭 을 에 가장가까운 .card 에 .expanded 을 토글'],
    ['zh', '一 点击 就 在 最近的 .card 把 .expanded 切换'],
  ];

  it.each(cases)('%s keeps both roles of a positional destination', (language, code) => {
    const node = find(parse(code, language), 'toggle');
    expect(node, `${language}: no toggle parsed out of: ${code}`).not.toBeNull();
    // Pre-fix: destination absent and patient = the whole swallowed run.
    expect(text(role(node, 'destination')), `${language} lost the positional destination`).toBe(
      'closest .card'
    );
    expect(role(node, 'patient')?.value, `${language} lost the patient`).toBe('.expanded');
  });

  it.each([
    ['bn', 'ক্লিক তে পরবর্তী <li/> তে .highlight কে যোগ', 'add', 'next <li/>'],
    ['ja', 'クリック を で 次 <li/> に .highlight を 追加', 'add', 'next <li/>'],
    ['ko', '클릭 을 에 다음 <li/> 에 .highlight 을 추가', 'add', 'next <li/>'],
    ['tr', 'tıklama i üzerinde sonraki <li/> e .highlight i ekle', 'add', 'next <li/>'],
  ] as const)('%s recovers `%s`', (language, code, action, expected) => {
    const node = find(parse(code, language), action);
    expect(node, `${language}: no ${action} parsed`).not.toBeNull();
    expect(text(role(node, 'destination')), `${language} lost the positional destination`).toBe(
      expected
    );
    expect(role(node, 'patient')?.value).toBe('.highlight');
  });

  it.each([
    ['ja', 'クリック を で 前 <li/> から .highlight を 削除', 'previous <li/>'],
    ['ko', '클릭 을 에 이전 <li/> 에서 .highlight 을 제거', 'previous <li/>'],
    ['tr', 'tıklama i üzerinde önceki <li/> den .highlight i kaldır', 'previous <li/>'],
  ] as const)('%s keeps a positional SOURCE and its patient', (language, code, expected) => {
    const node = find(parse(code, language), 'remove');
    expect(node, `${language}: no remove parsed`).not.toBeNull();
    expect(text(role(node, 'source')), `${language} lost the positional source`).toBe(expected);
    expect(role(node, 'patient')?.value).toBe('.highlight');
  });
});

describe('a run whose source clause is genuinely its own still takes it', () => {
  // `scroll to last <.message/> in #chat` — the renderer emits a positional's
  // INTERNAL locative in English, so `in #chat` belongs to the run. The tr row
  // is the one that pins the second half of the rule: tr's `e` lists `in` among
  // its alternatives, so the marker LOOKS owed until you notice the real `e`
  // sitting right after `#chat`.
  const cases: ReadonlyArray<readonly [string, string]> = [
    ['bn', 'ক্লিক তে শেষ <.message/> in #chat তে স্ক্রোল'],
    ['ja', 'クリック を で 最後 <.message/> in #chat に スクロール'],
    ['ko', '클릭 을 에 마지막 <.message/> in #chat 에 스크롤'],
    ['tr', 'tıklama i üzerinde sonuncu <.message/> in #chat e kaydırma'],
  ];

  it.each(cases)('%s keeps `last <.message/> in #chat` whole', (language, code) => {
    const node = find(parse(code, language), 'scroll');
    expect(node, `${language}: no scroll parsed out of: ${code}`).not.toBeNull();
    expect(text(role(node, 'destination')), `${language} truncated the run`).toBe(
      'last <.message/> in #chat'
    );
  });
});
