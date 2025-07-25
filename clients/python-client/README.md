# HyperFixi Python Client

A Python client library for [HyperFixi](https://github.com/hyperfixi/hyperfixi) server-side hyperscript compilation, with native integrations for Django, Flask, and FastAPI.

## Features

- **Async/sync client** for HyperFixi server API
- **Django integration** with template tags and middleware
- **Flask integration** with Jinja2 filters and CLI commands  
- **FastAPI integration** with middleware and dependencies
- **CLI tool** for command-line compilation and validation
- **Template variable substitution** with `{{variable}}` syntax
- **Comprehensive error handling** and retry logic
- **Type hints** with Pydantic models
- **Caching support** for performance optimization

## Installation

```bash
pip install hyperfixi-client
```

### Framework-specific installations:

```bash
# Django support
pip install hyperfixi-client[django]

# Flask support  
pip install hyperfixi-client[flask]

# FastAPI support
pip install hyperfixi-client[fastapi]

# Development tools
pip install hyperfixi-client[dev]
```

## Quick Start

### Basic Client Usage

```python
import asyncio
from hyperfixi_client import HyperfixiClient

async def main():
    client = HyperfixiClient("http://localhost:3000")
    
    # Compile hyperscript
    result = await client.compile({
        "button": "on click toggle .active",
        "form": "on submit fetch /api/save then put result into #status"
    })
    
    print(result.compiled["button"])  # Generated JavaScript
    print(result.metadata["button"])  # Script metadata

asyncio.run(main())
```

### Synchronous Usage

```python
from hyperfixi_client import HyperfixiClient

client = HyperfixiClient("http://localhost:3000")

# Use sync methods
result = client.compile_sync({
    "button": "on click toggle .active"
})
```

## FastAPI Integration

### Middleware Integration

```python
from fastapi import FastAPI
from hyperfixi_client.integrations.fastapi import FastAPIHyperscriptMiddleware

app = FastAPI()

# Add middleware for automatic hyperscript compilation
app.add_middleware(
    FastAPIHyperscriptMiddleware,
    client_url="http://localhost:3000",
    compile_on_response=True
)

@app.get("/")
async def home():
    return """
    <html>
        <button _="on click toggle .active">Click me</button>
    </html>
    """
```

### Dependency Injection

```python
from fastapi import FastAPI, Depends
from hyperfixi_client.integrations.fastapi import hyperscript_dependency

app = FastAPI()

@app.get("/")
async def home(hyperscript = Depends(hyperscript_dependency)):
    result = await hyperscript.compile({
        "button": "on click toggle .active"
    })
    return {"compiled": result.compiled}
```

### Template Rendering

```python
from fastapi import FastAPI
from hyperfixi_client.integrations.fastapi import HyperscriptTemplateRenderer

app = FastAPI()
renderer = HyperscriptTemplateRenderer("http://localhost:3000")

@app.get("/")
async def home():
    return await renderer.render_template(
        '<button _="on click fetch /api/users/{{userId}}">Load User</button>',
        template_vars={"userId": 123}
    )
```

### API Routes

```python
from fastapi import FastAPI
from hyperfixi_client.integrations.fastapi import create_hyperscript_routes

app = FastAPI()

# Add /hyperscript/* routes
create_hyperscript_routes(app, "http://localhost:3000")

# Now available:
# POST /hyperscript/compile
# POST /hyperscript/validate  
# GET /hyperscript/health
# GET /hyperscript/cache/stats
# POST /hyperscript/cache/clear
```

## Django Integration

### Settings Configuration

```python
# settings.py
INSTALLED_APPS = [
    # ...
    'hyperfixi_client',
]

MIDDLEWARE = [
    # ...
    'hyperfixi_client.integrations.django.DjangoHyperscriptMiddleware',
]

HYPERFIXI = {
    'CLIENT_URL': 'http://localhost:3000',
    'COMPILE_ON_RESPONSE': True,
    'TEMPLATE_VARS_HEADER': 'X-Hyperscript-Template-Vars',
    'COMPILATION_OPTIONS': {
        'minify': True,
        'compatibility': 'modern'
    }
}
```

### Template Tags

```html
<!-- Load template tags -->
{% load hyperscript %}

<!-- Basic compilation -->
<button {% hyperscript "on click toggle .active" %}>Click me</button>

<!-- With options -->
<button {% hyperscript "on click log 'Hello'" minify=True %}>Log</button>

<!-- Store in variable -->
{% hyperscript "on click toggle .modal" as modal_script %}
<button onclick="{{ modal_script }}">Open Modal</button>

<!-- Using filter -->
<button {{ "on click toggle .active"|compile_hyperscript }}>Click me</button>
```

### Management Command

```bash
# Test connection
python manage.py test_hyperfixi --url http://localhost:3000
```

## Flask Integration

### Extension Setup

```python
from flask import Flask
from hyperfixi_client.integrations.flask import FlaskHyperscriptExtension

app = Flask(__name__)
hyperscript = FlaskHyperscriptExtension()
hyperscript.init_app(app, client_url="http://localhost:3000")

@app.route('/')
def home():
    return hyperscript.render_template_string(
        '<button _="on click toggle .active">Click me</button>',
        template_vars={'user_id': 123}
    )
```

### Jinja2 Filters

```html
<!-- Using filter -->
<button {{ "on click toggle .active" | compile_hyperscript }}>Click me</button>

<!-- With options -->
<button {{ script_var | compile_hyperscript(minify=true) }}>Click me</button>

<!-- Using global function -->
<button {{ hyperscript("on click toggle .active") }}>Click me</button>
```

### CLI Commands

```python
from hyperfixi_client.integrations.flask import create_cli_commands

create_cli_commands(app)
```

```bash
# Check service health
flask hyperscript health

# Compile script
flask hyperscript compile "on click toggle .active"

# Validate script
flask hyperscript validate "on click log 'Hello'"

# Cache management
flask hyperscript cache-stats
flask hyperscript clear-cache
```

## Command Line Interface

### Installation

```bash
pip install hyperfixi-client
```

### Basic Usage

```bash
# Check service health
hyperfixi --url http://localhost:3000 health

# Compile hyperscript
hyperfixi compile "on click toggle .active"

# Multiple scripts
hyperfixi compile button="on click toggle .active" form="on submit halt"

# With options
hyperfixi --minify --compatibility legacy compile "on click log 'Hello'"

# Template variables
hyperfixi --template-vars '{"userId": 123}' compile "on click fetch /api/users/{{userId}}"

# Validate syntax
hyperfixi validate "on click toggle .active"

# Batch compilation
hyperfixi batch scripts.json

# Cache management
hyperfixi cache stats
hyperfixi cache clear
```

### Output Formats

```bash
# Default onclick format
hyperfixi compile "on click toggle .active"
# Output: onclick="document.addEventListener('click', ...)"

# JavaScript format
hyperfixi --output js compile "on click toggle .active"
# Output: document.addEventListener('click', ...)

# JSON format (full response)
hyperfixi --output json compile "on click toggle .active"
```

### Batch File Format

```json
[
  {
    "id": "button",
    "script": "on click toggle .active",
    "options": {
      "minify": true
    },
    "context": {
      "templateVars": {
        "userId": 123
      }
    }
  }
]
```

## Template Variables

All integrations support template variable substitution:

```python
# Variables are substituted before compilation
result = await client.compile(
    {"script": "on click fetch /api/users/{{userId}}"},
    template_vars={"userId": 123}
)
# Results in: "on click fetch /api/users/123"
```

## Error Handling

```python
from hyperfixi_client import HyperfixiClient
from hyperfixi_client.exceptions import (
    CompilationError,
    ValidationError, 
    NetworkError,
    TimeoutError
)

client = HyperfixiClient("http://localhost:3000")

try:
    result = await client.compile({"invalid": "on click toggle ."})
except CompilationError as e:
    print(f"Compilation failed: {e}")
    for error in e.errors:
        print(f"  Line {error.line}: {error.message}")
except NetworkError as e:
    print(f"Network error: {e}")
except TimeoutError:
    print("Request timed out")
```

## Configuration

### Client Configuration

```python
client = HyperfixiClient(
    base_url="http://localhost:3000",
    timeout=30.0,
    retries=3,
    auth_token="your-token",
    headers={"Custom-Header": "value"}
)
```

### Compilation Options

```python
from hyperfixi_client.types import CompilationOptions, CompatibilityMode

options = CompilationOptions(
    minify=True,
    compatibility=CompatibilityMode.LEGACY,
    source_map=True,
    optimization=True
)
```

## Development

### Setup

```bash
git clone https://github.com/hyperfixi/hyperfixi
cd hyperfixi/clients/python-client

pip install -e .[dev]
```

### Testing

```bash
pytest tests/
pytest --cov=hyperfixi_client tests/
```

### Code Quality

```bash
black hyperfixi_client/
mypy hyperfixi_client/
flake8 hyperfixi_client/
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Support

- **Documentation**: [https://hyperfixi.dev/docs](https://hyperfixi.dev/docs)
- **Issues**: [GitHub Issues](https://github.com/hyperfixi/hyperfixi/issues)
- **Discussions**: [GitHub Discussions](https://github.com/hyperfixi/hyperfixi/discussions)