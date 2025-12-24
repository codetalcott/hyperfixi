/**
 * Pattern routes for the patterns browser.
 */

import { Elysia } from 'elysia';
import { BaseLayout } from '../layouts/base';
import { PatternList } from '../partials/pattern-list';
import { CategoryFilter } from '../partials/category-filter';
import { RoleFilter } from '../partials/role-filter';
import { SearchInput } from '../partials/search-input';
import { CodeBlock } from '../components/code-block';
import {
  getPatterns,
  getPattern,
  getPatternsByFeature,
  getPatternsByRole,
  search,
  getCategories,
  getStats,
  getRoleStats,
  getPatternRoles,
  type Pattern,
  type PatternRole,
} from '../db';
import { RoleList } from '../components/role-badge';

const PAGE_SIZE = 24;

/**
 * Build category list with counts from stats
 */
async function getCategoryStats() {
  const stats = await getStats();
  const categories = getCategories();
  return categories
    .filter(cat => stats.byCategory[cat] > 0)
    .map(cat => ({ id: cat, count: stats.byCategory[cat] || 0 }))
    .sort((a, b) => b.count - a.count);
}

export const patternsRoutes = new Elysia({ prefix: '/patterns' })
  // Full patterns page
  .get('/', async ({ query, headers }) => {
    const category = query.category as string | undefined;
    const role = query.role as string | undefined;
    const q = query.q as string | undefined;

    let patterns: Pattern[];
    if (q) {
      patterns = await search(q, { limit: PAGE_SIZE });
    } else if (role) {
      patterns = await getPatternsByRole(role);
    } else if (category) {
      patterns = await getPatternsByFeature(category);
    } else {
      patterns = await getPatterns({ limit: PAGE_SIZE });
    }

    const categoryStats = await getCategoryStats();
    const roleStats = await getRoleStats();
    const totalPatterns = (await getStats()).totalPatterns;
    const hasMore = patterns.length === PAGE_SIZE;

    // Check if this is a partial request (for SPA navigation)
    const isPartial = headers['hx-request'] === 'true';

    const content = (
      <>
        <h1>Hyperscript Patterns</h1>
        <p class="muted">
          {totalPatterns} patterns covering common UI interactions
        </p>

        <SearchInput />

        <div class="sidebar-layout">
          <div class="filters-sidebar">
            <CategoryFilter categories={categoryStats} activeCategory={category} />
            <RoleFilter roleStats={roleStats} activeRole={role} />
          </div>

          <div>
            <PatternList patterns={patterns} page={1} hasMore={hasMore} />
          </div>
        </div>
      </>
    );

    if (isPartial) {
      return content;
    }

    return <BaseLayout title="Patterns">{content}</BaseLayout>;
  })

  // Pattern list partial (for htmx/hyperfixi requests)
  .get('/list', async ({ query }) => {
    const category = query.category as string | undefined;
    const role = query.role as string | undefined;
    const q = query.q as string | undefined;
    const page = parseInt((query.page as string) || '1', 10);
    const offset = (page - 1) * PAGE_SIZE;

    let patterns: Pattern[];
    if (q) {
      patterns = await search(q, { limit: PAGE_SIZE, offset });
    } else if (role) {
      patterns = (await getPatternsByRole(role)).slice(offset, offset + PAGE_SIZE);
    } else if (category) {
      patterns = (await getPatternsByFeature(category)).slice(offset, offset + PAGE_SIZE);
    } else {
      patterns = await getPatterns({ limit: PAGE_SIZE, offset });
    }

    const hasMore = patterns.length === PAGE_SIZE;

    return <PatternList patterns={patterns} page={page} hasMore={hasMore} />;
  })

  // Single pattern detail page
  .get('/:id', async ({ params, headers }) => {
    const pattern = await getPattern(params.id);

    if (!pattern) {
      return (
        <BaseLayout title="Not Found">
          <h1>Pattern Not Found</h1>
          <p>The pattern "{params.id}" could not be found.</p>
          <p>
            <a href="/patterns">Back to patterns</a>
          </p>
        </BaseLayout>
      );
    }

    // Fetch semantic roles for this pattern
    const roles = await getPatternRoles(params.id);

    // Check if this is a partial request
    const isPartial = headers['hx-request'] === 'true';

    const content = (
      <>
        <nav class="breadcrumb">
          <a href="/patterns">Patterns</a> / {pattern.title}
        </nav>

        <h1>{pattern.title}</h1>

        {pattern.description && <p class="muted">{pattern.description}</p>}

        <div class="meta">
          {pattern.category && <chip>{pattern.category}</chip>}
          {pattern.primaryCommand && <chip class="muted">{pattern.primaryCommand}</chip>}
          <chip class="muted">{pattern.difficulty}</chip>
        </div>

        <section class="pattern-detail-code">
          <h2>Code</h2>
          <CodeBlock code={pattern.rawCode} showCopy={true} />
        </section>

        <section class="pattern-roles">
          <h2>Semantic Roles</h2>
          <p class="pattern-roles-intro muted">
            Hyperscript commands follow a semantic structure with distinct roles for each part.
            Hover over a role to learn what it means.
          </p>
          <RoleList roles={roles} showValues={true} groupByCommand={true} />
        </section>

        <section class="pattern-usage">
          <h2>Usage</h2>
          <p>Add this pattern to any HTML element using the <code>_</code> attribute:</p>
          <div class="usage-example">
            <pre class="code-block">
              <code>{`<button _="${pattern.rawCode}">`}</code>
              {'\n'}
              <code>{'  Click me'}</code>
              {'\n'}
              <code>{'</button>'}</code>
            </pre>
          </div>
        </section>

        <section>
          <h2>Translations</h2>
          <p class="muted">
            This pattern is available in 13 languages with native word order support.
          </p>
          <a href={`/translations/${pattern.id}`} class="btn secondary">
            View Translations
          </a>
        </section>
      </>
    );

    if (isPartial) {
      return content;
    }

    return <BaseLayout title={pattern.title}>{content}</BaseLayout>;
  });
