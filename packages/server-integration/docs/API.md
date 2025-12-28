# HyperFixi API Reference

## Base URL

```
https://api.hyperfixi.dev/v1
```

For local development:
```
http://localhost:3000
```

## Authentication

All API requests (except `/health`) require an API key in the `X-API-Key` header.

```bash
curl -H "X-API-Key: hfx_your_api_key_here" https://api.hyperfixi.dev/v1/compile
```

API keys are prefixed with `hfx_` and are tied to your subscription tier.

## Endpoints

### POST /api/compile

Compile one or more hyperscript snippets to JavaScript.

#### Request

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-API-Key` | Yes | Your API key |
| `Content-Type` | Yes | Must be `application/json` |

**Body:**
```json
{
  "scripts": {
    "scriptName": "hyperscript code",
    "anotherScript": "more hyperscript"
  },
  "options": {
    "minify": true,
    "sourceMap": false,
    "language": "en"
  }
}
```

**Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minify` | boolean | `true` | Minify output JavaScript |
| `sourceMap` | boolean | `false` | Generate source maps |
| `language` | string | `"en"` | Input language (en, ja, es, etc.) |

#### Response

**Success (200):**
```json
{
  "success": true,
  "compiled": {
    "scriptName": "(function(){ /* compiled JavaScript */ })();",
    "anotherScript": "(function(){ /* compiled JavaScript */ })();"
  },
  "metadata": {
    "scriptName": {
      "events": ["click", "keydown"],
      "commands": ["toggle", "add", "remove"],
      "selectors": ["#myElement", ".active"],
      "dependencies": []
    }
  },
  "timing": {
    "totalMs": 15,
    "perScript": {
      "scriptName": 8,
      "anotherScript": 7
    }
  }
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "errors": [
    {
      "script": "scriptName",
      "message": "Unexpected token at line 1, column 15",
      "line": 1,
      "column": 15
    }
  ]
}
```

**Authentication Error (401):**
```json
{
  "error": "Invalid API key",
  "message": "The provided API key is not valid or has been revoked"
}
```

**Rate Limit Error (429):**
```json
{
  "error": "Rate limit exceeded",
  "message": "You have exceeded 60 requests per minute",
  "limit": 60,
  "remaining": 0,
  "resetIn": 45,
  "tier": "free",
  "upgrade": "https://hyperfixi.dev/pricing"
}
```

### GET /health

Health check endpoint. Does not require authentication.

#### Response

**Success (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-28T00:00:00.000Z"
}
```

## Rate Limiting

Rate limits are enforced per API key based on subscription tier:

| Tier | Requests/Minute | Monthly Compiles | Burst Capacity |
|------|-----------------|------------------|----------------|
| Free | 60 | 1,000 | 10 |
| Pro | 600 | Unlimited | 100 |
| Team | 3,000 | Unlimited | 500 |

### Rate Limit Headers

Every response includes these headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed per window |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset` | Unix timestamp when window resets |
| `X-RateLimit-Policy` | Rate limit policy (e.g., `60;w=60`) |

When rate limited, the response also includes:
| Header | Description |
|--------|-------------|
| `Retry-After` | Seconds until you can retry |

## Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Missing request body` | No JSON body provided |
| 400 | `Invalid request format` | Body is not valid JSON |
| 400 | `Missing scripts field` | Request body missing `scripts` |
| 400 | `Invalid signature` | Webhook signature verification failed |
| 401 | `Missing API key` | No `X-API-Key` header |
| 401 | `Invalid API key format` | Key doesn't start with `hfx_` |
| 401 | `Invalid API key` | Key not found or revoked |
| 403 | `Insufficient permissions` | Tier doesn't allow this operation |
| 429 | `Rate limit exceeded` | Too many requests |
| 500 | `Compilation failed` | Internal compiler error |
| 500 | `Authentication failed` | Database error during auth |

## Supported Languages

The `language` option supports:

| Code | Language | Example |
|------|----------|---------|
| `en` | English | `on click toggle .active` |
| `ja` | Japanese | `クリック で .active を トグル` |
| `es` | Spanish | `al hacer clic alternar .active` |
| `ko` | Korean | `클릭 시 .active 토글` |
| `zh` | Chinese | `点击时 切换 .active` |
| `ar` | Arabic | `عند النقر بدل .active` |
| `de` | German | `bei klick umschalten .active` |
| `fr` | French | `au clic basculer .active` |
| `pt` | Portuguese | `ao clicar alternar .active` |
| `tr` | Turkish | `tiklayinca .active degistir` |
| `id` | Indonesian | `saat klik toggle .active` |

## Webhooks

Stripe webhooks are received at `/webhooks/stripe`. The following events are handled:

| Event | Action |
|-------|--------|
| `customer.subscription.created` | Create/upgrade API key |
| `customer.subscription.updated` | Update tier |
| `customer.subscription.deleted` | Downgrade to free |
| `invoice.paid` | Reset usage counter |
| `invoice.payment_failed` | Log failure (grace period) |

## SDKs

### TypeScript/JavaScript

```typescript
import { HyperFixiClient } from '@hyperfixi/client';

const client = new HyperFixiClient({
  apiKey: 'hfx_your_api_key',
});

const result = await client.compile({
  scripts: {
    main: 'on click toggle .active',
  },
});

console.log(result.compiled.main);
```

### cURL

```bash
curl -X POST https://api.hyperfixi.dev/v1/compile \
  -H "X-API-Key: hfx_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"scripts":{"main":"on click toggle .active"}}'
```

## Best Practices

1. **Batch requests**: Compile multiple scripts in a single request to reduce latency
2. **Cache responses**: Compiled JavaScript is deterministic; cache based on input hash
3. **Handle rate limits**: Implement exponential backoff on 429 responses
4. **Use source maps**: Enable in development for easier debugging
5. **Validate locally**: Use `@hyperfixi/core` for local validation before API calls
