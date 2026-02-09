/**
 * Base HTML layout for the profile editor.
 *
 * Uses missing.css for styling and LokaScript hybrid-hx for interactivity.
 */

import type { PropsWithChildren } from '@kitajs/html';

interface BaseLayoutProps {
  title?: string;
}

export function BaseLayout({ title, children }: PropsWithChildren<BaseLayoutProps>) {
  const pageTitle = title
    ? `${title} | LokaScript Profile Editor`
    : 'LokaScript Profile Editor';

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

        {/* Custom theme */}
        <link rel="stylesheet" href="/public/theme.css" />

        {/* LokaScript hybrid-hx bundle */}
        <script src="/public/lokascript-hybrid-hx.js"></script>

        {/* Theme initialization */}
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
              <strong>LokaScript</strong> Profile Editor
            </a>
            <ul role="list">
              <li>
                <a href="/">Languages</a>
              </li>
              <li>
                <a href="/export">Export</a>
              </li>
              <li>
                <a href="/audit">Audit Log</a>
              </li>
            </ul>
            <button
              id="theme-toggle"
              class="theme-toggle"
              title="Toggle dark mode"
              aria-label="Toggle dark mode"
              _="on load
                   if <html/> matches .dark-mode
                     put 'light' into me
                   else
                     put 'dark' into me
                   end
                 end
                 on click
                   toggle .dark-mode on <html/>
                   if <html/> matches .dark-mode
                     set localStorage.theme to 'dark'
                     put 'light' into me
                   else
                     set localStorage.theme to 'light'
                     put 'dark' into me
                   end
                 end"
            >
              dark
            </button>
          </nav>
        </header>

        <main id="main" class="flow">{children}</main>

        {/* Toast container */}
        <div id="toast-container" class="toast-container"></div>

        <footer>
          <p class="center muted">
            <small>
              Built with{' '}
              <a href="https://github.com/anthropics/hyperfixi" target="_blank">
                LokaScript
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
 * Partial layout for fetch partial responses.
 */
export function PartialLayout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
