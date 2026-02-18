/**
 * LokaScript Chat Demo
 *
 * Conversational interface for the LokaScript compilation service.
 * Describe UI behaviors in natural language (24 languages) and see them
 * compiled to hyperscript, JavaScript, React, Vue, and Svelte.
 */

// =============================================================================
// Configuration
// =============================================================================

const API_BASE = new URLSearchParams(window.location.search).get('api')
  || 'http://localhost:3001';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: 'EN' },
  { code: 'es', name: 'Espanol', flag: 'ES' },
  { code: 'ja', name: 'Japanese', flag: 'JA' },
  { code: 'ko', name: 'Korean', flag: 'KO' },
  { code: 'zh', name: 'Chinese', flag: 'ZH' },
  { code: 'ar', name: 'Arabic', flag: 'AR' },
  { code: 'tr', name: 'Turkish', flag: 'TR' },
  { code: 'pt', name: 'Portuguese', flag: 'PT' },
  { code: 'fr', name: 'French', flag: 'FR' },
  { code: 'de', name: 'German', flag: 'DE' },
  { code: 'id', name: 'Indonesian', flag: 'ID' },
  { code: 'sw', name: 'Swahili', flag: 'SW' },
];

const TRANSLATION_LANGUAGES = ['en', 'es', 'ja', 'ko', 'zh', 'ar'];

const EXAMPLE_PROMPTS = [
  'on click toggle .active on me',
  'on click add .highlight to #header',
  'on click hide #modal',
  'on click toggle .dark-mode on <body/>',
  'on click increment :count',
  'on click set #output.innerHTML to "Hello!"',
];

// =============================================================================
// State
// =============================================================================

let currentLanguage = 'en';
let serviceConnected = false;
let isProcessing = false;

// =============================================================================
// DOM References
// =============================================================================

const $ = (sel) => document.querySelector(sel);
const messagesEl = $('#messages');
const inputEl = $('#chat-input');
const sendBtn = $('#send-btn');
const langSelect = $('#lang-select');
const statusDot = $('#status-dot');
const statusLabel = $('#status-label');
const offlineBanner = $('#offline-banner');

// =============================================================================
// API Client
// =============================================================================

async function apiCall(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function compile(code, language) {
  return apiCall('/compile', { code, language });
}

async function translate(code, from, to) {
  return apiCall('/translate', { code, from, to });
}

async function generateComponent(code, language, framework) {
  return apiCall('/generate-component', { code, language, framework });
}

async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    return data.ok;
  } catch {
    return false;
  }
}

// =============================================================================
// Connection Status
// =============================================================================

async function updateConnectionStatus() {
  const wasConnected = serviceConnected;
  serviceConnected = await checkHealth();

  statusDot.className = 'status-dot ' + (serviceConnected ? 'connected' : 'error');
  statusLabel.textContent = serviceConnected ? 'Connected' : 'Disconnected';
  offlineBanner.classList.toggle('visible', !serviceConnected);

  if (!wasConnected && serviceConnected) {
    // Just connected — re-enable input
    inputEl.disabled = false;
    sendBtn.disabled = false;
  }
}

// =============================================================================
// Message Rendering
// =============================================================================

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

function addUserMessage(text) {
  // Remove welcome if present
  const welcome = messagesEl.querySelector('.welcome');
  if (welcome) welcome.remove();

  const msg = document.createElement('div');
  msg.className = 'message user';
  msg.innerHTML = `
    <div class="message-avatar">U</div>
    <div class="message-body">${escapeHtml(text)}</div>
  `;
  messagesEl.appendChild(msg);
  scrollToBottom();
}

function addLoadingMessage() {
  const msg = document.createElement('div');
  msg.className = 'message assistant';
  msg.id = 'loading-msg';
  msg.innerHTML = `
    <div class="message-avatar">L</div>
    <div class="message-body">
      <div class="loading-dots"><span></span><span></span><span></span></div>
    </div>
  `;
  messagesEl.appendChild(msg);
  scrollToBottom();
  return msg;
}

function removeLoadingMessage() {
  const el = document.getElementById('loading-msg');
  if (el) el.remove();
}

function addErrorMessage(text) {
  removeLoadingMessage();
  const msg = document.createElement('div');
  msg.className = 'message assistant';
  msg.innerHTML = `
    <div class="message-avatar">L</div>
    <div class="message-body">
      <div class="error-msg">${text}</div>
    </div>
  `;
  messagesEl.appendChild(msg);
  scrollToBottom();
}

function addBehaviorCard(compileResult, componentResults, translations) {
  removeLoadingMessage();

  const cardId = 'card-' + Date.now();
  const confidence = compileResult.confidence ?? 1.0;
  const confPercent = Math.round(confidence * 100);
  const confClass = confidence >= 0.8 ? 'high' : confidence >= 0.6 ? 'medium' : 'low';

  // Build tab buttons and panels
  const tabs = [];
  const panels = [];

  // Hyperscript tab
  const hsCode = compileResult.semantic
    ? formatSemantic(compileResult.semantic)
    : '(no semantic data)';
  tabs.push(makeTab(cardId, 'hyperscript', 'Hyperscript', true));
  panels.push(makeCodePanel(cardId, 'hyperscript', hsCode, true));

  // JavaScript tab
  if (compileResult.js) {
    tabs.push(makeTab(cardId, 'js', 'JavaScript'));
    panels.push(makeCodePanel(cardId, 'js', compileResult.js));
  }

  // Preview tab
  tabs.push(makeTab(cardId, 'preview', 'Preview'));
  panels.push(makePreviewPanel(cardId, compileResult));

  // Framework tabs
  for (const [fw, result] of Object.entries(componentResults)) {
    if (result.ok && result.component) {
      const label = fw.charAt(0).toUpperCase() + fw.slice(1);
      tabs.push(makeTab(cardId, fw, label));
      panels.push(makeCodePanel(cardId, fw, result.component.code));
    }
  }

  // Diagnostics
  let diagnosticsHtml = '';
  const warnings = (compileResult.diagnostics || []).filter(d => d.severity !== 'error');
  if (warnings.length > 0) {
    diagnosticsHtml = `<div class="diagnostics">${warnings
      .map(d => `<span class="diagnostic ${d.severity}">${d.message}</span>`)
      .join('')}</div>`;
  }

  // Translations
  let translationsHtml = '';
  if (translations && Object.keys(translations).length > 0) {
    const items = Object.entries(translations)
      .filter(([lang]) => lang !== currentLanguage)
      .map(([lang, code]) => `
        <div class="translation-item">
          <span class="translation-lang">${lang}</span>
          <span class="translation-code">${escapeHtml(code)}</span>
        </div>
      `).join('');

    if (items) {
      translationsHtml = `
        <div class="translations">
          <button class="translations-toggle" onclick="toggleTranslations(this)">
            Translations ▸
          </button>
          <div class="translations-list">${items}</div>
        </div>
      `;
    }
  }

  const msg = document.createElement('div');
  msg.className = 'message assistant';
  msg.innerHTML = `
    <div class="message-avatar">L</div>
    <div class="message-body">
      <div class="confidence-row">
        <div class="confidence-bar">
          <div class="confidence-fill ${confClass}" style="width: ${confPercent}%"></div>
        </div>
        <span>confidence: ${confPercent}%</span>
      </div>
      ${diagnosticsHtml}
      <div class="behavior-card">
        <div class="card-tabs">${tabs.join('')}</div>
        <div class="card-content">${panels.join('')}</div>
        ${translationsHtml}
      </div>
    </div>
  `;

  messagesEl.appendChild(msg);
  scrollToBottom();
}

// =============================================================================
// Tab / Panel Helpers
// =============================================================================

function makeTab(cardId, name, label, active = false) {
  return `<button class="card-tab${active ? ' active' : ''}"
    onclick="switchTab('${cardId}', '${name}')">${label}</button>`;
}

function makeCodePanel(cardId, name, code, active = false) {
  const panelId = `${cardId}-${name}`;
  return `
    <div class="tab-panel${active ? ' active' : ''}" data-tab="${name}" data-card="${cardId}">
      <div class="code-block" id="${panelId}">
        <button class="copy-btn" onclick="copyCode('${panelId}')">Copy</button>
        ${escapeHtml(code)}
      </div>
    </div>
  `;
}

function makePreviewPanel(cardId, compileResult) {
  const semantic = compileResult.semantic;
  let previewContent = '';

  if (semantic) {
    const action = semantic.action || '';
    const trigger = semantic.trigger?.event || 'click';

    // Generate a simple interactive preview based on the action
    if (['toggle', 'add', 'remove'].includes(action)) {
      const className = extractRoleValue(semantic.roles, 'patient') || 'active';
      previewContent = `
        <div class="preview-area">
          <button onclick="this.classList.toggle('${className.replace(/^\./, '')}')"
            style="padding: 10px 24px; border-radius: 6px; font-size: 14px; cursor: pointer;
                   background: var(--accent); color: #fff; border: none;
                   transition: all 200ms ease;">
            ${trigger.charAt(0).toUpperCase() + trigger.slice(1)} me
          </button>
        </div>
        <div class="preview-note">Click to see the ${action} behavior</div>
      `;
    } else if (['show', 'hide'].includes(action)) {
      previewContent = `
        <div class="preview-area" style="flex-direction: column; gap: 12px;">
          <div id="${cardId}-target" style="padding: 12px 24px; background: var(--bg-surface);
               border: 1px solid var(--border); border-radius: 6px; color: var(--text);">
            Target Element
          </div>
          <button onclick="document.getElementById('${cardId}-target').style.display =
            document.getElementById('${cardId}-target').style.display === 'none' ? '' : 'none'"
            style="padding: 8px 16px; border-radius: 6px; font-size: 13px; cursor: pointer;
                   background: var(--bg-hover); color: var(--text); border: 1px solid var(--border);">
            Toggle visibility
          </button>
        </div>
      `;
    } else {
      previewContent = `
        <div class="preview-area">
          <div style="color: var(--text-muted); font-size: 13px;">
            Preview not available for "${action}" command
          </div>
        </div>
      `;
    }
  } else {
    previewContent = `
      <div class="preview-area">
        <div style="color: var(--text-muted); font-size: 13px;">No preview available</div>
      </div>
    `;
  }

  return `
    <div class="tab-panel" data-tab="preview" data-card="${cardId}">
      ${previewContent}
    </div>
  `;
}

// =============================================================================
// Semantic Formatting
// =============================================================================

function formatSemantic(semantic) {
  if (!semantic) return '';
  const parts = [semantic.action || '???'];

  // Add roles in a readable order
  const roleOrder = ['patient', 'destination', 'source', 'instrument', 'manner', 'style'];
  const roles = semantic.roles || {};

  for (const role of roleOrder) {
    if (roles[role]) {
      const val = typeof roles[role] === 'object' ? roles[role].value : roles[role];
      if (role === 'destination') {
        parts.push('on ' + val);
      } else {
        parts.push(String(val));
      }
    }
  }

  // Add any remaining roles not in the standard order
  for (const [role, val] of Object.entries(roles)) {
    if (!roleOrder.includes(role)) {
      const v = typeof val === 'object' ? val.value : val;
      parts.push(String(v));
    }
  }

  // Add trigger
  if (semantic.trigger) {
    return 'on ' + semantic.trigger.event + ' ' + parts.join(' ');
  }

  return parts.join(' ');
}

function extractRoleValue(roles, roleName) {
  if (!roles || !roles[roleName]) return null;
  const role = roles[roleName];
  return typeof role === 'object' ? String(role.value) : String(role);
}

// =============================================================================
// Chat Logic
// =============================================================================

async function handleSubmit() {
  const text = inputEl.value.trim();
  if (!text || isProcessing) return;

  isProcessing = true;
  sendBtn.disabled = true;
  inputEl.value = '';
  autoResizeTextarea();

  addUserMessage(text);

  if (!serviceConnected) {
    addErrorMessage(
      'Compilation service is not running. Start it with:<br>' +
      '<code>cd packages/compilation-service && npx tsx src/serve.ts</code>'
    );
    isProcessing = false;
    sendBtn.disabled = false;
    return;
  }

  addLoadingMessage();

  try {
    // Step 1: Compile the input
    const compileResult = await compile(text, currentLanguage);

    if (!compileResult.ok) {
      const errorMsg = compileResult.diagnostics
        ?.map(d => d.message)
        .join('<br>') || 'Failed to parse input';
      addErrorMessage(errorMsg);
      isProcessing = false;
      sendBtn.disabled = false;
      return;
    }

    // Step 2: Generate components for all frameworks (in parallel)
    const frameworks = ['react', 'vue', 'svelte'];
    const componentPromises = frameworks.map(fw =>
      generateComponent(text, currentLanguage, fw).catch(() => ({ ok: false }))
    );

    // Step 3: Get translations (in parallel)
    const translationPromises = TRANSLATION_LANGUAGES
      .filter(lang => lang !== currentLanguage)
      .map(async lang => {
        try {
          const result = await translate(text, currentLanguage, lang);
          return [lang, result.ok ? result.code : null];
        } catch {
          return [lang, null];
        }
      });

    const [componentResults, translationResults] = await Promise.all([
      Promise.all(componentPromises),
      Promise.all(translationPromises),
    ]);

    // Assemble results
    const components = {};
    frameworks.forEach((fw, i) => { components[fw] = componentResults[i]; });

    const translations = {};
    for (const [lang, code] of translationResults) {
      if (code) translations[lang] = code;
    }

    addBehaviorCard(compileResult, components, translations);
  } catch (err) {
    addErrorMessage('Request failed: ' + escapeHtml(err.message));
  }

  isProcessing = false;
  sendBtn.disabled = false;
  inputEl.focus();
}

// =============================================================================
// UI Interactions
// =============================================================================

// Global functions referenced from onclick attributes

window.switchTab = function(cardId, tabName) {
  const card = document.querySelector(`.behavior-card:has([data-card="${cardId}"])`);
  if (!card) return;

  card.querySelectorAll('.card-tab').forEach((tab, i) => {
    const panels = card.querySelectorAll('.tab-panel');
    const isTarget = panels[i]?.dataset.tab === tabName;
    tab.classList.toggle('active', isTarget);
    if (panels[i]) panels[i].classList.toggle('active', isTarget);
  });
};

window.copyCode = function(panelId) {
  const el = document.getElementById(panelId);
  if (!el) return;

  // Get text content excluding the copy button
  const btn = el.querySelector('.copy-btn');
  const text = el.textContent.replace(btn?.textContent || '', '').trim();

  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.classList.remove('copied');
    }, 1500);
  });
};

window.toggleTranslations = function(btn) {
  const list = btn.nextElementSibling;
  const isOpen = list.classList.toggle('open');
  btn.textContent = isOpen ? 'Translations ▾' : 'Translations ▸';
};

window.useExample = function(text) {
  inputEl.value = text;
  autoResizeTextarea();
  inputEl.focus();
};

function autoResizeTextarea() {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
}

// =============================================================================
// Utilities
// =============================================================================

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// =============================================================================
// Event Listeners
// =============================================================================

sendBtn.addEventListener('click', handleSubmit);

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
});

inputEl.addEventListener('input', autoResizeTextarea);

langSelect.addEventListener('change', (e) => {
  currentLanguage = e.target.value;
});

// =============================================================================
// Initialization
// =============================================================================

async function init() {
  // Populate language selector
  for (const lang of LANGUAGES) {
    const opt = document.createElement('option');
    opt.value = lang.code;
    opt.textContent = `${lang.flag} ${lang.name}`;
    langSelect.appendChild(opt);
  }

  // Check connection
  await updateConnectionStatus();

  // Periodically check connection
  setInterval(updateConnectionStatus, 10000);

  // Focus input
  inputEl.focus();
}

init();
