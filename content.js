// Guardián Digital de Menores — Content Script

(function () {
  'use strict';

  const ATTR_ANALYZED = 'data-sg-analyzed';
  const MIN_LENGTH = 80;
  const MAX_LENGTH = 900;
  const DEBOUNCE_MS = 1500;
  const BATCH_SIZE = 5;

  let debounceTimer = null;
  const pending = new Set();
  let isEnabled = true;

  const ATTR_IMG = 'data-sg-img';
  const IMG_MIN_PX = 80;

  console.log('[GDM] Content script activo en:', location.href);

  chrome.storage.sync.get('enabled').then(({ enabled = true }) => { isEnabled = enabled; });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || changes.enabled === undefined) return;
    isEnabled = changes.enabled.newValue ?? true;
    if (isEnabled) {
      console.log('[GDM] Extensión reactivada — re-escaneando página...');
      harvest(document.body);
      harvestImages(document.body);
      schedule();
    }
  });

  // ── Observer ───────────────────────────────────────────────────────────────

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          harvest(node);
          harvestImages(node);
        }
      }
      if (m.type === 'characterData' && m.target.parentElement) {
        harvest(m.target.parentElement);
      }
    }
    schedule();
  });

  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  setTimeout(() => {
    console.log('[GDM] Escaneo inicial...');
    harvest(document.body);
    harvestImages(document.body);
    schedule();
  }, 2000);

  // ── Cosecha de nodos ───────────────────────────────────────────────────────

  const MESSAGE_SELECTORS = [
    '[class*="message"]', '[class*="msg-"]', '[class*="-msg"]',
    '[class*="chat"]', '[class*="comment"]', '[class*="post-body"]',
    '[class*="bubble"]', '[class*="balloon"]', '[class*="text-body"]',
    '[data-testid*="message"]', '[data-testid*="tweet"]',
    'p', 'li'
  ].join(',');

  function harvest(root) {
    const candidates = root.matches?.(MESSAGE_SELECTORS)
      ? [root]
      : [...root.querySelectorAll(MESSAGE_SELECTORS)];

    for (const el of candidates) {
      if (el.hasAttribute(ATTR_ANALYZED)) continue;
      if (el.closest('[data-sg-wrapper]')) continue;
      const text = getText(el);
      if (text.length >= MIN_LENGTH) {
        pending.add(el);
      }
    }
  }

  function getText(el) {
    if (el.querySelectorAll(MESSAGE_SELECTORS).length > 3) return '';
    return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().substring(0, MAX_LENGTH);
  }

  // ── Cola de análisis ───────────────────────────────────────────────────────

  function schedule() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flush, DEBOUNCE_MS);
  }

  function flush() {
    if (!pending.size) return;
    if (!isEnabled) return;

    console.log(`[GDM] Analizando ${pending.size} elementos...`);
    const batch = [...pending].slice(0, BATCH_SIZE);
    pending.clear();

    for (const el of batch) {
      const text = getText(el);
      if (text.length >= MIN_LENGTH) {
        el.setAttribute(ATTR_ANALYZED, 'pending');
        requestAnalysis(el, text);
      } else {
        el.setAttribute(ATTR_ANALYZED, 'skip');
      }
    }
  }

  // ── Comunicación con Service Worker ───────────────────────────────────────

  async function requestAnalysis(el, text) {
    console.log('[GDM] Enviando texto:', text.substring(0, 60) + '...');
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'ANALYZE_TEXT',
        text,
        context: location.hostname || 'archivo local'
      });

      if (!res) {
        console.warn('[GDM] Sin respuesta del service worker');
        el.setAttribute(ATTR_ANALYZED, 'error');
        return;
      }

      if (!res.success) {
        if (res.error === 'disabled') {
          el.removeAttribute(ATTR_ANALYZED);
        } else {
          console.warn('[GDM] Error del service worker:', res.error);
          el.setAttribute(ATTR_ANALYZED, 'error');
        }
        return;
      }

      console.log('[GDM] Resultado:', res.result.risk_level, '-', res.result.category);
      el.setAttribute(ATTR_ANALYZED, 'done');

      if (res.result.risk_level !== 'none') {
        injectBadge(el, res.result);
      }
    } catch (e) {
      console.error('[GDM] Excepción:', e.message);
      el.setAttribute(ATTR_ANALYZED, 'error');
    }
  }

  // ── UI: badge inline ────────────────────────────────────────────────────────

  function injectBadge(el, result) {
    const { risk_level } = result;

    const wrapper = document.createElement('div');
    wrapper.className = `sg-wrapper sg-risk-${risk_level}`;
    wrapper.setAttribute('data-sg-wrapper', 'true');
    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);

    if (risk_level === 'high' || risk_level === 'medium') showFloating(result);
  }

  // ── UI: alerta flotante (solo riesgo alto) ─────────────────────────────────

  const RISK_ORDER = { high: 2, medium: 1, low: 0, none: -1 };

  function showFloating(result) {
    const existing = document.getElementById('sg-floating-host');
    if (existing) {
      const currentLevel = existing.dataset.level || 'none';
      if (RISK_ORDER[currentLevel] > RISK_ORDER[result.risk_level]) return;
      existing.remove();
    }

    const host = document.createElement('div');
    host.id = 'sg-floating-host';
    host.style.cssText = 'all:initial;position:fixed;bottom:24px;right:24px;z-index:2147483647;width:340px;';

    const isHigh    = result.risk_level === 'high';
    const color     = isHigh ? '#ef4444' : '#f97316';
    const colorBg   = isHigh ? '#fef2f2' : '#fff7ed';
    const colorBdr  = isHigh ? '#fecaca' : '#fed7aa';
    const colorText = isHigh ? '#7f1d1d' : '#7c2d12';
    const icon      = isHigh ? '🚨' : '🔶';
    const label     = isHigh ? 'Riesgo Alto Detectado' : 'Riesgo Medio Detectado';

    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        .sg-floating {
          width: 100%;
          background: #fff;
          border: 2px solid ${color};
          border-radius: 12px;
          box-shadow: 0 8px 32px ${color}40, 0 2px 8px rgba(0,0,0,0.15);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 13px;
          animation: sg-slide-in 0.3s ease;
          overflow: hidden;
        }
        @keyframes sg-slide-in {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .sg-floating-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: ${colorBg};
          border-bottom: 1px solid ${colorBdr};
          color: ${colorText};
        }
        .sg-floating-header strong { flex: 1; font-size: 13px; }
        .sg-floating-close {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 15px;
          opacity: 0.6;
          padding: 2px 4px;
          color: ${colorText};
          transition: opacity 0.15s;
        }
        .sg-floating-close:hover { opacity: 1; }
        .sg-floating-body {
          padding: 12px 14px;
          color: #374151;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .sg-floating-body p { margin: 0; line-height: 1.45; }
        .sg-floating-category {
          font-weight: 700;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: ${color};
        }
        .sg-floating-rec {
          font-size: 12px;
          color: #6b7280;
          padding-top: 4px;
          border-top: 1px solid #f3f4f6;
        }
      </style>
      <div class="sg-floating">
        <div class="sg-floating-header">
          <span>${icon}</span>
          <strong>Guardián Digital de Menores — ${label}</strong>
          <button class="sg-floating-close">✕</button>
        </div>
        <div class="sg-floating-body">
          <p class="sg-floating-category">${categoryLabel(result.category)}</p>
          <p>${result.explanation}</p>
          ${result.recommendation ? `<p class="sg-floating-rec">💡 ${result.recommendation}</p>` : ''}
        </div>
      </div>
    `;

    host.dataset.level = result.risk_level;
    shadow.querySelector('.sg-floating-close').addEventListener('click', () => host.remove());
    document.documentElement.appendChild(host);
    setTimeout(() => host.remove(), 10000);
  }

  // ── Imágenes ───────────────────────────────────────────────────────────────

  function harvestImages(root) {
    const imgs = root.tagName === 'IMG' ? [root] : [...root.querySelectorAll('img')];
    for (const img of imgs) {
      if (img.hasAttribute(ATTR_IMG)) continue;
      if (!img.src || img.src.startsWith('data:')) continue;
      img.setAttribute(ATTR_IMG, 'pending');
      // Esperar a que la imagen cargue para conocer sus dimensiones
      if (img.complete) scheduleImageAnalysis(img);
      else img.addEventListener('load', () => scheduleImageAnalysis(img), { once: true });
    }
  }

  function scheduleImageAnalysis(img) {
    const w = img.naturalWidth  || img.width  || img.offsetWidth;
    const h = img.naturalHeight || img.height || img.offsetHeight;
    if (w < IMG_MIN_PX || h < IMG_MIN_PX) {
      img.setAttribute(ATTR_IMG, 'skip');
      return;
    }
    requestImageAnalysis(img);
  }

  async function requestImageAnalysis(img) {
    if (!isEnabled) { img.removeAttribute(ATTR_IMG); return; }

    const src = img.src;
    const alt = img.alt || '';

    try {
      const res = await chrome.runtime.sendMessage({ type: 'ANALYZE_IMAGE', src, alt });

      if (!res?.success) {
        img.setAttribute(ATTR_IMG, 'error');
        return;
      }

      img.setAttribute(ATTR_IMG, 'done');

      if (res.result.risk_level && res.result.risk_level !== 'none') {
        applyImageBlock(img, res.result);
      }
    } catch (e) {
      img.setAttribute(ATTR_IMG, 'error');
    }
  }

  function applyImageBlock(img, result) {
    const risk = result.risk_level || 'high';
    img.classList.add('sg-img-blocked', `sg-img-blocked-${risk}`);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function categoryLabel(c) {
    return ({
      grooming:                    'Grooming',
      captacion_criminal:          'Captación criminal',
      violencia_armas:             'Violencia y armas',
      explotacion_laboral_engano:  'Explotación laboral y engaño',
      narco_cultura_riesgo:        'Narco cultura de riesgo',
      fraude_extorsion:            'Fraude y extorsión',
      datos_personales:            'Datos personales',
      acoso_manipulacion:          'Acoso y manipulación',
      imagen_inapropiada:          'Imagen inapropiada'
    })[c] ?? c;
  }
})();
