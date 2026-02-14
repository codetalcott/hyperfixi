import type { RequestBodyField } from '../types.js';

/**
 * Regex to match <form> blocks and capture inner content.
 * Uses non-greedy matching to handle multiple forms.
 */
const FORM_BLOCK = /<form\b[^>]*>([\s\S]*?)<\/form>/gi;

/**
 * Regex to match input-like elements with a name attribute.
 * Captures: tag name, full attributes string.
 */
const NAMED_FIELD = /<(input|select|textarea)\b([^>]*)\bname\s*=\s*["']([^"']+)["']([^>]*)>/gi;

/** Regex for type attribute */
const TYPE_ATTR = /\btype\s*=\s*["']([^"']+)["']/i;

/** Regex for required attribute */
const REQUIRED_ATTR = /\brequired\b/i;

/** Map HTML input types to our field types */
const TYPE_MAP: Record<string, RequestBodyField['type']> = {
  text: 'string',
  email: 'string',
  password: 'string',
  tel: 'string',
  url: 'string',
  search: 'string',
  hidden: 'string',
  color: 'string',
  date: 'string',
  'datetime-local': 'string',
  month: 'string',
  week: 'string',
  time: 'string',
  number: 'number',
  range: 'number',
  checkbox: 'boolean',
  file: 'file',
};

/**
 * Extract form fields from a <form> block's inner HTML.
 */
export function extractFormFields(formInnerHtml: string): RequestBodyField[] {
  const fields: RequestBodyField[] = [];
  const seen = new Set<string>();

  NAMED_FIELD.lastIndex = 0;
  let match;
  while ((match = NAMED_FIELD.exec(formInnerHtml)) !== null) {
    const tag = match[1].toLowerCase();
    const attrsBefore = match[2];
    const name = match[3];
    const attrsAfter = match[4];
    const allAttrs = attrsBefore + ' ' + attrsAfter;

    if (seen.has(name)) continue;
    seen.add(name);

    let type: RequestBodyField['type'] = 'string';
    if (tag === 'select' || tag === 'textarea') {
      type = 'string';
    } else {
      const typeMatch = allAttrs.match(TYPE_ATTR);
      const inputType = typeMatch ? typeMatch[1].toLowerCase() : 'text';
      type = TYPE_MAP[inputType] ?? 'unknown';
    }

    const required = REQUIRED_ATTR.test(allAttrs);

    fields.push({ name, type, required });
  }

  return fields;
}

/**
 * Find all <form> blocks in HTML content that contain route-implying attributes
 * (hx-post, hx-put, hx-patch, fx-action) and extract their fields.
 *
 * Returns a map from URL path to field list.
 */
export function extractFormBodies(content: string): Map<string, RequestBodyField[]> {
  const result = new Map<string, RequestBodyField[]>();

  FORM_BLOCK.lastIndex = 0;
  let match;
  while ((match = FORM_BLOCK.exec(content)) !== null) {
    const formTag = content.slice(
      match.index,
      match.index + content.slice(match.index).indexOf('>') + 1
    );
    const formBody = match[1];

    // Check for route-implying attributes in the form tag
    const url = extractFormUrl(formTag);
    if (!url) continue;

    const fields = extractFormFields(formBody);
    if (fields.length > 0) {
      result.set(url, fields);
    }
  }

  return result;
}

/**
 * Extract URL from a form tag's route-implying attributes.
 */
function extractFormUrl(formTag: string): string | undefined {
  // hx-post, hx-put, hx-patch
  const hxMatch = formTag.match(/\bhx-(?:post|put|patch)\s*=\s*["']([^"']+)["']/i);
  if (hxMatch) return hxMatch[1];

  // fx-action
  const fxMatch = formTag.match(/\bfx-action\s*=\s*["']([^"']+)["']/i);
  if (fxMatch) return fxMatch[1];

  // hyperscript with send form to
  const hsMatch = formTag.match(/\bsend\s+(?:the\s+)?form\s+to\s+['"]?([^\s'"]+)['"]?/i);
  if (hsMatch) return hsMatch[1];

  return undefined;
}
