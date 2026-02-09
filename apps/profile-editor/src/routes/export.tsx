/**
 * Export route — preview and generate TypeScript source files.
 */

import { Elysia } from 'elysia';
import { BaseLayout } from '../layouts/base';
import { getAllLanguageCodes, getBaseProfile } from '../profile-loader';
import { getMergedProfile } from '../merge';
import { getEditCounts, getEditsForLanguage, logExport } from '../db';
import { generateProfileSource } from '../export';

export const exportRoutes = new Elysia({ prefix: '/export' })
  .get('/', () => {
    const codes = getAllLanguageCodes();
    const editCounts = getEditCounts();

    const languagesWithEdits = codes
      .filter(code => (editCounts[code] ?? 0) > 0)
      .map(code => ({
        code,
        profile: getBaseProfile(code)!,
        editCount: editCounts[code],
      }));

    return (
      <BaseLayout title="Export">
        <h1>Export Profiles</h1>
        <p class="muted">
          Generate TypeScript source files from your edits.
        </p>

        {languagesWithEdits.length === 0 ? (
          <div style="padding: 2rem; text-align: center; color: var(--text-muted)">
            <p>No pending edits. Edit some profiles first!</p>
            <a href="/">Go to dashboard</a>
          </div>
        ) : (
          <div class="flow">
            {languagesWithEdits.map(({ code, profile, editCount }) => (
              <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 1rem">
                <div class="flex-between">
                  <div>
                    <h3 style="margin: 0">{profile.name} ({code})</h3>
                    <span class="muted">{editCount} pending edits</span>
                  </div>
                  <div style="display: flex; gap: 0.5rem">
                    <button
                      class="secondary"
                      _={`on click
                            fetch '/export/${code}/preview' as html
                            then put it into #preview-${code}
                            then toggle .hidden on #preview-${code}
                          end`}
                    >
                      Preview
                    </button>
                    <button
                      _={`on click
                            fetch '/export/${code}/generate' with method:'POST' as html
                            then put it into #preview-${code}
                            then remove .hidden from #preview-${code}
                          end`}
                    >
                      Generate TypeScript
                    </button>
                  </div>
                </div>
                <div id={`preview-${code}`} class="hidden" style="margin-top: 1rem"></div>
              </div>
            ))}
          </div>
        )}
      </BaseLayout>
    );
  })

  .get('/:code/preview', ({ params }) => {
    const { code } = params;
    const edits = getEditsForLanguage(code);

    return (
      <div>
        <h4>Pending Edits</h4>
        <table class="audit-table">
          <thead>
            <tr>
              <th>Section</th>
              <th>Field</th>
              <th>Old Value</th>
              <th>New Value</th>
            </tr>
          </thead>
          <tbody>
            {edits.map(edit => (
              <tr>
                <td><span class="chip">{edit.section}</span></td>
                <td><code>{edit.field_path}</code></td>
                <td class="muted">{edit.old_value ?? '-'}</td>
                <td><strong>{edit.new_value}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  })

  .post('/:code/generate', ({ params }) => {
    const { code } = params;
    const source = generateProfileSource(code);

    if (!source) {
      return <p class="muted">Profile not found</p>;
    }

    logExport(code, JSON.stringify({ lines: source.split('\n').length }));

    return (
      <div>
        <div class="flex-between" style="margin-bottom: 0.5rem">
          <h4>Generated TypeScript</h4>
          <button
            class="secondary"
            _={`on click
                  js(event) navigator.clipboard.writeText(
                    document.getElementById('ts-output-${code}').textContent
                  ) end
                  then put 'Copied!' into me
                  then wait 2s
                  then put 'Copy' into me
                end`}
          >
            Copy
          </button>
        </div>
        <pre class="export-preview"><code id={`ts-output-${code}`}>{source}</code></pre>
        <p class="muted" style="font-size: 0.8rem; margin-top: 0.5rem">
          Save to: <code>packages/semantic/src/generators/profiles/{code}.ts</code>
        </p>
      </div>
    );
  });
