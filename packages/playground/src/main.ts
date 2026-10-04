/**
 * LokaScript Playground — main entry point.
 *
 * Split-pane editor: Source → LSE IR → the engine's parse
 * Translation view: See equivalent code in all supported languages
 */

// The whole engine and the whole semantic front-end — the playground doesn't care about
// bundle size. Vite aliases resolve both to their source directories.
import { ParseError, everything, formatError, parse, register } from '@hyperfixi/engine';
import { parseSemantic, render, renderExplicit, getAllTranslations } from '@lokascript/semantic';

register(...everything);

/**
 * The English the engine reads for code in `language`: the code itself, or its semantic parse
 * rendered to English (what `@lokascript/hyperscript-adapter` does on a page).
 */
function englishOf(code: string, language: string): string {
  if (language === 'en') return code;
  const node = parseSemantic(code, language).node;
  if (!node) throw new Error(`not readable as ${language}`);
  return render(node, 'en');
}

// ── Elements ──────────────────────────────────────────────────────────────────

const sourceEditor = document.getElementById('source-editor') as HTMLTextAreaElement;
const lseOutput = document.getElementById('lse-output') as HTMLPreElement;
const compiledOutput = document.getElementById('compiled-output') as HTMLPreElement;
const diagnosticsOutput = document.getElementById('diagnostics-output') as HTMLPreElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const shareBtn = document.getElementById('share-btn') as HTMLButtonElement;
const translateEditor = document.getElementById('translate-editor') as HTMLTextAreaElement;
const translationGrid = document.getElementById('translation-grid') as HTMLDivElement;
const tabButtons = document.querySelectorAll<HTMLButtonElement>('nav button[role="tab"]');

// ── Language names for translation cards ──────────────────────────────────────

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Espanol',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
  ar: 'العربية',
  fr: 'Francais',
  de: 'Deutsch',
  pt: 'Portugues',
  tr: 'Turkce',
  ru: 'Русский',
  hi: 'हिन्दी',
  id: 'Indonesia',
  it: 'Italiano',
  pl: 'Polski',
  sw: 'Kiswahili',
  th: 'ไทย',
  uk: 'Українська',
  vi: 'Tieng Viet',
};

// ── Tab switching ─────────────────────────────────────────────────────────────

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.setAttribute('aria-selected', 'false'));
    btn.setAttribute('aria-selected', 'true');

    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const target = btn.getAttribute('data-tab');
    document.getElementById(`panel-${target}`)?.classList.add('active');

    if (target === 'translation') {
      updateTranslation();
    }
  });
});

// ── Hyperscript tab: live compilation ─────────────────────────────────────────

let debounceTimer: ReturnType<typeof setTimeout>;

function debounce(fn: () => void, ms: number) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fn, ms);
}

async function updateCompilation() {
  const code = sourceEditor.value.trim();
  const language = languageSelect.value;

  if (!code) {
    lseOutput.textContent = '';
    compiledOutput.textContent = '';
    diagnosticsOutput.textContent = '';
    diagnosticsOutput.className = 'output';
    return;
  }

  // 1. Parse with semantic parser to get LSE
  try {
    const semanticResult = parseSemantic(code, language);
    if (semanticResult?.node && semanticResult.confidence > 0.3) {
      const lse = renderExplicit(semanticResult.node);
      lseOutput.textContent = lse;
    } else {
      lseOutput.textContent = '(low confidence — try a different command or language)';
    }
  } catch (e) {
    lseOutput.textContent = `Error: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 2. Parse on the engine (@hyperfixi/engine), in English
  try {
    const english = englishOf(code, language);
    const parsed = parse(english);
    compiledOutput.textContent =
      (english === code ? '' : `// ${english}\n`) + JSON.stringify(parsed, null, 2);
    diagnosticsOutput.textContent = 'No errors';
    diagnosticsOutput.className = 'output diagnostic-ok';
  } catch (e) {
    compiledOutput.textContent = '';
    diagnosticsOutput.textContent =
      e instanceof ParseError
        ? `${e.message}\n\n${formatError(e)}`
        : `Parse error: ${e instanceof Error ? e.message : String(e)}`;
    diagnosticsOutput.className = 'output diagnostic-error';
  }
}

sourceEditor.addEventListener('input', () => debounce(updateCompilation, 200));
languageSelect.addEventListener('change', () => updateCompilation());

// ── Translation tab ───────────────────────────────────────────────────────────

function updateTranslation() {
  const code = translateEditor.value.trim();
  if (!code) {
    translationGrid.innerHTML = '';
    return;
  }

  const sourceLang = languageSelect.value;

  try {
    const translations = getAllTranslations(code, sourceLang);
    translationGrid.innerHTML = '';

    for (const [lang, translated] of Object.entries(translations)) {
      const name = LANGUAGE_NAMES[lang] || lang;
      const card = document.createElement('div');
      card.className = 'translation-card';
      card.innerHTML = `
        <div class="lang-header">
          <span class="lang-code">${lang}</span>
          <span>${name}</span>
        </div>
        <div class="lang-text">${escapeHtml(translated as string)}</div>
      `;
      translationGrid.appendChild(card);
    }
  } catch (e) {
    translationGrid.innerHTML = `<p style="color: var(--error)">Translation error: ${escapeHtml(String(e))}</p>`;
  }
}

translateEditor.addEventListener('input', () => debounce(updateTranslation, 300));

// ── Share / permalink ─────────────────────────────────────────────────────────

shareBtn.addEventListener('click', () => {
  const state = {
    code: sourceEditor.value,
    lang: languageSelect.value,
  };
  const hash = btoa(JSON.stringify(state));
  const url = `${window.location.origin}${window.location.pathname}#${hash}`;
  navigator.clipboard.writeText(url).then(() => {
    shareBtn.textContent = 'Copied!';
    setTimeout(() => {
      shareBtn.textContent = 'Share';
    }, 1500);
  });
});

// Restore from permalink on load
function restoreFromHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;
  try {
    const state = JSON.parse(atob(hash));
    if (state.code) sourceEditor.value = state.code;
    if (state.lang) languageSelect.value = state.lang;
  } catch {
    // Invalid hash — ignore
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ── Init ──────────────────────────────────────────────────────────────────────

restoreFromHash();
updateCompilation();
