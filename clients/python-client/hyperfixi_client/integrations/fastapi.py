"""
FastAPI integration for LokaScript Python client
"""

import asyncio
from typing import Dict, Optional, Any, Callable, List
from fastapi import Request, Response, Depends
from fastapi.middleware.base import BaseHTTPMiddleware
from starlette.middleware.base import RequestResponseEndpoint
from starlette.responses import Response as StarletteResponse

from ..client import HyperfixiClient
from ..types import CompilationOptions, ParseContext, event_attribute, escape_attr_value
from ..exceptions import HyperfixiError


class FastAPIHyperscriptMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware for automatic hyperscript compilation
    
    Example:
        from fastapi import FastAPI
        from lokascript_client.integrations.fastapi import FastAPIHyperscriptMiddleware
        
        app = FastAPI()
        app.add_middleware(
            FastAPIHyperscriptMiddleware,
            client_url="http://localhost:3000",
            compile_on_response=True
        )
    """
    
    def __init__(
        self,
        app,
        client_url: str = "http://localhost:3000",
        compile_on_response: bool = True,
        template_vars_header: str = "X-Hyperscript-Template-Vars",
        compilation_options: Optional[CompilationOptions] = None,
        error_handler: Optional[Callable] = None,
    ):
        super().__init__(app)
        self.client = HyperfixiClient(client_url)
        self.compile_on_response = compile_on_response
        self.template_vars_header = template_vars_header
        self.compilation_options = compilation_options or CompilationOptions()
        self.error_handler = error_handler or self._default_error_handler
    
    async def dispatch(
        self, 
        request: Request, 
        call_next: RequestResponseEndpoint
    ) -> StarletteResponse:
        """Process request and potentially compile hyperscript in response"""
        
        # Add hyperscript client to request state
        request.state.hyperscript = self.client
        
        # Get template variables from header if present
        template_vars = None
        if self.template_vars_header in request.headers:
            try:
                import json
                template_vars = json.loads(request.headers[self.template_vars_header])
            except (json.JSONDecodeError, ValueError):
                pass
        
        request.state.hyperscript_template_vars = template_vars
        
        # Process the request
        response = await call_next(request)
        
        # Compile hyperscript in HTML responses if enabled
        if (
            self.compile_on_response 
            and hasattr(response, 'body')
            and response.headers.get('content-type', '').startswith('text/html')
        ):
            try:
                # Extract and compile hyperscript from response body
                body = response.body.decode('utf-8')
                compiled_body = await self._compile_hyperscript_in_html(
                    body, 
                    template_vars
                )
                
                # Create new response with compiled content
                return Response(
                    content=compiled_body,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type=response.headers.get('content-type', 'text/html')
                )
                
            except Exception as e:
                return self.error_handler(e, request, response)
        
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
    
    def _default_error_handler(
        self, 
        error: Exception, 
        request: Request, 
        response: Response
    ) -> Response:
        """Default error handler - logs error and returns original response"""
        print(f"LokaScript middleware error: {error}")
        return response


class HyperscriptDependency:
    """
    FastAPI dependency for hyperscript compilation
    
    Example:
        from fastapi import FastAPI, Depends
        from lokascript_client.integrations.fastapi import hyperscript_dependency
        
        app = FastAPI()
        
        @app.get("/")
        async def home(hyperscript: HyperfixiClient = Depends(hyperscript_dependency)):
            result = await hyperscript.compile({"button": "on click toggle .active"})
            return {"compiled": result.compiled}
    """
    
    def __init__(self, client_url: str = "http://localhost:3000"):
        self.client = HyperfixiClient(client_url)
    
    async def __call__(self) -> HyperfixiClient:
        return self.client


# Global dependency instance
hyperscript_dependency = HyperscriptDependency()


def configure_hyperscript_dependency(client_url: str = "http://localhost:3000"):
    """Configure the global hyperscript dependency"""
    global hyperscript_dependency
    hyperscript_dependency = HyperscriptDependency(client_url)


async def compile_hyperscript_template(
    template: str,
    template_vars: Optional[Dict[str, Any]] = None,
    options: Optional[CompilationOptions] = None,
    client: HyperfixiClient = Depends(hyperscript_dependency),
) -> Dict[str, str]:
    """
    FastAPI dependency for compiling hyperscript templates
    
    Args:
        template: HTML template with hyperscript attributes
        template_vars: Template variables for substitution
        options: Compilation options
        client: LokaScript client instance
        
    Returns:
        Dictionary mapping script IDs to compiled JavaScript
    """
    import re
    
    # Extract hyperscript from template
    hyperscript_pattern = r'(?:_|data-hs)="([^"]*)"'
    matches = re.findall(hyperscript_pattern, template)
    
    if not matches:
        return {}
    
    scripts = {f"script_{i}": script for i, script in enumerate(matches)}
    
    context = None
    if template_vars:
        context = ParseContext(template_vars=template_vars)
    
    result = await client.compile(
        scripts=scripts,
        options=options or CompilationOptions(),
        context=context
    )
    
    return result.compiled


class HyperscriptTemplateRenderer:
    """
    Template renderer with automatic hyperscript compilation
    
    Example:
        from fastapi import FastAPI
        from lokascript_client.integrations.fastapi import HyperscriptTemplateRenderer
        
        app = FastAPI()
        renderer = HyperscriptTemplateRenderer("http://localhost:3000")
        
        @app.get("/")
        async def home():
            return await renderer.render_template(
                '<button _="on click toggle .active">Click me</button>',
                template_vars={"user_id": 123}
            )
    """
    
    def __init__(self, client_url: str = "http://localhost:3000"):
        self.client = HyperfixiClient(client_url)
    
    async def render_template(
        self,
        template: str,
        template_vars: Optional[Dict[str, Any]] = None,
        options: Optional[CompilationOptions] = None,
    ) -> str:
        """
        Render template with compiled hyperscript
        
        Args:
            template: HTML template with hyperscript attributes
            template_vars: Template variables for substitution
            options: Compilation options
            
        Returns:
            Rendered HTML with compiled JavaScript
        """
        import re
        
        # Find all hyperscript attributes
        hyperscript_pattern = r'(?:_|data-hs)="([^"]*)"'
        matches = re.findall(hyperscript_pattern, template)
        
        if not matches:
            return template
        
        # Compile all found hyperscript
        scripts = {f"script_{i}": script for i, script in enumerate(matches)}
        
        context = None
        if template_vars:
            context = ParseContext(template_vars=template_vars)
        
        try:
            result = await self.client.compile(
                scripts=scripts,
                options=options or CompilationOptions(),
                context=context
            )
            
            # Replace hyperscript with compiled JavaScript using correct event attribute
            rendered_template = template
            for i, (script_id, compiled) in enumerate(result.compiled.items()):
                original_script = matches[i]
                meta = result.metadata.get(script_id)
                attr = event_attribute(meta)
                escaped = escape_attr_value(compiled)
                new_attr = f'{attr}="{escaped}"'

                rendered_template = rendered_template.replace(f'_="{original_script}"', new_attr, 1)
                rendered_template = rendered_template.replace(f'data-hs="{original_script}"', new_attr, 1)
            
            return rendered_template
            
        except HyperfixiError as e:
            # If compilation fails, return original template with error comment
            return f"<!-- LokaScript compilation error: {e} -->\n{template}"


# FastAPI response models for API endpoints
from pydantic import BaseModel

class HyperscriptCompileRequest(BaseModel):
    """Request model for hyperscript compilation endpoint"""
    scripts: Dict[str, str]
    template_vars: Optional[Dict[str, Any]] = None
    options: Optional[CompilationOptions] = None


class HyperscriptValidateRequest(BaseModel):
    """Request model for hyperscript validation endpoint"""
    script: str 
    template_vars: Optional[Dict[str, Any]] = None


def create_hyperscript_routes(app, client_url: str = "http://localhost:3000"):
    """
    Add hyperscript compilation routes to FastAPI app
    
    Example:
        from fastapi import FastAPI
        from lokascript_client.integrations.fastapi import create_hyperscript_routes
        
        app = FastAPI()
        create_hyperscript_routes(app, "http://localhost:3000")
    """
    client = HyperfixiClient(client_url)
    
    @app.post("/hyperscript/compile")
    async def compile_hyperscript(request: HyperscriptCompileRequest):
        """Compile hyperscript to JavaScript"""
        context = None
        if request.template_vars:
            context = ParseContext(template_vars=request.template_vars)
        
        result = await client.compile(
            scripts=request.scripts,
            options=request.options,
            context=context
        )
        return result
    
    @app.post("/hyperscript/validate")
    async def validate_hyperscript(request: HyperscriptValidateRequest):
        """Validate hyperscript syntax"""
        context = None
        if request.template_vars:
            context = ParseContext(template_vars=request.template_vars)
        
        result = await client.validate(
            script=request.script,
            context=context
        )
        return result
    
    @app.get("/hyperscript/health")
    async def hyperscript_health():
        """Get LokaScript service health"""
        return await client.health()
    
    @app.get("/hyperscript/cache/stats")
    async def hyperscript_cache_stats():
        """Get LokaScript cache statistics"""
        return await client.cache_stats()
    
    @app.post("/hyperscript/cache/clear")
    async def hyperscript_clear_cache():
        """Clear LokaScript cache"""
        return await client.clear_cache()