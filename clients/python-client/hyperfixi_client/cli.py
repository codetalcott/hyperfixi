"""
CLI interface for LokaScript Python client
"""

import asyncio
import json
import sys
from typing import Dict, Any, Optional
import argparse

from .client import HyperfixiClient
from .types import CompilationOptions, ParseContext
from .exceptions import HyperfixiError


def create_parser() -> argparse.ArgumentParser:
    """Create argument parser for CLI"""
    parser = argparse.ArgumentParser(
        prog='lokascript',
        description='LokaScript Python Client - Server-side hyperscript compilation'
    )
    
    parser.add_argument(
        '--url',
        default='http://localhost:3000',
        help='LokaScript service URL (default: http://localhost:3000)'
    )
    
    parser.add_argument(
        '--timeout',
        type=float,
        default=30.0,
        help='Request timeout in seconds (default: 30)'
    )
    
    parser.add_argument(
        '--retries',
        type=int,
        default=3,
        help='Number of retry attempts (default: 3)'
    )
    
    parser.add_argument(
        '--auth-token',
        help='Authentication token'
    )
    
    parser.add_argument(
        '--template-vars',
        help='Template variables as JSON string'
    )
    
    parser.add_argument(
        '--minify',
        action='store_true',
        help='Minify compiled JavaScript'
    )
    
    parser.add_argument(
        '--compatibility',
        choices=['modern', 'legacy'],
        default='modern',
        help='JavaScript compatibility mode (default: modern)'
    )
    
    parser.add_argument(
        '--source-map',
        action='store_true',
        help='Generate source maps'
    )
    
    parser.add_argument(
        '--optimization',
        action='store_true',
        help='Enable optimization'
    )
    
    # Subcommands
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Health command
    health_parser = subparsers.add_parser('health', help='Check service health')
    
    # Compile command
    compile_parser = subparsers.add_parser('compile', help='Compile hyperscript')
    compile_parser.add_argument(
        'scripts',
        nargs='+',
        help='Hyperscript to compile (use name=script format for multiple)'
    )
    compile_parser.add_argument(
        '--output',
        choices=['json', 'js', 'onclick'],
        default='onclick',
        help='Output format (default: onclick)'
    )
    
    # Validate command
    validate_parser = subparsers.add_parser('validate', help='Validate hyperscript')
    validate_parser.add_argument('script', help='Hyperscript to validate')
    
    # Batch command
    batch_parser = subparsers.add_parser('batch', help='Batch compile scripts')
    batch_parser.add_argument(
        'file',
        help='JSON file with script definitions'
    )
    
    # Cache commands
    cache_parser = subparsers.add_parser('cache', help='Cache management')
    cache_subparsers = cache_parser.add_subparsers(dest='cache_command')
    
    cache_subparsers.add_parser('stats', help='Get cache statistics')
    cache_subparsers.add_parser('clear', help='Clear cache')
    
    return parser


def parse_template_vars(template_vars_str: Optional[str]) -> Optional[Dict[str, Any]]:
    """Parse template variables from JSON string"""
    if not template_vars_str:
        return None
    
    try:
        return json.loads(template_vars_str)
    except json.JSONDecodeError as e:
        print(f"Error parsing template variables: {e}", file=sys.stderr)
        sys.exit(1)


def parse_scripts(script_args: list) -> Dict[str, str]:
    """Parse script arguments into name=script dictionary"""
    scripts = {}
    
    for i, arg in enumerate(script_args):
        if '=' in arg:
            name, script = arg.split('=', 1)
            scripts[name] = script
        else:
            scripts[f'script_{i}'] = arg
    
    return scripts


async def cmd_health(client: HyperfixiClient, args) -> int:
    """Handle health command"""
    try:
        health = await client.health()
        
        print(f"Status: {health.status}")
        print(f"Version: {health.version}")
        print(f"Uptime: {health.uptime}ms")
        print(f"Cache: {health.cache.size}/{health.cache.max_size} "
              f"(hit ratio: {health.cache.hit_ratio:.2%})")
        
        return 0
        
    except HyperfixiError as e:
        print(f"Health check failed: {e}", file=sys.stderr)
        return 1


async def cmd_compile(client: HyperfixiClient, args) -> int:
    """Handle compile command"""
    try:
        scripts = parse_scripts(args.scripts)
        template_vars = parse_template_vars(args.template_vars)
        
        options = CompilationOptions(
            minify=args.minify,
            compatibility=args.compatibility,
            source_map=args.source_map,
            optimization=args.optimization
        )
        
        context = None
        if template_vars:
            context = ParseContext(template_vars=template_vars)
        
        result = await client.compile(
            scripts=scripts,
            options=options,
            context=context
        )
        
        # Handle output format
        if args.output == 'json':
            print(json.dumps(result.dict(), indent=2))
        elif args.output == 'js':
            for name, compiled in result.compiled.items():
                if len(result.compiled) > 1:
                    print(f"// {name}")
                print(compiled)
                if len(result.compiled) > 1:
                    print()
        else:  # event handler attribute format
            for name, compiled in result.compiled.items():
                meta = result.metadata.get(name)
                attr = "onclick"
                if meta and meta.events:
                    attr = "on" + meta.events[0]
                if len(result.compiled) > 1:
                    print(f'{name}: {attr}="{compiled}"')
                else:
                    print(f'{attr}="{compiled}"')
        
        # Show warnings and errors
        if result.warnings:
            print("\nWarnings:", file=sys.stderr)
            for warning in result.warnings:
                print(f"  {warning.message}", file=sys.stderr)
        
        if result.errors:
            print("\nErrors:", file=sys.stderr)
            for error in result.errors:
                print(f"  Line {error.line}: {error.message}", file=sys.stderr)
            return 1
        
        return 0
        
    except HyperfixiError as e:
        print(f"Compilation failed: {e}", file=sys.stderr)
        return 1


async def cmd_validate(client: HyperfixiClient, args) -> int:
    """Handle validate command"""
    try:
        template_vars = parse_template_vars(args.template_vars)
        
        context = None
        if template_vars:
            context = ParseContext(template_vars=template_vars)
        
        result = await client.validate(
            script=args.script,
            context=context
        )
        
        if result.valid:
            print("✓ Valid hyperscript")
            
            # Show metadata if available
            if result.metadata:
                print(f"Events: {', '.join(result.metadata.events)}")
                print(f"Commands: {', '.join(result.metadata.commands)}")
                print(f"Selectors: {', '.join(result.metadata.selectors)}")
                print(f"Complexity: {result.metadata.complexity}")
        else:
            print("✗ Invalid hyperscript")
            for error in result.errors:
                print(f"  Line {error.line}: {error.message}")
            return 1
        
        # Show warnings
        if result.warnings:
            print("Warnings:")
            for warning in result.warnings:
                print(f"  {warning.message}")
        
        return 0
        
    except HyperfixiError as e:
        print(f"Validation failed: {e}", file=sys.stderr)
        return 1


async def cmd_batch(client: HyperfixiClient, args) -> int:
    """Handle batch command"""
    try:
        # Read batch file
        with open(args.file, 'r') as f:
            batch_data = json.load(f)
        
        if not isinstance(batch_data, list):
            print("Batch file must contain a list of script definitions", file=sys.stderr)
            return 1
        
        result = await client.batch_compile(batch_data)
        
        print(f"Compiled {len(result.compiled)} scripts:")
        for name, compiled in result.compiled.items():
            meta = result.metadata.get(name)
            attr = "onclick"
            if meta and meta.events:
                attr = "on" + meta.events[0]
            print(f'  {name}: {attr}="{compiled}"')
        
        # Show warnings and errors
        if result.warnings:
            print("\nWarnings:")
            for warning in result.warnings:
                print(f"  {warning.message}")
        
        if result.errors:
            print("\nErrors:")
            for error in result.errors:
                print(f"  Line {error.line}: {error.message}")
            return 1
        
        return 0
        
    except FileNotFoundError:
        print(f"Batch file not found: {args.file}", file=sys.stderr)
        return 1
    except json.JSONDecodeError as e:
        print(f"Invalid JSON in batch file: {e}", file=sys.stderr)
        return 1
    except HyperfixiError as e:
        print(f"Batch compilation failed: {e}", file=sys.stderr)
        return 1


async def cmd_cache_stats(client: HyperfixiClient, args) -> int:
    """Handle cache stats command"""
    try:
        stats = await client.cache_stats()
        
        print(f"Cache size: {stats.size}/{stats.max_size}")
        print(f"Hits: {stats.hits}")
        print(f"Misses: {stats.misses}")
        print(f"Hit ratio: {stats.hit_ratio:.2%}")
        
        return 0
        
    except HyperfixiError as e:
        print(f"Failed to get cache stats: {e}", file=sys.stderr)
        return 1


async def cmd_cache_clear(client: HyperfixiClient, args) -> int:
    """Handle cache clear command"""
    try:
        result = await client.clear_cache()
        print(result.get('message', 'Cache cleared successfully'))
        return 0
        
    except HyperfixiError as e:
        print(f"Failed to clear cache: {e}", file=sys.stderr)
        return 1


async def main() -> int:
    """Main CLI entry point"""
    parser = create_parser()
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    # Create client
    client = HyperfixiClient(
        base_url=args.url,
        timeout=args.timeout,
        retries=args.retries,
        auth_token=args.auth_token
    )
    
    # Route to command handlers
    if args.command == 'health':
        return await cmd_health(client, args)
    elif args.command == 'compile':
        return await cmd_compile(client, args)
    elif args.command == 'validate':
        return await cmd_validate(client, args)
    elif args.command == 'batch':
        return await cmd_batch(client, args)
    elif args.command == 'cache':
        if args.cache_command == 'stats':
            return await cmd_cache_stats(client, args)
        elif args.cache_command == 'clear':
            return await cmd_cache_clear(client, args)
        else:
            parser.print_help()
            return 1
    else:
        parser.print_help()
        return 1


def cli_main():
    """Synchronous CLI entry point"""
    try:
        return asyncio.run(main())
    except KeyboardInterrupt:
        print("\nInterrupted", file=sys.stderr)
        return 130
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(cli_main())