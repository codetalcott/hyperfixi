/**
 * Translation routes for the patterns browser.
 */

import { Elysia } from 'elysia';
import { BaseLayout } from '../layouts/base';
import { getPatterns, getPatternTranslations, getLanguages, type Translation } from '../db';
import { AlignmentBadge } from '../components/alignment-indicator';

export const translationsRoutes = new Elysia({ prefix: '/translations' })
  // Translations explorer page
  .get('/', async ({ headers }) => {
    const patterns = await getPatterns({ limit: 20 });
    const languages = getLanguages();

    // Check if this is a partial request (for SPA navigation)
    const isPartial = headers['hx-request'] === 'true';

    const content = (
      <>
        <h1>Translation Explorer</h1>
        <p class="muted">
          View hyperscript patterns translated to 13 languages with different word orders
        </p>

        <div class="meta" style="margin-bottom: 1rem">
          {languages.map(lang => (
            <chip class={lang.wordOrder.toLowerCase()}>
              {lang.name} ({lang.wordOrder})
            </chip>
          ))}
        </div>

        <table>
          <thead>
            <tr>
              <th>Pattern</th>
              <th>English</th>
              <th>Japanese (SOV)</th>
              <th>Arabic (VSO)</th>
            </tr>
          </thead>
          <tbody>
            {patterns.map(pattern => (
              <tr>
                <td>
                  <a href={`/translations/${pattern.id}`}>{pattern.title}</a>
                </td>
                <td>
                  <code>{pattern.rawCode}</code>
                </td>
                <td>
                  <em class="muted">Loading...</em>
                </td>
                <td>
                  <em class="muted">Loading...</em>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );

    if (isPartial) {
      return content;
    }

    return <BaseLayout title="Translations">{content}</BaseLayout>;
  })

  // Single pattern translations
  .get('/:patternId', async ({ params }) => {
    const translations = await getPatternTranslations(params.patternId);
    const languages = getLanguages();

    if (translations.length === 0) {
      return (
        <BaseLayout title="Translations">
          <h1>No Translations Found</h1>
          <p>No translations found for pattern "{params.patternId}".</p>
          <p>
            <a href="/translations">Back to translations</a>
          </p>
        </BaseLayout>
      );
    }

    // Group by word order
    const byWordOrder: Record<string, Translation[]> = {
      SVO: [],
      SOV: [],
      VSO: [],
      V2: [],
    };

    translations.forEach(t => {
      if (byWordOrder[t.wordOrder]) {
        byWordOrder[t.wordOrder].push(t);
      }
    });

    return (
      <BaseLayout title={`Translations - ${params.patternId}`}>
        <nav class="breadcrumb">
          <a href="/translations">Translations</a> / {params.patternId}
        </nav>

        <h1>Translations: {params.patternId}</h1>

        {Object.entries(byWordOrder).map(
          ([wordOrder, trans]) =>
            trans.length > 0 && (
              <section>
                <h2>
                  <chip class={wordOrder.toLowerCase()}>{wordOrder}</chip> Word Order
                </h2>
                <table>
                  <thead>
                    <tr>
                      <th>Language</th>
                      <th>Code</th>
                      <th>Confidence</th>
                      <th>Role Alignment</th>
                      <th>Verified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trans.map(t => {
                      const lang = languages.find(l => l.code === t.language);
                      return (
                        <tr>
                          <td>{lang?.name || t.language}</td>
                          <td>
                            <code>{t.hyperscript}</code>
                          </td>
                          <td>{Math.round(t.confidence * 100)}%</td>
                          <td>
                            <AlignmentBadge score={t.roleAlignmentScore} />
                          </td>
                          <td>{t.verifiedParses ? 'Yes' : 'No'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            )
        )}
      </BaseLayout>
    );
  });
