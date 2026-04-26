// Guardián Digital de Menores — Popup

const DEFAULT_API_KEY = 'sk-ant-api03-TlN_PyY5LLqXUAa_MD-yyAGgh8HXGwkFgAL';

const apiKeyInput   = document.getElementById('api-key');
const btnSave       = document.getElementById('btn-save');
const btnTest       = document.getElementById('btn-test');
const testStatus    = document.getElementById('test-status');
const enableToggle  = document.getElementById('enable-toggle');
const toggleLabel   = document.getElementById('toggle-lbl');
const alertsList    = document.getElementById('alerts-list');
const btnClear      = document.getElementById('btn-clear');
const countHigh     = document.getElementById('count-high');
const countMedium   = document.getElementById('count-medium');
const countLow      = document.getElementById('count-low');

// ── Inicialización ────────────────────────────────────────────────────────────

async function init() {
  const { apiKey, enabled = true } = await chrome.storage.sync.get(['apiKey', 'enabled']);
  const resolvedKey = apiKey || DEFAULT_API_KEY;

  if (apiKeyInput) {
    apiKeyInput.value = maskKey(resolvedKey);
    apiKeyInput.dataset.saved = resolvedKey;
    apiKeyInput.classList.add('saved');
  }

  enableToggle.checked = enabled;
  toggleLabel.textContent = enabled ? 'ON' : 'OFF';

  await checkApiError();
  await loadAlerts();
}

async function checkApiError() {
  const { apiError } = await chrome.storage.local.get('apiError');
  const banner = document.getElementById('api-error-banner');
  const detail = document.getElementById('api-error-detail');
  if (apiError) {
    const mins = Math.round((Date.now() - apiError.ts) / 60000);
    detail.textContent = ` · Hace ${mins < 1 ? 'menos de 1' : mins} min.`;
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}

init();

// ── Guardar API Key ───────────────────────────────────────────────────────────

if (apiKeyInput) {
  apiKeyInput.addEventListener('focus', () => {
    if (apiKeyInput.dataset.saved) {
      apiKeyInput.value = apiKeyInput.dataset.saved;
    }
  });

  apiKeyInput.addEventListener('blur', () => {
    if (apiKeyInput.dataset.saved && apiKeyInput.value === apiKeyInput.dataset.saved) {
      apiKeyInput.value = maskKey(apiKeyInput.dataset.saved);
    }
  });
}

if (btnSave) btnSave.addEventListener('click', async () => {
  const raw = apiKeyInput.value.trim();
  const val = raw.includes('•') ? apiKeyInput.dataset.saved : raw;
  if (!val || !val.startsWith('sk-ant-')) {
    shake(apiKeyInput);
    return;
  }
  await chrome.storage.sync.set({ apiKey: val });
  apiKeyInput.dataset.saved = val;
  apiKeyInput.value = maskKey(val);
  apiKeyInput.classList.add('saved');
  btnSave.textContent = '✓ Listo';
  btnSave.classList.add('saved');
  setTimeout(() => {
    btnSave.textContent = 'Guardar';
    btnSave.classList.remove('saved');
  }, 2000);
});

// ── Probar conexión ───────────────────────────────────────────────────────────

async function testConnection() {
  const key = (apiKeyInput?.dataset.saved || apiKeyInput?.value || DEFAULT_API_KEY).trim();
  if (!key || !key.startsWith('sk-ant-')) {
    testStatus.className = 'err';
    testStatus.textContent = '✗ Key inválida';
    return;
  }

  if (btnTest) btnTest.disabled = true;
  testStatus.className = '';
  testStatus.textContent = 'Probando…';

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Respondé solo: ok' }]
      })
    });
    if (res.ok) {
      testStatus.className = 'ok';
      testStatus.textContent = '✓ Conexión OK';
    } else {
      const err = await res.json().catch(() => ({}));
      testStatus.className = 'err';
      testStatus.textContent = `✗ Error ${res.status}`;
    }
  } catch (e) {
    testStatus.className = 'err';
    testStatus.textContent = '✗ Sin conexión';
  } finally {
    if (btnTest) btnTest.disabled = false;
    setTimeout(() => { testStatus.className = ''; testStatus.textContent = ''; }, 4000);
  }
}

if (btnTest) btnTest.addEventListener('click', testConnection);

// ── Toggle activar/desactivar ─────────────────────────────────────────────────

enableToggle.addEventListener('change', async () => {
  const enabled = enableToggle.checked;
  await chrome.storage.sync.set({ enabled });
  toggleLabel.textContent = enabled ? 'ON' : 'OFF';
  if (enabled) {
    testConnection();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) chrome.tabs.reload(tab.id);
  }
});

// ── Cargar y mostrar alertas ──────────────────────────────────────────────────

async function loadAlerts() {
  const { alerts = [] } = await chrome.storage.local.get('alerts');

  const high   = alerts.filter(a => a.risk_level === 'high').length;
  const medium = alerts.filter(a => a.risk_level === 'medium').length;
  const low    = alerts.filter(a => a.risk_level === 'low').length;

  countHigh.textContent   = high;
  countMedium.textContent = medium;
  countLow.textContent    = low;

  countHigh.closest('.stat').classList.toggle('active', high >= 1);
  countMedium.closest('.stat').classList.toggle('active', medium >= 1);
  countLow.closest('.stat').classList.toggle('active', low >= 1);

  if (!alerts.length) {
    alertsList.innerHTML = '<div class="empty-state"><span><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#314D1C"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19.77 4.93l1.4 1.4L8.43 19.07l-5.6-5.6 1.4-1.4 4.2 4.2L19.77 4.93m0-2.83L8.43 13.44l-4.2-4.2L0 13.47l8.43 8.43L24 6.33 19.77 2.1z"/></svg></span>Sin alertas recientes</div>';
    return;
  }

  alertsList.innerHTML = alerts.slice(0, 20).map(a => `
    <div class="alert-item ${a.risk_level}">
      <div class="alert-item-header">
        <span class="alert-item-cat ${a.risk_level}">${categoryLabel(a.category)}</span>
        <span class="alert-item-time">${relativeTime(a.timestamp)}</span>
      </div>
      <div class="alert-item-text">${escapeHtml(truncate(a.text, 90))}</div>
      <div class="alert-item-explanation">${escapeHtml(a.explanation)}</div>
    </div>
  `).join('');
}

btnClear.addEventListener('click', async () => {
  await chrome.storage.local.set({ alerts: [] });
  await chrome.storage.local.remove('apiError');
  document.getElementById('api-error-banner').style.display = 'none';
  await loadAlerts();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function maskKey(key) {
  if (!key || key.length < 12) return key;
  return key.substring(0, 10) + '••••••••' + key.slice(-4);
}

function shake(el) {
  el.style.animation = 'none';
  el.style.borderColor = '#ef4444';
  el.style.boxShadow = '0 0 0 2px rgba(239,68,68,0.25)';
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.boxShadow = '';
  }, 1200);
}

function categoryLabel(c) {
  return ({
    grooming:                   'Grooming',
    captacion_criminal:         'Captación criminal',
    violencia_armas:            'Violencia y armas',
    explotacion_laboral_engano: 'Explotación laboral y engaño',
    narco_cultura_riesgo:       'Narco cultura de riesgo',
    fraude_extorsion:           'Fraude y extorsión',
    datos_personales:           'Datos personales',
    acoso_manipulacion:         'Acoso y manipulación',
    imagen_inapropiada:         'Imagen inapropiada'
  })[c] ?? c;
}

function relativeTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000)  return 'hace un momento';
  if (diff < 3600000) return `hace ${Math.floor(diff / 60000)} min`;
  return new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  return (str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function truncate(str, n) {
  return str.length > n ? str.substring(0, n) + '…' : str;
}
