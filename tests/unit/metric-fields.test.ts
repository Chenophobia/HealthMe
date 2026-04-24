import { describe, it, expect } from "vitest";
import { METRIC_FIELDS, getMetricField } from "@/lib/metric-fields";

describe("metric fields", () => {
  it("has exactly 13 RENPHO fields", () => {
    expect(METRIC_FIELDS).toHaveLength(13);
  });

  it("returns label and unit for a known metric", () => {
    const f = getMetricField("weightKg");
    expect(f?.label).toBe("Weight");
    expect(f?.unit).toBe("kg");
    expect(f?.goalEnum).toBe("WEIGHT_KG");
  });

  it("returns undefined for unknown metric", () => {
    expect(getMetricField("foo" as never)).toBeUndefined();
  });
});
