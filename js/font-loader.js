'use strict';

(function () {
  const globalConfig = window.__WIN98_FONT_CONFIG || {};
  const FONT_FAMILY = globalConfig.family || 'Zpix';
  const FONT_URL = globalConfig.url || '/fonts/zpix.ttf';
  const CACHE_KEY = globalConfig.cacheKey || 'win98-font-cache';
  const FONT_WEIGHT = globalConfig.weight || '400';
  const FONT_STYLE = globalConfig.style || 'normal';
  const FONT_FORMAT = globalConfig.format || 'truetype';
  const FONT_DISPLAY = globalConfig.display || 'swap';
  const FONT_MIME = globalConfig.mime || 'font/ttf';
  const LOADING_CLASS = globalConfig.loadingClass || 'fonts-loading';
  const READY_CLASS = globalConfig.readyClass || 'fonts-ready';
  const FALLBACK_STYLE_ID = 'win98-font-face-fallback';
  const docEl = document.documentElement;

  function markReady() {
    docEl.classList.remove(LOADING_CLASS);
    docEl.classList.add(READY_CLASS);
  }

  function ensureFallbackFontFace() {
    if (document.getElementById(FALLBACK_STYLE_ID)) {
      return;
    }
    const styleEl = document.createElement('style');
    styleEl.id = FALLBACK_STYLE_ID;
    styleEl.textContent = (
      '@font-face {' +
      `font-family: '${FONT_FAMILY}';` +
      `src: url('${FONT_URL}') format('${FONT_FORMAT}');` +
      `font-weight: ${FONT_WEIGHT};` +
      `font-style: ${FONT_STYLE};` +
      `font-display: ${FONT_DISPLAY};` +
      '}'
    );
    (document.head || document.documentElement).appendChild(styleEl);
  }

  function isCacheStorageAvailable() {
    return typeof window !== 'undefined' && 'caches' in window;
  }

  async function readFromCache() {
    if (!isCacheStorageAvailable() || !CACHE_KEY) {
      return null;
    }
    try {
      const cache = await window.caches.open(CACHE_KEY);
      const cachedResponse = await cache.match(FONT_URL);
      if (!cachedResponse) {
        return null;
      }
      return cachedResponse.arrayBuffer();
    } catch (error) {
      console.warn('[FontLoader] Failed to read from CacheStorage.', error);
      return null;
    }
  }

  async function persistCache(buffer) {
    if (!isCacheStorageAvailable() || !CACHE_KEY) {
      return;
    }
    try {
      const cache = await window.caches.open(CACHE_KEY);
      const clone = buffer.slice(0);
      const response = new Response(clone, {
        headers: { 'Content-Type': FONT_MIME }
      });
      await cache.put(FONT_URL, response);
    } catch (error) {
      console.warn('[FontLoader] Failed to persist font cache (CacheStorage).', error);
    }
  }

  async function fetchFontBuffer() {
    const response = await fetch(FONT_URL, { cache: 'force-cache', credentials: 'omit' });
    if (!response.ok) {
      throw new Error(`[FontLoader] Unable to fetch font: ${response.status} ${response.statusText}`);
    }
    return response.arrayBuffer();
  }

  async function loadFontFromBuffer(buffer) {
    const fontFace = new FontFace(FONT_FAMILY, buffer, {
      weight: FONT_WEIGHT,
      style: FONT_STYLE,
      display: FONT_DISPLAY
    });
    const loadedFont = await fontFace.load();
    document.fonts.add(loadedFont);
  }

  async function loadFontWithCache() {
    const cachedBuffer = await readFromCache();
    if (cachedBuffer) {
      try {
        await loadFontFromBuffer(cachedBuffer);
        return;
      } catch (error) {
        console.warn('[FontLoader] Failed to load cached font, ignoring cache.', error);
      }
    }
    const buffer = await fetchFontBuffer();
    await loadFontFromBuffer(buffer);
    persistCache(buffer);
  }

  async function ensureFontWithCssOnly() {
    ensureFallbackFontFace();
  }

  async function ensureFontIsReady() {
    if (!('fonts' in document) || typeof FontFace === 'undefined') {
      await ensureFontWithCssOnly();
      throw new Error('[FontLoader] Font loading API not supported.');
    }
    await loadFontWithCache();
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
