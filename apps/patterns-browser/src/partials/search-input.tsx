/**
 * Search input component with debounced fetch.
 */

interface SearchInputProps {
  placeholder?: string;
  endpoint?: string;
  targetId?: string;
}

export function SearchInput({
  placeholder = 'Search patterns...',
  endpoint = '/patterns/list',
  targetId = 'pattern-list',
}: SearchInputProps) {
  return (
    <div class="search-container">
      <input
        type="search"
        id="search"
        name="q"
        placeholder={placeholder}
        autocomplete="off"
        _={`on input debounced at 300ms add .loading to closest .search-container then fetch \`${endpoint}?q=\${my value}\` as html then morph #${targetId} with it using view transition then remove .loading from closest .search-container then remove .active from <a/> in #category-filter then remove .active from <a/> in #role-filter end on keydown[key=='Escape'] set my value to '' then fetch '${endpoint}' as html then morph #${targetId} with it end`}
      />
      <span class="spinner">Loading...</span>
    </div>
  );
}
