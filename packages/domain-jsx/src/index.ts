/**
 * @lokascript/domain-jsx — Multilingual JSX DSL
 *
 * A proof-of-generality JSX/React domain built on @lokascript/framework.
 * Parses JSX component descriptions written in English, Spanish, Japanese,
 * or Arabic, demonstrating that the framework supports SVO, SOV, and VSO
 * word orders for UI component DSLs.
 *
 * @example
 * ```typescript
 * import { createJSXDSL } from '@lokascript/domain-jsx';
 *
 * const jsx = createJSXDSL();
 *
 * // English (SVO)
 * jsx.compile('element div with className "app"', 'en');
 * // → { ok: true, code: '<div className="app" />' }
 *
 * // Spanish (SVO)
 * jsx.compile('renderizar App en root', 'es');
 * // → { ok: true, code: 'createRoot(document.getElementById("root")).render(<App />)' }
 *
 * // Japanese (SOV)
 * jsx.compile('count 初期値 0 状態', 'ja');
 * // → { ok: true, code: 'const [count, setCount] = useState(0)' }
 *
 * // Arabic (VSO)
 * jsx.compile('ارسم App في root', 'ar');
 * // → { ok: true, code: 'createRoot(document.getElementById("root")).render(<App />)' }
 * ```
 */

import { createMultilingualDSL, type MultilingualDSL } from '@lokascript/framework';
import {
  allSchemas,
  elementSchema,
  componentSchema,
  renderSchema,
  stateSchema,
  effectSchema,
  fragmentSchema,
} from './schemas';
import { englishProfile, spanishProfile, japaneseProfile, arabicProfile } from './profiles';
import {
  EnglishJSXTokenizer,
  SpanishJSXTokenizer,
  JapaneseJSXTokenizer,
  ArabicJSXTokenizer,
} from './tokenizers';
import { jsxCodeGenerator } from './generators/jsx-generator';

/**
 * Create a multilingual JSX DSL instance with all 4 supported languages.
 */
export function createJSXDSL(): MultilingualDSL {
  return createMultilingualDSL({
    name: 'JSX',
    schemas: allSchemas,
    languages: [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        tokenizer: new EnglishJSXTokenizer(),
        patternProfile: englishProfile,
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        tokenizer: new SpanishJSXTokenizer(),
        patternProfile: spanishProfile,
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        tokenizer: new JapaneseJSXTokenizer(),
        patternProfile: japaneseProfile,
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        tokenizer: new ArabicJSXTokenizer(),
        patternProfile: arabicProfile,
      },
    ],
    codeGenerator: jsxCodeGenerator,
  });
}

// Re-export schemas for consumers who want to extend
export {
  allSchemas,
  elementSchema,
  componentSchema,
  renderSchema,
  stateSchema,
  effectSchema,
  fragmentSchema,
};
export { englishProfile, spanishProfile, japaneseProfile, arabicProfile } from './profiles';
export { jsxCodeGenerator } from './generators/jsx-generator';
export {
  EnglishJSXTokenizer,
  SpanishJSXTokenizer,
  JapaneseJSXTokenizer,
  ArabicJSXTokenizer,
} from './tokenizers';
