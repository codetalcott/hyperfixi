/**
 * JSX Code Generator
 *
 * Transforms semantic AST nodes into JSX/React code output.
 * Always generates standard JSX/React syntax regardless of the input language.
 *
 * Generated output examples:
 *  - element   → <div className="app" />
 *  - component → function Button({ text, onClick }) { }
 *  - render    → createRoot(document.getElementById("root")).render(<App />)
 *  - state     → const [count, setCount] = useState(0)
 *  - effect    → useEffect(() => { fetchData(); }, [count])
 *  - fragment  → <><Header /><Footer /></>
 */

import type { SemanticNode, CodeGenerator } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

/** Escape characters for safe interpolation into JS string literals */
function escapeForString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Capitalize first letter for setter name: count → setCount
 */
function toSetterName(name: string): string {
  return 'set' + name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Capitalize first letter for component tags: header → <Header />
 */
function toPascalCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Check if a string looks like it has props (key=value or key="value" pairs).
 */
function parseProps(propsStr: string): string {
  // Already formatted as JSX props (e.g. className "app" → className="app")
  // Split on spaces and pair up key-value
  const parts = propsStr.split(/\s+/);
  const pairs: string[] = [];
  let i = 0;
  while (i < parts.length) {
    const key = parts[i];
    // If next part looks like a value (quoted or numeric), pair them
    if (i + 1 < parts.length) {
      const val = parts[i + 1];
      if (/^["']/.test(val) || /^\d/.test(val)) {
        // Ensure value is quoted for JSX
        const quoted = /^["']/.test(val) ? val : `{${val}}`;
        pairs.push(`${key}=${quoted}`);
        i += 2;
        continue;
      }
    }
    // Standalone prop (boolean attribute)
    pairs.push(key);
    i++;
  }
  return pairs.join(' ');
}

// ---------------------------------------------------------------------------
// Command generators
// ---------------------------------------------------------------------------

function generateElement(node: SemanticNode): string {
  const tagStr = extractRoleValue(node, 'tag') || 'div';
  const propsRaw = extractRoleValue(node, 'props');
  const propsStr = propsRaw ? ' ' + parseProps(propsRaw) : '';
  const childStr = extractRoleValue(node, 'children');

  if (childStr) {
    return `<${tagStr}${propsStr}>${childStr}</${tagStr}>`;
  }
  return `<${tagStr}${propsStr} />`;
}

function generateComponent(node: SemanticNode): string {
  const nameStr = extractRoleValue(node, 'name') || 'Component';
  const propsStr = extractRoleValue(node, 'props');
  const bodyStr = extractRoleValue(node, 'children') || 'null';

  // Build destructured props list
  const propsList = propsStr ? `{ ${propsStr.split(/\s+/).join(', ')} }` : '';

  return `function ${nameStr}(${propsList}) {\n  return ${bodyStr};\n}`;
}

function generateRender(node: SemanticNode): string {
  const componentStr = extractRoleValue(node, 'source') || 'App';
  const targetStr = extractRoleValue(node, 'destination') || 'root';

  return `createRoot(document.getElementById("${escapeForString(targetStr)}")).render(<${escapeForString(componentStr)} />)`;
}

function generateState(node: SemanticNode): string {
  const nameStr = extractRoleValue(node, 'name') || 'value';
  const initialStr = extractRoleValue(node, 'initial') || 'null';

  return `const [${nameStr}, ${toSetterName(nameStr)}] = useState(${initialStr})`;
}

function generateEffect(node: SemanticNode): string {
  const callbackStr = extractRoleValue(node, 'callback') || '() => {}';
  const depsStr = extractRoleValue(node, 'deps');

  // Build deps array
  const depsArray = depsStr ? `[${depsStr.split(/\s+/).join(', ')}]` : '[]';

  return `useEffect(() => { ${callbackStr}(); }, ${depsArray})`;
}

function generateFragment(node: SemanticNode): string {
  const childStr = extractRoleValue(node, 'children');

  if (!childStr) {
    return '<></>';
  }

  // Convert space-separated names to JSX component tags
  const components = childStr
    .split(/\s+/)
    .map(name => `<${toPascalCase(name)} />`)
    .join('');

  return `<>${components}</>`;
}

// ---------------------------------------------------------------------------
// Public generator
// ---------------------------------------------------------------------------

/**
 * JSX code generator implementation.
 */
export const jsxCodeGenerator: CodeGenerator = {
  generate(node: SemanticNode): string {
    switch (node.action) {
      case 'element':
        return generateElement(node);
      case 'component':
        return generateComponent(node);
      case 'render':
        return generateRender(node);
      case 'state':
        return generateState(node);
      case 'effect':
        return generateEffect(node);
      case 'fragment':
        return generateFragment(node);
      default:
        throw new Error(`Unknown JSX command: ${node.action}`);
    }
  },
};
