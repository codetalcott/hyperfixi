# Siren+GRAIL Browser Demos

Two demos showing hyperscript driven by server affordances via the Siren hypermedia format and GRAIL cooperative affordance protocol.

## Orders Demo

Classic Siren example. Fetches order entities, shows available actions, handles 409 blocked responses with automatic plan generation and pursuit.

**Server:** siren-grail Express server (port 3000)

```bash
cd /Users/williamtalcott/projects/siren-grail
node server.js
```

## Incident Response Demo

GRAIL workflow lifecycle: alert → acknowledge → classify → assign → investigate → mitigate → verify+notify (parallel) → postmortem → resolve. Shows deeper dependency chains and form inputs.

**Server:** grail-domains FastAPI server (port 8091)

```bash
cd /Users/williamtalcott/projects/grail-domains
python -m domains.incident_response.server
```

## Running the Demos

```bash
# 1. Build the siren browser bundle (from hyperfixi root)
npm run build --prefix experiments/siren

# 2. Start a server (see above)

# 3. Serve from the siren experiment root (so both demo/ and dist/ are accessible)
npx http-server experiments/siren -p 8080 -c-1 --cors

# 4. Open in browser
# http://localhost:8080/demo/orders.html
# http://localhost:8080/demo/incident.html
```

## What to Try

### Orders

1. Select an order with status "pending" and click Load
2. Click "Ship Order" — it will be blocked (needs items + processing status)
3. See the plan UI appear with prerequisite steps
4. Click "Pursue" to auto-execute the chain

### Incident Response

1. Select the fresh alert incident and click Load
2. Click "Acknowledge" to start the workflow
3. Work through: classify severity → assign owner → investigate → mitigate
4. After mitigation, verify health AND notify stakeholders (parallel — either order)
5. Write postmortem (unlocked after both verify + notify)
6. Resolve the incident

## Architecture

```text
Browser (this demo)              Server (siren-grail / grail-domains)
─────────────────────            ──────────────────────────────────────
fetchSiren(url)           →      GET /orders/1 → Siren entity + actions
                          ←      200 { actions: [...], x-conditions: [...] }

execute action            →      POST /orders/1/ship
                          ←      409 { blocked, offeredActions: [...] }

siren:blocked event       →      (client-side plan generation)
siren:plan event          →      (plan UI renders steps)

pursue('ship-order')      →      POST /orders/1/items (offered action)
                          ←      200 (item added)
                          →      PUT /orders/1 (update status)
                          ←      200 (status: processing)
                          →      POST /orders/1/ship (retry goal)
                          ←      200 (shipped!)
```

## CORS Note

The siren-grail server doesn't have CORS enabled by default. Either:

- Add `app.use(cors())` to `server.js` (requires `npm install cors`)
- Use `http-server --cors` as a proxy (serves demo files, proxies API)
- Or run the demo from the same origin as the server
