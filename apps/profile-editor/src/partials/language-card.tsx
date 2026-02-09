/**
 * Language card for the dashboard grid.
 */

import type { LanguageProfile } from '../profile-loader';
import type { CoverageStats } from '../merge';

interface LanguageCardProps {
  code: string;
  profile: LanguageProfile;
  coverage: CoverageStats;
  pendingEdits: number;
}

export function LanguageCard({ code, profile, coverage, pendingEdits }: LanguageCardProps) {
  const coverageLevel = coverage.overall >= 80 ? 'high' : coverage.overall >= 50 ? 'medium' : 'low';
  const wordOrderClass = profile.wordOrder.toLowerCase();

  return (
    <a href={`/profiles/${code}`} class="language-card">
      <h3>
        {profile.name} <span class="native">{profile.nativeName}</span>
      </h3>
      <div class="meta">
        <span class={`chip ${wordOrderClass}`}>{profile.wordOrder}</span>
        <span class="chip">{profile.markingStrategy}</span>
        {profile.direction === 'rtl' && <span class="chip rtl">RTL</span>}
        {pendingEdits > 0 && (
          <span class="chip pending">{pendingEdits} pending</span>
        )}
      </div>
      <div class="coverage-bar">
        <div class={`coverage-fill ${coverageLevel}`} style={`width: ${coverage.overall}%`}></div>
      </div>
      <div class="stats">
        {coverage.keywords.covered}/{coverage.keywords.total} keywords
        {coverage.markers.covered > 0 && ` | ${coverage.markers.covered}/${coverage.markers.total} markers`}
        {coverage.references.covered > 0 && ` | ${coverage.references.covered}/${coverage.references.total} refs`}
      </div>
    </a>
  );
}
