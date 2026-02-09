/**
 * TypeScript Source Generator
 *
 * Generates TypeScript profile source files that match the exact format
 * of existing profiles in packages/semantic/src/generators/profiles/.
 */

import { getMergedProfile } from './merge';
import type { LanguageProfile } from './profile-loader';

/**
 * Generate TypeScript source code for a profile with all edits applied.
 */
export function generateProfileSource(code: string): string | null {
  const profile = getMergedProfile(code);
  if (!profile) return null;

  const varName = getVariableName(code, profile.name);
  const lines: string[] = [];

  // JSDoc header
  lines.push('/**');
  lines.push(` * ${profile.name} Language Profile`);
  lines.push(' *');
  lines.push(` * ${profile.wordOrder} word order, ${profile.markingStrategy}, ${profile.usesSpaces ? 'space-separated' : 'no spaces between words'}.`);
  lines.push(' */');
  lines.push('');
  lines.push("import type { LanguageProfile } from './types';");
  lines.push('');
  lines.push(`export const ${varName}: LanguageProfile = {`);

  // Metadata
  lines.push(`  code: '${profile.code}',`);
  lines.push(`  name: '${profile.name}',`);
  lines.push(`  nativeName: '${escape(profile.nativeName)}',`);
  lines.push(`  direction: '${profile.direction}',`);
  lines.push(`  wordOrder: '${profile.wordOrder}',`);
  lines.push(`  markingStrategy: '${profile.markingStrategy}',`);
  lines.push(`  usesSpaces: ${profile.usesSpaces},`);

  if (profile.defaultVerbForm) {
    lines.push(`  defaultVerbForm: '${profile.defaultVerbForm}',`);
  }
  if (profile.extends) {
    lines.push(`  extends: '${profile.extends}',`);
  }

  // Verb config
  lines.push('  verb: {');
  lines.push(`    position: '${profile.verb.position}',`);
  if (profile.verb.suffixes && profile.verb.suffixes.length > 0) {
    lines.push(`    suffixes: [${profile.verb.suffixes.map(s => `'${escape(s)}'`).join(', ')}],`);
  }
  if (profile.verb.subjectDrop !== undefined) {
    lines.push(`    subjectDrop: ${profile.verb.subjectDrop},`);
  }
  lines.push('  },');

  // References
  if (profile.references && Object.keys(profile.references).length > 0) {
    lines.push('  references: {');
    for (const [key, value] of Object.entries(profile.references)) {
      lines.push(`    ${key}: '${escape(value)}',`);
    }
    lines.push('  },');
  }

  // Possessive
  if (profile.possessive) {
    lines.push('  possessive: {');
    lines.push(`    marker: '${escape(profile.possessive.marker)}',`);
    lines.push(`    markerPosition: '${profile.possessive.markerPosition}',`);
    if (profile.possessive.usePossessiveAdjectives) {
      lines.push(`    usePossessiveAdjectives: true,`);
    }
    if (profile.possessive.specialForms && Object.keys(profile.possessive.specialForms).length > 0) {
      lines.push('    specialForms: {');
      for (const [key, value] of Object.entries(profile.possessive.specialForms)) {
        lines.push(`      ${key}: '${escape(value)}',`);
      }
      lines.push('    },');
    }
    if (profile.possessive.keywords && Object.keys(profile.possessive.keywords).length > 0) {
      lines.push('    keywords: {');
      for (const [key, value] of Object.entries(profile.possessive.keywords)) {
        lines.push(`      ${maybeQuoteKey(key)}: '${escape(value)}',`);
      }
      lines.push('    },');
    }
    lines.push('  },');
  }

  // Role markers
  const markers = profile.roleMarkers as Record<string, { primary: string; alternatives?: string[]; position: string }>;
  if (Object.keys(markers).length > 0) {
    lines.push('  roleMarkers: {');
    for (const [role, marker] of Object.entries(markers)) {
      if (!marker) continue;
      const parts = [`primary: '${escape(marker.primary)}'`];
      if (marker.alternatives && marker.alternatives.length > 0) {
        parts.push(`alternatives: [${marker.alternatives.map(a => `'${escape(a)}'`).join(', ')}]`);
      }
      parts.push(`position: '${marker.position}'`);
      lines.push(`    ${role}: { ${parts.join(', ')} },`);
    }
    lines.push('  },');
  }

  // Keywords
  lines.push('  keywords: {');
  for (const [key, kw] of Object.entries(profile.keywords)) {
    if (!kw) continue;
    const parts = [`primary: '${escape(kw.primary)}'`];
    if (kw.alternatives && kw.alternatives.length > 0) {
      parts.push(`alternatives: [${kw.alternatives.map(a => `'${escape(a)}'`).join(', ')}]`);
    }
    if (kw.normalized) {
      parts.push(`normalized: '${kw.normalized}'`);
    }
    if (kw.form) {
      parts.push(`form: '${kw.form}'`);
    }
    lines.push(`    ${key}: { ${parts.join(', ')} },`);
  }
  lines.push('  },');

  // Tokenization
  if (profile.tokenization) {
    lines.push('  tokenization: {');
    if (profile.tokenization.particles && profile.tokenization.particles.length > 0) {
      lines.push(`    particles: [${profile.tokenization.particles.map(p => `'${escape(p)}'`).join(', ')}],`);
    }
    if (profile.tokenization.prefixes && profile.tokenization.prefixes.length > 0) {
      lines.push(`    prefixes: [${profile.tokenization.prefixes.map(p => `'${escape(p)}'`).join(', ')}],`);
    }
    if (profile.tokenization.boundaryStrategy) {
      lines.push(`    boundaryStrategy: '${profile.tokenization.boundaryStrategy}',`);
    }
    lines.push('  },');
  }

  // Event handler
  if (profile.eventHandler) {
    lines.push('  eventHandler: {');
    if (profile.eventHandler.keyword) {
      const kw = profile.eventHandler.keyword;
      lines.push(`    keyword: { primary: '${escape(kw.primary)}'${kw.alternatives?.length ? `, alternatives: [${kw.alternatives.map(a => `'${escape(a)}'`).join(', ')}]` : ''} },`);
    }
    if (profile.eventHandler.eventMarker) {
      const em = profile.eventHandler.eventMarker;
      lines.push(`    eventMarker: { primary: '${escape(em.primary)}', position: '${em.position}' },`);
    }
    if (profile.eventHandler.temporalMarkers && profile.eventHandler.temporalMarkers.length > 0) {
      lines.push(`    temporalMarkers: [${profile.eventHandler.temporalMarkers.map(t => `'${escape(t)}'`).join(', ')}],`);
    }
    if (profile.eventHandler.sourceMarker) {
      const sm = profile.eventHandler.sourceMarker;
      lines.push(`    sourceMarker: { primary: '${escape(sm.primary)}', position: '${sm.position}' },`);
    }
    if (profile.eventHandler.conditionalKeyword) {
      const ck = profile.eventHandler.conditionalKeyword;
      lines.push(`    conditionalKeyword: { primary: '${escape(ck.primary)}' },`);
    }
    if (profile.eventHandler.negationMarker) {
      const nm = profile.eventHandler.negationMarker;
      lines.push(`    negationMarker: { primary: '${escape(nm.primary)}', position: '${nm.position}' },`);
    }
    lines.push('  },');
  }

  lines.push('};');
  lines.push('');

  return lines.join('\n');
}

// =============================================================================
// Helpers
// =============================================================================

function getVariableName(code: string, name: string): string {
  // Match existing naming convention: japaneseProfile, spanishProfile, etc.
  const base = name.toLowerCase().replace(/[^a-z]/g, '');
  return `${base}Profile`;
}

function escape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function maybeQuoteKey(key: string): string {
  // Quote keys that aren't valid JS identifiers (e.g., Japanese characters)
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) return key;
  return `'${escape(key)}'`;
}
