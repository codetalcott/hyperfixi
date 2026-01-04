# hyperfixi-python

Django 6.0 and FastAPI integration for HyperFixi.

## Quick Start

```bash
# Run tests
python3 -m pytest tests/ -v

# Install for development
pip install -e ".[dev]"

# With Django support
pip install -e ".[django]"

# With FastAPI support
pip install -e ".[fastapi]"
```

## Package Structure

```
hyperfixi/
├── core.py              # hs(), hs_attr(), escape_hyperscript()
├── validator.py         # Basic regex validation (Tier 1)
├── cli_validator.py     # Node.js CLI validation (Tier 2)
├── behaviors.py         # BehaviorRegistry, @behavior decorator
├── scanner.py           # Template scanner for bundle generation
├── aggregator.py        # Usage aggregation across files
├── django/
│   ├── templatetags/hyperfixi.py  # {% hs %}, {% hs_behaviors %}
│   ├── context_processors.py      # Common scripts
│   └── management/commands/
│       ├── hyperfixi_check.py     # Validate templates
│       └── hyperfixi_bundle.py    # Generate bundle config
└── fastapi/
    └── jinja.py         # Jinja2 extension
```

## Key APIs

```python
# Core function - variable substitution with HTML escaping
from hyperfixi import hs
script = hs("on click fetch /api/user/{id}", id=123)

# Behavior decorator - register reusable hyperscript
from hyperfixi import behavior

@behavior("Removable")
def removable():
    """on click remove me"""

# Validation
from hyperfixi import validate, validate_basic
result = validate_basic("on click toggle .active")
```

## Django Usage

```python
# settings.py
INSTALLED_APPS = ['hyperfixi.django']
TEMPLATES[0]['OPTIONS']['context_processors'].append(
    'hyperfixi.django.context_processors.hyperscript'
)
```

```html
{% load hyperfixi %}
<button {% hs %}on click toggle .active{% endhs %}>Toggle</button>
{% hs_behaviors %}
```

## FastAPI Usage

```python
from hyperfixi.fastapi import setup_jinja
setup_jinja(templates)
```

```html
<button {{ hs("on click toggle .active") }}>Toggle</button>
```

## Validation Tiers

1. **Tier 1 (Basic)**: Pure Python regex (~80% error detection)
2. **Tier 2 (Full)**: Node.js CLI via `npx hyperfixi validate`

Falls back gracefully: Tier 2 → Tier 1 if Node.js unavailable.

## Template Scanning (Bundle Generation)

Scan Django templates at build time to detect which hyperscript features are used,
then generate a minimal bundle configuration.

### Management Command

```bash
# Scan and output JSON bundle config
python manage.py hyperfixi_bundle

# Write to file
python manage.py hyperfixi_bundle --output bundle-config.json

# View human-readable summary
python manage.py hyperfixi_bundle --format summary

# Generate JS config for direct use
python manage.py hyperfixi_bundle --format js-config

# Add extra commands/blocks
python manage.py hyperfixi_bundle --extra-commands fetch --extra-blocks if
```

### Django Settings

```python
# settings.py
HYPERFIXI = {
    'EXTRA_COMMANDS': ['fetch'],  # Always include these
    'EXTRA_BLOCKS': ['if'],
    'HTMX': True,                 # Enable HTMX integration
    'POSITIONAL': True,           # Include first/last/etc.
}
```

### Programmatic Usage

```python
from hyperfixi import Scanner, Aggregator

# Scan templates
scanner = Scanner()
usage_map = scanner.scan_directory(Path("templates"))

# Aggregate usage
aggregator = Aggregator()
aggregator.load_from_scan(usage_map)

# Get summary
summary = aggregator.get_summary()
print(f"Commands: {summary['commands']}")
print(f"Blocks: {summary['blocks']}")
```

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml
- name: Generate HyperFixi bundle
  run: |
    python manage.py hyperfixi_bundle --output bundle-config.json
    cd packages/core
    npm run generate:bundle -- --config /path/to/bundle-config.json
    cp dist/hyperfixi-*.js ../django/static/js/
```

### Detected Features

**Commands (21):** toggle, add, remove, show, hide, set, get, put, append, take,
increment, decrement, log, send, trigger, wait, transition, go, call, focus, blur, return

**Blocks (6):** if, repeat, for, while, fetch, async

**Positional (6):** first, last, next, previous, closest, parent
