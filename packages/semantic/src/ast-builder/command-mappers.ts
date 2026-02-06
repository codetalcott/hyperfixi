/**
 * Command-specific AST Mappers
 *
 * Each command can have a custom mapper that knows how to convert
 * its semantic roles to the appropriate AST structure.
 */

import type { CommandSemanticNode, ActionType, SemanticValue, SemanticRole } from '../types';
import { convertValue } from './value-converters';
import type { ASTBuilder, CommandNode } from './index';
import type { ExpressionNode } from './expression-parser';

// =============================================================================
// Command Mapper Interface
// =============================================================================

/**
 * Result from command mapping, including the AST and any warnings.
 */
export interface CommandMapperResult {
  ast: CommandNode;
  warnings: string[];
}

/**
 * Interface for command-specific AST mappers.
 */
export interface CommandMapper {
  /**
   * The action type this mapper handles.
   */
  readonly action: ActionType;

  /**
   * Convert a CommandSemanticNode to a CommandNode.
   *
   * @param node - The semantic command node
   * @param builder - The AST builder (for recursive building if needed)
   * @returns The AST command node with any warnings, or just the AST node for backward compatibility
   */
  toAST(node: CommandSemanticNode, builder: ASTBuilder): CommandMapperResult | CommandNode;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get a semantic value from a node's roles, returning undefined if not present.
 */
function getRole(node: CommandSemanticNode, role: SemanticRole): SemanticValue | undefined {
  return node.roles.get(role);
}

/**
 * Convert a semantic value to an AST expression, or return undefined.
 *
 * @param node - The semantic node containing roles
 * @param role - The semantic role to extract
 * @param warnings - Optional array to collect warnings
 */
function convertRoleValue(
  node: CommandSemanticNode,
  role: SemanticRole,
  warnings?: string[]
): ExpressionNode | undefined {
  const value = getRole(node, role);
  return value ? convertValue(value, warnings) : undefined;
}

/**
 * Create a basic command node with standard structure.
 * Handles exactOptionalPropertyTypes by not including undefined properties.
 */
function createCommandNode(
  name: string,
  args: ExpressionNode[] = [],
  modifiers?: Record<string, ExpressionNode>,
  options: {
    isBlocking?: boolean;
    implicitTarget?: ExpressionNode;
    semanticRoles?: Record<string, ExpressionNode>;
  } = {}
): CommandNode {
  const result: CommandNode = {
    type: 'command',
    name,
    args,
  };

  // Only add optional properties if they have values (exactOptionalPropertyTypes)
  if (modifiers && Object.keys(modifiers).length > 0) {
    (result as { modifiers: Record<string, ExpressionNode> }).modifiers = modifiers;
  }

  if (options.isBlocking) {
    (result as { isBlocking: boolean }).isBlocking = options.isBlocking;
  }

  if (options.implicitTarget) {
    (result as { implicitTarget: ExpressionNode }).implicitTarget = options.implicitTarget;
  }

  if (options.semanticRoles && Object.keys(options.semanticRoles).length > 0) {
    (result as unknown as Record<string, unknown>)['semanticRoles'] = options.semanticRoles;
  }

  return result;
}

// =============================================================================
// Command Mappers
// =============================================================================

/**
 * Toggle command mapper.
 *
 * Semantic: toggle patient:.active destination:#button
 * AST: { name: 'toggle', args: ['.active'], modifiers: { on: '#button' } }
 */
const toggleMapper: CommandMapper = {
  action: 'toggle',
  toAST(node, _builder) {
    const patient = convertRoleValue(node, 'patient');
    const destination = convertRoleValue(node, 'destination');
    const duration = convertRoleValue(node, 'duration');

    const args: ExpressionNode[] = patient ? [patient] : [];
    const modifiers: Record<string, ExpressionNode> = {};

    if (destination) modifiers['on'] = destination;
    if (duration) modifiers['for'] = duration;

    return createCommandNode('toggle', args, modifiers);
  },
};

/**
 * Add command mapper.
 *
 * Semantic: add patient:.active destination:#button
 * AST: { name: 'add', args: ['.active'], modifiers: { to: '#button' } }
 */
const addMapper: CommandMapper = {
  action: 'add',
  toAST(node, _builder) {
    const patient = convertRoleValue(node, 'patient');
    const destination = convertRoleValue(node, 'destination');

    const args: ExpressionNode[] = patient ? [patient] : [];
    const modifiers: Record<string, ExpressionNode> = {};

    if (destination) modifiers['to'] = destination;

    return createCommandNode('add', args, modifiers);
  },
};

/**
 * Remove command mapper.
 *
 * Semantic: remove patient:.active source:#button
 * AST: { name: 'remove', args: ['.active'], modifiers: { from: '#button' } }
 */
const removeMapper: CommandMapper = {
  action: 'remove',
  toAST(node, _builder) {
    const patient = convertRoleValue(node, 'patient');
    const source = convertRoleValue(node, 'source');

    const args: ExpressionNode[] = patient ? [patient] : [];
    const modifiers: Record<string, ExpressionNode> = {};

    if (source) modifiers['from'] = source;

    return createCommandNode('remove', args, modifiers);
  },
};

/**
 * Set command mapper.
 *
 * Semantic: set destination:#element's value patient:"hello"
 * AST: { name: 'set', args: [#element's value], modifiers: { to: "hello" } }
 *
 * Note: The destination typically includes the property path (e.g., #element's value)
 * and patient is the value being set.
 */
const setMapper: CommandMapper = {
  action: 'set',
  toAST(node, _builder) {
    const destination = convertRoleValue(node, 'destination');
    const patient = convertRoleValue(node, 'patient');

    const args: ExpressionNode[] = [];
    const modifiers: Record<string, ExpressionNode> = {};

    // The destination is typically the property path to set
    if (destination) {
      args.push(destination);
    }

    // The patient is the value being set
    if (patient) modifiers['to'] = patient;

    return createCommandNode('set', args, modifiers);
  },
};

/**
 * Show command mapper.
 */
const showMapper: CommandMapper = {
  action: 'show',
  toAST(node, _builder) {
    const destination = convertRoleValue(node, 'destination');
    const patient = convertRoleValue(node, 'patient');
    const duration = convertRoleValue(node, 'duration');

    const args: ExpressionNode[] = [];
    const modifiers: Record<string, ExpressionNode> = {};

    // Target can be in destination or patient
    const target = destination ?? patient;
    if (target) args.push(target);
    if (duration) modifiers['with'] = duration;

    return createCommandNode('show', args, modifiers);
  },
};

/**
 * Hide command mapper.
 */
const hideMapper: CommandMapper = {
  action: 'hide',
  toAST(node, _builder) {
    const destination = convertRoleValue(node, 'destination');
    const patient = convertRoleValue(node, 'patient');
    const duration = convertRoleValue(node, 'duration');

    const args: ExpressionNode[] = [];
    const modifiers: Record<string, ExpressionNode> = {};

    const target = destination ?? patient;
    if (target) args.push(target);
    if (duration) modifiers['with'] = duration;

    return createCommandNode('hide', args, modifiers);
  },
};

/**
 * Increment command mapper.
 *
 * Semantic: increment patient:#count quantity:5
 * AST: { name: 'increment', args: [#count], modifiers: { by: 5 } }
 */
const incrementMapper: CommandMapper = {
  action: 'increment',
  toAST(node, _builder) {
    const destination = convertRoleValue(node, 'destination');
    const patient = convertRoleValue(node, 'patient');
    const quantity = convertRoleValue(node, 'quantity'); // Amount

    const args: ExpressionNode[] = [];
    const modifiers: Record<string, ExpressionNode> = {};

    const target = destination ?? patient;
    if (target) args.push(target);
    if (quantity) modifiers['by'] = quantity;

    return createCommandNode('increment', args, modifiers);
  },
};

/**
 * Decrement command mapper.
 *
 * Semantic: decrement patient:#count quantity:5
 * AST: { name: 'decrement', args: [#count], modifiers: { by: 5 } }
 */
const decrementMapper: CommandMapper = {
  action: 'decrement',
  toAST(node, _builder) {
    const destination = convertRoleValue(node, 'destination');
    const patient = convertRoleValue(node, 'patient');
    const quantity = convertRoleValue(node, 'quantity');

    const args: ExpressionNode[] = [];
    const modifiers: Record<string, ExpressionNode> = {};

    const target = destination ?? patient;
    if (target) args.push(target);
    if (quantity) modifiers['by'] = quantity;

    return createCommandNode('decrement', args, modifiers);
  },
};

/**
 * Wait command mapper.
 */
const waitMapper: CommandMapper = {
  action: 'wait',
  toAST(node, _builder) {
    const duration = convertRoleValue(node, 'duration');

    const args: ExpressionNode[] = duration ? [duration] : [];

    return createCommandNode('wait', args, undefined, { isBlocking: true });
  },
};

/**
 * Log command mapper.
 *
 * Semantic: log patient:"hello"
 * AST: { name: 'log', args: ["hello"] }
 */
const logMapper: CommandMapper = {
  action: 'log',
  toAST(node, _builder) {
    const patient = convertRoleValue(node, 'patient');

    const args: ExpressionNode[] = [];
    if (patient) args.push(patient);

    return createCommandNode('log', args);
  },
};

/**
 * Put command mapper.
 *
 * Semantic: put patient:"hello" destination:#output method:into
 * AST: { name: 'put', args: ["hello"], modifiers: { into: #output } }
 */
const putMapper: CommandMapper = {
  action: 'put',
  toAST(node, _builder) {
    const patient = convertRoleValue(node, 'patient');
    const destination = convertRoleValue(node, 'destination');
    const method = getRole(node, 'method'); // before, after, into, etc.

    const args: ExpressionNode[] = patient ? [patient] : [];
    const modifiers: Record<string, ExpressionNode> = {};

    if (destination) {
      // Determine the preposition based on method or default to 'into'
      const prep = method?.type === 'literal' ? String(method.value) : 'into';
      modifiers[prep] = destination;
    }

    return createCommandNode('put', args, modifiers);
  },
};

/**
 * Fetch command mapper.
 *
 * Semantic: fetch source:"/api/data" responseType:json method:GET
 * AST: { name: 'fetch', args: ["/api/data"], modifiers: { as: json, with: GET } }
 */
const fetchMapper: CommandMapper = {
  action: 'fetch',
  toAST(node, _builder) {
    const source = convertRoleValue(node, 'source'); // URL
    const method = convertRoleValue(node, 'method'); // GET, POST, etc.
    const responseType = convertRoleValue(node, 'responseType'); // json, text, etc.
    const patient = convertRoleValue(node, 'patient'); // Body

    const args: ExpressionNode[] = source ? [source] : [];
    const modifiers: Record<string, ExpressionNode> = {};

    if (method) modifiers['with'] = method;
    if (responseType) modifiers['as'] = responseType;
    if (patient) modifiers['body'] = patient;

    return createCommandNode('fetch', args, modifiers, { isBlocking: true });
  },
};

/**
 * Append command mapper.
 *
 * Semantic: append patient:"text" destination:#output
 * AST: { name: 'append', args: ["text"], modifiers: { to: #output } }
 */
const appendMapper: CommandMapper = {
  action: 'append',
  toAST(node, _builder) {
    const patient = convertRoleValue(node, 'patient');
    const destination = convertRoleValue(node, 'destination');

    const args: ExpressionNode[] = patient ? [patient] : [];
    const modifiers: Record<string, ExpressionNode> = {};

    if (destination) modifiers['to'] = destination;

    return createCommandNode('append', args, modifiers);
  },
};

/**
 * Prepend command mapper.
 *
 * Semantic: prepend patient:"text" destination:#output
 * AST: { name: 'prepend', args: ["text"], modifiers: { to: #output } }
 */
const prependMapper: CommandMapper = {
  action: 'prepend',
  toAST(node, _builder) {
    const patient = convertRoleValue(node, 'patient');
    const destination = convertRoleValue(node, 'destination');

    const args: ExpressionNode[] = patient ? [patient] : [];
    const modifiers: Record<string, ExpressionNode> = {};

    if (destination) modifiers['to'] = destination;

    return createCommandNode('prepend', args, modifiers);
  },
};

/**
 * Trigger command mapper.
 *
 * Semantic: trigger event:click destination:#button
 * AST: { name: 'trigger', args: [click], modifiers: { on: #button } }
 */
const triggerMapper: CommandMapper = {
  action: 'trigger',
  toAST(node, _builder) {
    const event = convertRoleValue(node, 'event');
    const destination = convertRoleValue(node, 'destination');

    const args: ExpressionNode[] = event ? [event] : [];
    const modifiers: Record<string, ExpressionNode> = {};

    if (destination) modifiers['on'] = destination;

    return createCommandNode('trigger', args, modifiers);
  },
};

/**
 * Send command mapper.
 *
 * Semantic: send event:customEvent destination:#target patient:{detail}
 * AST: { name: 'send', args: [customEvent], modifiers: { to: #target, detail: ... } }
 */
const sendMapper: CommandMapper = {
  action: 'send',
  toAST(node, _builder) {
    const event = convertRoleValue(node, 'event');
    const destination = convertRoleValue(node, 'destination');
    const patient = convertRoleValue(node, 'patient');

    const args: ExpressionNode[] = event ? [event] : [];
    const modifiers: Record<string, ExpressionNode> = {};

    if (destination) modifiers['to'] = destination;
    if (patient) modifiers['detail'] = patient;

    return createCommandNode('send', args, modifiers);
  },
};

/**
 * Go command mapper (navigation).
 *
 * Semantic: go source:/page destination:url
 * AST: { name: 'go', args: [/page], modifiers: { to: url } }
 */
const goMapper: CommandMapper = {
  action: 'go',
  toAST(node, _builder) {
    const source = convertRoleValue(node, 'source');
    const destination = convertRoleValue(node, 'destination');

    const args: ExpressionNode[] = [];
    const modifiers: Record<string, ExpressionNode> = {};

    // Source is the URL/location to navigate to
    if (source) args.push(source);
    if (destination) modifiers['to'] = destination;

    return createCommandNode('go', args, modifiers);
  },
};

/**
 * Transition command mapper.
 *
 * Semantic: transition patient:*background-color goal:'red' duration:500ms destination:#element
 * AST: { name: 'transition', args: [*background-color], modifiers: { to: 'red', over: 500ms, on: #element } }
 */
const transitionMapper: CommandMapper = {
  action: 'transition',
  toAST(node, _builder) {
    const patient = convertRoleValue(node, 'patient');
    const goal = convertRoleValue(node, 'goal');
    const duration = convertRoleValue(node, 'duration');
    const destination = convertRoleValue(node, 'destination');

    const args: ExpressionNode[] = patient ? [patient] : [];
    const modifiers: Record<string, ExpressionNode> = {};

    if (goal) modifiers['to'] = goal;
    if (duration) modifiers['over'] = duration;
    if (destination) modifiers['on'] = destination;

    return createCommandNode('transition', args, modifiers);
  },
};

/**
 * Focus command mapper.
 *
 * Semantic: focus destination:#input
 * AST: { name: 'focus', args: [], modifiers: { on: #input } }
 */
const focusMapper: CommandMapper = {
  action: 'focus',
  toAST(node, _builder) {
    const destination = convertRoleValue(node, 'destination');
    const patient = convertRoleValue(node, 'patient');

    const args: ExpressionNode[] = [];
    const modifiers: Record<string, ExpressionNode> = {};

    // Target can be in destination or patient
    const target = destination ?? patient;
    if (target) args.push(target);

    return createCommandNode('focus', args, modifiers);
  },
};

/**
 * Blur command mapper.
 *
 * Semantic: blur destination:#input
 * AST: { name: 'blur', args: [#input] }
 */
const blurMapper: CommandMapper = {
  action: 'blur',
  toAST(node, _builder) {
    const destination = convertRoleValue(node, 'destination');
    const patient = convertRoleValue(node, 'patient');

    const args: ExpressionNode[] = [];
    const target = destination ?? patient;
    if (target) args.push(target);

    return createCommandNode('blur', args);
  },
};

/**
 * Get command mapper.
 *
 * Semantic: get source:myValue
 * AST: { name: 'get', args: [myValue] }
 */
const getMapper: CommandMapper = {
  action: 'get',
  toAST(node, _builder) {
    const source = convertRoleValue(node, 'source');
    const patient = convertRoleValue(node, 'patient');

    const args: ExpressionNode[] = [];
    const value = source ?? patient;
    if (value) args.push(value);

    return createCommandNode('get', args);
  },
};

/**
 * Take command mapper.
 *
 * Semantic: take patient:.active source:#parent
 * AST: { name: 'take', args: [.active], modifiers: { from: #parent } }
 */
const takeMapper: CommandMapper = {
  action: 'take',
  toAST(node, _builder) {
    const patient = convertRoleValue(node, 'patient');
    const source = convertRoleValue(node, 'source');

    const args: ExpressionNode[] = patient ? [patient] : [];
    const modifiers: Record<string, ExpressionNode> = {};

    if (source) modifiers['from'] = source;

    return createCommandNode('take', args, modifiers);
  },
};

/**
 * Call command mapper.
 *
 * Semantic: call patient:functionName
 * AST: { name: 'call', args: [functionName] }
 */
const callMapper: CommandMapper = {
  action: 'call',
  toAST(node, _builder) {
    const patient = convertRoleValue(node, 'patient');

    const args: ExpressionNode[] = patient ? [patient] : [];

    return createCommandNode('call', args);
  },
};

/**
 * Return command mapper.
 *
 * Semantic: return patient:value
 * AST: { name: 'return', args: [value] }
 */
const returnMapper: CommandMapper = {
  action: 'return',
  toAST(node, _builder) {
    const patient = convertRoleValue(node, 'patient');

    const args: ExpressionNode[] = patient ? [patient] : [];

    return createCommandNode('return', args);
  },
};

/**
 * Halt command mapper.
 *
 * Semantic: halt
 * AST: { name: 'halt', args: [] }
 */
const haltMapper: CommandMapper = {
  action: 'halt',
  toAST(_node, _builder) {
    return createCommandNode('halt', []);
  },
};

/**
 * Throw command mapper.
 *
 * Semantic: throw patient:"error message"
 * AST: { name: 'throw', args: ["error message"] }
 */
const throwMapper: CommandMapper = {
  action: 'throw',
  toAST(node, _builder) {
    const patient = convertRoleValue(node, 'patient');

    const args: ExpressionNode[] = patient ? [patient] : [];

    return createCommandNode('throw', args);
  },
};

/**
 * Settle command mapper.
 *
 * Semantic: settle destination:#element
 * AST: { name: 'settle', args: [#element] }
 */
const settleMapper: CommandMapper = {
  action: 'settle',
  toAST(node, _builder) {
    const destination = convertRoleValue(node, 'destination');
    const patient = convertRoleValue(node, 'patient');

    const args: ExpressionNode[] = [];
    const target = destination ?? patient;
    if (target) args.push(target);

    return createCommandNode('settle', args, undefined, { isBlocking: true });
  },
};

// =============================================================================
// Tier 3: Advanced Commands
// =============================================================================

/**
 * Swap command mapper.
 *
 * Semantic: swap patient:innerHTML destination:#element source:"<p>new</p>"
 * AST: { name: 'swap', args: [innerHTML, "<p>new</p>"], modifiers: { on: #element } }
 */
const swapMapper: CommandMapper = {
  action: 'swap',
  toAST(node, _builder) {
    const patient = convertRoleValue(node, 'patient'); // What to swap (e.g., innerHTML)
    const source = convertRoleValue(node, 'source'); // New content
    const destination = convertRoleValue(node, 'destination'); // Target element
    const style = convertRoleValue(node, 'style'); // Swap strategy (innerHTML, outerHTML, etc.)

    const args: ExpressionNode[] = [];
    const modifiers: Record<string, ExpressionNode> = {};

    if (patient) args.push(patient);
    if (source) args.push(source);
    if (destination) modifiers['on'] = destination;
    if (style) modifiers['with'] = style;

    return createCommandNode('swap', args, modifiers);
  },
};

/**
 * Morph command mapper.
 *
 * Semantic: morph destination:#element source:"<div>new</div>"
 * AST: { name: 'morph', args: ["<div>new</div>"], modifiers: { on: #element } }
 */
const morphMapper: CommandMapper = {
  action: 'morph',
  toAST(node, _builder) {
    const source = convertRoleValue(node, 'source'); // New HTML
    const destination = convertRoleValue(node, 'destination'); // Target element
    const patient = convertRoleValue(node, 'patient');

    const args: ExpressionNode[] = [];
    const modifiers: Record<string, ExpressionNode> = {};

    const content = source ?? patient;
    if (content) args.push(content);
    if (destination) modifiers['on'] = destination;

    return createCommandNode('morph', args, modifiers);
  },
};

/**
 * Clone command mapper.
 *
 * Semantic: clone source:#template destination:#container
 * AST: { name: 'clone', args: [#template], modifiers: { into: #container } }
 */
const cloneMapper: CommandMapper = {
  action: 'clone',
  toAST(node, _builder) {
    const source = convertRoleValue(node, 'source'); // Element to clone
    const destination = convertRoleValue(node, 'destination'); // Where to put clone
    const patient = convertRoleValue(node, 'patient');

    const args: ExpressionNode[] = [];
    const modifiers: Record<string, ExpressionNode> = {};

    const target = source ?? patient;
    if (target) args.push(target);
    if (destination) modifiers['into'] = destination;

    return createCommandNode('clone', args, modifiers);
  },
};

/**
 * Make command mapper.
 *
 * Semantic: make patient:Date
 * AST: { name: 'make', args: [Date] }
 */
const makeMapper: CommandMapper = {
  action: 'make',
  toAST(node, _builder) {
    const patient = convertRoleValue(node, 'patient'); // Constructor/type

    const args: ExpressionNode[] = patient ? [patient] : [];

    return createCommandNode('make', args);
  },
};

/**
 * Measure command mapper.
 *
 * Semantic: measure destination:#element patient:width
 * AST: { name: 'measure', args: [width], modifiers: { of: #element } }
 */
const measureMapper: CommandMapper = {
  action: 'measure',
  toAST(node, _builder) {
    const patient = convertRoleValue(node, 'patient'); // What to measure
    const destination = convertRoleValue(node, 'destination'); // Element
    const source = convertRoleValue(node, 'source');

    const args: ExpressionNode[] = [];
    const modifiers: Record<string, ExpressionNode> = {};

    if (patient) args.push(patient);
    const element = destination ?? source;
    if (element) modifiers['of'] = element;

    return createCommandNode('measure', args, modifiers);
  },
};

/**
 * Tell command mapper.
 *
 * Semantic: tell destination:#element
 * AST: { name: 'tell', args: [#element] }
 */
const tellMapper: CommandMapper = {
  action: 'tell',
  toAST(node, _builder) {
    const destination = convertRoleValue(node, 'destination');
    const patient = convertRoleValue(node, 'patient');

    const args: ExpressionNode[] = [];
    const target = destination ?? patient;
    if (target) args.push(target);

    return createCommandNode('tell', args);
  },
};

/**
 * JS command mapper (inline JavaScript).
 *
 * Semantic: js patient:"console.log('hello')"
 * AST: { name: 'js', args: ["console.log('hello')"] }
 */
const jsMapper: CommandMapper = {
  action: 'js',
  toAST(node, _builder) {
    const patient = convertRoleValue(node, 'patient'); // JS code

    const args: ExpressionNode[] = patient ? [patient] : [];

    return createCommandNode('js', args);
  },
};

/**
 * Async command mapper.
 *
 * Semantic: async
 * AST: { name: 'async', args: [] }
 */
const asyncMapper: CommandMapper = {
  action: 'async',
  toAST(_node, _builder) {
    return createCommandNode('async', []);
  },
};

/**
 * If command mapper.
 *
 * Semantic: if condition:x > 5
 * AST: { name: 'if', args: [], modifiers: { condition: x > 5 } }
 */
const ifMapper: CommandMapper = {
  action: 'if',
  toAST(node, _builder) {
    const condition = convertRoleValue(node, 'condition');

    const args: ExpressionNode[] = condition ? [condition] : [];

    return createCommandNode('if', args);
  },
};

/**
 * Unless command mapper.
 *
 * Semantic: unless condition:x < 5
 * AST: { name: 'unless', args: [x < 5] }
 */
const unlessMapper: CommandMapper = {
  action: 'unless',
  toAST(node, _builder) {
    const condition = convertRoleValue(node, 'condition');

    const args: ExpressionNode[] = condition ? [condition] : [];

    return createCommandNode('unless', args);
  },
};

/**
 * Repeat command mapper.
 *
 * Semantic: repeat quantity:5
 * AST: { name: 'repeat', args: [5] }
 */
const repeatMapper: CommandMapper = {
  action: 'repeat',
  toAST(node, _builder) {
    const quantity = convertRoleValue(node, 'quantity');
    const patient = convertRoleValue(node, 'patient');

    const args: ExpressionNode[] = [];
    const count = quantity ?? patient;
    if (count) args.push(count);

    return createCommandNode('repeat', args);
  },
};

/**
 * For command mapper.
 *
 * Semantic: for patient:item source:items
 * AST: { name: 'for', args: [item], modifiers: { in: items } }
 */
const forMapper: CommandMapper = {
  action: 'for',
  toAST(node, _builder) {
    const patient = convertRoleValue(node, 'patient'); // Loop variable
    const source = convertRoleValue(node, 'source'); // Collection

    const args: ExpressionNode[] = patient ? [patient] : [];
    const modifiers: Record<string, ExpressionNode> = {};

    if (source) modifiers['in'] = source;

    return createCommandNode('for', args, modifiers);
  },
};

/**
 * While command mapper.
 *
 * Semantic: while condition:x < 10
 * AST: { name: 'while', args: [x < 10] }
 */
const whileMapper: CommandMapper = {
  action: 'while',
  toAST(node, _builder) {
    const condition = convertRoleValue(node, 'condition');

    const args: ExpressionNode[] = condition ? [condition] : [];

    return createCommandNode('while', args);
  },
};

/**
 * Continue command mapper.
 *
 * Semantic: continue
 * AST: { name: 'continue', args: [] }
 */
const continueMapper: CommandMapper = {
  action: 'continue',
  toAST(_node, _builder) {
    return createCommandNode('continue', []);
  },
};

/**
 * Default command mapper.
 *
 * Semantic: default patient:myVar source:0
 * AST: { name: 'default', args: [myVar], modifiers: { to: 0 } }
 */
const defaultMapper: CommandMapper = {
  action: 'default',
  toAST(node, _builder) {
    const patient = convertRoleValue(node, 'patient'); // Variable
    const source = convertRoleValue(node, 'source'); // Default value

    const args: ExpressionNode[] = patient ? [patient] : [];
    const modifiers: Record<string, ExpressionNode> = {};

    if (source) modifiers['to'] = source;

    return createCommandNode('default', args, modifiers);
  },
};

/**
 * Init command mapper.
 *
 * Semantic: init
 * AST: { name: 'init', args: [] }
 */
const initMapper: CommandMapper = {
  action: 'init',
  toAST(_node, _builder) {
    return createCommandNode('init', []);
  },
};

/**
 * Behavior command mapper.
 *
 * Semantic: behavior patient:MyBehavior
 * AST: { name: 'behavior', args: [MyBehavior] }
 */
const behaviorMapper: CommandMapper = {
  action: 'behavior',
  toAST(node, _builder) {
    const patient = convertRoleValue(node, 'patient'); // Behavior name

    const args: ExpressionNode[] = patient ? [patient] : [];

    return createCommandNode('behavior', args);
  },
};

/**
 * Install command mapper.
 *
 * Semantic: install patient:MyBehavior destination:#element
 * AST: { name: 'install', args: [MyBehavior], modifiers: { on: #element } }
 */
const installMapper: CommandMapper = {
  action: 'install',
  toAST(node, _builder) {
    const patient = convertRoleValue(node, 'patient'); // Behavior to install
    const destination = convertRoleValue(node, 'destination'); // Target element

    const args: ExpressionNode[] = patient ? [patient] : [];
    const modifiers: Record<string, ExpressionNode> = {};

    if (destination) modifiers['on'] = destination;

    return createCommandNode('install', args, modifiers);
  },
};

/**
 * On command mapper (event handler declaration).
 *
 * Semantic: on event:click
 * AST: { name: 'on', args: [click] }
 */
const onMapper: CommandMapper = {
  action: 'on',
  toAST(node, _builder) {
    const event = convertRoleValue(node, 'event');
    const source = convertRoleValue(node, 'source'); // 'from' clause

    const args: ExpressionNode[] = event ? [event] : [];
    const modifiers: Record<string, ExpressionNode> = {};

    if (source) modifiers['from'] = source;

    return createCommandNode('on', args, modifiers);
  },
};

// =============================================================================
// Mapper Registry
// =============================================================================

const mappers: Map<ActionType, CommandMapper> = new Map([
  // Tier 1: Core commands
  ['toggle', toggleMapper],
  ['add', addMapper],
  ['remove', removeMapper],
  ['set', setMapper],
  ['show', showMapper],
  ['hide', hideMapper],
  ['increment', incrementMapper],
  ['decrement', decrementMapper],
  ['wait', waitMapper],
  ['log', logMapper],
  ['put', putMapper],
  ['fetch', fetchMapper],
  // Tier 2: Content manipulation
  ['append', appendMapper],
  ['prepend', prependMapper],
  ['get', getMapper],
  ['take', takeMapper],
  // Tier 2: Events
  ['trigger', triggerMapper],
  ['send', sendMapper],
  ['on', onMapper],
  // Tier 2: Navigation & DOM
  ['go', goMapper],
  ['transition', transitionMapper],
  ['focus', focusMapper],
  ['blur', blurMapper],
  // Tier 2: Control flow
  ['call', callMapper],
  ['return', returnMapper],
  ['halt', haltMapper],
  ['throw', throwMapper],
  ['settle', settleMapper],
  // Tier 3: Advanced DOM
  ['swap', swapMapper],
  ['morph', morphMapper],
  ['clone', cloneMapper],
  ['measure', measureMapper],
  // Tier 3: Object/Types
  ['make', makeMapper],
  ['tell', tellMapper],
  ['default', defaultMapper],
  // Tier 3: JavaScript integration
  ['js', jsMapper],
  ['async', asyncMapper],
  // Tier 3: Conditionals
  ['if', ifMapper],
  ['unless', unlessMapper],
  // Tier 3: Loops
  ['repeat', repeatMapper],
  ['for', forMapper],
  ['while', whileMapper],
  ['continue', continueMapper],
  // Tier 3: Behaviors
  ['init', initMapper],
  ['behavior', behaviorMapper],
  ['install', installMapper],
]);

/**
 * Get the command mapper for an action type.
 *
 * @param action - The action type
 * @returns The mapper, or undefined if no specific mapper exists
 */
export function getCommandMapper(action: ActionType): CommandMapper | undefined {
  return mappers.get(action);
}

/**
 * Register a custom command mapper.
 *
 * @param mapper - The command mapper to register
 */
export function registerCommandMapper(mapper: CommandMapper): void {
  mappers.set(mapper.action, mapper);
}

/**
 * Get all registered command mappers.
 */
export function getRegisteredMappers(): Map<ActionType, CommandMapper> {
  return new Map(mappers);
}
