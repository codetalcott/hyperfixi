/**
 * Single role marker editing row.
 */

import type { RoleMarker } from '@lokascript/semantic';

interface MarkerRowProps {
  code: string;
  role: string;
  marker: RoleMarker | undefined;
  hasEdit: boolean;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  patient: 'What is acted upon',
  destination: 'Where something goes',
  source: 'Where something comes from',
  style: 'How it happens',
  event: 'Trigger event marker',
  responseType: 'Response format (as)',
  method: 'HTTP method (via)',
};

export function MarkerRow({ code, role, marker, hasEdit }: MarkerRowProps) {
  const primary = marker?.primary ?? '';
  const alternatives = marker?.alternatives?.join(', ') ?? '';
  const position = marker?.position ?? 'before';
  const status = !primary ? 'missing' : hasEdit ? 'modified' : 'complete';

  return (
    <tr id={`marker-${role}`}>
      <td>
        <strong>{role}</strong>
        <br />
        <small class="muted">{ROLE_DESCRIPTIONS[role] ?? ''}</small>
      </td>
      <td>
        <input
          type="text"
          name="primary"
          value={primary}
          placeholder="marker..."
          _={`on change
              fetch \`/profiles/${code}/markers/${role}\` with method:'POST' and headers:{'Content-Type':'application/json'} and body:JSON.stringify({field:'primary',value:my value}) as html
              then put it into #marker-status-${role}
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
              fetch \`/profiles/${code}/markers/${role}\` with method:'POST' and headers:{'Content-Type':'application/json'} and body:JSON.stringify({field:'alternatives',value:my value}) as html
              then put it into #marker-status-${role}
            end
            on input add .modified to me`}
        />
      </td>
      <td>
        <select
          name="position"
          _={`on change
              fetch \`/profiles/${code}/markers/${role}\` with method:'POST' and headers:{'Content-Type':'application/json'} and body:JSON.stringify({field:'position',value:my value}) as html
              then put it into #marker-status-${role}
            end`}
        >
          <option value="before" selected={position === 'before'}>before</option>
          <option value="after" selected={position === 'after'}>after</option>
        </select>
      </td>
      <td>
        <span id={`marker-status-${role}`} class={`badge ${status}`}>{status}</span>
      </td>
    </tr>
  );
}
