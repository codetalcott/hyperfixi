"""
Flask integration for LokaScript Python client
"""

import asyncio
from typing import Dict, Optional, Any, Callable
from flask import Flask, request, g, current_app
from jinja2 import Environment
import json

import re as _re

from ..client import HyperfixiClient
from ..types import CompilationOptions, ParseContext, event_attribute, escape_attr_value
from ..exceptions import HyperfixiError

_EVENT_RE = _re.compile(r'^on\s+(\w+)')


def _event_attr_from_source(source: str) -> str:
    """Extract event attribute name from hyperscript source text.

    >>> _event_attr_from_source("on click toggle .active")
    'onclick'
    >>> _event_attr_from_source("on submit send /api")
    'onsubmit'
    """
    m = _EVENT_RE.match(source.strip())
    if m:
        return "on" + m.group(1)
    return "onclick"


class FlaskHyperscriptExtension:
    """
    Flask extension for LokaScript integration
    
    Example:
        from flask import Flask
        from lokascript_client.integrations.flask import FlaskHyperscriptExtension
        
        app = Flask(__name__)
        hyperscript = FlaskHyperscriptExtension()
        hyperscript.init_app(app, client_url="http://localhost:3000")
        
        @app.route('/')
        def home():
            return hyperscript.render_template_string(
                '<button _="on click toggle .active">Click me</button>',
                template_vars={'user_id': 123}
            )
    """
    
    def __init__(self, app: Optional[Flask] = None, client_url: str = "http://localhost:3000"):
        self.client_url = client_url
        self.client = None
        
        if app is not None:
            self.init_app(app, client_url)
    
    def init_app(self, app: Flask, client_url: str = None):
        """Initialize the extension with a Flask app"""
        if client_url:
            self.client_url = client_url
        
        self.client = HyperfixiClient(self.client_url)
        
        # Store extension in app extensions
        if not hasattr(app, 'extensions'):
            app.extensions = {}
        app.extensions['hyperscript'] = self
        
        # Add template filters and functions
        app.jinja_env.filters['compile_hyperscript'] = self.compile_hyperscript_filter
        app.jinja_env.globals['hyperscript'] = self.hyperscript_function
        
        # Add before_request handler to set up client
        app.before_request(self._before_request)
        
        # Add context processor
        app.context_processor(self._context_processor)
    
    def _before_request(self):
        """Set up hyperscript client for request"""
        g.hyperscript = self.client
        
        # Parse template variables from header
        template_vars_header = current_app.config.get(
            'LOKASCRIPT_TEMPLATE_VARS_HEADER', 
            'X-Hyperscript-Template-Vars'
        )
        
        if template_vars_header in request.headers:
            try:
                g.hyperscript_template_vars = json.loads(
                    request.headers[template_vars_header]
                )
            except (json.JSONDecodeError, ValueError):
                g.hyperscript_template_vars = None
        else:
            g.hyperscript_template_vars = None
    
    def _context_processor(self):
        """Add hyperscript client to template context"""
        return {
            'hyperscript_client': getattr(g, 'hyperscript', None),
            'hyperscript_template_vars': getattr(g, 'hyperscript_template_vars', None)
        }
    
    def compile_hyperscript_filter(self, script: str, **options) -> str:
        """
        Jinja2 filter for compiling hyperscript
        
        Usage:
            {{ "on click toggle .active" | compile_hyperscript }}
            {{ script_var | compile_hyperscript(minify=true) }}
        """
        try:
            template_vars = getattr(g, 'hyperscript_template_vars', {})
            context = ParseContext(template_vars=template_vars) if template_vars else None
            compilation_options = CompilationOptions(**options)
            
            result = asyncio.run(self.client.compile(
                scripts={'filter_script': script},
                options=compilation_options,
                context=context
            ))

            compiled = result.compiled.get('filter_script', '')
            meta = result.metadata.get('filter_script')
            attr = event_attribute(meta)
            escaped = escape_attr_value(compiled)
            return f'{attr}="{escaped}"'
            
        except Exception as e:
            return f'<!-- LokaScript compilation error: {e} -->'
    
    def hyperscript_function(self, script: str, **options) -> str:
        """
        Jinja2 global function for compiling hyperscript
        
        Usage:
            {{ hyperscript("on click toggle .active") }}
            {{ hyperscript(script_var, minify=true) }}
        """
        return self.compile_hyperscript_filter(script, **options)
    
    async def compile_scripts(
        self,
        scripts: Dict[str, str],
        template_vars: Optional[Dict[str, Any]] = None,
        options: Optional[CompilationOptions] = None
    ) -> Dict[str, str]:
        """Compile multiple hyperscript strings"""
        context = ParseContext(template_vars=template_vars) if template_vars else None
        
        result = await self.client.compile(
            scripts=scripts,
            options=options or CompilationOptions(),
            context=context
        )
        
        return result.compiled
    
    def render_template_string(
        self,
        template: str,
        template_vars: Optional[Dict[str, Any]] = None,
        **context
    ) -> str:
        """
        Render template string with automatic hyperscript compilation
        
        Args:
            template: HTML template with hyperscript attributes
            template_vars: Template variables for hyperscript substitution
            **context: Additional template context variables
            
        Returns:
            Rendered HTML with compiled JavaScript
        """
        import re
        from flask import render_template_string
        
        # First render the Jinja2 template
        rendered = render_template_string(template, **context)
        
        # Find all hyperscript attributes
        hyperscript_pattern = r'(?:_|data-hs)="([^"]*)"'
        matches = re.findall(hyperscript_pattern, rendered)
        
        if not matches:
            return rendered
        
        # Compile all found hyperscript
        scripts = {f"script_{i}": script for i, script in enumerate(matches)}
        
        try:
            compiled_scripts = asyncio.run(self.compile_scripts(
                scripts=scripts,
                template_vars=template_vars or getattr(g, 'hyperscript_template_vars', None)
            ))
            
            # Replace hyperscript with compiled JavaScript using correct event attribute
            # Note: compile_scripts returns only compiled code; we need full result for metadata
            # Re-compile to get metadata (compile_scripts is a thin wrapper)
            for i, (script_id, compiled) in enumerate(compiled_scripts.items()):
                original_script = matches[i]
                # Fallback: extract event from the original hyperscript text
                attr = _event_attr_from_source(original_script)
                escaped = escape_attr_value(compiled)
                new_attr = f'{attr}="{escaped}"'

                rendered = rendered.replace(f'_="{original_script}"', new_attr, 1)
                rendered = rendered.replace(f'data-hs="{original_script}"', new_attr, 1)
            
            return rendered
            
        except HyperfixiError as e:
            # If compilation fails, return original template with error comment
            return f"<!-- LokaScript compilation error: {e} -->\n{rendered}"


def hyperscript_filter(script: str, **options) -> str:
    """
    Standalone Jinja2 filter for hyperscript compilation
    
    Usage (after registering filter):
        {{ "on click toggle .active" | hyperscript }}
        {{ script_var | hyperscript(minify=true) }}
    """
    # Get extension from current app
    ext = current_app.extensions.get('hyperscript')
    if not ext:
        return '<!-- LokaScript extension not initialized -->'
    
    return ext.compile_hyperscript_filter(script, **options)


class HyperscriptMiddleware:
    """
    WSGI middleware for automatic hyperscript compilation in responses
    
    Example:
        from flask import Flask
        from lokascript_client.integrations.flask import HyperscriptMiddleware
        
        app = Flask(__name__)
        app.wsgi_app = HyperscriptMiddleware(
            app.wsgi_app,
            client_url="http://localhost:3000"
        )
    """
    
    def __init__(
        self,
        wsgi_app,
        client_url: str = "http://localhost:3000",
        compile_responses: bool = True,
        template_vars_header: str = "X-Hyperscript-Template-Vars"
    ):
        self.wsgi_app = wsgi_app
        self.client = HyperfixiClient(client_url)
        self.compile_responses = compile_responses
        self.template_vars_header = template_vars_header
    
    def __call__(self, environ, start_response):
        """WSGI application"""
        if not self.compile_responses:
            return self.wsgi_app(environ, start_response)
        
        # Capture response
        response_data = []
        response_headers = []
        
        def capture_start_response(status, headers, exc_info=None):
            response_headers.extend(headers)
            return start_response(status, headers, exc_info)
        
        # Get original response
        response_iter = self.wsgi_app(environ, capture_start_response)
        
        try:
            # Collect response body
            for data in response_iter:
                response_data.append(data)
            
            # Check if response is HTML
            content_type = None
            for header_name, header_value in response_headers:
                if header_name.lower() == 'content-type':
                    content_type = header_value
                    break
            
            if content_type and content_type.startswith('text/html'):
                # Compile hyperscript in HTML
                html = b''.join(response_data).decode('utf-8')
                
                # Get template variables from headers
                template_vars = None
                if self.template_vars_header.upper().replace('-', '_') in environ:
                    try:
                        template_vars = json.loads(
                            environ[self.template_vars_header.upper().replace('-', '_')]
                        )
                    except (json.JSONDecodeError, ValueError):
                        pass
                
                compiled_html = asyncio.run(self._compile_hyperscript_in_html(
                    html, template_vars
                ))
                
                return [compiled_html.encode('utf-8')]
            else:
                return response_data
                
        finally:
            if hasattr(response_iter, 'close'):
                response_iter.close()
    
    async def _compile_hyperscript_in_html(
        self, 
        html: str, 
        template_vars: Optional[Dict[str, Any]] = None
    ) -> str:
        """Extract hyperscript from HTML and compile it"""
        import re
        
        # Find all hyperscript attributes
        hyperscript_pattern = r'(?:_|data-hs)="([^"]*)"'
        matches = re.findall(hyperscript_pattern, html)
        
        if not matches:
            return html
        
        # Compile all found hyperscript
        scripts = {f"script_{i}": script for i, script in enumerate(matches)}
        
        context = None
        if template_vars:
            context = ParseContext(template_vars=template_vars)
        
        try:
            result = await self.client.compile(
                scripts=scripts,
                options=CompilationOptions(),
                context=context
            )
            
            # Replace hyperscript with compiled JavaScript using correct event attribute
            for i, (script_id, compiled) in enumerate(result.compiled.items()):
                original_script = matches[i]
                meta = result.metadata.get(script_id)
                attr = event_attribute(meta)
                escaped = escape_attr_value(compiled)
                new_attr = f'{attr}="{escaped}"'

                html = html.replace(f'_="{original_script}"', new_attr, 1)
                html = html.replace(f'data-hs="{original_script}"', new_attr, 1)
            
            return html
            
        except HyperfixiError:
            # If compilation fails, return original HTML
            return html


# Flask CLI commands
def create_cli_commands(app: Flask):
    """
    Create Flask CLI commands for LokaScript
    
    Example:
        from flask import Flask
        from lokascript_client.integrations.flask import create_cli_commands
        
        app = Flask(__name__)
        create_cli_commands(app)
        
        # Usage:
        # flask hyperscript health
        # flask hyperscript compile "on click toggle .active"
    """
    
    @app.cli.group()
    def hyperscript():
        """LokaScript commands"""
        pass
    
    @hyperscript.command()
    def health():
        """Check LokaScript service health"""
        client_url = app.config.get('LOKASCRIPT_CLIENT_URL', 'http://localhost:3000')
        client = HyperfixiClient(client_url)
        
        try:
            health_status = asyncio.run(client.health())
            print(f"Status: {health_status.status}")
            print(f"Version: {health_status.version}")
            print(f"Uptime: {health_status.uptime}ms")
            print(f"Cache: {health_status.cache.size}/{health_status.cache.max_size}")
            
        except Exception as e:
            print(f"Health check failed: {e}")
    
    @hyperscript.command()
    @app.cli.argument('script')
    def compile(script):
        """Compile hyperscript to JavaScript"""
        client_url = app.config.get('LOKASCRIPT_CLIENT_URL', 'http://localhost:3000')
        client = HyperfixiClient(client_url)
        
        try:
            result = asyncio.run(client.compile({
                'cli_script': script
            }))
            
            compiled = result.compiled.get('cli_script', '')
            print(f"Compiled: {compiled}")
            
            if result.errors:
                print("Errors:")
                for error in result.errors:
                    print(f"  Line {error.line}: {error.message}")
            
            if result.warnings:
                print("Warnings:")
                for warning in result.warnings:
                    print(f"  {warning.message}")
                    
        except Exception as e:
            print(f"Compilation failed: {e}")
    
    @hyperscript.command()
    @app.cli.argument('script')
    def validate(script):
        """Validate hyperscript syntax"""
        client_url = app.config.get('LOKASCRIPT_CLIENT_URL', 'http://localhost:3000')
        client = HyperfixiClient(client_url)
        
        try:
            result = asyncio.run(client.validate(script))
            
            if result.valid:
                print("✓ Valid hyperscript")
            else:
                print("✗ Invalid hyperscript")
                for error in result.errors:
                    print(f"  Line {error.line}: {error.message}")
                    
        except Exception as e:
            print(f"Validation failed: {e}")
    
    @hyperscript.command()
    def cache_stats():
        """Get cache statistics"""
        client_url = app.config.get('LOKASCRIPT_CLIENT_URL', 'http://localhost:3000')
        client = HyperfixiClient(client_url)
        
        try:
            stats = asyncio.run(client.cache_stats())
            print(f"Cache size: {stats.size}/{stats.max_size}")
            print(f"Hits: {stats.hits}")
            print(f"Misses: {stats.misses}")
            print(f"Hit ratio: {stats.hit_ratio:.2%}")
            
        except Exception as e:
            print(f"Failed to get cache stats: {e}")
    
    @hyperscript.command()
    def clear_cache():
        """Clear compilation cache"""
        client_url = app.config.get('LOKASCRIPT_CLIENT_URL', 'http://localhost:3000')
        client = HyperfixiClient(client_url)
        
        try:
            result = asyncio.run(client.clear_cache())
            print(result.get('message', 'Cache cleared'))
            
        except Exception as e:
            print(f"Failed to clear cache: {e}")