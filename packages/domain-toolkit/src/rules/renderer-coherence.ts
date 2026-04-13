/**
 * R10: Renderer-table coherence (opt-in).
 *
 * Some domains ship a natural-language renderer that maintains its own
 * per-language keyword/marker tables separate from the profile data. This
 * rule — when the domain passes `input.renderer` — asserts that:
 *   - Every `commandKeywords[action][lang]` matches `profile.keywords[action].primary`
 *     for that language.
 *   - Every `markers[name][lang]` appears as a markerOverride value somewhere
 *     in the schemas for that language (can't pin to a specific role since
 *     renderer marker names are arbitrary labels).
 *
 * Warnings only. Domains without `input.renderer` get a no-op pass — this
 * rule is inherently opt-in because not every domain has round-trip
 * rendering and not every renderer uses the same table shape.
 *
 * Catches the exact drift we fixed earlier this session: domain-sql's
 * Turkish source marker was `dan` in the `get` schema but `den` in the
 * renderer's MARKERS table. Had this rule existed, it would have warned
 * the moment `get` was added with the wrong Turkish variant.
 */

import type { LintFinding, LintRule } from '../types';

const RULE_ID = 'renderer-coherence';

export const rendererCoherenceRule: LintRule = input => {
  if (!input.renderer) return [];
  const findings: LintFinding[] = [];

  // commandKeywords ↔ profile primaries
  for (const [action, langMap] of Object.entries(input.renderer.commandKeywords)) {
    for (const [lang, rendererWord] of Object.entries(langMap)) {
      const profile = input.profiles.find(p => p.code === lang);
      if (!profile) continue; // lang not registered; R6 handles that
      const profileEntry = profile.keywords[action];
      if (!profileEntry) {
        findings.push({
          rule: RULE_ID,
          severity: 'warning',
          message: `renderer has '${action}' keyword for ${lang} ("${rendererWord}") but profile has no entry for that action`,
          context: { domain: input.name, lang, action, rendererWord },
        });
        continue;
      }
      const profilePrimary = profileEntry.primary;
      const profileAlts = profileEntry.alternatives ?? [];
      if (rendererWord !== profilePrimary && !profileAlts.includes(rendererWord)) {
        findings.push({
          rule: RULE_ID,
          severity: 'warning',
          message: `renderer '${action}' keyword for ${lang} is "${rendererWord}" but profile has primary="${profilePrimary}"${profileAlts.length ? ` (alternatives: ${profileAlts.join(', ')})` : ''}`,
          context: {
            domain: input.name,
            lang,
            action,
            rendererWord,
            profilePrimary,
          },
        });
      }
    }
  }

  // markers ↔ schema markerOverride values (loose check — any role in any
  // schema for that lang must have this marker value somewhere)
  const markerByLang = new Map<string, Set<string>>();
  for (const schema of input.schemas) {
    for (const role of schema.roles) {
      if (!role.markerOverride) continue;
      for (const [lang, word] of Object.entries(role.markerOverride)) {
        const set = markerByLang.get(lang) ?? new Set<string>();
        set.add(word);
        markerByLang.set(lang, set);
      }
    }
  }

  for (const [markerName, langMap] of Object.entries(input.renderer.markers)) {
    for (const [lang, rendererWord] of Object.entries(langMap)) {
      const schemaMarkers = markerByLang.get(lang);
      if (!schemaMarkers) continue; // lang has no markerOverride anywhere; skip
      if (!schemaMarkers.has(rendererWord)) {
        findings.push({
          rule: RULE_ID,
          severity: 'warning',
          message: `renderer marker "${markerName}" in ${lang} is "${rendererWord}" but no schema role has that markerOverride value — likely drift`,
          context: {
            domain: input.name,
            lang,
            markerName,
            rendererWord,
          },
        });
      }
    }
  }

  return findings;
};
