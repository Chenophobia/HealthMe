export type MetricKey =
  | "weightKg" | "bmi" | "bodyFatPct" | "bodyFatKg"
  | "skeletalMuscleKg" | "skeletalMusclePct" | "subcutaneousFatPct"
  | "bmrKcal" | "metabolicAge" | "fatFreeMassKg"
  | "visceralFat" | "bodyWaterKg" | "bodyWaterPct";

export type GoalEnum =
  | "WEIGHT_KG" | "BODY_FAT_PCT" | "SKELETAL_MUSCLE_KG"
  | "BMI" | "MUSCLE_MASS_KG" | "VISCERAL_FAT";

export interface MetricField {
  key: MetricKey;
  label: string;
  unit: string;
  goalEnum?: GoalEnum;
  dashboardPrimary?: boolean;
}

export const METRIC_FIELDS: MetricField[] = [
  { key: "weightKg", label: "Weight", unit: "kg", goalEnum: "WEIGHT_KG", dashboardPrimary: true },
  { key: "bodyFatPct", label: "Body Fat", unit: "%", goalEnum: "BODY_FAT_PCT", dashboardPrimary: true },
  { key: "skeletalMuscleKg", label: "Skeletal Muscle", unit: "kg", goalEnum: "SKELETAL_MUSCLE_KG", dashboardPrimary: true },
  { key: "bmi", label: "BMI", unit: "", goalEnum: "BMI", dashboardPrimary: true },
  { key: "bodyFatKg", label: "Body Fat Mass", unit: "kg" },
  { key: "skeletalMusclePct", label: "Skeletal Muscle %", unit: "%" },
  { key: "subcutaneousFatPct", label: "Subcutaneous Fat", unit: "%" },
  { key: "bmrKcal", label: "BMR", unit: "kcal" },
  { key: "metabolicAge", label: "Metabolic Age", unit: "" },
  { key: "fatFreeMassKg", label: "Fat-Free Mass", unit: "kg" },
  { key: "visceralFat", label: "Visceral Fat", unit: "", goalEnum: "VISCERAL_FAT" },
  { key: "bodyWaterKg", label: "Body Water", unit: "kg" },
  { key: "bodyWaterPct", label: "Body Water %", unit: "%" },
];

export function getMetricField(key: MetricKey): MetricField | undefined {
  return METRIC_FIELDS.find((f) => f.key === key);
}
