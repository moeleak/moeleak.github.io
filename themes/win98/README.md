# A classic win98 style hexo theme.

![screenshot](./screenshot.png)

## Web font

The theme uses [Zpix](https://github.com/SolidZORO/zpix-pixel-font) v3.1.11.
The site owner has permission from the copyright holder to convert and subset
the font for this website. During `hexo generate`, the site creates a shared
subset, an exact subset for each page, and small on-demand ranges for dynamic
text. Generated files are WOFF2 and content-hashed so browsers only fetch the
glyphs they need.

Zpix is designed around a 12px cell. Body copy, window titles, and tabs all use
that native 12px size. Headings advance in full physical-pixel grid steps for
the current display scale and use a one-device-pixel offset for a crisp bold
weight. Line heights and spacing are realigned after browser zoom or moving the
window between displays.
