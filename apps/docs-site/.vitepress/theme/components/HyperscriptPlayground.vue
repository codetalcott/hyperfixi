<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps<{
  initialCode?: string
  initialLanguage?: string
  initialHtml?: string
}>()

const languages = [
  { code: 'en', name: 'English', rtl: false },
  { code: 'es', name: 'Español', rtl: false },
  { code: 'ja', name: '日本語', rtl: false },
  { code: 'zh', name: '中文', rtl: false },
  { code: 'ar', name: 'العربية', rtl: true }
]

const code = ref(props.initialCode || 'on click toggle .active on me')
const selectedLanguage = ref(props.initialLanguage || 'en')
const output = ref('')
const error = ref('')
const previewEl = ref<HTMLElement | null>(null)
const isRunning = ref(false)

const defaultHtml = '<button class="demo-button">Click me</button>'

const isRTL = computed(() =>
  languages.find(l => l.code === selectedLanguage.value)?.rtl || false
)

// Watch for language changes and show translation hint
watch(selectedLanguage, (newLang) => {
  if (newLang !== 'en') {
    output.value = `Language: ${languages.find(l => l.code === newLang)?.name}. The semantic parser will process this code.`
  } else {
    output.value = ''
  }
})

async function runCode() {
  error.value = ''
  output.value = ''
  isRunning.value = true

  try {
    // Check if hyperfixi is available globally (loaded via CDN in production)
    const hyperfixi = (window as any).hyperfixi

    if (!hyperfixi) {
      // Fallback: Just show what would happen
      output.value = `Code ready: "${code.value}"\n\nTo see live execution, the HyperFixi runtime must be loaded.`

      // Still update the preview HTML to show the attribute
      if (previewEl.value) {
        const html = props.initialHtml || defaultHtml
        previewEl.value.innerHTML = html.replace(/(_=["'][^"']*["']|>)/, `_="${code.value}"$1`)
      }
      return
    }

    // Set up preview element with the hyperscript
    if (previewEl.value) {
      const html = props.initialHtml || defaultHtml
      // Inject the hyperscript code into the _ attribute
      previewEl.value.innerHTML = html.replace(/(_=["'][^"']*["']|>)/, `_="${code.value}"$1`)

      // Process with HyperFixi
      await hyperfixi.processNode(previewEl.value)
      output.value = 'Hyperscript is now active. Try clicking the button!'
    }
  } catch (e: any) {
    error.value = e.message || 'An error occurred'
  } finally {
    isRunning.value = false
  }
}

onMounted(() => {
  // Initialize preview with default HTML
  if (previewEl.value) {
    previewEl.value.innerHTML = props.initialHtml || defaultHtml
  }
})
</script>

<template>
  <div class="playground" :class="{ rtl: isRTL }">
    <div class="playground-header">
      <select v-model="selectedLanguage" class="language-select">
        <option v-for="lang in languages" :key="lang.code" :value="lang.code">
          {{ lang.name }}
        </option>
      </select>
      <button @click="runCode" class="run-button" :disabled="isRunning">
        {{ isRunning ? 'Running...' : 'Run' }}
      </button>
    </div>

    <div class="playground-editor">
      <textarea
        v-model="code"
        class="code-input"
        :dir="isRTL ? 'rtl' : 'ltr'"
        spellcheck="false"
        placeholder="Enter hyperscript code..."
      ></textarea>
    </div>

    <div class="playground-preview">
      <div class="html-preview" ref="previewEl"></div>
    </div>

    <div class="playground-output">
      <pre v-if="output" class="success">{{ output }}</pre>
      <pre v-if="error" class="error">{{ error }}</pre>
      <span v-if="!output && !error" class="placeholder">Click "Run" to execute the hyperscript</span>
    </div>
  </div>
</template>

<style scoped>
.placeholder {
  color: var(--vp-c-text-3);
  font-style: italic;
}
</style>
