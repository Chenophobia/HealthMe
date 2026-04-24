import { z } from "zod";

export const OcrResponseSchema = z.object({
  weightKg: z.number().optional(),
  bmi: z.number().optional(),
  bodyFatPct: z.number().optional(),
  bodyFatKg: z.number().optional(),
  skeletalMuscleKg: z.number().optional(),
  skeletalMusclePct: z.number().optional(),
  subcutaneousFatPct: z.number().optional(),
  bmrKcal: z.number().int().optional(),
  metabolicAge: z.number().int().optional(),
  fatFreeMassKg: z.number().optional(),
  visceralFat: z.number().optional(),
  bodyWaterKg: z.number().optional(),
  bodyWaterPct: z.number().optional(),
  muscleMassKg: z.number().optional(),
  muscleMassPct: z.number().optional(),
  boneMassKg: z.number().optional(),
  boneMassPct: z.number().optional(),
  proteinKg: z.number().optional(),
  proteinPct: z.number().optional(),
});

export type OcrResponse = z.infer<typeof OcrResponseSchema>;

export type ParseResult =
  | { ok: true; value: OcrResponse }
  | { ok: false; error: string };

export function parseOcrResponse(raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "invalid_json" };
  }
  const result = OcrResponseSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, error: result.error.message };
  }
  return { ok: true, value: result.data };
}
