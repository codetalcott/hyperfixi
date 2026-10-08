/**
 * `… when <condition>` on a hand-crafted add, remove, hide or show pattern.
 */
import type { ActionType, LanguagePattern, PatternToken } from '../types';
import { getSchema } from '../generators/command-schemas';
import { buildRoleToken } from '../generators/pattern-generator';
import { tryGetProfile } from '../registry';

/**
 * Give each of `language`'s hand-crafted `command` patterns the schema's
 * optional `when <condition>` (whenConditionRole in command-schemas.ts), as
 * set's dispatcher gives its own a trailing scope. A hand-crafted pattern
 * outranks the generated one, so without the group de read `zeigen ich mit
 * opacity` and left `wenn es passt .foo` unread. Built by the generator's own
 * buildRoleToken, so it reads the marker the generated pattern does, and placed
 * where that pattern places it: last after a verb-first command, first in a
 * verb-final language. A pattern that already reads a condition is kept as is.
 */
export function withWhenCondition(
  command: ActionType,
  language: string,
  patterns: LanguagePattern[]
): LanguagePattern[] {
  const spec = getSchema(command)?.roles.find(r => r.role === 'condition');
  const profile = tryGetProfile(language);
  if (!spec || !profile || patterns.length === 0) return patterns;
  const group: PatternToken = {
    type: 'group',
    optional: true,
    tokens: buildRoleToken(spec, profile),
  };
  const first = profile.wordOrder === 'SOV';
  const marker = spec.markerOverride?.[language];
  return patterns.map((p): LanguagePattern => {
    if (p.extraction?.condition) return p;
    const tokens = first ? [group, ...p.template.tokens] : [...p.template.tokens, group];
    return {
      ...p,
      template: { ...p.template, tokens },
      extraction: { ...p.extraction, condition: marker ? { marker } : {} },
    };
  });
}
