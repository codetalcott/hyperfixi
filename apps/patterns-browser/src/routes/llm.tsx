/**
 * LLM examples routes for the patterns browser.
 */

import { Elysia } from 'elysia';
import { BaseLayout } from '../layouts/base';
import { getLLMExamplesForPrompt, getLLMExamplesStats, getLanguages } from '../db';

export const llmRoutes = new Elysia({ prefix: '/llm' })
  // LLM examples browser
  .get('/', async () => {
    const stats = await getLLMExamplesStats();
    const languages = getLanguages();

    return (
      <BaseLayout title="LLM Examples">
        <h1>LLM Few-Shot Examples</h1>
        <p class="muted">
          Prompt/completion pairs for few-shot learning with language models
        </p>

        <div class="pattern-grid">
          <div class="box">
            <h3>Total Examples</h3>
            <p style="font-size: 2rem; font-weight: bold">{stats.total}</p>
          </div>
          <div class="box">
            <h3>Average Quality</h3>
            <p style="font-size: 2rem; font-weight: bold">
              {Math.round(stats.avgQuality * 100)}%
            </p>
          </div>
          <div class="box">
            <h3>Total Usage</h3>
            <p style="font-size: 2rem; font-weight: bold">{stats.totalUsage}</p>
          </div>
        </div>

        <h2>Search Examples</h2>
        <div class="search-container">
          <input
            type="search"
            id="llm-search"
            placeholder="Enter a prompt to find relevant examples..."
            autocomplete="off"
            _="on input debounced at 300ms if my value.length > 2 add .loading to closest .search-container then fetch `/llm/search?q=${my value}` as html then morph #llm-results with it then remove .loading from closest .search-container end end"
          />
          <span class="spinner">Loading...</span>
        </div>

        <div id="llm-results">
          <p class="muted center">Enter a prompt to search for relevant examples</p>
        </div>

        <h2>Examples by Language</h2>
        <table>
          <thead>
            <tr>
              <th>Language</th>
              <th>Word Order</th>
              <th>Examples</th>
            </tr>
          </thead>
          <tbody>
            {languages.map(lang => (
              <tr>
                <td>{lang.name}</td>
                <td>
                  <chip class={lang.wordOrder.toLowerCase()}>{lang.wordOrder}</chip>
                </td>
                <td>{stats.byLanguage[lang.code] || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </BaseLayout>
    );
  })

  // Search LLM examples
  .get('/search', async ({ query }) => {
    const q = query.q as string;
    if (!q || q.length < 3) {
      return <p class="muted center">Enter at least 3 characters to search</p>;
    }

    const examples = await getLLMExamplesForPrompt(q, undefined, 10);

    if (examples.length === 0) {
      return <p class="muted center">No examples found matching "{q}"</p>;
    }

    return (
      <div>
        <p class="muted">Found {examples.length} examples</p>
        {examples.map(example => (
          <div class="box" style="margin-bottom: 1rem">
            <h4>Prompt</h4>
            <p>{example.prompt}</p>
            <h4>Completion</h4>
            <pre class="code-block">{example.completion}</pre>
            <div class="meta">
              <chip class="muted">{example.language}</chip>
              <chip class="muted">Quality: {Math.round(example.qualityScore * 100)}%</chip>
              <chip class="muted">Used: {example.usageCount}x</chip>
            </div>
          </div>
        ))}
      </div>
    );
  });
