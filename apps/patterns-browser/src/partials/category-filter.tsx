/**
 * Category filter sidebar component.
 */

interface CategoryFilterProps {
  categories: Array<{ id: string; count: number }>;
  activeCategory?: string;
}

export function CategoryFilter({ categories, activeCategory }: CategoryFilterProps) {
  return (
    <nav class="sidebar" id="category-filter">
      <h3>Categories</h3>
      <ul>
        <li>
          <a
            href="/patterns"
            class={!activeCategory ? 'active' : ''}
            _="on click halt the event then fetch '/patterns/list' as html then morph #pattern-list with it using view transition then push url '/patterns' then remove .active from <a/> in #category-filter then remove .active from <a/> in #role-filter then add .active to me end"
          >
            All patterns
          </a>
        </li>
        {categories.map(cat => (
          <li>
            <a
              href={`/patterns?category=${cat.id}`}
              class={activeCategory === cat.id ? 'active' : ''}
              _={`on click halt the event then fetch '/patterns/list?category=${cat.id}' as html then morph #pattern-list with it using view transition then push url '/patterns?category=${cat.id}' then remove .active from <a/> in #category-filter then remove .active from <a/> in #role-filter then add .active to me end`}
            >
              {cat.id}
              <chip class="muted">{cat.count}</chip>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
