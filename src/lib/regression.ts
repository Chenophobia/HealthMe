export interface Point { x: number; y: number; }
export interface RegressionResult { slope: number; intercept: number; }

export function linearRegression(points: Point[]): RegressionResult | null {
  if (points.length < 3) return null;
  const n = points.length;
  const sumX = points.reduce((a, p) => a + p.x, 0);
  const sumY = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumXX = points.reduce((a, p) => a + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function project(r: RegressionResult, x: number): number {
  return r.slope * x + r.intercept;
}
