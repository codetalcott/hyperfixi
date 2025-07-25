"""
Exceptions for HyperFixi Python client
"""


class HyperfixiError(Exception):
    """Base exception for HyperFixi client errors"""
    pass


class CompilationError(HyperfixiError):
    """Error during hyperscript compilation"""
    
    def __init__(self, message: str, errors: list = None):
        super().__init__(message)
        self.errors = errors or []


class ValidationError(HyperfixiError):
    """Error during hyperscript validation"""
    
    def __init__(self, message: str, errors: list = None):
        super().__init__(message)
        self.errors = errors or []


class NetworkError(HyperfixiError):
    """Network-related error when communicating with HyperFixi service"""
    
    def __init__(self, message: str, status_code: int = None):
        super().__init__(message)
        self.status_code = status_code


class TimeoutError(HyperfixiError):
    """Timeout error when communicating with HyperFixi service"""
    pass


class ServiceUnavailableError(NetworkError):
    """HyperFixi service is unavailable"""
    pass


class AuthenticationError(NetworkError):
    """Authentication failed"""
    pass


class RateLimitError(NetworkError):
    """Rate limit exceeded"""
    pass