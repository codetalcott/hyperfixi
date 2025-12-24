/**
 * Pattern card component - displays a single pattern in the grid.
 */

import type { Pattern } from '../db';
import { HyperscriptCode } from '../components/code-block';

interface PatternCardProps {
  pattern: Pattern;
}

export function PatternCard({ pattern }: PatternCardProps) {
  return (
    <a href={`/patterns/${pattern.id}`} class="pattern-card box" style="text-decoration: none; color: inherit; display: block">
      <h3>{pattern.title}</h3>
      <div class="code">
        <HyperscriptCode code={pattern.rawCode} />
      </div>
      <div class="meta">
        {pattern.category && <chip>{pattern.category}</chip>}
        {pattern.primaryCommand && <chip class="muted">{pattern.primaryCommand}</chip>}
        <chip class="muted">{pattern.difficulty}</chip>
      </div>
    </a>
  );
}
