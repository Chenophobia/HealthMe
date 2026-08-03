/*
 * The arithmetic behind every gauge in the app.
 *
 * The program has two kinds of number and they are not read the same way:
 * calories are a *ceiling* you spend down against, protein is a *floor* you
 * climb up to. Keeping that distinction in one place stops each page from
 * reinventing "is this good or bad" with its own inequality.
 */

/** A ceiling is spent down against; a floor is climbed up to. */
export type GaugeKind = 'ceiling' | 'floor';

export type GaugeStatus = 'empty' | 'progress' | 'near' | 'met' | 'over';

/** The colour band a status paints in. See the token block in app.css. */
export type Tone = 'muted' | 'accent' | 'warn' | 'good' | 'over';

export function toneFor(status: GaugeStatus): Tone {
  if (status === 'empty') return 'muted';
  if (status === 'over') return 'over';
  if (status === 'met') return 'good';
  if (status === 'near') return 'warn';
  return 'accent';
}

export type Gauge = {
  logged: number;
  target: number;
  /** Full-scale value of the bar — the aim for a floor, the target otherwise. */
  scale: number;
  /** 0–1, clamped: how much of the bar is filled. */
  fraction: number;
  /** `target - logged`. Negative once a ceiling is breached. */
  remaining: number;
  status: GaugeStatus;
};

/**
 * Daily swing in weighing and logging makes an exact hit meaningless, so a
 * ceiling counts as "met" from 95% and only reads "over" past 105%.
 */
const CEILING_TOLERANCE = 0.05;

/** Where a ceiling starts warning that the room left is running out. */
const CEILING_NEAR = 0.85;

export function gauge(
  logged: number,
  target: number,
  kind: GaugeKind = 'ceiling',
  aim?: number
): Gauge {
  const safeTarget = target > 0 ? target : 1;
  const scale = kind === 'floor' && aim && aim > safeTarget ? aim : safeTarget;
  const value = Number.isFinite(logged) && logged > 0 ? logged : 0;

  return {
    logged: value,
    target: safeTarget,
    scale,
    fraction: Math.max(0, Math.min(1, value / scale)),
    remaining: safeTarget - value,
    status: statusFor(value, safeTarget, kind)
  };
}

function statusFor(logged: number, target: number, kind: GaugeKind): GaugeStatus {
  if (logged <= 0) return 'empty';
  // A floor has no "nearly" worth warning about — you either cleared it or
  // you're still climbing.
  if (kind === 'floor') return logged >= target ? 'met' : 'progress';
  if (logged > target * (1 + CEILING_TOLERANCE)) return 'over';
  if (logged >= target * (1 - CEILING_TOLERANCE)) return 'met';
  if (logged >= target * CEILING_NEAR) return 'near';
  return 'progress';
}

/** Thousands separators, no decimals — every figure in the app is a whole unit. */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('en-GB');
}

/** Explicit sign, for deltas where the direction is the point. */
export function formatSigned(n: number, decimals = 1): string {
  if (!Number.isFinite(n)) return '—';
  const fixed = n.toFixed(decimals);
  return n > 0 ? `+${fixed}` : fixed;
}

/**
 * The headline for a gauge: the number that's left to act on, and its unit
 * phrase. Deliberately terse — this app has one reader, who knows what it does.
 */
export function gaugeHeadline(
  g: Gauge,
  unit: string,
  kind: GaugeKind = 'ceiling'
): { value: string; suffix: string } {
  if (kind === 'floor') {
    return g.status === 'met'
      ? { value: formatNumber(g.logged), suffix: `${unit} logged` }
      : { value: formatNumber(Math.max(0, g.remaining)), suffix: `${unit} to go` };
  }
  return g.remaining < 0
    ? { value: formatNumber(-g.remaining), suffix: `${unit} over` }
    : { value: formatNumber(g.remaining), suffix: `${unit} left` };
}
