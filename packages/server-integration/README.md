# @hyperfixi/server-integration

Server-side hyperscript compilation API with enterprise features: API key authentication, tiered rate limiting, Stripe billing integration, and usage tracking.

## Features

- **Hyperscript Compilation**: Compile hyperscript to optimized JavaScript via HTTP API
- **API Key Authentication**: Secure access with hashed API keys and tiered permissions
- **Rate Limiting**: Tier-based rate limits (free: 60/min, pro: 600/min, team: 3000/min)
- **Stripe Billing**: Usage-based metering, webhook handlers, subscription management
- **Usage Tracking**: Per-request logging with response times and error counts
- **PostgreSQL Storage**: Persistent storage for keys, usage logs, and billing events

## Installation

```bash
npm install @hyperfixi/server-integration
```

## Quick Start

```typescript
import { HyperfixiService } from '@hyperfixi/server-integration';

const service = new HyperfixiService({
  port: 3000,
  database: process.env.DATABASE_URL,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  apiKeySalt: process.env.API_KEY_SALT,
});

await service.start();
console.log('HyperFixi API running on http://localhost:3000');
```

## API Endpoints

### POST /api/compile

Compile hyperscript to JavaScript.

**Request:**
```bash
curl -X POST http://localhost:3000/api/compile \
  -H "X-API-Key: hfx_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "scripts": {
      "main": "on click toggle .active",
      "counter": "on click increment :count then put it into me"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "compiled": {
    "main": "(function(){ /* compiled JS */ })();",
    "counter": "(function(){ /* compiled JS */ })();"
  },
  "metadata": {
    "main": {
      "events": ["click"],
      "commands": ["toggle"],
      "dependencies": []
    },
    "counter": {
      "events": ["click"],
      "commands": ["increment", "put"],
      "dependencies": []
    }
  },
  "timing": {
    "totalMs": 12,
    "perScript": { "main": 5, "counter": 7 }
  }
}
```

### GET /health

Health check endpoint (no authentication required).

```bash
curl http://localhost:3000/health
```

## Configuration

| Environment Variable | Description | Required |
|---------------------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `STRIPE_SECRET_KEY` | Stripe API secret key | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Yes |
| `API_KEY_SALT` | Salt for hashing API keys | Yes |
| `PORT` | Server port (default: 3000) | No |
| `STRIPE_PRO_PRICE_ID` | Stripe price ID for Pro tier | No |
| `STRIPE_TEAM_PRICE_ID` | Stripe price ID for Team tier | No |

## Rate Limits

Requests are rate-limited per API key based on subscription tier:

| Tier | Requests/Minute | Monthly Compiles |
|------|-----------------|------------------|
| Free | 60 | 1,000 |
| Pro | 600 | Unlimited |
| Team | 3,000 | Unlimited |

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when window resets

## Database Setup

Apply the schema to your PostgreSQL database:

```bash
psql $DATABASE_URL < src/db/schema.sql
```

The schema includes:
- `users`: User accounts linked to Stripe customers
- `api_keys`: Hashed API keys with tier and usage tracking
- `usage_logs`: Detailed per-request usage logs
- `usage_monthly`: Monthly usage aggregates
- `rate_limit_events`: Rate limit violation logging
- `stripe_events`: Webhook idempotency tracking

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Type checking
npm run typecheck

# Development server
npm run dev

# Build
npm run build
```

## Testing

The package includes comprehensive tests for:
- Hyperscript compiler (25 tests)
- Database client (31 tests)
- Authentication middleware (20 tests)
- Rate limiting middleware (14 tests)
- Usage tracking middleware (15 tests)
- Stripe webhooks (14 tests)

Run all tests:
```bash
npm test -- --run
```

## License

MIT
