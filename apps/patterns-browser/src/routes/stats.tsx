/**
 * Statistics routes for the patterns browser.
 */

import { Elysia } from 'elysia';
import { BaseLayout } from '../layouts/base';
import { getStats, getTranslationsStats, getLLMExamplesStats, getLanguages, getRoleStats } from '../db';

// Role display names for stats
const ROLE_LABELS: Record<string, string> = {
  action: 'Commands',
  event: 'Events',
  patient: 'Target (patient)',
  destination: 'Destination',
  source: 'Source',
  condition: 'Conditions',
  quantity: 'Quantities',
  duration: 'Durations',
  loopType: 'Loops',
  responseType: 'Response Types',
  method: 'Methods',
  style: 'Styles',
  manner: 'Manner',
};

export const statsRoutes = new Elysia({ prefix: '/stats' }).get('/', async () => {
  const patternStats = await getStats();
  const translationStats = await getTranslationsStats();
  const llmStats = await getLLMExamplesStats();
  const languages = getLanguages();
  const roleStats = await getRoleStats();

  // Calculate total roles (excluding 'action' since every pattern has one)
  const totalRoles = Object.entries(roleStats)
    .filter(([role]) => role !== 'action')
    .reduce((sum, [, count]) => sum + count, 0);

  return (
    <BaseLayout title="Statistics">
      <h1>Database Statistics</h1>

      <h2>Overview</h2>
      <div class="pattern-grid">
        <div class="box">
          <h3>Total Patterns</h3>
          <p style="font-size: 2.5rem; font-weight: bold">{patternStats.totalPatterns}</p>
        </div>
        <div class="box">
          <h3>Total Translations</h3>
          <p style="font-size: 2.5rem; font-weight: bold">{patternStats.totalTranslations}</p>
        </div>
        <div class="box">
          <h3>LLM Examples</h3>
          <p style="font-size: 2.5rem; font-weight: bold">{llmStats.total}</p>
        </div>
        <div class="box">
          <h3>Languages</h3>
          <p style="font-size: 2.5rem; font-weight: bold">{languages.length}</p>
        </div>
      </div>

      <h2>Patterns by Category</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Count</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(patternStats.byCategory)
            .sort(([, a], [, b]) => b - a)
            .map(([category, count]) => (
              <tr>
                <td>
                  <a href={`/patterns?category=${category}`}>{category}</a>
                </td>
                <td>{count}</td>
                <td>{Math.round((count / patternStats.totalPatterns) * 100)}%</td>
              </tr>
            ))}
        </tbody>
      </table>

      <h2>Semantic Roles</h2>
      <p class="muted">
        {totalRoles} semantic roles extracted across {patternStats.totalPatterns} patterns.
        Roles describe the grammatical function of each part of a hyperscript command.
      </p>
      <table>
        <thead>
          <tr>
            <th>Role</th>
            <th>Description</th>
            <th>Count</th>
            <th>% of Patterns</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(roleStats)
            .filter(([role]) => role !== 'action') // Exclude action (every pattern has one)
            .sort(([, a], [, b]) => b - a)
            .map(([role, count]) => (
              <tr>
                <td>
                  <a href={`/patterns?role=${role}`}>
                    <span class={`role-dot role-${role}`} style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 0.5rem;"></span>
                    {ROLE_LABELS[role] || role}
                  </a>
                </td>
                <td class="muted" style="font-size: 0.9rem;">
                  {role === 'event' && 'Trigger events (click, keydown, submit)'}
                  {role === 'patient' && 'What is being acted upon (.class, #id)'}
                  {role === 'destination' && 'Where something goes (to, into)'}
                  {role === 'source' && 'Where something comes from (from)'}
                  {role === 'condition' && 'Conditional expressions (if, when)'}
                  {role === 'quantity' && 'Amount or count (by 5, 3 times)'}
                  {role === 'duration' && 'Time period (2s, 300ms)'}
                  {role === 'loopType' && 'Repetition type (forever, until)'}
                  {role === 'responseType' && 'Response format (as json, as html)'}
                  {role === 'method' && 'HTTP method (GET, POST)'}
                  {role === 'style' && 'Manner modifier (with fade)'}
                  {role === 'manner' && 'How action is performed (before, after)'}
                </td>
                <td>{count}</td>
                <td>{Math.round((count / patternStats.totalPatterns) * 100)}%</td>
              </tr>
            ))}
        </tbody>
      </table>

      <h2>Translations by Language</h2>
      <table>
        <thead>
          <tr>
            <th>Language</th>
            <th>Code</th>
            <th>Word Order</th>
            <th>Total</th>
            <th>Verified</th>
            <th>Coverage</th>
          </tr>
        </thead>
        <tbody>
          {languages.map(lang => {
            const langStats = patternStats.byLanguage[lang.code] || { count: 0, verifiedCount: 0 };
            return (
              <tr>
                <td>{lang.name}</td>
                <td>
                  <code>{lang.code}</code>
                </td>
                <td>
                  <chip class={lang.wordOrder.toLowerCase()}>{lang.wordOrder}</chip>
                </td>
                <td>{langStats.count}</td>
                <td>{langStats.verifiedCount}</td>
                <td>
                  {langStats.count > 0
                    ? Math.round((langStats.verifiedCount / langStats.count) * 100)
                    : 0}
                  %
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Translation Quality</h2>
      <div class="box">
        <p>
          <strong>Average Confidence:</strong> {Math.round(patternStats.avgConfidence * 100)}%
        </p>
        <p>
          <strong>LLM Example Quality:</strong> {Math.round(llmStats.avgQuality * 100)}%
        </p>
      </div>
    </BaseLayout>
  );
});
