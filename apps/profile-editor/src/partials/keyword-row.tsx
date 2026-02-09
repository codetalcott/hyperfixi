/**
 * Single keyword editing row.
 */

import type { KeywordTranslation } from '@lokascript/semantic';

interface KeywordRowProps {
  code: string;
  keyword: string;
  translation: KeywordTranslation | undefined;
  hasEdit: boolean;
}

export function KeywordRow({ code, keyword, translation, hasEdit }: KeywordRowProps) {
  const primary = translation?.primary ?? '';
  const alternatives = translation?.alternatives?.join(', ') ?? '';
  const form = translation?.form ?? '';
  const status = !primary ? 'missing' : hasEdit ? 'modified' : 'complete';

  return (
    <tr id={`kw-${keyword}`}>
      <td><code>{keyword}</code></td>
      <td>
        <input
          type="text"
          name="primary"
          value={primary}
          placeholder="translation..."
          _={`on change
              fetch \`/profiles/${code}/keywords/${keyword}\` with method:'POST' and headers:{'Content-Type':'application/json'} and body:JSON.stringify({field:'primary',value:my value}) as html
              then put it into #status-${keyword}
            end
            on input add .modified to me`}
        />
      </td>
      <td>
        <input
          type="text"
          name="alternatives"
          value={alternatives}
          placeholder="alt1, alt2..."
          _={`on change
              fetch \`/profiles/${code}/keywords/${keyword}\` with method:'POST' and headers:{'Content-Type':'application/json'} and body:JSON.stringify({field:'alternatives',value:my value}) as html
              then put it into #status-${keyword}
            end
            on input add .modified to me`}
        />
      </td>
      <td>
        <select
          name="form"
          _={`on change
              fetch \`/profiles/${code}/keywords/${keyword}\` with method:'POST' and headers:{'Content-Type':'application/json'} and body:JSON.stringify({field:'form',value:my value}) as html
              then put it into #status-${keyword}
            end`}
        >
          <option value="" selected={!form}>-</option>
          <option value="base" selected={form === 'base'}>base</option>
          <option value="infinitive" selected={form === 'infinitive'}>infinitive</option>
          <option value="imperative" selected={form === 'imperative'}>imperative</option>
        </select>
      </td>
      <td>
        <span id={`status-${keyword}`} class={`badge ${status}`}>{status}</span>
      </td>
    </tr>
  );
}
