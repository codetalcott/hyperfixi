/**
 * Translation routes for the patterns browser.
 *
 * Uses @lokascript/semantic for live translation of hyperscript patterns.
 */

import { Elysia } from 'elysia';
import { BaseLayout } from '../layouts/base';
import { getPatterns, getPatternTranslations, getLanguages, type Translation } from '../db';
import { AlignmentBadge } from '../components/alignment-indicator';
import { getAllTranslations, getSupportedLanguages, canParse } from '@lokascript/semantic';

/**
 * Get live translation for a pattern using @lokascript/semantic.
 * Falls back gracefully if translation fails.
 */
function getLiveTranslation(code: string, targetLang: string): { code: string; confidence: number } | null {
  try {
    // Try to get translations using the semantic package
    const translations = getAllTranslations(code, 'en', [targetLang]);
    const translatedCode = translations[targetLang];

    if (translatedCode && translatedCode !== code) {
      // Verify the translation can be parsed back
      const canParseBack = canParse(translatedCode, targetLang);
      return {
        code: translatedCode,
        confidence: canParseBack ? 0.95 : 0.7,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Language metadata with word order information.
 */
const LANGUAGE_INFO: Record<string, { name: string; wordOrder: string }> = {
  en: { name: 'English', wordOrder: 'SVO' },
  es: { name: 'Spanish', wordOrder: 'SVO' },
  fr: { name: 'French', wordOrder: 'SVO' },
  pt: { name: 'Portuguese', wordOrder: 'SVO' },
  id: { name: 'Indonesian', wordOrder: 'SVO' },
  sw: { name: 'Swahili', wordOrder: 'SVO' },
  zh: { name: 'Chinese', wordOrder: 'SVO' },
  ja: { name: 'Japanese', wordOrder: 'SOV' },
  ko: { name: 'Korean', wordOrder: 'SOV' },
  tr: { name: 'Turkish', wordOrder: 'SOV' },
  qu: { name: 'Quechua', wordOrder: 'SOV' },
  ar: { name: 'Arabic', wordOrder: 'VSO' },
  de: { name: 'German', wordOrder: 'V2' },
};

export const translationsRoutes = new Elysia({ prefix: '/translations' })
  // Translations explorer page
  .get('/', async ({ headers }) => {
    const patterns = await getPatterns({ limit: 20 });

    // Get supported languages from semantic package
    const supportedLangs = getSupportedLanguages();

    // Build language chips from supported languages
    const languages = supportedLangs.map((code: string) => ({
      code,
      name: LANGUAGE_INFO[code]?.name || code,
      wordOrder: LANGUAGE_INFO[code]?.wordOrder || 'SVO',
    }));

    // Check if this is a partial request (for SPA navigation)
    const isPartial = headers['hx-request'] === 'true';

    // Get live translations for each pattern
    const patternsWithTranslations = patterns.map(pattern => {
      const jaTranslation = getLiveTranslation(pattern.rawCode, 'ja');
      const arTranslation = getLiveTranslation(pattern.rawCode, 'ar');

      return {
        ...pattern,
        jaTranslation,
        arTranslation,
      };
    });

    const content = (
      <>
        <h1>Translation Explorer</h1>
        <p class="muted">
          View hyperscript patterns translated to {supportedLangs.length} languages with different word orders.
          Powered by <code>@lokascript/semantic</code> live translation.
        </p>

        <div class="meta" style="margin-bottom: 1rem">
          {languages.map((lang: { code: string; name: string; wordOrder: string }) => (
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
            {patternsWithTranslations.map(pattern => (
              <tr>
                <td>
                  <a href={`/translations/${pattern.id}`}>{pattern.title}</a>
                </td>
                <td>
                  <code>{pattern.rawCode}</code>
                </td>
                <td>
                  {pattern.jaTranslation ? (
                    <>
                      <code>{pattern.jaTranslation.code}</code>
                      <br />
                      <small class="muted">
                        {Math.round(pattern.jaTranslation.confidence * 100)}% confidence
                      </small>
                    </>
                  ) : (
                    <em class="muted">Not translatable</em>
                  )}
                </td>
                <td>
                  {pattern.arTranslation ? (
                    <>
                      <code dir="rtl">{pattern.arTranslation.code}</code>
                      <br />
                      <small class="muted">
                        {Math.round(pattern.arTranslation.confidence * 100)}% confidence
                      </small>
                    </>
                  ) : (
                    <em class="muted">Not translatable</em>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p class="muted" style="margin-top: 2rem">
          <a href="/translations/toggle-class">View detailed translations for a single pattern →</a>
        </p>
      </>
    );

    if (isPartial) {
      return content;
    }

    return <BaseLayout title="Translations">{content}</BaseLayout>;
  })

  // Single pattern translations
  .get('/:patternId', async ({ params }) => {
    // First try to get translations from database
    const dbTranslations = await getPatternTranslations(params.patternId);
    const languages = getLanguages();

    // Get the pattern to translate live
    const patterns = await getPatterns({ limit: 100 });
    const pattern = patterns.find(p => p.id === params.patternId);

    // Get live translations using semantic package
    let liveTranslations: Record<string, string> = {};
    if (pattern) {
      try {
        liveTranslations = getAllTranslations(pattern.rawCode, 'en');
      } catch {
        // Fall back to database translations
      }
    }

    // Combine database and live translations
    const combinedTranslations: Translation[] = [];

    // Use database translations if available, otherwise use live translations
    if (dbTranslations.length > 0) {
      combinedTranslations.push(...dbTranslations);
    } else if (Object.keys(liveTranslations).length > 0) {
      // Convert live translations to Translation objects
      for (const [langCode, code] of Object.entries(liveTranslations)) {
        if (langCode === 'explicit') continue;

        const langInfo = LANGUAGE_INFO[langCode];
        if (!langInfo) continue;

        combinedTranslations.push({
          id: 0,
          codeExampleId: params.patternId,
          language: langCode,
          hyperscript: code,
          wordOrder: langInfo.wordOrder as 'SVO' | 'SOV' | 'VSO' | 'V2',
          translationMethod: 'semantic-live',
          confidence: canParse(code, langCode) ? 0.95 : 0.7,
          verifiedParses: canParse(code, langCode),
          verifiedExecutes: false,
          roleAlignmentScore: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    if (combinedTranslations.length === 0) {
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

    combinedTranslations.forEach(t => {
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

        {pattern && (
          <div class="pattern-source" style="margin-bottom: 2rem">
            <strong>Source (English):</strong>
            <pre><code>{pattern.rawCode}</code></pre>
          </div>
        )}

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
                      const isRTL = t.language === 'ar';
                      return (
                        <tr>
                          <td>{lang?.name || LANGUAGE_INFO[t.language]?.name || t.language}</td>
                          <td>
                            <code dir={isRTL ? 'rtl' : 'ltr'}>{t.hyperscript}</code>
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

        {liveTranslations['explicit'] && (
          <section style="margin-top: 2rem">
            <h2>Explicit Mode</h2>
            <p class="muted">
              The semantic representation used for translation:
            </p>
            <pre><code>{liveTranslations['explicit']}</code></pre>
          </section>
        )}
      </BaseLayout>
    );
  });
