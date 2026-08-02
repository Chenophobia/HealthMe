/*
 * Guards the "Add to Home Screen" path.
 *
 * The app shipped for a while with only an SVG favicon, which iOS ignores
 * when you add a site to the home screen — it wants an apple-touch-icon PNG,
 * and without one the tile comes up blank. Nothing about that failure is
 * visible in a browser tab, so it needs a test rather than a code review.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const staticFile = (name: string) =>
  fileURLToPath(new URL(`../../static/${name}`, import.meta.url));
const APP_HTML = fileURLToPath(new URL('../app.html', import.meta.url));

/** Width and height straight out of the PNG's IHDR chunk. */
function pngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  expect(buf.subarray(0, 8).equals(signature), `${path} is not a PNG`).toBe(true);
  expect(buf.subarray(12, 16).toString('latin1')).toBe('IHDR');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const manifest = JSON.parse(readFileSync(staticFile('manifest.webmanifest'), 'utf8'));
const html = readFileSync(APP_HTML, 'utf8');

describe('apple-touch-icon', () => {
  it('exists as a 180×180 PNG — the size iOS asks for', () => {
    const path = staticFile('apple-touch-icon.png');
    expect(existsSync(path)).toBe(true);
    expect(pngSize(path)).toEqual({ width: 180, height: 180 });
  });

  it('is linked from app.html, where iOS looks for it', () => {
    expect(html).toMatch(/<link[^>]+rel="apple-touch-icon"[^>]+href="\/apple-touch-icon\.png"/);
  });
});

describe('web manifest', () => {
  it('is linked from app.html', () => {
    expect(html).toMatch(/<link[^>]+rel="manifest"[^>]+href="\/manifest\.webmanifest"/);
  });

  it('declares the fields a standalone install needs', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('ships every icon it advertises, at the size it advertises', () => {
    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons) {
      const path = staticFile(icon.src.replace(/^\//, ''));
      expect(existsSync(path), `${icon.src} is referenced but missing`).toBe(true);

      const [w, h] = icon.sizes.split('x').map(Number);
      expect(pngSize(path), `${icon.src} is not ${icon.sizes}`).toEqual({ width: w, height: h });
    }
  });

  it('includes a maskable icon, so Android does not letterbox it', () => {
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  });
});

describe('app.html viewport and theming', () => {
  it('opts into the full screen so safe-area padding can do its job', () => {
    expect(html).toMatch(/<meta[^>]+name="viewport"[^>]+viewport-fit=cover/);
  });

  it('sets a theme colour for both schemes', () => {
    expect(html).toMatch(/name="theme-color"[^>]+\(prefers-color-scheme: light\)/);
    expect(html).toMatch(/name="theme-color"[^>]+\(prefers-color-scheme: dark\)/);
  });

  it('names the app for the home screen', () => {
    expect(html).toMatch(/name="apple-mobile-web-app-title"/);
  });
});
