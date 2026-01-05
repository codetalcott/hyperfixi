import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import HyperscriptPlayground from './components/HyperscriptPlayground.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Register global components
    app.component('HyperscriptPlayground', HyperscriptPlayground)
  }
} satisfies Theme
