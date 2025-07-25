"""
Main HyperFixi Python client
"""

import asyncio
from typing import Dict, List, Optional, Any, Union
import httpx
from urllib.parse import urljoin

from .types import (
    CompileRequest,
    CompileResponse,
    ValidateRequest,
    ValidateResponse,
    BatchCompileRequest,
    CompilationOptions,
    ParseContext,
    HealthStatus,
    CacheStats,
)
from .exceptions import (
    HyperfixiError,
    CompilationError,
    ValidationError,
    NetworkError,
    TimeoutError,
    ServiceUnavailableError,
    AuthenticationError,
    RateLimitError,
)


class HyperfixiClient:
    """
    Python client for HyperFixi server-side hyperscript compilation
    
    Example:
        client = HyperfixiClient("http://localhost:3000")
        
        # Compile a single script
        result = await client.compile({
            "button": "on click toggle .active"
        })
        
        # Validate hyperscript
        is_valid = await client.validate("on click log 'Hello'")
    """
    
    def __init__(
        self,
        base_url: str = "http://localhost:3000",
        timeout: float = 30.0,
        retries: int = 3,
        auth_token: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None,
    ):
        """
        Initialize HyperFixi client
        
        Args:
            base_url: Base URL of HyperFixi service
            timeout: Request timeout in seconds
            retries: Number of retry attempts
            auth_token: Optional authentication token
            headers: Additional headers to send with requests
        """
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.retries = retries
        
        # Setup headers
        self._headers = {
            "Content-Type": "application/json",
            "User-Agent": "hyperfixi-python-client/0.1.0",
        }
        
        if auth_token:
            self._headers["Authorization"] = f"Bearer {auth_token}"
            
        if headers:
            self._headers.update(headers)
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Make HTTP request with error handling and retries"""
        url = urljoin(self.base_url + "/", endpoint.lstrip("/"))
        
        async with httpx.AsyncClient() as client:
            for attempt in range(self.retries + 1):
                try:
                    response = await client.request(
                        method=method,
                        url=url,
                        json=data,
                        params=params,
                        headers=self._headers,
                        timeout=self.timeout,
                    )
                    
                    if response.status_code == 200:
                        return response.json()
                    elif response.status_code == 400:
                        error_data = response.json()
                        raise NetworkError(
                            f"Bad request: {error_data.get('error', 'Unknown error')}",
                            status_code=400
                        )
                    elif response.status_code == 401:
                        raise AuthenticationError(
                            "Authentication failed",
                            status_code=401
                        )
                    elif response.status_code == 429:
                        raise RateLimitError(
                            "Rate limit exceeded",
                            status_code=429
                        )
                    elif response.status_code >= 500:
                        if attempt < self.retries:
                            await asyncio.sleep(2 ** attempt)  # Exponential backoff
                            continue
                        raise ServiceUnavailableError(
                            f"Service unavailable: {response.status_code}",
                            status_code=response.status_code
                        )
                    else:
                        raise NetworkError(
                            f"HTTP {response.status_code}: {response.text}",
                            status_code=response.status_code
                        )
                        
                except httpx.TimeoutException:
                    if attempt < self.retries:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    raise TimeoutError(f"Request timed out after {self.timeout} seconds")
                except httpx.RequestError as e:
                    if attempt < self.retries:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    raise NetworkError(f"Request failed: {str(e)}")
    
    async def compile(
        self,
        scripts: Dict[str, str],
        options: Optional[CompilationOptions] = None,
        context: Optional[ParseContext] = None,
        template_vars: Optional[Dict[str, Any]] = None,
    ) -> CompileResponse:
        """
        Compile hyperscript to JavaScript
        
        Args:
            scripts: Dictionary of script name to hyperscript code
            options: Compilation options
            context: Parse context for template processing
            template_vars: Template variables (convenience parameter)
            
        Returns:
            CompileResponse with compiled JavaScript and metadata
            
        Raises:
            CompilationError: If compilation fails
            NetworkError: If network request fails
        """
        # Handle template_vars convenience parameter
        if template_vars and context is None:
            context = ParseContext(template_vars=template_vars)
        elif template_vars and context is not None:
            if context.template_vars is None:
                context.template_vars = template_vars
            else:
                context.template_vars.update(template_vars)
        
        request = CompileRequest(
            scripts=scripts,
            options=options,
            context=context,
        )
        
        try:
            response_data = await self._request("POST", "/compile", request.dict(exclude_none=True))
            response = CompileResponse(**response_data)
            
            if response.errors:
                raise CompilationError(
                    f"Compilation failed with {len(response.errors)} errors",
                    errors=response.errors
                )
            
            return response
            
        except NetworkError:
            raise
        except Exception as e:
            raise HyperfixiError(f"Unexpected error during compilation: {str(e)}")
    
    async def validate(
        self,
        script: str,
        context: Optional[ParseContext] = None,
        template_vars: Optional[Dict[str, Any]] = None,
    ) -> ValidateResponse:
        """
        Validate hyperscript syntax
        
        Args:
            script: Hyperscript code to validate
            context: Parse context for template processing
            template_vars: Template variables (convenience parameter)
            
        Returns:
            ValidateResponse with validation results
            
        Raises:
            ValidationError: If validation fails
            NetworkError: If network request fails
        """
        # Handle template_vars convenience parameter
        if template_vars and context is None:
            context = ParseContext(template_vars=template_vars)
        elif template_vars and context is not None:
            if context.template_vars is None:
                context.template_vars = template_vars
            else:
                context.template_vars.update(template_vars)
        
        request = ValidateRequest(
            script=script,
            context=context,
        )
        
        try:
            response_data = await self._request("POST", "/validate", request.dict(exclude_none=True))
            return ValidateResponse(**response_data)
            
        except NetworkError:
            raise
        except Exception as e:
            raise HyperfixiError(f"Unexpected error during validation: {str(e)}")
    
    async def batch_compile(
        self,
        definitions: List[Dict[str, Any]],
    ) -> CompileResponse:
        """
        Compile multiple scripts in a single batch request
        
        Args:
            definitions: List of script definitions with id, script, options, context
            
        Returns:
            CompileResponse with all compiled scripts
            
        Raises:
            CompilationError: If compilation fails
            NetworkError: If network request fails
        """
        request = BatchCompileRequest(definitions=definitions)
        
        try:
            response_data = await self._request("POST", "/batch", request.dict(exclude_none=True))
            response = CompileResponse(**response_data)
            
            if response.errors:
                raise CompilationError(
                    f"Batch compilation failed with {len(response.errors)} errors",
                    errors=response.errors
                )
            
            return response
            
        except NetworkError:
            raise
        except Exception as e:
            raise HyperfixiError(f"Unexpected error during batch compilation: {str(e)}")
    
    async def health(self) -> HealthStatus:
        """
        Get service health status
        
        Returns:
            HealthStatus with service information
            
        Raises:
            NetworkError: If network request fails
        """
        try:
            response_data = await self._request("GET", "/health")
            return HealthStatus(**response_data)
            
        except NetworkError:
            raise
        except Exception as e:
            raise HyperfixiError(f"Unexpected error getting health status: {str(e)}")
    
    async def cache_stats(self) -> CacheStats:
        """
        Get cache statistics
        
        Returns:
            CacheStats with cache information
            
        Raises:
            NetworkError: If network request fails
        """
        try:
            response_data = await self._request("GET", "/cache/stats")
            return CacheStats(**response_data)
            
        except NetworkError:
            raise
        except Exception as e:
            raise HyperfixiError(f"Unexpected error getting cache stats: {str(e)}")
    
    async def clear_cache(self) -> Dict[str, str]:
        """
        Clear the compilation cache
        
        Returns:
            Response message
            
        Raises:
            NetworkError: If network request fails
        """
        try:
            return await self._request("POST", "/cache/clear")
            
        except NetworkError:
            raise
        except Exception as e:
            raise HyperfixiError(f"Unexpected error clearing cache: {str(e)}")
    
    # Synchronous wrapper methods
    def compile_sync(self, *args, **kwargs) -> CompileResponse:
        """Synchronous version of compile()"""
        return asyncio.run(self.compile(*args, **kwargs))
    
    def validate_sync(self, *args, **kwargs) -> ValidateResponse:
        """Synchronous version of validate()"""
        return asyncio.run(self.validate(*args, **kwargs))
    
    def batch_compile_sync(self, *args, **kwargs) -> CompileResponse:
        """Synchronous version of batch_compile()"""
        return asyncio.run(self.batch_compile(*args, **kwargs))
    
    def health_sync(self) -> HealthStatus:
        """Synchronous version of health()"""
        return asyncio.run(self.health())
    
    def cache_stats_sync(self) -> CacheStats:
        """Synchronous version of cache_stats()"""
        return asyncio.run(self.cache_stats())
    
    def clear_cache_sync(self) -> Dict[str, str]:
        """Synchronous version of clear_cache()"""
        return asyncio.run(self.clear_cache())