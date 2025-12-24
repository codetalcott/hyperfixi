/**
 * Pattern list partial - the grid of pattern cards.
 */

import type { Pattern } from '../db';
import { PatternCard } from './pattern-card';

interface PatternListProps {
  patterns: Pattern[];
  page?: number;
  hasMore?: boolean;
}

export function PatternList({ patterns, page = 1, hasMore = false }: PatternListProps) {
  if (patterns.length === 0) {
    return (
      <div id="pattern-list" class="center muted" tabindex="0">
        <p>No patterns found.</p>
      </div>
    );
  }

  // Keyboard navigation: j/k to navigate, Enter to select
  const keyboardNav = `
    on keydown[key=='j' or key=='ArrowDown']
      halt the event
      set current to first .selected in me
      if current exists
        set next to next <a.pattern-card/> from current
        if next exists
          remove .selected from current
          add .selected to next
          call next.scrollIntoView({block: 'nearest', behavior: 'smooth'})
        end
      else
        set first to first <a.pattern-card/> in me
        if first exists
          add .selected to first
        end
      end
    end
    on keydown[key=='k' or key=='ArrowUp']
      halt the event
      set current to first .selected in me
      if current exists
        set prev to previous <a.pattern-card/> from current
        if prev exists
          remove .selected from current
          add .selected to prev
          call prev.scrollIntoView({block: 'nearest', behavior: 'smooth'})
        end
      else
        set last to last <a.pattern-card/> in me
        if last exists
          add .selected to last
        end
      end
    end
    on keydown[key=='Enter']
      set current to first .selected in me
      if current exists
        call current.click()
      end
    end
    on keydown[key=='Escape']
      remove .selected from .selected in me
    end
  `;

  return (
    <div id="pattern-list" class="pattern-grid" tabindex="0" _={keyboardNav}>
      {patterns.map(pattern => (
        <PatternCard pattern={pattern} />
      ))}

      {hasMore && (
        <div
          id="load-more-trigger"
          class="center muted"
          _={`on intersection(threshold: 0.5) once
              fetch '/patterns/list?page=${page + 1}' as html
              put it after me
              remove me
            end`}
        >
          Loading more...
        </div>
      )}
    </div>
  );
}
