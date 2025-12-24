/**
 * Base HTML layout for the patterns browser.
 *
 * Uses missing.css for styling and hyperfixi for interactivity.
 */

import type { PropsWithChildren } from '@kitajs/html';

interface BaseLayoutProps {
  title?: string;
}

export function BaseLayout({ title, children }: PropsWithChildren<BaseLayoutProps>) {
  const pageTitle = title ? `${title} | HyperFixi Patterns` : 'HyperFixi Patterns Reference';

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{pageTitle}</title>
        <link rel="icon" href="/public/favicon.svg" type="image/svg+xml" />

        {/* missing.css */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/missing.css@1.1.3/dist/missing.min.css"
        />

        {/* Custom theme from Zed Missing */}
        <link rel="stylesheet" href="/public/theme.css" />

        {/* hyperfixi */}
        <script src="/public/hyperfixi-browser.js"></script>

        {/* Theme initialization - must run before body renders */}
        <script>{`
          (function() {
            var theme = localStorage.getItem('theme');
            if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark-mode');
            }
          })();
        `}</script>
      </head>
      <body>
        <header class="navbar">
          <nav>
            <a href="/" class="brand">
              <strong>HyperFixi</strong> Patterns
            </a>
            <ul role="list">
              <li>
                <a href="/patterns">Patterns</a>
              </li>
              <li>
                <a href="/translations">Translations</a>
              </li>
              <li>
                <a href="/llm">LLM Examples</a>
              </li>
              <li>
                <a href="/stats">Stats</a>
              </li>
            </ul>
            <button
              id="theme-toggle"
              class="theme-toggle"
              title="Toggle dark mode"
              aria-label="Toggle dark mode"
              _="on load
                   if <html/> matches .dark-mode
                     put '☀️' into me
                   else
                     put '🌙' into me
                   end
                 end
                 on click
                   toggle .dark-mode on <html/>
                   if <html/> matches .dark-mode
                     set localStorage.theme to 'dark'
                     put '☀️' into me
                   else
                     set localStorage.theme to 'light'
                     put '🌙' into me
                   end
                 end"
            >
              🌙
            </button>
          </nav>
        </header>

        <main id="main" class="flow">{children}</main>

        <footer>
          <p class="center muted">
            <small>
              Built with{' '}
              <a href="https://github.com/anthropics/hyperfixi" target="_blank">
                hyperfixi
              </a>{' '}
              +{' '}
              <a href="https://elysiajs.com" target="_blank">
                Elysia
              </a>{' '}
              +{' '}
              <a href="https://missing.style" target="_blank">
                missing.css
              </a>
            </small>
          </p>
        </footer>
      </body>
    </html>
  );
}

/**
 * Partial layout for htmx/hyperfixi partial responses.
 * Just returns the children without full HTML wrapper.
 */
export function PartialLayout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
