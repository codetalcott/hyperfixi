/**
 * Role filter sidebar component.
 *
 * Allows filtering patterns by semantic role (patient, destination, event, etc.)
 */

// Role descriptions for display
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

interface RoleFilterProps {
  roleStats: Record<string, number>;
  activeRole?: string;
}

export function RoleFilter({ roleStats, activeRole }: RoleFilterProps) {
  // Sort roles by count, descending
  const sortedRoles = Object.entries(roleStats)
    .filter(([role]) => role !== 'action') // Exclude action since every pattern has it
    .sort(([, a], [, b]) => b - a);

  return (
    <nav class="sidebar role-filter-sidebar">
      <h3>Filter by Role</h3>
      <ul>
        <li>
          <a
            href="/patterns"
            class={!activeRole ? 'active' : ''}
            _={`on click
                halt the event
                fetch '/patterns/list' as html
                morph #pattern-list with it using view transition
                push url '/patterns'
                remove .active from <a/> in closest <nav/>
                add .active to me
              end`}
          >
            All patterns
          </a>
        </li>
        {sortedRoles.map(([role, count]) => (
          <li>
            <a
              href={`/patterns?role=${role}`}
              class={activeRole === role ? 'active' : ''}
              _={`on click
                  halt the event
                  fetch '/patterns/list?role=${role}' as html
                  morph #pattern-list with it using view transition
                  push url '/patterns?role=${role}'
                  remove .active from <a/> in closest <nav/>
                  add .active to me
                end`}
            >
              <span class={`role-dot role-${role}`}></span>
              {ROLE_LABELS[role] || role}
              <chip class="muted">{count}</chip>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
