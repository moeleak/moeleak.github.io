'use strict';

(function () {
  const globalConfig = window.__WIN98_FONT_CONFIG || {};
  const FONT_FAMILY = globalConfig.family || 'Zpix';
  const FONT_URL = globalConfig.url || '/fonts/zpix.ttf';
  const CACHE_KEY = globalConfig.cacheKey || 'win98-font-cache';
  const FONT_WEIGHT = globalConfig.weight || '400';
  const FONT_STYLE = globalConfig.style || 'normal';
  const FONT_DISPLAY = globalConfig.display || 'swap';
  const LOADING_CLASS = globalConfig.loadingClass || 'fonts-loading';
  const READY_CLASS = globalConfig.readyClass || 'fonts-ready';
  const docEl = document.documentElement;

  function markReady() {
    docEl.classList.remove(LOADING_CLASS);
    docEl.classList.add(READY_CLASS);
  }

  function ensureFallbackFontFace() {
    if (document.getElementById('win98-font-face-fallback')) {
      return;
    }
    const styleEl = document.createElement('style');
    styleEl.id = 'win98-font-face-fallback';
    styleEl.textContent = (
      '@font-face {' +
      `font-family: '${FONT_FAMILY}';` +
      `src: url('${FONT_URL}') format('truetype');` +
      `font-weight: ${FONT_WEIGHT};` +
      `font-style: ${FONT_STYLE};` +
      '}'
    );
    (document.head || document.documentElement).appendChild(styleEl);
  }

  function getLocalStorage() {
    try {
      return window.localStorage || null;
    } catch (error) {
      console.warn('[FontLoader] LocalStorage unavailable:', error);
      return null;
    }
  }

  function base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i += 1) {
      view[i] = binary.charCodeAt(i);
    }
    return buffer;
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return window.btoa(binary);
  }

  function readFromCache(storage) {
    if (!storage || !CACHE_KEY) {
      return null;
    }
    const cached = storage.getItem(CACHE_KEY);
    if (!cached) {
      return null;
    }
    try {
      return base64ToArrayBuffer(cached);
    } catch (error) {
      console.warn('[FontLoader] Failed to parse cached font, clearing cache.', error);
      storage.removeItem(CACHE_KEY);
      return null;
    }
  }

  async function fetchAndPersist(storage) {
    const response = await fetch(FONT_URL, { cache: 'force-cache', credentials: 'omit' });
    if (!response.ok) {
      throw new Error(`[FontLoader] Unable to fetch font: ${response.status} ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    if (storage && CACHE_KEY) {
      try {
        storage.setItem(CACHE_KEY, arrayBufferToBase64(buffer));
      } catch (error) {
        console.warn('[FontLoader] Failed to persist font cache:', error);
      }
    }
    return buffer;
  }

  async function getFontBuffer(storage) {
    const cachedBuffer = readFromCache(storage);
    if (cachedBuffer) {
      return cachedBuffer;
    }
    return fetchAndPersist(storage);
  }

  async function ensureFontIsReady() {
    if (!('fonts' in document) || !window.FontFace) {
      ensureFallbackFontFace();
      throw new Error('[FontLoader] Font loading API not supported.');
    }
    if (document.fonts.check(`1em "${FONT_FAMILY}"`)) {
      return;
    }
    const storage = getLocalStorage();
    const buffer = await getFontBuffer(storage);
    const fontFace = new FontFace(FONT_FAMILY, buffer, {
      weight: FONT_WEIGHT,
      style: FONT_STYLE,
      display: FONT_DISPLAY
    });
    const loadedFont = await fontFace.load();
    document.fonts.add(loadedFont);
  }

  (async function run() {
    try {
      await ensureFontIsReady();
    } catch (error) {
      console.error(error);
      ensureFallbackFontFace();
    } finally {
      markReady();
    }
  }());
})();
