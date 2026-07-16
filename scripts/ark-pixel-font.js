'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const subsetFont = require('subset-font');
const { stripHTML, unescapeHTML } = require('hexo-util');

const FONT_VERSION = '2026.07.01';
const FONT_SOURCE = path.join(
  hexo.theme_dir,
  'font-source',
  `ark-pixel-12px-proportional-zh-cn-v${FONT_VERSION}.woff2`
);
const FONT_OUTPUT_DIR = 'fonts/ark-pixel';
const COMMON_PAGE_THRESHOLD = 3;
const FONT_BLOCK_START = '<!-- ark-pixel-font:start -->';
const FONT_BLOCK_END = '<!-- ark-pixel-font:end -->';
const DYNAMIC_STYLE_ROUTE = 'css/style.css';
const DYNAMIC_STYLE_START = '/* ark-pixel-dynamic:start */';
const DYNAMIC_STYLE_END = '/* ark-pixel-dynamic:end */';
const FONT_BLOCK_PATTERN = new RegExp(
  `${FONT_BLOCK_START}[\\s\\S]*?${FONT_BLOCK_END}\\s*`,
  'g'
);
const DYNAMIC_STYLE_PATTERN = /\/\* ark-pixel-dynamic:start \*\/[\s\S]*?\/\* ark-pixel-dynamic:end \*\/\s*/g;

// Printable ASCII is shared so controls, dates, URLs, and code do not create
// tiny page-specific files. Everything else becomes common after appearing on
// at least three pages, following the approach described at ayu.land/webfont.
const BASE_CHARACTERS = Array.from(
  { length: 95 },
  (_, index) => String.fromCodePoint(0x20 + index)
).join('') + '\u00a0';

// Dynamic text (for example Gitalk comments) cannot be known at build time.
// These ranges provide small on-demand fallbacks instead of fetching the full
// font. Unsupported ranges are automatically omitted.
const DYNAMIC_RANGES = [
  { id: 'latin-extended', start: 0x00a0, end: 0x024f },
  { id: 'greek-cyrillic', start: 0x0370, end: 0x052f },
  { id: 'punctuation', start: 0x2000, end: 0x2e7f },
  { id: 'cjk-symbols', start: 0x2e80, end: 0x33ff },
  { id: 'cjk-ext-a-1', start: 0x3400, end: 0x3bff },
  { id: 'cjk-ext-a-2', start: 0x3c00, end: 0x43ff },
  { id: 'cjk-ext-a-3', start: 0x4400, end: 0x4dbf },
  ...Array.from({ length: 11 }, (_, index) => {
    const start = 0x4e00 + index * 0x0800;
    return {
      id: `cjk-${index + 1}`,
      start,
      end: Math.min(0x9fff, start + 0x07ff)
    };
  }),
  { id: 'hangul', start: 0xac00, end: 0xd7af },
  { id: 'cjk-compatibility', start: 0xf900, end: 0xfaff },
  { id: 'fullwidth', start: 0xfe10, end: 0xffef }
];

const subsetBufferCache = new Map();

function digest(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function isUsefulCharacter(character) {
  const codePoint = character.codePointAt(0);
  return character === ' ' || character === '\u00a0' || codePoint >= 0x21;
}

function toCharacterSet(text) {
  return new Set(
    Array.from(text.normalize('NFC')).filter(isUsefulCharacter)
  );
}

function sortCharacters(characters) {
  return Array.from(characters)
    .sort((left, right) => left.codePointAt(0) - right.codePointAt(0))
    .join('');
}

function extractPageCharacters(html) {
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;
  const attributeText = Array.from(
    body.matchAll(
      /\b(?:alt|title|aria-label|data-[\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi
    ),
    (match) => match[1] || match[2] || ''
  ).join(' ');
  const visibleMarkup = body
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(
      /<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
      ' '
    );
  const text = unescapeHTML(`${stripHTML(visibleMarkup)} ${attributeText}`);
  return toCharacterSet(text);
}

function collectRuntimeCharacters(directory) {
  const characters = new Set();
  const extensions = new Set(['.ejs', '.js']);

  function visit(currentPath) {
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
      } else if (extensions.has(path.extname(entry.name))) {
        const source = fs.readFileSync(entryPath, 'utf8');
        for (const character of toCharacterSet(source)) {
          if (character.codePointAt(0) > 0x7f) {
            characters.add(character);
          }
        }
      }
    }
  }

  visit(directory);
  return characters;
}

async function readRoute(routePath) {
  const stream = hexo.route.get(routePath);
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function buildRangeText(start, end) {
  let text = '';
  for (let codePoint = start; codePoint <= end; codePoint += 1) {
    if (codePoint < 0xd800 || codePoint > 0xdfff) {
      text += String.fromCodePoint(codePoint);
    }
  }
  return text;
}

function subsetWithCache(fontBuffer, fontDigest, text) {
  const key = `${fontDigest}:${digest(text)}`;
  if (!subsetBufferCache.has(key)) {
    subsetBufferCache.set(
      key,
      subsetFont(fontBuffer, text, { targetFormat: 'woff2' })
    );
  }
  return subsetBufferCache.get(key);
}

function assetUrl(routePath) {
  const root = String(hexo.config.root || '/').replace(/\/?$/, '/');
  return `${root}${routePath}`;
}

function fontFace(family, url, unicodeRange, indentation = 0) {
  const outerIndent = ' '.repeat(indentation);
  const innerIndent = ' '.repeat(indentation + 2);
  const rangeDescriptor = unicodeRange
    ? `\n${innerIndent}unicode-range: ${unicodeRange};`
    : '';
  return `${outerIndent}@font-face {
${innerIndent}font-family: "${family}";
${innerIndent}src: url("${url}") format("woff2");
${innerIndent}font-style: normal;
${innerIndent}font-weight: 400;
${innerIndent}font-display: swap;${rangeDescriptor}
${outerIndent}}`;
}

function rangeDescriptor(start, end) {
  const format = (codePoint) => codePoint.toString(16).toUpperCase().padStart(4, '0');
  return `U+${format(start)}-${format(end)}`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

hexo.extend.filter.register('after_generate', async function buildArkPixelSubsets() {
  if (!fs.existsSync(FONT_SOURCE)) {
    throw new Error(`Ark Pixel Font source not found: ${FONT_SOURCE}`);
  }

  const htmlRoutes = hexo.route.list()
    .filter((routePath) => routePath.endsWith('.html'))
    .sort();
  if (htmlRoutes.length === 0) return;

  const pages = await Promise.all(htmlRoutes.map(async (routePath) => {
    const html = (await readRoute(routePath)).toString('utf8');
    return {
      routePath,
      html,
      characters: extractPageCharacters(html)
    };
  }));

  const pageFrequency = new Map();
  for (const page of pages) {
    for (const character of page.characters) {
      pageFrequency.set(character, (pageFrequency.get(character) || 0) + 1);
    }
  }

  const commonCharacters = toCharacterSet(BASE_CHARACTERS);
  for (const character of collectRuntimeCharacters(hexo.theme_dir)) {
    commonCharacters.add(character);
  }
  for (const [character, count] of pageFrequency) {
    if (count >= COMMON_PAGE_THRESHOLD) {
      commonCharacters.add(character);
    }
  }

  const fontBuffer = fs.readFileSync(FONT_SOURCE);
  const fontDigest = digest(fontBuffer);
  const emptySubset = await subsetWithCache(
    fontBuffer,
    fontDigest,
    String.fromCodePoint(0x10ffff)
  );
  const emittedRoutes = new Set();

  async function emitSubset(prefix, text) {
    if (!text) return null;
    const buffer = await subsetWithCache(fontBuffer, fontDigest, text);
    if (buffer.equals(emptySubset)) return null;

    const routePath = `${FONT_OUTPUT_DIR}/${prefix}.${digest(buffer)}.woff2`;
    if (!emittedRoutes.has(routePath)) {
      hexo.route.set(routePath, buffer);
      emittedRoutes.add(routePath);
    }
    return {
      bytes: buffer.length,
      routePath,
      url: assetUrl(routePath)
    };
  }

  const commonFont = await emitSubset(
    'common',
    sortCharacters(commonCharacters)
  );
  if (!commonFont) {
    throw new Error('Ark Pixel Font common subset is empty.');
  }

  const dynamicFonts = [];
  for (const range of DYNAMIC_RANGES) {
    const font = await emitSubset(
      `dynamic-${range.id}`,
      buildRangeText(range.start, range.end)
    );
    if (font) dynamicFonts.push({ ...range, ...font });
  }

  const styleRoute = hexo.route.get(DYNAMIC_STYLE_ROUTE);
  if (!styleRoute) {
    throw new Error(`Theme stylesheet route not found: ${DYNAMIC_STYLE_ROUTE}`);
  }
  const stylesheet = (await readRoute(DYNAMIC_STYLE_ROUTE)).toString('utf8');
  const dynamicStyleBlock = `${DYNAMIC_STYLE_START}
${dynamicFonts.map((font) => fontFace(
    'Ark Pixel Dynamic',
    font.url,
    rangeDescriptor(font.start, font.end)
  )).join('\n')}
${DYNAMIC_STYLE_END}`;
  hexo.route.set(
    DYNAMIC_STYLE_ROUTE,
    `${stylesheet.replace(DYNAMIC_STYLE_PATTERN, '').trimEnd()}\n\n${dynamicStyleBlock}\n`
  );

  const pageFonts = [];
  for (const page of pages) {
    const uniqueCharacters = new Set(
      Array.from(page.characters).filter(
        (character) => !commonCharacters.has(character)
      )
    );
    const pageFont = await emitSubset(
      'page',
      sortCharacters(uniqueCharacters)
    );
    pageFonts.push(pageFont);

    const preloadFonts = [commonFont, pageFont].filter(Boolean);
    const faces = [
      fontFace('Ark Pixel Common', commonFont.url, null, 4),
      pageFont ? fontFace('Ark Pixel Page', pageFont.url, null, 4) : ''
    ].filter(Boolean);
    const fontBlock = `${FONT_BLOCK_START}
${preloadFonts.map((font) => `  <link rel="preload" href="${font.url}" as="font" type="font/woff2" crossorigin>`).join('\n')}
  <style data-ark-pixel-font>
${faces.join('\n')}
  </style>
${FONT_BLOCK_END}`;
    const cleanHtml = page.html.replace(FONT_BLOCK_PATTERN, '');
    const outputHtml = /<\/head>/i.test(cleanHtml)
      ? cleanHtml.replace(/<\/head>/i, `${fontBlock}\n</head>`)
      : `${fontBlock}\n${cleanHtml}`;
    hexo.route.set(page.routePath, outputHtml);
  }

  const pageFontSizes = pageFonts.filter(Boolean).map((font) => font.bytes);
  const totalPageBytes = pageFontSizes.reduce((total, bytes) => total + bytes, 0);
  const averagePageBytes = pageFontSizes.length
    ? Math.round(totalPageBytes / pageFontSizes.length)
    : 0;
  const maximumPageBytes = pageFontSizes.length
    ? Math.max(...pageFontSizes)
    : 0;

  hexo.log.info(
    'Ark Pixel Font: %d pages, common %s, page subsets avg %s / max %s, %d dynamic shards',
    pages.length,
    formatBytes(commonFont.bytes),
    formatBytes(averagePageBytes),
    formatBytes(maximumPageBytes),
    dynamicFonts.length
  );
});
