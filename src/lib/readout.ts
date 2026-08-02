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

export type GaugeStatus = 'empty' | 'progress' | 'met' | 'over';

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
  if (kind === 'floor') return logged >= target ? 'met' : 'progress';
  if (logged > target * (1 + CEILING_TOLERANCE)) return 'over';
  if (logged >= target * (1 - CEILING_TOLERANCE)) return 'met';
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
 * The caption under a big readout: what the number that's on screen means,
 * in the interface's own voice.
 */
export function gaugeCaption(g: Gauge, unit: string, kind: GaugeKind = 'ceiling'): string {
  if (kind === 'floor') {
    return g.status === 'met'
      ? `Floor cleared — ${formatNumber(g.logged)} ${unit} logged.`
      : `${formatNumber(Math.max(0, g.remaining))} ${unit} to go.`;
  }
  if (g.status === 'over') {
    return `${formatNumber(-g.remaining)} ${unit} over budget.`;
  }
  return `${formatNumber(g.logged)} of ${formatNumber(g.target)} ${unit} logged.`;
}
