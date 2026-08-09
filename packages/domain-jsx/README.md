# @lokascript/domain-jsx

Multilingual JSX/React DSL built on `@lokascript/framework`. Describe React components in 11 natural languages and compile to standard JSX code.

## Supported Languages

| Language | Code | Word Order | Example                            |
| -------- | ---- | ---------- | ---------------------------------- |
| English  | `en` | SVO        | `element div with className "app"` |
| Spanish  | `es` | SVO        | `elemento div con className "app"` |
| Japanese | `ja` | SOV        | `div className で 要素`            |
| Arabic   | `ar` | VSO        | `عنصر div مع className "app"`      |
| Korean   | `ko` | SOV        | `div className 로 요소`            |
| Chinese  | `zh` | SVO        | `元素 div 用 className "app"`      |
| Turkish  | `tr` | SOV        | `div className ile oge`            |
| French   | `fr` | SVO        | `element div avec className "app"` |

## Commands

| Command     | Description                  | English Example                      |
| ----------- | ---------------------------- | ------------------------------------ |
| `element`   | Create a JSX element         | `element div with className "app"`   |
| `component` | Define a function component  | `component Button with text onClick` |
| `render`    | Render into the DOM          | `render App into root`               |
| `state`     | Declare a useState hook      | `state count initial 0`              |
| `effect`    | Declare a useEffect hook     | `effect fetchData on count`          |
| `fragment`  | Group elements in a fragment | `fragment header sidebar footer`     |

## Usage

```typescript
import { createJSXDSL } from '@lokascript/domain-jsx';

const jsx = createJSXDSL();

// Parse
const node = jsx.parse('state count initial 0', 'en');

// Compile to JSX code
const result = jsx.compile('state count initial 0', 'en');
// → const [count, setCount] = useState(0)

// Validate
const validation = jsx.validate('element div', 'en');
// → { valid: true, node: ... }
```

### Multi-Language Examples

```typescript
// Korean (SOV) — verb last
jsx.compile('count 0 초기값 상태', 'ko');
// → const [count, setCount] = useState(0)

// Chinese (SVO)
jsx.compile('渲染 App 到 root', 'zh');
// → createRoot(document.getElementById("root")).render(<App />)

// Japanese (SOV) — verb last
jsx.compile('root に App 描画', 'ja');
// → createRoot(document.getElementById("root")).render(<App />)

// Arabic (VSO) — verb first
jsx.compile('ارسم App في root', 'ar');
// → createRoot(document.getElementById("root")).render(<App />)
```

### TypeScript Output Mode

```typescript
import { createJSXCodeGenerator } from '@lokascript/domain-jsx';

const tsGen = createJSXCodeGenerator({ typescript: true });
const node = jsx.parse('state count initial 0', 'en');
tsGen.generate(node);
// → const [count, setCount] = useState<number>(0)

const compNode = jsx.parse('component Button with text onClick', 'en');
tsGen.generate(compNode);
// → interface ButtonProps {
//     text: string;
//     onClick: () => void;
//   }
//
//   function Button({ text, onClick }: ButtonProps): JSX.Element {
//     return null;
//   }
```

### Natural Language Renderer

Render semantic nodes back to natural-language DSL syntax in any target language:

```typescript
import { renderJSX } from '@lokascript/domain-jsx';

const node = jsx.parse('render App into root', 'en');

renderJSX(node, 'ja'); // → root に App 描画
renderJSX(node, 'es'); // → renderizar App en root
renderJSX(node, 'ko'); // → root 에 App 렌더링
```

### Greedy Role Capture

Props, children, and deps roles capture multiple space-separated tokens:

```typescript
jsx.compile('fragment header sidebar footer', 'en');
// → <><Header /><Sidebar /><Footer /></>

jsx.compile('component Modal with title body footer', 'en');
// → function Modal({ title, body, footer }) { return null; }

jsx.compile('effect fetchData on count userId', 'en');
// → useEffect(() => { fetchData(); }, [count, userId])
```

## API

### `createJSXDSL(): MultilingualDSL`

Create a DSL instance with all 11 languages.

### `createJSXCodeGenerator(options?): CodeGenerator`

Create a code generator. Pass `{ typescript: true }` for TypeScript annotations.

### `renderJSX(node, language): string`

Render a semantic node to natural-language DSL text in the given language.

### `MultilingualDSL` Methods

- `parse(code, language)` — Parse to semantic node
- `compile(code, language)` — Parse and generate JSX code
- `validate(code, language)` — Validate without throwing
- `getSupportedLanguages()` — List language codes
