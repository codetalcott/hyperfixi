# Deployment Guide

This guide covers deploying the HyperFixi API to production environments.

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Stripe account with:
  - API keys (secret key)
  - Webhook endpoint configured
  - Usage-based billing meter (optional)
  - Pro/Team price IDs

## Environment Variables

Create a `.env` file or configure these in your deployment platform:

```bash
# Required
DATABASE_URL=postgresql://user:password@host:5432/hyperfixi
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
API_KEY_SALT=your-secure-random-string-minimum-32-chars

# Optional
PORT=3000
NODE_ENV=production
STRIPE_PRO_PRICE_ID=price_...
STRIPE_TEAM_PRICE_ID=price_...
STRIPE_METER_ID=mtr_...
```

### Generating API_KEY_SALT

```bash
openssl rand -hex 32
```

## Database Setup

### 1. Create Database

```bash
createdb hyperfixi
```

### 2. Apply Schema

```bash
psql $DATABASE_URL < src/db/schema.sql
```

### 3. Verify Tables

```bash
psql $DATABASE_URL -c "\dt"
```

Expected tables:
- `migrations`
- `users`
- `api_keys`
- `usage_logs`
- `usage_monthly`
- `rate_limit_events`
- `stripe_events`

## Stripe Configuration

### 1. Create Webhook Endpoint

In Stripe Dashboard > Developers > Webhooks:

1. Add endpoint: `https://api.hyperfixi.dev/webhooks/stripe`
2. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
3. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

### 2. Create Products and Prices

Create products in Stripe:

**Pro Plan:**
- Product: "HyperFixi Pro"
- Price: $29/month (metered or fixed)
- Copy price ID to `STRIPE_PRO_PRICE_ID`

**Team Plan:**
- Product: "HyperFixi Team"
- Price: $99/month
- Copy price ID to `STRIPE_TEAM_PRICE_ID`

### 3. Create Usage Meter (Optional)

For usage-based billing:

1. Go to Billing > Meters
2. Create meter: "HyperFixi Compiles"
3. Copy meter ID to `STRIPE_METER_ID`

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/server/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/hyperfixi
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
      - API_KEY_SALT=${API_KEY_SALT}
      - NODE_ENV=production
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:14-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/db/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    environment:
      - POSTGRES_DB=hyperfixi
      - POSTGRES_PASSWORD=password
    restart: unless-stopped

volumes:
  postgres_data:
```

### Build and Run

```bash
# Build
npm run build
docker build -t hyperfixi-api .

# Run
docker-compose up -d
```

## Kubernetes Deployment

### deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hyperfixi-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hyperfixi-api
  template:
    metadata:
      labels:
        app: hyperfixi-api
    spec:
      containers:
      - name: api
        image: your-registry/hyperfixi-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: hyperfixi-secrets
              key: database-url
        - name: STRIPE_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: hyperfixi-secrets
              key: stripe-secret-key
        - name: STRIPE_WEBHOOK_SECRET
          valueFrom:
            secretKeyRef:
              name: hyperfixi-secrets
              key: stripe-webhook-secret
        - name: API_KEY_SALT
          valueFrom:
            secretKeyRef:
              name: hyperfixi-secrets
              key: api-key-salt
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: hyperfixi-api
spec:
  selector:
    app: hyperfixi-api
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Cloud Platform Guides

### Railway

1. Connect your GitHub repository
2. Add environment variables in dashboard
3. Deploy

```bash
railway up
```

### Render

1. Create new Web Service
2. Connect repository
3. Set build command: `npm run build`
4. Set start command: `node dist/server/index.js`
5. Add environment variables

### Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch
fly launch

# Set secrets
fly secrets set DATABASE_URL=... STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... API_KEY_SALT=...

# Deploy
fly deploy
```

## Security Checklist

- [ ] Use HTTPS in production (terminate TLS at load balancer)
- [ ] Set `NODE_ENV=production`
- [ ] Use strong `API_KEY_SALT` (32+ characters)
- [ ] Enable database SSL: `?sslmode=require`
- [ ] Configure CORS for your frontend domains
- [ ] Set up database connection pooling
- [ ] Enable request body size limits (default: 100kb)
- [ ] Configure rate limiting for webhook endpoint
- [ ] Set up log aggregation (e.g., Datadog, Papertrail)
- [ ] Configure error tracking (e.g., Sentry)

## Monitoring

### Health Check

```bash
curl https://api.hyperfixi.dev/health
```

### Key Metrics to Monitor

1. **Response latency**: p50, p95, p99 for `/api/compile`
2. **Error rate**: 4xx and 5xx responses
3. **Rate limit hits**: Track per tier
4. **Database connections**: Pool usage
5. **Stripe webhook success rate**: Failed webhook deliveries

### Recommended Alerts

- Response latency p95 > 500ms
- Error rate > 1%
- Database connection pool > 80%
- Rate limit hits > 1000/hour (potential abuse)

## Scaling

### Horizontal Scaling

The API is stateless and can scale horizontally:

```bash
# Docker Compose
docker-compose up -d --scale api=3

# Kubernetes
kubectl scale deployment hyperfixi-api --replicas=5
```

### Database Scaling

For high load:

1. Enable connection pooling (PgBouncer)
2. Add read replicas for usage queries
3. Partition `usage_logs` table by month
4. Archive old rate limit events

### Caching

Consider adding Redis for:
- Rate limit state (currently in-memory)
- Compilation cache (cache compiled output by input hash)

## Backup & Recovery

### Database Backup

```bash
# Backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

### Automated Backups

Most cloud databases (RDS, Cloud SQL, Render) provide automated backups. Enable:
- Daily automated backups
- Point-in-time recovery
- 7-day retention minimum

## Troubleshooting

### Common Issues

**"Connection refused" to database**
- Check `DATABASE_URL` format
- Verify database is running
- Check network/firewall rules

**"Invalid signature" on webhooks**
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Ensure raw body parsing for webhook endpoint
- Check Stripe webhook logs

**"API key not found"**
- Verify key starts with `hfx_`
- Check `API_KEY_SALT` matches when key was created
- Query database: `SELECT * FROM api_keys WHERE key_prefix = 'hfx_xxx...'`

**High memory usage**
- Check for memory leaks in compilation cache
- Reduce connection pool size
- Enable GC logging: `node --expose-gc dist/server/index.js`
