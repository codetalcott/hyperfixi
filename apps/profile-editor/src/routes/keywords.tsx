/**
 * Keyword save routes.
 */

import { Elysia } from 'elysia';
import { saveEdit, revertLanguage } from '../db';
import { getMergedProfile } from '../merge';

export const keywordRoutes = new Elysia({ prefix: '/profiles' })
  .post('/:code/keywords/:key', async ({ params, body }) => {
    const { code, key } = params;
    const { field, value } = body as { field: string; value: string };

    // Get current value for audit trail
    const profile = getMergedProfile(code);
    const current = profile?.keywords[key];
    let oldValue: string | null = null;

    if (current) {
      if (field === 'primary') oldValue = current.primary;
      else if (field === 'alternatives') oldValue = current.alternatives?.join(', ') ?? '';
      else if (field === 'form') oldValue = current.form ?? '';
      else if (field === 'normalized') oldValue = current.normalized ?? '';
    }

    saveEdit(code, 'keywords', `${key}.${field}`, oldValue, JSON.stringify(value));

    return <span class="badge modified">saved</span>;
  })

  .post('/:code/markers/:role', async ({ params, body }) => {
    const { code, role } = params;
    const { field, value } = body as { field: string; value: string };

    const profile = getMergedProfile(code);
    const markers = profile?.roleMarkers as Record<string, { primary?: string; alternatives?: string[]; position?: string }> | undefined;
    const current = markers?.[role];
    let oldValue: string | null = null;

    if (current) {
      if (field === 'primary') oldValue = current.primary ?? '';
      else if (field === 'alternatives') oldValue = current.alternatives?.join(', ') ?? '';
      else if (field === 'position') oldValue = current.position ?? '';
    }

    saveEdit(code, 'markers', `${role}.${field}`, oldValue, JSON.stringify(value));

    return <span class="badge modified">saved</span>;
  })

  .post('/:code/metadata', async ({ params, body }) => {
    const { code } = params;
    const data = body as Record<string, string>;

    const profile = getMergedProfile(code);
    if (!profile) return <span class="badge missing">not found</span>;

    // Save each changed metadata field
    const metadataFields = ['name', 'nativeName', 'direction', 'wordOrder', 'markingStrategy', 'usesSpaces', 'defaultVerbForm'];
    let saved = 0;
    for (const field of metadataFields) {
      if (data[field] !== undefined) {
        const currentVal = String((profile as Record<string, unknown>)[field] ?? '');
        if (data[field] !== currentVal) {
          const value = field === 'usesSpaces' ? data[field] === 'true' : data[field];
          saveEdit(code, 'metadata', field, JSON.stringify(currentVal), JSON.stringify(value));
          saved++;
        }
      }
    }

    return <span class="badge saved">{saved > 0 ? `${saved} fields saved` : 'no changes'}</span>;
  })

  .post('/:code/references', async ({ params, body }) => {
    const { code } = params;
    const data = body as Record<string, string>;

    const profile = getMergedProfile(code);
    if (!profile) return <span class="badge missing">not found</span>;

    const refs = profile.references ?? {};
    let saved = 0;
    for (const [key, value] of Object.entries(data)) {
      const currentVal = (refs as Record<string, string>)[key] ?? '';
      if (value !== currentVal) {
        saveEdit(code, 'references', key, JSON.stringify(currentVal), JSON.stringify(value));
        saved++;
      }
    }

    return <span class="badge saved">{saved > 0 ? `${saved} refs saved` : 'no changes'}</span>;
  })

  .post('/:code/verb', async ({ params, body }) => {
    const { code } = params;
    const data = body as Record<string, string>;

    const profile = getMergedProfile(code);
    if (!profile) return <span class="badge missing">not found</span>;

    const verb = profile.verb;
    let saved = 0;

    if (data.position && data.position !== verb.position) {
      saveEdit(code, 'verb', 'position', JSON.stringify(verb.position), JSON.stringify(data.position));
      saved++;
    }
    if (data.subjectDrop !== undefined) {
      const val = data.subjectDrop === 'true';
      if (val !== verb.subjectDrop) {
        saveEdit(code, 'verb', 'subjectDrop', JSON.stringify(verb.subjectDrop), JSON.stringify(val));
        saved++;
      }
    }
    if (data.suffixes !== undefined) {
      const currentSuffixes = verb.suffixes?.join(', ') ?? '';
      if (data.suffixes !== currentSuffixes) {
        saveEdit(code, 'verb', 'suffixes', JSON.stringify(currentSuffixes), JSON.stringify(data.suffixes));
        saved++;
      }
    }

    return <span class="badge saved">{saved > 0 ? `${saved} fields saved` : 'no changes'}</span>;
  })

  .post('/:code/revert', ({ params }) => {
    const { code } = params;
    const count = revertLanguage(code);
    return <span class="badge saved">Reverted {count} edits</span>;
  });
