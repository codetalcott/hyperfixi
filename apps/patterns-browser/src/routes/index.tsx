/**
 * Home page route.
 */

import { Elysia } from 'elysia';
import { BaseLayout } from '../layouts/base';
import { getStats } from '../db';

export const indexRoutes = new Elysia().get('/', async () => {
  const stats = await getStats();

  return (
    <BaseLayout>
      <div class="center">
        <h1>HyperFixi Patterns Reference</h1>
        <p class="muted">
          Explore {stats.totalPatterns} hyperscript patterns with translations in 13 languages
        </p>
      </div>

      <div class="pattern-grid">
        <a href="/patterns" class="pattern-card" style="text-decoration: none">
          <h3>Patterns</h3>
          <p class="muted">
            Browse {stats.totalPatterns} code examples covering common UI interactions
          </p>
          <div class="meta">
            <chip>{stats.totalPatterns} patterns</chip>
            <chip class="muted">
              {Object.keys(stats.byCategory).length} categories
            </chip>
          </div>
        </a>

        <a href="/translations" class="pattern-card" style="text-decoration: none">
          <h3>Translations</h3>
          <p class="muted">
            View patterns translated to 13 languages with different word orders
          </p>
          <div class="meta">
            <chip>{stats.totalTranslations} translations</chip>
            <chip class="svo">SVO</chip>
            <chip class="sov">SOV</chip>
            <chip class="vso">VSO</chip>
          </div>
        </a>

        <a href="/llm" class="pattern-card" style="text-decoration: none">
          <h3>LLM Examples</h3>
          <p class="muted">
            Prompt/completion pairs for few-shot learning with language models
          </p>
          <div class="meta">
            <chip>414 examples</chip>
            <chip class="muted">For AI integration</chip>
          </div>
        </a>

        <a href="/stats" class="pattern-card" style="text-decoration: none">
          <h3>Statistics</h3>
          <p class="muted">
            Pattern counts, translation coverage, and language distribution
          </p>
          <div class="meta">
            <chip class="muted">Dashboard</chip>
          </div>
        </a>
      </div>

      <hr />

      <h2>About</h2>
      <p>
        This patterns reference is part of the{' '}
        <a href="https://github.com/anthropics/hyperfixi" target="_blank">
          HyperFixi
        </a>{' '}
        project, a complete TypeScript implementation of hyperscript with:
      </p>
      <ul>
        <li>100% pattern compatibility with official hyperscript</li>
        <li>Multilingual support for 13 languages</li>
        <li>Semantic parsing with grammar transformation</li>
        <li>LLM integration for code generation</li>
      </ul>
    </BaseLayout>
  );
});
