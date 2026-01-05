import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'HyperFixi',
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
      { icon: 'github', link: 'https://github.com/hyperfixi/hyperfixi' }
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
            { text: 'What is HyperFixi?', link: '/en/guide/what-is-hyperfixi' },
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
            { text: 'Async Commands', link: '/en/api/commands/async' }
          ]
        },
        {
          text: 'Expressions',
          items: [
            { text: 'Selectors', link: '/en/api/expressions/selectors' },
            { text: 'Positional', link: '/en/api/expressions/positional' },
            { text: 'Properties', link: '/en/api/expressions/properties' },
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
            { text: '@hyperfixi/semantic', link: '/en/packages/semantic' },
            { text: '@hyperfixi/i18n', link: '/en/packages/i18n' }
          ]
        },
        {
          text: 'Build Tools',
          items: [
            { text: '@hyperfixi/vite-plugin', link: '/en/packages/vite-plugin' },
            { text: '@hyperfixi/smart-bundling', link: '/en/packages/smart-bundling' }
          ]
        },
        {
          text: 'Server Integration',
          items: [
            { text: '@hyperfixi/server-integration', link: '/en/packages/server-integration' },
            { text: '@hyperfixi/ssr-support', link: '/en/packages/ssr-support' },
            { text: 'hyperfixi-python', link: '/en/packages/hyperfixi-python' }
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
            { text: 'State Machine', link: '/en/cookbook/state-machine' }
          ]
        }
      ],

      '/en/contributing/': [
        {
          text: 'Architecture',
          items: [
            { text: 'Overview', link: '/en/contributing/' },
            { text: 'Monorepo Structure', link: '/en/contributing/architecture' },
            { text: 'Parser Design', link: '/en/contributing/parser' },
            { text: 'Runtime System', link: '/en/contributing/runtime' }
          ]
        },
        {
          text: 'Development',
          items: [
            { text: 'Setting Up', link: '/en/contributing/setup' },
            { text: 'Testing Guide', link: '/en/contributing/testing' },
            { text: 'Adding Commands', link: '/en/contributing/adding-commands' },
            { text: 'Adding Languages', link: '/en/contributing/adding-languages' }
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
