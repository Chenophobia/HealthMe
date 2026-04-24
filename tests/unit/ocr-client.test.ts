import { describe, it, expect, vi, beforeEach } from "vitest";
import { callOllamaVision } from "@/lib/ocr-client";

describe("callOllamaVision", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("posts base64 + prompt and returns parsed JSON response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: JSON.stringify({ weightKg: 80 }) }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await callOllamaVision({
      baseUrl: "http://ollama:11434",
      model: "qwen2-vl:7b",
      imageBase64: "xxx",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.raw).toBe(JSON.stringify({ weightKg: 80 }));

    expect(fetchMock).toHaveBeenCalledWith(
      "http://ollama:11434/api/generate",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("returns error when fetch fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) as unknown as typeof fetch;
    const result = await callOllamaVision({
      baseUrl: "http://ollama:11434",
      model: "qwen2-vl:7b",
      imageBase64: "xxx",
    });
    expect(result.ok).toBe(false);
  });

  it("returns error when model returns non-ok status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "internal",
    }) as unknown as typeof fetch;
    const result = await callOllamaVision({
      baseUrl: "http://ollama:11434",
      model: "qwen2-vl:7b",
      imageBase64: "xxx",
    });
    expect(result.ok).toBe(false);
  });
});
