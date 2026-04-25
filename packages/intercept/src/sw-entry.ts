/**
 * Service worker runtime for @hyperfixi/intercept.
 *
 * Bundled separately (tsup IIFE target) into `dist/intercept-sw.js`. Users
 * deploy this file at the path they configured when installing the plugin
 * (default `/hyperfixi-sw.js`).
 *
 * Protocol: receives a message `{ type: 'hs:intercept:config', config }` from
 * the page and applies the config to install/activate/fetch handlers.
 *
 * Mirrors `_hyperscript/src/ext/intercept-sw.js`.
 */

/// <reference lib="WebWorker" />

import type { InterceptConfig } from './types';
import { findRoute, cacheKeyFor } from './pattern-match';

// Narrow the global `self` to the worker scope so TS picks up the right APIs.
declare const self: ServiceWorkerGlobalScope;

let config: InterceptConfig | null = null;

self.addEventListener('message', (e: ExtendableMessageEvent) => {
  const data = e.data as { type?: string; config?: InterceptConfig } | undefined;
  if (data && data.type === 'hs:intercept:config' && data.config) {
    config = data.config;
  }
});

self.addEventListener('install', (e: ExtendableEvent) => {
  if (!config || !config.precache || !config.precache.urls.length) return;
  const key = cacheKeyFor(config);
  e.waitUntil(caches.open(key).then(cache => cache.addAll(config!.precache!.urls)));
});

self.addEventListener('activate', (e: ExtendableEvent) => {
  if (!config || !config.precache) return;
  const currentVersion = cacheKeyFor(config);
  e.waitUntil(
    caches
      .keys()
      .then(names =>
        Promise.all(names.filter(n => n !== currentVersion).map(n => caches.delete(n)))
      )
  );
});

self.addEventListener('fetch', (e: FetchEvent) => {
  if (!config || e.request.method !== 'GET') return;

  const path = new URL(e.request.url).pathname;
  const route = findRoute(path, config.routes);
  if (!route) return;

  const cacheName = cacheKeyFor(config);
  const offlineFallback = config.offlineFallback;

  const fallback = (): Promise<Response> => {
    if (offlineFallback) {
      return caches.match(offlineFallback).then(r => r || new Response('Offline', { status: 503 }));
    }
    return Promise.resolve(new Response('Offline', { status: 503 }));
  };

  const fetchOk = (): Promise<Response> =>
    fetch(e.request).then(resp => {
      if (!resp.ok) throw new Error('non-ok response: ' + resp.status);
      return resp;
    });

  if (route.strategy === 'cache-first') {
    e.respondWith(
      caches
        .match(e.request)
        .then(cached => {
          if (cached) return cached;
          return fetchOk().then(resp => {
            // Put runs async — caller doesn't wait.
            caches.open(cacheName).then(c => c.put(e.request, resp.clone()));
            return resp;
          });
        })
        .catch(fallback)
    );
  } else if (route.strategy === 'network-first') {
    e.respondWith(
      fetchOk()
        .then(resp => {
          caches.open(cacheName).then(c => c.put(e.request, resp.clone()));
          return resp;
        })
        .catch(() => caches.match(e.request).then(c => c || fallback()))
    );
  } else if (route.strategy === 'stale-while-revalidate') {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetched = fetchOk()
          .then(resp => {
            caches.open(cacheName).then(c => c.put(e.request, resp.clone()));
            return resp;
          })
          .catch(() => cached || fallback());
        return cached || fetched;
      })
    );
  } else if (route.strategy === 'cache-only') {
    e.respondWith(caches.match(e.request).then(c => c || fallback()));
  }
  // network-only: don't intercept — let the browser handle the request.
});
