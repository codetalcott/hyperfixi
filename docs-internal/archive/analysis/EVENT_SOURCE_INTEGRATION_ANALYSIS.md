# Custom Event Source Integration Opportunities

**Date:** 2026-01-17
**Context:** Analysis of integration opportunities for the custom event source system (registry system) across LokaScript packages

## Executive Summary

The recently implemented custom event source registry system enables server-side hyperscript with custom event sources (HTTP requests, WebSockets, SSE, etc.) beyond standard DOM events. This document identifies **high-impact integration opportunities** across 8 existing packages.

**Key Integrations Identified:**

- ✅ **Server-Integration** - Direct API integration (HIGH PRIORITY)
- ✅ **SSR-Support** - SSR lifecycle events (HIGH PRIORITY)
- ✅ **Developer-Tools** - Testing, debugging, and profiling (MEDIUM-HIGH)
- ✅ **MCP-Server** - AI-assisted development tools (MEDIUM)
- ✅ **Testing-Framework** - Custom test events (MEDIUM)
- ✅ **Analytics** - Event tracking integration (LOW-MEDIUM)
- ⚠️ **Vite-Plugin** - Build-time event detection (LOW, needs research)
- ℹ️ **Progressive-Enhancement**, **Multi-Tenant** - Future opportunities

---

## 1. Server-Integration Package

**Package:** `@lokascript/server-integration`
**Priority:** 🔴 **HIGH**
**Status:** Ready for integration

### Current State

- Express-based API server with hyperscript compilation endpoints
- PostgreSQL storage for API keys, usage tracking, and billing
- Tiered rate limiting (free/pro/team)
- Stripe billing integration

### Integration Opportunities

#### A. Request Event Source for Server-Side Routes ⭐

Create a first-class request event source that integrates with the Express server.

**Implementation:**

```typescript
// packages/server-integration/src/events/request-event-source.ts
import { createRequestEventSource } from '@lokascript/core/registry/examples';
import { registry } from '@lokascript/core/registry';

export function setupRequestEvents(app: Express) {
  const requestSource = createRequestEventSource();
  registry.eventSources.register('request', requestSource);

  // Middleware to handle hyperscript route handlers
  app.use((req, res, next) => {
    const handled = requestSource.handleRequest(
      {
        method: req.method as HttpMethod,
        url: req.url,
        path: req.path,
        query: req.query,
        params: req.params,
        headers: req.headers,
        body: req.body,
      },
      res
    );

    if (!handled) next();
  });
}
```

**Usage Example:**

```typescript
// Server-side hyperscript routes
lokascript.compile(`
  on request(GET, /api/users/:id)
    set user to db.users.findById(params.id)
    respond with <json> user </json>
  end

  on request(POST, /api/users)
    set user to db.users.create(request.body)
    respond with <json> user </json> status 201
  end
`);
```

**Benefits:**

- Declarative route handlers in hyperscript
- Reduces boilerplate Express route code
- Natural integration with existing compilation API
- Opens door for "hyperscript-as-a-service" API endpoints

**Files to Modify:**

- `packages/server-integration/src/service/hyperscript-compiler.ts` - Add event source initialization
- `packages/server-integration/src/server/index.ts` - Wire up middleware
- Add new file: `packages/server-integration/src/events/request-event-source.ts`

#### B. Webhook Event Source

Create event sources for Stripe webhooks and other external webhooks.

**Implementation:**

```typescript
// packages/server-integration/src/events/webhook-event-source.ts
const webhookSource: EventSource = {
  name: 'webhook',
  supportedEvents: ['stripe.charge.succeeded', 'stripe.subscription.created', '*'],

  subscribe(options, context) {
    // Register webhook handler with Stripe
    const handler = event => {
      if (event.type === options.event || options.event === '*') {
        options.handler(
          {
            type: event.type,
            data: event.data,
            meta: { source: 'stripe', eventId: event.id },
          },
          context
        );
      }
    };

    webhookHandlers.push(handler);
    return { id: generateId(), source: 'webhook', event: options.event, unsubscribe: () => {} };
  },
};
```

**Usage:**

```hyperscript
on webhook(stripe.subscription.created)
  set subscription to event.data.object
  log "New subscription: " subscription.id
  call notifyTeam(subscription)
end
```

**Benefits:**

- Declarative webhook handlers
- Reduces webhook processing boilerplate
- Type-safe event handling

#### C. Database Event Source

Create event sources for PostgreSQL LISTEN/NOTIFY.

**Implementation:**

```typescript
const dbSource: EventSource = {
  name: 'database',
  supportedEvents: ['user_created', 'payment_received', '*'],

  subscribe(options, context) {
    // Setup PostgreSQL LISTEN
    pgClient.query(`LISTEN ${options.event}`);

    const handler = notification => {
      options.handler(
        {
          type: notification.channel,
          data: JSON.parse(notification.payload),
        },
        context
      );
    };

    pgClient.on('notification', handler);

    return {
      id: generateId(),
      source: 'database',
      event: options.event,
      unsubscribe: () => {
        pgClient.off('notification', handler);
        pgClient.query(`UNLISTEN ${options.event}`);
      },
    };
  },
};
```

**Usage:**

```hyperscript
on database(user_created)
  set user to event.data
  call sendWelcomeEmail(user)
  log "Sent welcome email to " user.email
end
```

---

## 2. SSR-Support Package

**Package:** `@lokascript/ssr-support`
**Priority:** 🔴 **HIGH**
**Status:** Ready for integration

### Current State

- Server-side rendering engine with hydration
- SEO optimization and critical CSS extraction
- Framework middleware (Express, Koa, Fastify, Next.js)
- Multi-tier caching (memory, Redis, tiered)

### Integration Opportunities

#### A. SSR Lifecycle Event Source ⭐

Create event sources for SSR lifecycle hooks (before-render, after-render, hydration).

**Implementation:**

```typescript
// packages/ssr-support/src/events/ssr-lifecycle.ts
export const ssrLifecycleSource: EventSource = {
  name: 'ssr',
  supportedEvents: ['before-render', 'after-render', 'hydration', 'cache-hit', 'cache-miss'],

  subscribe(options, context) {
    const handler = payload => {
      options.handler(payload, context);
    };

    lifecycleEmitter.on(options.event, handler);

    return {
      id: generateId(),
      source: 'ssr',
      event: options.event,
      unsubscribe: () => lifecycleEmitter.off(options.event, handler),
    };
  },
};
```

**Usage in SSR Templates:**

```hyperscript
on ssr(before-render)
  call analytics.track('page-render-start', { url: request.url })
  set renderStart to Date.now()
end

on ssr(after-render)
  set duration to Date.now() - renderStart
  log "Rendered in " duration "ms"
  call analytics.track('page-render-complete', { duration })
end

on ssr(cache-hit)
  log "Cache hit for " request.url
  call incrementCacheHitCounter()
end
```

**Benefits:**

- Declarative SSR lifecycle hooks
- Simplifies analytics integration
- Custom render pipeline logic without middleware boilerplate

**Files to Modify:**

- `packages/ssr-support/src/engine.ts` - Emit lifecycle events
- Add new file: `packages/ssr-support/src/events/ssr-lifecycle.ts`

#### B. Hydration Event Source

Track and respond to client-side hydration events.

**Implementation:**

```typescript
const hydrationSource: EventSource = {
  name: 'hydration',
  supportedEvents: ['start', 'complete', 'error', 'component-hydrated'],

  subscribe(options, context) {
    // Listen for hydration events from client
    window.addEventListener(`lokascript:hydration:${options.event}`, e => {
      options.handler(
        {
          type: options.event,
          data: e.detail,
          target: e.target,
        },
        context
      );
    });

    return { id: generateId(), source: 'hydration', event: options.event, unsubscribe: () => {} };
  },
};
```

**Usage:**

```hyperscript
on hydration(complete)
  log "App hydrated in " event.data.duration "ms"
  call initializeInteractivity()
  add .hydrated to <body/>
end

on hydration(error)
  log "Hydration error: " event.data.message
  call reportHydrationError(event.data)
end
```

---

## 3. Developer-Tools Package

**Package:** `@lokascript/developer-tools`
**Priority:** 🟡 **MEDIUM-HIGH**
**Status:** Ready for integration

### Current State

- CLI tools (`lokascript` / `hfx`)
- Visual builder with live preview
- Development server with WebSocket live reload
- Code analyzer, profiler, bundle analyzer
- Project scaffolding and code generation

### Integration Opportunities

#### A. Dev Server Hot Reload Event Source ⭐

Integrate custom event sources with the development server.

**Implementation:**

```typescript
// packages/developer-tools/src/events/dev-server-events.ts
export const devServerSource: EventSource = {
  name: 'dev',
  supportedEvents: ['file-change', 'reload', 'error', 'build-complete'],

  subscribe(options, context) {
    const handler = data => {
      options.handler(
        {
          type: options.event,
          data,
          meta: { timestamp: Date.now() },
        },
        context
      );
    };

    devServer.on(options.event, handler);

    return {
      id: generateId(),
      source: 'dev',
      event: options.event,
      unsubscribe: () => devServer.off(options.event, handler),
    };
  },
};
```

**Usage in Dev Tools:**

```hyperscript
on dev(file-change)
  set file to event.data.path
  log "File changed: " file
  if file contains ".css"
    call reloadStyles()
  else
    call fullReload()
  end
end

on dev(build-complete)
  log "Build completed in " event.data.duration "ms"
  call notifyBrowser({ type: 'reload' })
end
```

**Benefits:**

- Custom dev server behaviors without touching core code
- Plugin system for dev tools
- Easier to test dev workflows

#### B. Test Event Source for Testing Framework Integration

Create event sources that fire during test execution.

**Implementation:**

```typescript
const testSource: EventSource = {
  name: 'test',
  supportedEvents: ['before-test', 'after-test', 'assertion', 'error'],

  subscribe(options, context) {
    testRunner.on(options.event, testInfo => {
      options.handler(
        {
          type: options.event,
          data: testInfo,
        },
        context
      );
    });

    return { id: generateId(), source: 'test', event: options.event, unsubscribe: () => {} };
  },
};
```

**Usage in Test Suites:**

```hyperscript
on test(before-test)
  call setupTestDatabase()
  call clearCache()
end

on test(after-test)
  if test.failed
    call captureScreenshot(test.name)
  end
  call cleanupTestData()
end
```

#### C. Profiler Event Source

Expose profiling events for performance monitoring.

**Implementation:**

```typescript
const profilerSource: EventSource = {
  name: 'profiler',
  supportedEvents: ['command-start', 'command-end', 'slow-command'],

  subscribe(options, context) {
    profiler.on(options.event, data => {
      options.handler({ type: options.event, data }, context);
    });

    return { id: generateId(), source: 'profiler', event: options.event, unsubscribe: () => {} };
  },
};
```

**Usage:**

```hyperscript
on profiler(slow-command)
  if event.data.duration > 100
    log "WARNING: Slow command " event.data.command " took " event.data.duration "ms"
    call reportSlowCommand(event.data)
  end
end
```

---

## 4. MCP-Server Package

**Package:** `@lokascript/mcp-server`
**Priority:** 🟡 **MEDIUM**
**Status:** Ready for integration

### Current State

- MCP server with 22 tools for hyperscript development
- Validation, pattern lookup, semantic parsing
- LSP-compatible features
- Multilingual support (23 languages)

### Integration Opportunities

#### A. Add MCP Tools for Event Source Discovery

New tools to help AI assistants discover and suggest event sources.

**Implementation:**

```typescript
// packages/mcp-server/src/tools/event-sources.ts
export const eventSourceTools = {
  list_event_sources: {
    description: 'List all registered custom event sources',
    handler: async () => {
      return {
        sources: registry.eventSources.names().map(name => ({
          name,
          description: registry.eventSources.get(name)?.description,
          supportedEvents: registry.eventSources.get(name)?.supportedEvents,
        })),
      };
    },
  },

  get_event_source_docs: {
    description: 'Get documentation for a specific event source',
    parameters: { sourceName: { type: 'string' } },
    handler: async ({ sourceName }) => {
      const source = registry.eventSources.get(sourceName);
      if (!source) return { error: `Event source '${sourceName}' not found` };

      return {
        name: source.name,
        description: source.description,
        supportedEvents: source.supportedEvents,
        examples: generateExamples(source),
      };
    },
  },

  suggest_event_source: {
    description: 'Suggest the best event source for a use case',
    parameters: { useCase: { type: 'string' } },
    handler: async ({ useCase }) => {
      // AI-powered suggestion logic
      const suggestions = analyzeUseCase(useCase);
      return {
        recommendations: suggestions.map(s => ({
          source: s.name,
          confidence: s.confidence,
          reasoning: s.reasoning,
          example: s.example,
        })),
      };
    },
  },
};
```

**Benefits:**

- Claude can discover available event sources
- Better code suggestions with custom events
- Educational for developers learning the system

**Files to Modify:**

- Add new file: `packages/mcp-server/src/tools/event-sources.ts`
- `packages/mcp-server/src/index.ts` - Register new tools

#### B. Add Event Source Examples to Pattern Database

Extend the pattern database with event source examples.

**Implementation:**

```typescript
// packages/patterns-reference/scripts/add-event-source-patterns.ts
const eventSourcePatterns = [
  {
    category: 'server-side',
    language: 'en',
    pattern: 'on request(GET, /api/:resource) respond with <json> data </json>',
    description: 'HTTP GET request handler',
    tags: ['server', 'api', 'request'],
  },
  {
    category: 'server-side',
    language: 'en',
    pattern: 'on webhook(stripe.charge.succeeded) log "Payment received"',
    description: 'Stripe webhook handler',
    tags: ['webhook', 'stripe', 'payments'],
  },
];
```

---

## 5. Testing-Framework Package

**Package:** `@lokascript/testing-framework`
**Priority:** 🟡 **MEDIUM**
**Status:** Ready for integration

### Current State

- Cross-platform testing (Node.js, browser, Playwright)
- Assertion library for hyperscript
- Test runner with parallel execution
- E2E testing support

### Integration Opportunities

#### A. Test Lifecycle Event Source ⭐

Enable hyperscript hooks in test suites.

**Implementation:**

```typescript
// packages/testing-framework/src/events/test-lifecycle.ts
export const testLifecycleSource: EventSource = {
  name: 'test',
  supportedEvents: [
    'before-each',
    'after-each',
    'before-all',
    'after-all',
    'test-start',
    'test-end',
  ],

  subscribe(options, context) {
    const handler = testInfo => {
      options.handler(
        {
          type: options.event,
          data: testInfo,
        },
        context
      );
    };

    testRunner.lifecycle.on(options.event, handler);

    return {
      id: generateId(),
      source: 'test',
      event: options.event,
      unsubscribe: () => testRunner.lifecycle.off(options.event, handler),
    };
  },
};
```

**Usage in Test Files:**

```hyperscript
on test(before-each)
  call resetDatabase()
  set testUser to createTestUser()
end

on test(after-each)
  call cleanupTestData()
  if test.failed
    call captureDebugInfo(test)
  end
end

on test(test-start)
  set testStartTime to Date.now()
end

on test(test-end)
  set duration to Date.now() - testStartTime
  if duration > 5000
    log "WARNING: Slow test " test.name " (" duration "ms)"
  end
end
```

**Benefits:**

- Declarative test setup/teardown
- Reduces test boilerplate
- Easier to share test utilities

#### B. Assertion Event Source

Track assertions for detailed test reports.

**Implementation:**

```typescript
const assertionSource: EventSource = {
  name: 'assertion',
  supportedEvents: ['pass', 'fail', 'skip'],

  subscribe(options, context) {
    assertions.on(options.event, assertion => {
      options.handler(
        {
          type: options.event,
          data: {
            description: assertion.description,
            expected: assertion.expected,
            actual: assertion.actual,
            message: assertion.message,
          },
        },
        context
      );
    });

    return { id: generateId(), source: 'assertion', event: options.event, unsubscribe: () => {} };
  },
};
```

**Usage:**

```hyperscript
on assertion(fail)
  log "Assertion failed: " event.data.description
  call captureFailureDetails(event.data)
  call notifyDevelopers({ type: 'test-failure', assertion: event.data })
end
```

---

## 6. Analytics Package

**Package:** `@lokascript/analytics`
**Priority:** 🟢 **LOW-MEDIUM**
**Status:** Ready for integration

### Current State

- Event tracking for compilation, execution, errors
- Performance monitoring
- Real-time subscriptions
- Alert system based on thresholds

### Integration Opportunities

#### A. Analytics Event Source ⭐

Make analytics events available as custom event sources.

**Implementation:**

```typescript
// packages/analytics/src/events/analytics-source.ts
export const analyticsSource: EventSource = {
  name: 'analytics',
  supportedEvents: ['compilation', 'execution', 'error', 'alert', 'threshold-exceeded'],

  subscribe(options, context) {
    const subId = analytics.subscribe({ eventTypes: [`hyperscript:${options.event}`] }, events => {
      events.forEach(event => {
        options.handler(
          {
            type: options.event,
            data: event.data,
            meta: { timestamp: event.timestamp },
          },
          context
        );
      });
    });

    return {
      id: subId,
      source: 'analytics',
      event: options.event,
      unsubscribe: () => analytics.unsubscribe(subId),
    };
  },
};
```

**Usage:**

```hyperscript
on analytics(error)
  if event.data.errorRate > 0.1
    log "High error rate detected: " event.data.errorRate
    call notifyTeam({ type: 'error-spike', rate: event.data.errorRate })
  end
end

on analytics(threshold-exceeded)
  log "Alert: " event.data.alert.name
  if event.data.alert.id is 'high-error-rate'
    call triggerIncidentResponse()
  end
end
```

**Benefits:**

- Declarative analytics reactions
- Custom alerting logic in hyperscript
- Easier to customize monitoring behaviors

#### B. Reverse Integration: Track Event Source Usage

Track when custom event sources are used in analytics.

**Implementation:**

```typescript
// In registry system, emit analytics events
eventSourceRegistry.subscribe = (sourceName, options, context) => {
  const sub = originalSubscribe(sourceName, options, context);

  analytics.track.custom('event-source:subscribe', {
    source: sourceName,
    event: options.event,
    subscriptionId: sub.id,
  });

  return sub;
};
```

**Benefits:**

- Visibility into event source adoption
- Identify most/least used sources
- Performance tracking per source

---

## 7. Vite-Plugin Package

**Package:** `@lokascript/vite-plugin`
**Priority:** 🟢 **LOW** (needs research)
**Status:** Exploration phase

### Current State

- Zero-config Vite plugin for automatic bundle generation
- Scans files for `_="..."` attributes
- Generates minimal bundles with only used commands

### Integration Opportunities

#### A. Detect Event Source Usage at Build Time

Scan for custom event sources in hyperscript code and warn if not registered.

**Implementation:**

```typescript
// packages/vite-plugin/src/event-source-detector.ts
export function detectEventSources(code: string): string[] {
  const eventSourcePattern = /on\s+(\w+)\s*\(/g;
  const matches = [...code.matchAll(eventSourcePattern)];
  return [...new Set(matches.map(m => m[1]))];
}

// In plugin
const detectedSources = detectEventSources(hyprescriptCode);
const unregistered = detectedSources.filter(s => !registry.eventSources.has(s));

if (unregistered.length > 0) {
  console.warn(`Unregistered event sources detected: ${unregistered.join(', ')}`);
}
```

**Benefits:**

- Build-time validation of event sources
- Prevents runtime errors from missing sources
- Better developer experience

**Note:** This is a lower priority because the benefit is marginal (validation vs. enabling new features).

---

## 8. Other Packages

### Progressive-Enhancement Package

**Status:** Future opportunity
**Integration:** Could use custom events for progressive loading states (e.g., `on progressive(loaded)`, `on progressive(fallback)`)

### Multi-Tenant Package

**Status:** Future opportunity
**Integration:** Could use tenant-scoped event sources (e.g., `on tenant(switch)`, `on tenant(quota-exceeded)`)

---

## Implementation Priorities

### Phase 1: High-Value, Low-Effort (Week 1-2)

1. ✅ **Server-Integration: Request Event Source** - Direct API value, clear use case
2. ✅ **SSR-Support: Lifecycle Event Source** - Enables declarative render hooks
3. ✅ **Developer-Tools: Dev Server Events** - Improves dev experience

### Phase 2: Medium-Value, Medium-Effort (Week 3-4)

4. ✅ **Testing-Framework: Test Lifecycle Events** - Better test utilities
5. ✅ **MCP-Server: Event Source Discovery Tools** - AI assistance
6. ✅ **Analytics: Analytics Event Source** - Custom monitoring

### Phase 3: Polish and Documentation (Week 5-6)

7. ✅ Server-Integration: Webhook + Database event sources
8. ✅ SSR-Support: Hydration event source
9. 📝 Comprehensive documentation and examples
10. 📝 Blog post / tutorial on custom event sources

### Phase 4: Future Enhancements

- Vite-Plugin: Build-time detection (if clear value emerges)
- Progressive-Enhancement integration (based on user feedback)
- Multi-Tenant integration (based on demand)

---

## Technical Considerations

### API Consistency

All event sources should follow the same pattern:

```typescript
const source: EventSource = {
  name: string,
  description: string,
  supportedEvents: string[],
  subscribe(options, context): EventSourceSubscription,
  supports?(event: string): boolean,
  initialize?(): Promise<void> | void,
  destroy?(): void
};
```

### Error Handling

- Event sources should never throw during subscribe
- Failed subscriptions should return undefined
- Errors should be logged but not crash the runtime

### Performance

- Event sources should be lazy-initialized
- Subscription setup should be fast (<5ms)
- Consider connection pooling for I/O-based sources (DB, WebSocket)

### Testing Strategy

- Unit tests for each event source implementation
- Integration tests with real event emission
- Performance benchmarks for high-frequency events

### Documentation Needs

- Event source developer guide
- Migration guide for existing code
- Performance best practices
- Security considerations (especially for server-side events)

---

## Next Steps

1. **Review & Prioritize:** Review this document with team, adjust priorities
2. **Spike Phase 1:** 1-2 day spike on request event source (highest value)
3. **Gather Feedback:** Share prototype with early users
4. **Iterate:** Based on feedback, implement remaining Phase 1 items
5. **Document:** Write comprehensive guides and examples
6. **Release:** Coordinate release across affected packages

---

## Questions for Discussion

1. Should event sources be opt-in or automatically enabled in each package?
2. Do we need a registry discovery UI in developer-tools?
3. Should we version event source APIs separately from core?
4. Security model for server-side event sources (authentication, authorization)?
5. Should event sources support request/response patterns (not just fire-and-forget)?

---

## Conclusion

The custom event source registry system opens up **significant opportunities** across the LokaScript ecosystem. The highest-value integrations are in **server-integration** (request handlers), **ssr-support** (lifecycle hooks), and **developer-tools** (dev server events).

**Estimated Impact:**

- 🚀 **Developer Productivity:** +30% (reduced boilerplate)
- 📈 **Feature Adoption:** Server-side hyperscript becomes viable
- 🎯 **Market Position:** First hypermedia DSL with comprehensive event sources
- 🔧 **Maintainability:** Better separation of concerns

**Recommendation:** Start with Phase 1 (request event source) as a proof-of-concept. The implementation is straightforward and the value is immediately tangible.
