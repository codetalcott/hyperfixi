/**
 * Profile detail route — tabbed editor.
 */

import { Elysia } from 'elysia';
import { BaseLayout } from '../layouts/base';
import { CoverageBar } from '../partials/coverage-bar';
import { KeywordRow } from '../partials/keyword-row';
import { MarkerRow } from '../partials/marker-row';
import { getBaseProfile, getEnglishKeywords, getEnglishRoleMarkers, getEnglishReferences } from '../profile-loader';
import { getMergedProfile, getCoverageStats } from '../merge';
import { getEditsForSection, getEditCounts } from '../db';

// =============================================================================
// Tab Content Renderers
// =============================================================================

function KeywordsTab({ code }: { code: string }) {
  const profile = getMergedProfile(code);
  if (!profile) return <p>Profile not found</p>;

  const enKeywords = getEnglishKeywords();
  const edits = getEditsForSection(code, 'keywords');
  const editedFields = new Set(edits.map(e => e.field_path.split('.')[0]));

  return (
    <div>
      <div class="search-container">
        <input
          type="search"
          placeholder="Filter keywords..."
          autocomplete="off"
          _={`on input debounced at 200ms
                set query to my value.toLowerCase()
                then set rows to <tr/> in #keyword-body
                then for row in rows
                  set key to row.querySelector('code')
                  if key is not null and key.textContent.toLowerCase().indexOf(query) >= 0
                    remove .hidden from row
                  else if query is ''
                    remove .hidden from row
                  else
                    add .hidden to row
                  end
                end
              end`}
        />
      </div>
      <table class="keyword-table">
        <thead>
          <tr>
            <th style="width: 15%">Keyword</th>
            <th style="width: 30%">Primary</th>
            <th style="width: 30%">Alternatives</th>
            <th style="width: 10%">Form</th>
            <th style="width: 15%">Status</th>
          </tr>
        </thead>
        <tbody id="keyword-body">
          {enKeywords.map(keyword => (
            <KeywordRow
              code={code}
              keyword={keyword}
              translation={profile.keywords[keyword]}
              hasEdit={editedFields.has(keyword)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarkersTab({ code }: { code: string }) {
  const profile = getMergedProfile(code);
  if (!profile) return <p>Profile not found</p>;

  const enMarkers = getEnglishRoleMarkers();
  const edits = getEditsForSection(code, 'markers');
  const editedFields = new Set(edits.map(e => e.field_path.split('.')[0]));

  return (
    <table class="keyword-table">
      <thead>
        <tr>
          <th style="width: 20%">Role</th>
          <th style="width: 25%">Primary Marker</th>
          <th style="width: 25%">Alternatives</th>
          <th style="width: 15%">Position</th>
          <th style="width: 15%">Status</th>
        </tr>
      </thead>
      <tbody>
        {enMarkers.map(role => {
          const markers = profile.roleMarkers as Record<string, { primary?: string; alternatives?: string[]; position?: string }>;
          return (
            <MarkerRow
              code={code}
              role={role}
              marker={markers[role] as any}
              hasEdit={editedFields.has(role)}
            />
          );
        })}
      </tbody>
    </table>
  );
}

function MetadataTab({ code }: { code: string }) {
  const profile = getMergedProfile(code);
  if (!profile) return <p>Profile not found</p>;

  return (
    <form
      _={`on submit
            halt the event
            set data to {}
            for input in <input/> in me
              set data[input.name] to input.value
            end
            for sel in <select/> in me
              set data[sel.name] to sel.value
            end
            fetch \`/profiles/${code}/metadata\` with method:'POST' and headers:{'Content-Type':'application/json'} and body:JSON.stringify(data) as html
            then put it into #metadata-status
          end`}
    >
      <div class="form-grid">
        <div class="form-group">
          <label>Language Code</label>
          <input type="text" name="code" value={profile.code} disabled />
        </div>
        <div class="form-group">
          <label>Name</label>
          <input type="text" name="name" value={profile.name} />
        </div>
        <div class="form-group">
          <label>Native Name</label>
          <input type="text" name="nativeName" value={profile.nativeName} />
        </div>
        <div class="form-group">
          <label>Direction</label>
          <select name="direction">
            <option value="ltr" selected={profile.direction === 'ltr'}>LTR</option>
            <option value="rtl" selected={profile.direction === 'rtl'}>RTL</option>
          </select>
        </div>
        <div class="form-group">
          <label>Word Order</label>
          <select name="wordOrder">
            {['SVO', 'SOV', 'VSO', 'VOS', 'OSV', 'OVS'].map(wo => (
              <option value={wo} selected={profile.wordOrder === wo}>{wo}</option>
            ))}
          </select>
        </div>
        <div class="form-group">
          <label>Marking Strategy</label>
          <select name="markingStrategy">
            {['preposition', 'postposition', 'particle', 'case-suffix'].map(ms => (
              <option value={ms} selected={profile.markingStrategy === ms}>{ms}</option>
            ))}
          </select>
        </div>
        <div class="form-group">
          <label>Uses Spaces</label>
          <select name="usesSpaces">
            <option value="true" selected={profile.usesSpaces}>Yes</option>
            <option value="false" selected={!profile.usesSpaces}>No</option>
          </select>
        </div>
        <div class="form-group">
          <label>Default Verb Form</label>
          <select name="defaultVerbForm">
            <option value="" selected={!profile.defaultVerbForm}>-</option>
            <option value="base" selected={profile.defaultVerbForm === 'base'}>base</option>
            <option value="infinitive" selected={profile.defaultVerbForm === 'infinitive'}>infinitive</option>
            <option value="imperative" selected={profile.defaultVerbForm === 'imperative'}>imperative</option>
          </select>
        </div>
      </div>
      <div style="margin-top: 1rem">
        <button type="submit">Save Metadata</button>
        <span id="metadata-status" style="margin-left: 0.5rem"></span>
      </div>
    </form>
  );
}

function ReferencesTab({ code }: { code: string }) {
  const profile = getMergedProfile(code);
  if (!profile) return <p>Profile not found</p>;

  const enRefs = getEnglishReferences();
  const refs = profile.references ?? {};

  return (
    <form
      _={`on submit
            halt the event
            set data to {}
            for input in <input/> in me
              set data[input.name] to input.value
            end
            fetch \`/profiles/${code}/references\` with method:'POST' and headers:{'Content-Type':'application/json'} and body:JSON.stringify(data) as html
            then put it into #refs-status
          end`}
    >
      <div class="form-grid">
        {enRefs.map(ref => (
          <div class="form-group">
            <label>{ref}</label>
            <input type="text" name={ref} value={(refs as Record<string, string>)[ref] ?? ''} placeholder={`${ref}...`} />
          </div>
        ))}
      </div>
      <div style="margin-top: 1rem">
        <button type="submit">Save References</button>
        <span id="refs-status" style="margin-left: 0.5rem"></span>
      </div>
    </form>
  );
}

function VerbTab({ code }: { code: string }) {
  const profile = getMergedProfile(code);
  if (!profile) return <p>Profile not found</p>;

  const verb = profile.verb;

  return (
    <form
      _={`on submit
            halt the event
            set data to {}
            for input in <input/> in me
              set data[input.name] to input.value
            end
            for sel in <select/> in me
              set data[sel.name] to sel.value
            end
            fetch \`/profiles/${code}/verb\` with method:'POST' and headers:{'Content-Type':'application/json'} and body:JSON.stringify(data) as html
            then put it into #verb-status
          end`}
    >
      <div class="form-grid">
        <div class="form-group">
          <label>Position</label>
          <select name="position">
            <option value="start" selected={verb.position === 'start'}>start</option>
            <option value="end" selected={verb.position === 'end'}>end</option>
            <option value="second" selected={verb.position === 'second'}>second (V2)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Subject Drop</label>
          <select name="subjectDrop">
            <option value="false" selected={!verb.subjectDrop}>No</option>
            <option value="true" selected={verb.subjectDrop === true}>Yes</option>
          </select>
        </div>
        <div class="form-group" style="grid-column: span 2">
          <label>Suffixes (comma-separated)</label>
          <input type="text" name="suffixes" value={verb.suffixes?.join(', ') ?? ''} placeholder="e.g. る, て, た" />
        </div>
      </div>
      <div style="margin-top: 1rem">
        <button type="submit">Save Verb Config</button>
        <span id="verb-status" style="margin-left: 0.5rem"></span>
      </div>
    </form>
  );
}

// =============================================================================
// Routes
// =============================================================================

export const profileRoutes = new Elysia({ prefix: '/profiles' })
  .get('/:code', ({ params }) => {
    const { code } = params;
    const profile = getBaseProfile(code);
    if (!profile) {
      return (
        <BaseLayout title="Not Found">
          <h1>Profile not found: {code}</h1>
          <a href="/">Back to dashboard</a>
        </BaseLayout>
      );
    }

    const coverage = getCoverageStats(code);
    const editCounts = getEditCounts();
    const pending = editCounts[code] ?? 0;

    return (
      <BaseLayout title={`${profile.name} (${code})`}>
        <div class="flex-between">
          <div>
            <a href="/" class="muted" style="text-decoration: none">&larr; Languages</a>
            <h1 style="margin-top: 0.25rem">
              {profile.name} <span class="muted" style="font-weight: normal">{profile.nativeName}</span>
            </h1>
          </div>
          {pending > 0 && (
            <button
              class="danger"
              _={`on click
                    if not js(event) window.confirm('Revert all ${pending} pending edits for ${profile.name}?') end
                      halt
                    end
                    fetch \`/profiles/${code}/revert\` with method:'POST' as html
                    then put it into #revert-status
                    then wait 1s
                    then go to '/profiles/${code}'
                  end`}
            >
              Revert {pending} edits
            </button>
          )}
        </div>
        <span id="revert-status"></span>

        <CoverageBar coverage={coverage} label="Overall Coverage" />

        <nav class="tabs" role="tablist">
          <a
            role="tab"
            class="active"
            _={`on click
                  fetch '/profiles/${code}/tab/keywords' as html
                  then put it into #tab-content
                  then remove .active from <a/> in closest nav
                  then add .active to me
                end`}
          >
            Keywords ({coverage.keywords.covered}/{coverage.keywords.total})
          </a>
          <a
            role="tab"
            _={`on click
                  fetch '/profiles/${code}/tab/markers' as html
                  then put it into #tab-content
                  then remove .active from <a/> in closest nav
                  then add .active to me
                end`}
          >
            Role Markers ({coverage.markers.covered}/{coverage.markers.total})
          </a>
          <a
            role="tab"
            _={`on click
                  fetch '/profiles/${code}/tab/metadata' as html
                  then put it into #tab-content
                  then remove .active from <a/> in closest nav
                  then add .active to me
                end`}
          >
            Metadata
          </a>
          <a
            role="tab"
            _={`on click
                  fetch '/profiles/${code}/tab/references' as html
                  then put it into #tab-content
                  then remove .active from <a/> in closest nav
                  then add .active to me
                end`}
          >
            References ({coverage.references.covered}/{coverage.references.total})
          </a>
          <a
            role="tab"
            _={`on click
                  fetch '/profiles/${code}/tab/verb' as html
                  then put it into #tab-content
                  then remove .active from <a/> in closest nav
                  then add .active to me
                end`}
          >
            Verb Config
          </a>
        </nav>

        <div id="tab-content">
          <KeywordsTab code={code} />
        </div>
      </BaseLayout>
    );
  })

  // Tab content partials
  .get('/:code/tab/keywords', ({ params }) => <KeywordsTab code={params.code} />)
  .get('/:code/tab/markers', ({ params }) => <MarkersTab code={params.code} />)
  .get('/:code/tab/metadata', ({ params }) => <MetadataTab code={params.code} />)
  .get('/:code/tab/references', ({ params }) => <ReferencesTab code={params.code} />)
  .get('/:code/tab/verb', ({ params }) => <VerbTab code={params.code} />);
