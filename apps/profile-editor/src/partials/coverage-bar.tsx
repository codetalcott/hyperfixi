/**
 * Coverage percentage indicator.
 */

import type { CoverageStats } from '../merge';

interface CoverageBarProps {
  coverage: CoverageStats;
  label?: string;
}

export function CoverageBar({ coverage, label }: CoverageBarProps) {
  const level = coverage.overall >= 80 ? 'high' : coverage.overall >= 50 ? 'medium' : 'low';

  return (
    <div class="coverage-section">
      {label && <span class="muted" style="font-size: 0.8rem">{label}</span>}
      <div class="flex-between">
        <div class="coverage-bar" style="flex: 1; margin-right: 0.5rem">
          <div class={`coverage-fill ${level}`} style={`width: ${coverage.overall}%`}></div>
        </div>
        <span style="font-size: 0.85rem; font-weight: 600">{coverage.overall}%</span>
      </div>
      <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem">
        Keywords: {coverage.keywords.covered}/{coverage.keywords.total}
        {' | '}Markers: {coverage.markers.covered}/{coverage.markers.total}
        {' | '}Refs: {coverage.references.covered}/{coverage.references.total}
      </div>
    </div>
  );
}
