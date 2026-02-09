/**
 * Audit log route.
 */

import { Elysia } from 'elysia';
import { BaseLayout } from '../layouts/base';
import { getAuditLog, type AuditEntry } from '../db';
import { getAllLanguageCodes } from '../profile-loader';

function AuditTable({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return <p class="muted center">No audit entries yet.</p>;
  }

  return (
    <table class="audit-table">
      <thead>
        <tr>
          <th>Time</th>
          <th>Action</th>
          <th>Language</th>
          <th>Section</th>
          <th>Field</th>
          <th>Detail</th>
        </tr>
      </thead>
      <tbody id="audit-body">
        {entries.map(entry => {
          const actionClass = entry.action === 'edit' ? 'modified'
            : entry.action === 'revert' ? 'missing'
            : 'saved';

          let detail = '';
          if (entry.detail) {
            try {
              const d = JSON.parse(entry.detail);
              if (d.old !== undefined && d.new !== undefined) {
                detail = `${d.old} -> ${d.new}`;
              } else if (d.count !== undefined) {
                detail = `${d.count} edits`;
              } else {
                detail = entry.detail;
              }
            } catch {
              detail = entry.detail;
            }
          }

          return (
            <tr>
              <td class="muted" style="font-size: 0.8rem; white-space: nowrap">
                {entry.created_at}
              </td>
              <td><span class={`badge ${actionClass}`}>{entry.action}</span></td>
              <td><strong>{entry.language}</strong></td>
              <td>{entry.section ?? '-'}</td>
              <td><code>{entry.field_path ?? '-'}</code></td>
              <td class="muted" style="font-size: 0.8rem; max-width: 300px; overflow: hidden; text-overflow: ellipsis">
                {detail}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export const auditRoutes = new Elysia({ prefix: '/audit' })
  .get('/', () => {
    const entries = getAuditLog();
    const codes = getAllLanguageCodes();

    return (
      <BaseLayout title="Audit Log">
        <h1>Audit Log</h1>
        <p class="muted">
          History of all profile changes.
        </p>

        <div style="margin-bottom: 1rem">
          <select
            _="on change
                 if my value is ''
                   fetch '/audit/list' as html
                 else
                   fetch `/audit/list?language=${my value}` as html
                 end
                 then put it into #audit-content
               end"
          >
            <option value="">All Languages</option>
            {codes.map(code => (
              <option value={code}>{code}</option>
            ))}
          </select>
        </div>

        <div id="audit-content">
          <AuditTable entries={entries} />
        </div>
      </BaseLayout>
    );
  })

  .get('/list', ({ query }) => {
    const language = query.language as string | undefined;
    const entries = getAuditLog(language || undefined);
    return <AuditTable entries={entries} />;
  });
