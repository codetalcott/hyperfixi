import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'LokaScript',
  description: 'Complete hyperscript ecosystem with multilingual i18n support',

  // Multi-language configuration
  locales: {
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/'
    },
    es: {
      label: 'Español',
      lang: 'es',
      link: '/es/'
    },
    ja: {
      label: '日本語',
      lang: 'ja',
      link: '/ja/'
    },
    zh: {
      label: '中文',
      lang: 'zh',
      link: '/zh/'
    },
    ar: {
      label: 'العربية',
      lang: 'ar',
      dir: 'rtl',
      link: '/ar/'
    }
  },

  themeConfig: {
    logo: '/favicon.svg',

    search: {
      provider: 'local'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/codetalcott/lokascript' }
    ],

    // Navigation
    nav: [
      { text: 'Guide', link: '/en/guide/' },
      { text: 'API', link: '/en/api/' },
      { text: 'Packages', link: '/en/packages/' },
      { text: 'Cookbook', link: '/en/cookbook/' },
      { text: 'Contributing', link: '/en/contributing/' }
    ],

    // Sidebar configuration
    sidebar: {
      '/en/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/en/guide/' },
            { text: 'Installation', link: '/en/guide/installation' },
            { text: 'Bundle Selection', link: '/en/guide/bundles' }
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Commands', link: '/en/guide/commands' },
            { text: 'Expressions', link: '/en/guide/expressions' },
            { text: 'Events', link: '/en/guide/events' },
            { text: 'Context & Variables', link: '/en/guide/context' }
          ]
        },
        {
          text: 'Multilingual',
          items: [
            { text: 'Writing in Your Language', link: '/en/guide/multilingual' },
            { text: 'Grammar Transformation', link: '/en/guide/grammar' },
            { text: 'Semantic Parser', link: '/en/guide/semantic-parser' }
          ]
        },
        {
          text: 'Build Tools',
          items: [
            { text: 'Vite Plugin', link: '/en/guide/vite-plugin' },
            { text: 'Custom Bundles', link: '/en/guide/custom-bundles' }
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Debugging', link: '/en/guide/debugging' },
            { text: 'htmx Compatibility', link: '/en/guide/htmx-compatibility' }
          ]
        }
      ],

      '/en/api/': [
        {
          text: 'Core API',
          items: [
            { text: 'Overview', link: '/en/api/' },
            { text: 'hyperscript Object', link: '/en/api/hyperscript' },
            { text: 'compile()', link: '/en/api/compile' },
            { text: 'execute()', link: '/en/api/execute' }
          ]
        },
        {
          text: 'Commands',
          items: [
            { text: 'DOM Commands', link: '/en/api/commands/dom' },
            { text: 'Control Flow', link: '/en/api/commands/control-flow' },
            { text: 'Animation', link: '/en/api/commands/animation' },
            { text: 'Async Commands', link: '/en/api/commands/async' },
            { text: 'Navigation', link: '/en/api/commands/navigation' },
            { text: 'Data Commands', link: '/en/api/commands/data' },
            { text: 'Utility Commands', link: '/en/api/commands/utility' }
          ]
        },
        {
          text: 'Expressions',
          items: [
            { text: 'Selectors', link: '/en/api/expressions/selectors' },
            { text: 'Positional', link: '/en/api/expressions/positional' },
            { text: 'Properties', link: '/en/api/expressions/properties' },
            { text: 'Logical', link: '/en/api/expressions/logical' },
            { text: 'Strings', link: '/en/api/expressions/strings' },
            { text: 'Type Conversion', link: '/en/api/expressions/conversion' }
          ]
        }
      ],

      '/en/packages/': [
        {
          text: 'Core Packages',
          items: [
            { text: 'Overview', link: '/en/packages/' },
            { text: '@hyperfixi/core', link: '/en/packages/core' },
            { text: '@lokascript/semantic', link: '/en/packages/semantic' },
            { text: '@lokascript/i18n', link: '/en/packages/i18n' }
          ]
        },
        {
          text: 'Integration',
          items: [
            { text: '@lokascript/hyperscript-adapter', link: '/en/packages/hyperscript-adapter' }
          ]
        },
        {
          text: 'Build Tools',
          items: [
            { text: '@hyperfixi/vite-plugin', link: '/en/packages/vite-plugin' }
          ]
        }
      ],

      '/en/cookbook/': [
        {
          text: 'Basics',
          items: [
            { text: 'Overview', link: '/en/cookbook/' },
            { text: 'Hello World', link: '/en/cookbook/hello-world' },
            { text: 'Toggle Classes', link: '/en/cookbook/toggle-classes' },
            { text: 'Show/Hide Elements', link: '/en/cookbook/show-hide' }
          ]
        },
        {
          text: 'Forms & Inputs',
          items: [
            { text: 'Form Validation', link: '/en/cookbook/form-validation' },
            { text: 'Input Mirroring', link: '/en/cookbook/input-mirror' }
          ]
        },
        {
          text: 'Advanced Patterns',
          items: [
            { text: 'Fade and Remove', link: '/en/cookbook/fade-remove' },
            { text: 'Fetch Data', link: '/en/cookbook/fetch-data' }
          ]
        }
      ],

      '/en/contributing/': [
        {
          text: 'Contributing',
          items: [
            { text: 'Overview', link: '/en/contributing/' }
          ]
        }
      ]
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 HyperFixi Contributors'
    }
  },

  // Vite configuration for workspace packages
  vite: {
    resolve: {
      alias: {
        '@hyperfixi/core': '/Users/williamtalcott/projects/hyperfixi/packages/core/src/index.ts',
        '@hyperfixi/semantic': '/Users/williamtalcott/projects/hyperfixi/packages/semantic/src/index.ts'
      }
    }
  }
})
