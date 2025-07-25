"""
Django integration for HyperFixi Python client
"""

from typing import Dict, Optional, Any
from django.template import Library, Node, TemplateSyntaxError
from django.template.base import FilterExpression
from django.utils.safestring import mark_safe
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
import asyncio
import json

from ..client import HyperfixiClient
from ..types import CompilationOptions, ParseContext
from ..exceptions import HyperfixiError


class DjangoHyperscriptMiddleware(MiddlewareMixin):
    """
    Django middleware for automatic hyperscript compilation
    
    Add to MIDDLEWARE in settings.py:
        MIDDLEWARE = [
            ...
            'hyperfixi_client.integrations.django.DjangoHyperscriptMiddleware',
        ]
    
    Configure in settings.py:
        HYPERFIXI = {
            'CLIENT_URL': 'http://localhost:3000',
            'COMPILE_ON_RESPONSE': True,
            'TEMPLATE_VARS_HEADER': 'X-Hyperscript-Template-Vars',
            'COMPILATION_OPTIONS': {
                'minify': True,
                'compatibility': 'modern'
            }
        }
    """
    
    def __init__(self, get_response):
        super().__init__(get_response)
        
        # Get configuration from Django settings
        hyperfixi_config = getattr(settings, 'HYPERFIXI', {})
        
        client_url = hyperfixi_config.get('CLIENT_URL', 'http://localhost:3000')
        self.client = HyperfixiClient(client_url)
        
        self.compile_on_response = hyperfixi_config.get('COMPILE_ON_RESPONSE', True)
        self.template_vars_header = hyperfixi_config.get(
            'TEMPLATE_VARS_HEADER', 
            'X-Hyperscript-Template-Vars'
        )
        
        options_dict = hyperfixi_config.get('COMPILATION_OPTIONS', {})
        self.compilation_options = CompilationOptions(**options_dict)
    
    def process_request(self, request):
        """Add hyperscript client to request"""
        request.hyperscript = self.client
        
        # Parse template variables from header
        if self.template_vars_header in request.META:
            try:
                request.hyperscript_template_vars = json.loads(
                    request.META[self.template_vars_header]
                )
            except (json.JSONDecodeError, ValueError):
                request.hyperscript_template_vars = None
        else:
            request.hyperscript_template_vars = None
    
    def process_response(self, request, response):
        """Compile hyperscript in HTML responses if enabled"""
        if (
            self.compile_on_response
            and response.get('Content-Type', '').startswith('text/html')
            and hasattr(response, 'content')
        ):
            try:
                # Extract and compile hyperscript from response content
                html = response.content.decode('utf-8')
                compiled_html = asyncio.run(self._compile_hyperscript_in_html(
                    html,
                    getattr(request, 'hyperscript_template_vars', None)
                ))
                
                response.content = compiled_html.encode('utf-8')
                
            except Exception as e:
                # Log error but don't break the response
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"HyperFixi middleware error: {e}")
        
        return response
    
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
                options=self.compilation_options,
                context=context
            )
            
            # Replace hyperscript with compiled JavaScript
            for i, (script_id, compiled) in enumerate(result.compiled.items()):
                original_script = matches[i]
                
                # Replace hyperscript attribute with onclick handler
                old_attr = f'_="{original_script}"'
                new_attr = f'onclick="{compiled}"'
                html = html.replace(old_attr, new_attr, 1)
                
                # Also handle data-hs attributes
                old_attr = f'data-hs="{original_script}"'
                html = html.replace(old_attr, new_attr, 1)
            
            return html
            
        except HyperfixiError:
            # If compilation fails, return original HTML
            return html


# Django template tags
register = Library()


class HyperscriptNode(Node):
    """Template node for hyperscript compilation"""
    
    def __init__(self, script_expr, var_name=None, options=None):
        self.script_expr = script_expr
        self.var_name = var_name
        self.options = options or {}
    
    def render(self, context):
        """Render compiled hyperscript"""
        script = self.script_expr.resolve(context)
        
        # Get client from request
        request = context.get('request')
        if not request or not hasattr(request, 'hyperscript'):
            return f'<!-- HyperFixi client not available -->'
        
        client = request.hyperscript
        
        # Get template variables from context
        template_vars = getattr(request, 'hyperscript_template_vars', None)
        if not template_vars:
            template_vars = {}
            # Add common Django context variables
            for key in ['user', 'request', 'csrf_token']:
                if key in context:
                    template_vars[key] = str(context[key])
        
        try:
            # Compile hyperscript
            parse_context = ParseContext(template_vars=template_vars)
            options = CompilationOptions(**self.options)
            
            result = asyncio.run(client.compile(
                scripts={'template_script': script},
                options=options,
                context=parse_context
            ))
            
            compiled = result.compiled.get('template_script', '')
            
            if self.var_name:
                # Store in context variable
                context[self.var_name] = compiled
                return ''
            else:
                # Return as onclick attribute
                return mark_safe(f'onclick="{compiled}"')
                
        except Exception as e:
            error_msg = f'<!-- HyperFixi compilation error: {e} -->'
            if self.var_name:
                context[self.var_name] = error_msg
                return ''
            return error_msg


@register.tag
def hyperscript(parser, token):
    """
    Compile hyperscript in Django templates
    
    Usage:
        {% hyperscript "on click toggle .active" %}
        {% hyperscript "on click log 'Hello'" as my_script %}
        {% hyperscript script_variable minify=True %}
    """
    bits = token.split_contents()
    
    if len(bits) < 2:
        raise TemplateSyntaxError("hyperscript tag requires at least one argument")
    
    script_expr = parser.compile_filter(bits[1])
    var_name = None
    options = {}
    
    # Parse additional arguments
    i = 2
    while i < len(bits):
        if bits[i] == 'as':
            if i + 1 >= len(bits):
                raise TemplateSyntaxError("hyperscript tag 'as' requires a variable name")
            var_name = bits[i + 1]
            i += 2
        elif '=' in bits[i]:
            # Parse option
            key, value = bits[i].split('=', 1)
            if value.lower() in ('true', 'false'):
                options[key] = value.lower() == 'true'
            else:
                try:
                    options[key] = json.loads(value)
                except json.JSONDecodeError:
                    options[key] = value.strip('"\'')
            i += 1
        else:
            raise TemplateSyntaxError(f"Unknown hyperscript tag argument: {bits[i]}")
    
    return HyperscriptNode(script_expr, var_name, options)


@register.simple_tag(takes_context=True)
def hyperscript_tag(context, script, **options):
    """
    Simple tag for hyperscript compilation
    
    Usage:
        {% hyperscript_tag "on click toggle .active" %}
        {% hyperscript_tag "on click log 'Hello'" minify=True %}
    """
    # Get client from request
    request = context.get('request')
    if not request or not hasattr(request, 'hyperscript'):
        return mark_safe('<!-- HyperFixi client not available -->')
    
    client = request.hyperscript
    
    # Get template variables
    template_vars = getattr(request, 'hyperscript_template_vars', {})
    
    try:
        # Compile hyperscript
        parse_context = ParseContext(template_vars=template_vars)
        compilation_options = CompilationOptions(**options)
        
        result = asyncio.run(client.compile(
            scripts={'tag_script': script},
            options=compilation_options,
            context=parse_context
        ))
        
        compiled = result.compiled.get('tag_script', '')
        return mark_safe(f'onclick="{compiled}"')
        
    except Exception as e:
        return mark_safe(f'<!-- HyperFixi compilation error: {e} -->')


@register.filter
def compile_hyperscript(script, options=None):
    """
    Filter for compiling hyperscript
    
    Usage:
        {{ "on click toggle .active"|compile_hyperscript }}
        {{ script_variable|compile_hyperscript:"minify=true" }}
    """
    # This is a simplified version that requires the client to be available globally
    # In a real implementation, you'd want to access it from the request context
    
    try:
        from django.conf import settings
        hyperfixi_config = getattr(settings, 'HYPERFIXI', {})
        client_url = hyperfixi_config.get('CLIENT_URL', 'http://localhost:3000')
        
        client = HyperfixiClient(client_url)
        
        # Parse options if provided
        compilation_options = CompilationOptions()
        if options:
            option_dict = {}
            for option in options.split(','):
                if '=' in option:
                    key, value = option.split('=', 1)
                    if value.lower() in ('true', 'false'):
                        option_dict[key.strip()] = value.lower() == 'true'
                    else:
                        option_dict[key.strip()] = value.strip()
            compilation_options = CompilationOptions(**option_dict)
        
        result = asyncio.run(client.compile(
            scripts={'filter_script': script},
            options=compilation_options
        ))
        
        compiled = result.compiled.get('filter_script', '')
        return mark_safe(f'onclick="{compiled}"')
        
    except Exception as e:
        return mark_safe(f'<!-- HyperFixi compilation error: {e} -->')


# Django management command for testing HyperFixi connection
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    """
    Django management command to test HyperFixi connection
    
    Usage:
        python manage.py test_hyperfixi
    """
    help = 'Test connection to HyperFixi service'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--url',
            type=str,
            default='http://localhost:3000',
            help='HyperFixi service URL'
        )
    
    def handle(self, *args, **options):
        client = HyperfixiClient(options['url'])
        
        try:
            health = asyncio.run(client.health())
            self.stdout.write(
                self.style.SUCCESS(f'HyperFixi service is healthy: {health.status}')
            )
            self.stdout.write(f'Version: {health.version}')
            self.stdout.write(f'Uptime: {health.uptime}ms')
            self.stdout.write(f'Cache size: {health.cache.size}/{health.cache.max_size}')
            
            # Test compilation
            result = asyncio.run(client.compile({
                'test': 'on click log "Hello from Django!"'
            }))
            self.stdout.write(
                self.style.SUCCESS('Test compilation successful')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'HyperFixi connection failed: {e}')
            )