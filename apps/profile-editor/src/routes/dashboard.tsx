/**
 * Dashboard route — language grid with coverage stats.
 */

import { Elysia } from 'elysia';
import { BaseLayout } from '../layouts/base';
import { LanguageCard } from '../partials/language-card';
import { getAllBaseProfiles, getAllLanguageCodes } from '../profile-loader';
import { getCoverageStats } from '../merge';
import { getEditCounts } from '../db';

function LanguageGrid({ filter }: { filter?: string }) {
  const profiles = getAllBaseProfiles();
  const codes = getAllLanguageCodes();
  const editCounts = getEditCounts();

  const filtered = filter
    ? codes.filter(code => {
        const p = profiles[code];
        const q = filter.toLowerCase();
        return (
          code.includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.nativeName.toLowerCase().includes(q) ||
          p.wordOrder.toLowerCase().includes(q)
        );
      })
    : codes;

  // Sort: languages with pending edits first, then by name
  const sorted = [...filtered].sort((a, b) => {
    const aPending = editCounts[a] ?? 0;
    const bPending = editCounts[b] ?? 0;
    if (aPending !== bPending) return bPending - aPending;
    return profiles[a].name.localeCompare(profiles[b].name);
  });

  return (
    <div id="language-grid" class="language-grid">
      {sorted.map(code => (
        <LanguageCard
          code={code}
          profile={profiles[code]}
          coverage={getCoverageStats(code)}
          pendingEdits={editCounts[code] ?? 0}
        />
      ))}
    </div>
  );
}

export const dashboardRoutes = new Elysia()
  .get('/', () => {
    const codes = getAllLanguageCodes();
    const editCounts = getEditCounts();
    const totalEdits = Object.values(editCounts).reduce((a, b) => a + b, 0);

    return (
      <BaseLayout title="Languages">
        <h1>Language Profiles</h1>
        <p class="muted">
          {codes.length} languages | {totalEdits > 0 ? `${totalEdits} pending edits` : 'no pending edits'}
        </p>

        <div class="search-container">
          <input
            type="search"
            id="search"
            name="q"
            placeholder="Filter languages..."
            autocomplete="off"
            _="on input debounced at 300ms
                 fetch `/languages/list?q=${my value}` as html
                 then put it into #language-grid
               end
               on keydown[key=='Escape']
                 set my value to ''
                 then fetch '/languages/list' as html
                 then put it into #language-grid
               end"
          />
        </div>

        <LanguageGrid />
      </BaseLayout>
    );
  })

  .get('/languages/list', ({ query }) => {
    const q = query.q as string | undefined;
    return <LanguageGrid filter={q} />;
  });
