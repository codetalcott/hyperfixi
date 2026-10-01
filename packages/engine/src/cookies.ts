/**
 * `cookies`: an ambient name for reading and writing `document.cookie`.
 *
 *   put cookies.theme into me        set cookies.theme to "dark"
 *   call cookies.clear("theme")      for c in cookies … end
 *
 * Follows upstream `core/runtime/cookies.js`.
 */
import type { Grammar } from './parser';
import { ambient } from './runtime';
import { get } from './util';

const EXPIRED = '=;expires=Thu, 01 Jan 1970 00:00:00 GMT';

const all = () =>
  document.cookie
    ? document.cookie.split('; ').map(entry => {
        const eq = entry.indexOf('=');
        return { name: entry.slice(0, eq), value: decodeURIComponent(entry.slice(eq + 1)) };
      })
    : [];

const jar = new Proxy<Record<string | symbol, unknown>>(
  {},
  {
    get(_target, prop) {
      if (prop === Symbol.iterator) {
        const list = all();
        return list[Symbol.iterator].bind(list);
      }
      if (typeof prop !== 'string' || prop === 'then') return;
      if (prop === 'length') return all().length;
      if (prop === 'clear') return (name: string) => void (document.cookie = name + EXPIRED);
      if (prop === 'clearAll')
        return () => all().forEach(c => (document.cookie = c.name + EXPIRED));
      if (prop !== '' && !Number.isNaN(Number(prop))) return all()[parseInt(prop)];
      return all().find(c => c.name === prop)?.value;
    },
    set(_target, prop, value) {
      const parts: string[] = [];
      if (typeof value === 'string') parts.push(encodeURIComponent(value), 'samesite=lax');
      else {
        parts.push(encodeURIComponent(String(get(value, 'value'))));
        const option = (key: string, label: string) => {
          const v = get(value, key);
          if (v) parts.push(`${label}=${v}`);
        };
        option('expires', 'expires');
        option('maxAge', 'max-age');
        option('partitioned', 'partitioned');
        option('path', 'path');
        option('samesite', 'samesite');
        if (get(value, 'secure')) parts.push('secure');
      }
      document.cookie = String(prop) + '=' + parts.join(';');
      return true;
    },
  }
);

export function cookies(_g: Grammar): void {
  ambient.cookies = jar;
}
