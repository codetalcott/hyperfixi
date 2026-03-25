/**
 * Shared demo initialization for Siren+GRAIL browser demos.
 *
 * Loads LokaScriptSiren from the built browser bundle and provides
 * helper functions for rendering entities, conditions, and actions.
 */

// The browser bundle exposes window.LokaScriptSiren
const Siren = () => window.LokaScriptSiren;

// ---------------------------------------------------------------------------
// Demo initialization
// ---------------------------------------------------------------------------

/**
 * Initialize a Siren+GRAIL demo page.
 * Call after DOM is loaded and LokaScriptSiren bundle is available.
 */
export function initDemo(config) {
  const { serverUrl, entityContainer, actionsContainer, conditionsContainer, planContainer, logContainer } = config;

  const siren = Siren();
  const conditionState = siren.getConditionState();

  // Set up plan UI if container exists
  let planUI = null;
  if (planContainer) {
    planUI = siren.createSirenPlanUI({ element: planContainer });
  }

  // Log helper
  function log(message) {
    if (!logContainer) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `${new Date().toLocaleTimeString()} ${message}`;
    logContainer.prepend(entry);
  }

  // Event listeners
  document.addEventListener('siren:entity', (e) => {
    const { entity, url } = e.detail;
    log(`Entity loaded: ${url}`);
    if (entityContainer) renderEntity(entity, entityContainer);
    if (actionsContainer) renderActions(entity, actionsContainer, serverUrl, log);
    if (conditionsContainer) renderConditions(entity, conditionState, conditionsContainer);
  });

  document.addEventListener('siren:blocked', (e) => {
    const { message, blockedAction, offeredActions } = e.detail;
    log(`Blocked: ${blockedAction} — ${message} (${offeredActions.length} offered)`);
  });

  document.addEventListener('siren:plan', (e) => {
    const { blockedAction, steps, totalCost } = e.detail;
    log(`Plan for ${blockedAction}: ${steps.length} steps, cost ${totalCost}`);
  });

  document.addEventListener('siren:error', (e) => {
    log(`Error: ${e.detail.message}`);
  });

  document.addEventListener('siren:conditions', (e) => {
    const { entity, added, removed } = e.detail;
    if (added.length) log(`Conditions added: ${added.join(', ')}`);
    if (removed.length) log(`Conditions removed: ${removed.join(', ')}`);
    // Re-render conditions panel
    const currentEntity = siren.getCurrentEntity();
    if (conditionsContainer && currentEntity) {
      renderConditions(currentEntity, conditionState, conditionsContainer);
    }
  });

  return {
    siren,
    conditionState,
    planUI,
    log,

    async fetchEntity(url) {
      log(`Fetching ${url}...`);
      return siren.fetchSiren(url);
    },

    async pursue(goalActionName, data) {
      log(`Pursuing: ${goalActionName}`);
      const result = await siren.pursue(goalActionName, data);
      log(`Pursuit ${result.status}: ${result.steps.map(s => `${s.action}(${s.status})`).join(' → ')}`);
      return result;
    },
  };
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

export function renderEntity(entity, container) {
  container.innerHTML = '';

  // Properties
  if (entity.properties) {
    const props = document.createElement('div');
    props.className = 'props';
    for (const [key, value] of Object.entries(entity.properties)) {
      if (key === 'conditions') continue; // rendered separately
      const span = document.createElement('span');
      span.innerHTML = `<span class="label">${key}:</span> ${escapeHtml(String(value))}`;
      props.appendChild(span);
    }
    container.appendChild(props);
  }

  // Status badge
  const status = entity.properties?.status;
  if (status) {
    const badge = document.createElement('span');
    badge.className = `badge badge-${status}`;
    badge.textContent = status;
    container.prepend(badge);
  }
}

export function renderActions(entity, container, serverUrl, log) {
  container.innerHTML = '';

  const actions = entity.actions ?? [];
  if (actions.length === 0) {
    container.innerHTML = '<em style="color:var(--muted)">No actions available</em>';
    return;
  }

  for (const action of actions) {
    const btn = document.createElement('button');
    btn.textContent = action.title || action.name;
    btn.dataset.action = action.name;

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = `${action.title || action.name}...`;
      try {
        const siren = Siren();
        // Build request from action
        const url = new URL(action.href, serverUrl).href;
        const method = (action.method || 'GET').toUpperCase();
        const opts = { method };

        if (method !== 'GET' && method !== 'HEAD') {
          // Collect field data from any associated form inputs
          const data = collectFieldData(action, container);
          opts.headers = { 'Content-Type': action.type || 'application/json' };
          opts.body = JSON.stringify(data);
        }

        await siren.fetchSiren(url, opts);
      } catch (err) {
        log(`Error executing ${action.name}: ${err.message}`);
      } finally {
        btn.disabled = false;
        btn.textContent = action.title || action.name;
      }
    });

    container.appendChild(btn);
  }
}

export function renderConditions(entity, conditionState, container) {
  container.innerHTML = '';

  const heading = document.createElement('h3');
  heading.textContent = 'Conditions';
  container.appendChild(heading);

  // Get conditions from x-conditions or entity properties
  const xConditions = entity['x-conditions'] || [];
  const propConditions = entity.properties?.conditions || {};

  // Merge sources
  const allConditions = new Map();

  // From x-conditions header/body
  for (const name of xConditions) {
    allConditions.set(name, true);
  }

  // From properties.conditions object
  if (typeof propConditions === 'object') {
    for (const [name, value] of Object.entries(propConditions)) {
      allConditions.set(name, Boolean(value));
    }
  }

  // From condition state tracker
  const tracked = conditionState.get();
  for (const name of tracked) {
    allConditions.set(name, true);
  }

  if (allConditions.size === 0) {
    container.innerHTML += '<div style="color:var(--muted);font-size:0.8125rem">No conditions reported</div>';
    return;
  }

  // Sort and render
  const sorted = [...allConditions.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [name, met] of sorted) {
    const row = document.createElement('div');
    row.className = 'cond-row';
    row.innerHTML = `<span class="cond-dot ${met ? 'met' : ''}"></span><span class="cond-name">${escapeHtml(name)}</span>`;
    container.appendChild(row);
  }
}

function collectFieldData(action, container) {
  const data = {};
  // Pre-fill from action field defaults
  for (const field of action.fields || []) {
    if (field.value !== undefined) {
      data[field.name] = field.value;
    }
    // Check for form inputs
    const input = container.closest('.card')?.querySelector(`[name="${field.name}"]`);
    if (input && input.value) {
      data[field.name] = input.value;
    }
  }
  return data;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
