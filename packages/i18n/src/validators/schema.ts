// packages/i18n/src/validators/schema.ts

export const RequiredCategories = [
  'commands',
  'modifiers',
  'events',
  'logical',
  'temporal',
  'values',
  'attributes'
] as const;

export const RequiredKeys = {
  commands: [
    'on', 'tell', 'trigger', 'send',
    'take', 'put', 'set', 'get', 'add', 'remove', 'toggle', 'hide', 'show',
    'if', 'repeat', 'for', 'while', 'wait', 'fetch', 'call', 'return',
    'make', 'log', 'throw', 'catch'
  ],
  
  modifiers: [
    'to', 'from', 'into', 'with', 'at', 'in', 'of', 'as', 'by',
    'before', 'after', 'over', 'under', 'between'
  ],
  
  events: [
    'click', 'change', 'focus', 'blur', 'keydown', 'keyup',
    'mouseenter', 'mouseleave', 'submit', 'load', 'scroll'
  ],
  
  logical: [
    'and', 'or', 'not', 'is', 'then', 'else', 'end'
  ],
  
  temporal: [
    'seconds', 'milliseconds', 'minutes', 'hours'
  ],
  
  values: [
    'true', 'false', 'null', 'it', 'me', 'my', 'element', 'window', 'document'
  ],
  
  attributes: [
    'class', 'style', 'attribute', 'first', 'last', 'next', 'previous', 'parent', 'children'
  ]
} as const;

export interface DictionarySchema {
  readonly categories: ReadonlyArray<string>;
  readonly requiredKeys: Readonly<Record<string, ReadonlyArray<string>>>;
}

export const schema: DictionarySchema = {
  categories: RequiredCategories,
  requiredKeys: RequiredKeys
};

// Helper type for strict dictionary validation
export type StrictDictionary = {
  [K in typeof RequiredCategories[number]]: Record<string, string>;
};

// Validation helpers
export function isValidCategory(category: string): category is typeof RequiredCategories[number] {
  return RequiredCategories.includes(category as any);
}

export function getRequiredKeysForCategory(category: string): ReadonlyArray<string> {
  return RequiredKeys[category as keyof typeof RequiredKeys] || [];
}

export function getMissingKeys(
  dictionary: Record<string, string>,
  requiredKeys: ReadonlyArray<string>
): string[] {
  return requiredKeys.filter(key => !(key in dictionary));
}

export function getExtraKeys(
  dictionary: Record<string, string>,
  requiredKeys: ReadonlyArray<string>
): string[] {
  const required = new Set(requiredKeys);
  return Object.keys(dictionary).filter(key => !required.has(key));
}
