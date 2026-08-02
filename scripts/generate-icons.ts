/*
 * Renders the app mark to the PNG sizes iOS and the web manifest need.
 *
 * Why hand-rolled: the mark is four straight strokes, and the alternative is
 * dragging in a headless-browser or native-image toolchain that CI would then
 * have to install on every run just to redraw a file that changes once a year.
 * Everything here is Node built-ins — geometry sampled as coverage, then a
 * minimal PNG container around zlib.
 *
 *   npm run icons
 *
 * Commit the output. The generator exists so the mark stays reproducible, not
 * because the build depends on it.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'static');

type RGB = [number, number, number];

const INK: RGB = [0x11, 0x15, 0x1b]; // --color-ink, the field
const CYAN: RGB = [0x53, 0xcf, 0xec]; // dark-mode --color-accent, the trend
const RULE: RGB = [0xff, 0xff, 0xff]; // the measuring rule, laid in at low alpha

/*
 * The mark, in unit coordinates (0–1, y down): a measuring rule with the
 * weight trend falling across it. Content sits inside the centre 64%, which
 * is already within the maskable safe zone.
 */
const TREND: Array<[number, number]> = [
  [0.2, 0.28],
  [0.36, 0.4],
  [0.52, 0.33],
  [0.68, 0.5],
  [0.8, 0.655]
];
const TREND_WIDTH = 0.078;
/* The trend's last point lands on the rule's last tick: the line comes down
   to the measure rather than floating above an unrelated comb. */
const BASELINE_Y = 0.74;
const RULE_WIDTH = 0.045;
const TICK_XS = [0.2, 0.4, 0.6, 0.8];
const TICK_WIDTH = 0.036;
const TICK_DROP = 0.075;

/** Distance from a point to a line segment — the whole geometry kernel. */
function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Round-capped stroke through a point list: inside if near any segment. */
function strokeDistance(px: number, py: number, points: Array<[number, number]>): number {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const d = distToSegment(px, py, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
    if (d < best) best = d;
  }
  return best;
}

type Stroke = { points: Array<[number, number]>; width: number; color: RGB; alpha: number };

function strokes(scale: number): Stroke[] {
  // Scale content about the canvas centre; the field stays full-bleed.
  const s = (v: number) => 0.5 + (v - 0.5) * scale;
  const pt = ([x, y]: [number, number]): [number, number] => [s(x), s(y)];

  const list: Stroke[] = [
    {
      points: [pt([0.2, BASELINE_Y]), pt([0.8, BASELINE_Y])],
      width: RULE_WIDTH * scale,
      color: RULE,
      alpha: 0.45
    }
  ];
  for (const x of TICK_XS) {
    list.push({
      points: [pt([x, BASELINE_Y]), pt([x, BASELINE_Y + TICK_DROP])],
      width: TICK_WIDTH * scale,
      color: RULE,
      alpha: 0.45
    });
  }
  list.push({
    points: TREND.map(pt),
    width: TREND_WIDTH * scale,
    color: CYAN,
    alpha: 1
  });
  return list;
}

/** 4×4 supersampled coverage, painted back-to-front over the ink field. */
function renderRGBA(size: number, contentScale: number): Buffer {
  const shapes = strokes(contentScale);
  const px = Buffer.alloc(size * size * 4);
  const SS = 4;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = INK[0];
      let g = INK[1];
      let b = INK[2];

      for (const shape of shapes) {
        const radius = shape.width / 2;
        let hits = 0;
        for (let sy = 0; sy < SS; sy++) {
          for (let sx = 0; sx < SS; sx++) {
            const ux = (x + (sx + 0.5) / SS) / size;
            const uy = (y + (sy + 0.5) / SS) / size;
            if (strokeDistance(ux, uy, shape.points) <= radius) hits++;
          }
        }
        if (hits === 0) continue;
        const a = (hits / (SS * SS)) * shape.alpha;
        r = Math.round(r + (shape.color[0] - r) * a);
        g = Math.round(g + (shape.color[1] - g) * a);
        b = Math.round(b + (shape.color[2] - b) * a);
      }

      const i = (y * size + x) * 4;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = 255; // opaque: iOS composites home-screen icons on white
    }
  }
  return px;
}

// ---------------------------------------------------------------- PNG container

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePNG(size: number, rgba: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  // bytes 10–12 stay 0: deflate, adaptive filtering, no interlace

  // One filter byte (0 = None) per scanline, then the row's pixels.
  const stride = size * 4;
  const raw = Buffer.alloc(size * (stride + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ---------------------------------------------------------------- outputs

/*
 * `contentScale` < 1 pulls the mark in for the maskable icon, which Android
 * may crop to a circle inscribed in the centre 80%.
 */
const TARGETS = [
  { file: 'apple-touch-icon.png', size: 180, contentScale: 1 },
  { file: 'icon-192.png', size: 192, contentScale: 1 },
  { file: 'icon-512.png', size: 512, contentScale: 1 },
  { file: 'icon-maskable-512.png', size: 512, contentScale: 0.78 }
];

for (const { file, size, contentScale } of TARGETS) {
  const png = encodePNG(size, renderRGBA(size, contentScale));
  writeFileSync(join(OUT_DIR, file), png);
  console.log(`wrote static/${file} (${size}×${size}, ${png.length} bytes)`);
}
