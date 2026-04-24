import { describe, it, expect } from "vitest";
import { parseOcrResponse } from "@/lib/ocr-schema";

describe("parseOcrResponse", () => {
  it("parses a valid complete JSON response", () => {
    const raw = JSON.stringify({
      weightKg: 80.45,
      bmi: 28.2,
      bodyFatPct: 28.3,
      bodyFatKg: 22.77,
      skeletalMuscleKg: 37.17,
      skeletalMusclePct: 46.2,
      subcutaneousFatPct: 24.9,
      bmrKcal: 1618,
      metabolicAge: 33,
      fatFreeMassKg: 57.68,
      visceralFat: 11,
      bodyWaterKg: 41.67,
      bodyWaterPct: 51.8,
      muscleMassKg: 54.79,
      muscleMassPct: 68.1,
      boneMassKg: 2.89,
      boneMassPct: 3.6,
      proteinKg: 13.19,
      proteinPct: 16.4,
    });
    const result = parseOcrResponse(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.weightKg).toBe(80.45);
      expect(result.value.visceralFat).toBe(11);
    }
  });

  it("accepts partial fields (all optional)", () => {
    const raw = JSON.stringify({ weightKg: 80.0 });
    const result = parseOcrResponse(raw);
    expect(result.ok).toBe(true);
  });

  it("returns error for malformed JSON", () => {
    const result = parseOcrResponse("not json");
    expect(result.ok).toBe(false);
  });

  it("returns error for wrong types", () => {
    const result = parseOcrResponse(JSON.stringify({ weightKg: "eighty" }));
    expect(result.ok).toBe(false);
  });

  it("strips unknown fields", () => {
    const raw = JSON.stringify({ weightKg: 80, unknownField: "xyz" });
    const result = parseOcrResponse(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect("unknownField" in result.value).toBe(false);
    }
  });
});
