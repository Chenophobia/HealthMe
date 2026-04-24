export interface OcrCallInput {
  baseUrl: string;
  model: string;
  imageBase64: string;
}

export type OcrCallResult =
  | { ok: true; raw: string }
  | { ok: false; error: string };

const PROMPT = `You are extracting body composition values from a RENPHO smart-scale screenshot. Return ONLY a JSON object with these optional numeric fields: weightKg, bmi, bodyFatPct, bodyFatKg, skeletalMuscleKg, skeletalMusclePct, subcutaneousFatPct, bmrKcal, metabolicAge, fatFreeMassKg, visceralFat, bodyWaterKg, bodyWaterPct, muscleMassKg, muscleMassPct, boneMassKg, boneMassPct, proteinKg, proteinPct. Convert percentages to numbers (e.g. 28.3 not "28.3%"). Do NOT include any commentary or markdown. Only JSON.`;

export async function callOllamaVision(i: OcrCallInput): Promise<OcrCallResult> {
  try {
    const res = await fetch(`${i.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: i.model,
        prompt: PROMPT,
        images: [i.imageBase64],
        format: "json",
        stream: false,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `ollama_http_${res.status}: ${text}` };
    }
    const body = (await res.json()) as { response?: string };
    if (!body.response) return { ok: false, error: "empty_response" };
    return { ok: true, raw: body.response };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `fetch_failed: ${msg}` };
  }
}
