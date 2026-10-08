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
 * set's dispatcher gives its own a trailing scope; builders.ts applies it. A
 * hand-crafted pattern outranks the generated one, so without the group de read
 * `zeigen ich mit opacity` and left `wenn es passt .foo` unread. Built by the
 * generator's own buildRoleToken, so it reads the marker the generated pattern
 * does, last, where that pattern places it. A verb-final language's patterns are
 * kept as they are: there the condition comes first, where no hand-crafted
 * pattern can begin, and the generated one reads it (measured the same either
 * way).
 */
export function withWhenCondition(
  command: ActionType,
  language: string,
  patterns: LanguagePattern[]
): LanguagePattern[] {
  const spec = getSchema(command)?.roles.find(r => r.role === 'condition');
  const profile = tryGetProfile(language);
  if (!spec || !profile || profile.wordOrder === 'SOV') return patterns;
  const group: PatternToken = {
    type: 'group',
    optional: true,
    tokens: buildRoleToken(spec, profile),
  };
  return patterns.map(p => ({
    ...p,
    template: { ...p.template, tokens: [...p.template.tokens, group] },
  }));
}
