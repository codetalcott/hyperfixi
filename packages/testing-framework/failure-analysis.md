# Parse Failure Analysis Report

## Summary

- Total patterns: 342
- Failures: 145 (42.4%)
- Success rate: 57.6%

## Common Failure Types

### Parse returned null (145 occurrences)

- Affected languages: ja, ko, ar
- Examples:
  - "私の \*background を クリック で 設定 "red" に"
  - ""<p>New</p>" 前に 私 を クリック で 置く"
  - ""<p>New</p>" 後に 私 を クリック で 置く"
  - "a <div.card/> を クリック で 作る それから それ を #container に 置く"
  - "2s を クリック で 待つ それから 私 を 削除"

## Failure Patterns in Code

- Multi-clause patterns: 61
- Event modifiers: 26
- Style properties: 10
- Conditionals: 14
- Window events: 7
- Complex selectors: 30

## By Language

### KO - 53/114 failures (46.5%)

Common errors:

- Parse returned null or undefined

### JA - 50/114 failures (43.9%)

Common errors:

- Parse returned null or undefined

### AR - 42/114 failures (36.8%)

Common errors:

- Parse returned null or undefined

═══════════════════════════════════════════════════════════════
DETAILED FAILURE BREAKDOWN
═══════════════════════════════════════════════════════════════

KO
────────────────────────────────────────────────────────────
Status: 53/114 failures (46.5% fail, 53.5% pass)

Common Error Types: - Parse returned null or undefined: 53 (100.0%)

Problematic Patterns (first 5): 1. "내 \*background 를 클릭 설정 "red" 에" 2. "a <div.card/> 를 클릭 만들다 그러면 그것 를 넣다 #container 에" 3. "update(value: 42) 를 클릭 보내다 #target 에" 4. "keypress[key=="Enter"] 토글 .active 를 클릭 또는" 5. "I match .active 를 클릭 만약 그러면 .active else 를 제거 그러면 .active 를 추가"

JA
────────────────────────────────────────────────────────────
Status: 50/114 failures (43.9% fail, 56.1% pass)

Common Error Types: - Parse returned null or undefined: 50 (100.0%)

Problematic Patterns (first 5): 1. "私の \*background を クリック で 設定 "red" に" 2. ""<p>New</p>" 前に 私 を クリック で 置く" 3. ""<p>New</p>" 後に 私 を クリック で 置く" 4. "a <div.card/> を クリック で 作る それから それ を #container に 置く" 5. "2s を クリック で 待つ それから 私 を 削除"

AR
────────────────────────────────────────────────────────────
Status: 42/114 failures (36.8% fail, 63.2% pass)

Common Error Types: - Parse returned null or undefined: 42 (100.0%)

Problematic Patterns (first 5): 1. "اصنع a <div.card/> عند نقر ثم ضع هو إلى #container" 2. "انتظر عند نقر transitionend" 3. "انتقال opacity إلى 0 عند نقر 500ms ثم احذف أنا" 4. "انتقال transform إلى "scale(1.2)" عند نقر 300ms" 5. "أو keypress[key=="Enter"] بدل .active عند نقر"

═══════════════════════════════════════════════════════════════
RECOMMENDATIONS
═══════════════════════════════════════════════════════════════

## SOV Language Issues (JA, KO)

Priority Actions:

1. Improve particle detection and positioning
2. Enhance verb conjugation recognition
3. Add support for complex clause patterns

Implementation Files:

- packages/semantic/src/tokenizers/ja.ts (Japanese)
- packages/semantic/src/tokenizers/ko.ts (Korean)
- packages/semantic/src/tokenizers/tr.ts (Turkish)
- packages/semantic/src/parser/semantic-parser.ts

## VSO Language Issues (AR)

Priority Actions:

1. Implement verb-first pattern matching
2. Enhance preposition handling
3. Improve right-to-left text processing

Implementation Files:

- packages/semantic/src/tokenizers/ar.ts
- packages/semantic/src/parser/semantic-parser.ts

## Common Failure Patterns

⚠️ Multi-clause patterns: 61 failures
→ Improve conjunction handling (それから/then/ثم/그러면)
→ Better clause separation logic

⚠️ Event modifiers: 26 failures
→ Improve bracket syntax parsing
→ Add debounced/throttled keyword support

⚠️ Complex selectors: 30 failures
→ Improve closest/first/parent selector parsing
→ Add HTML literal syntax support (<div.class/>)
