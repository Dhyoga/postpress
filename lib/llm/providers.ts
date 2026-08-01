import { LlmError } from "./errors";

/** Provider LLM yang didukung form Pengaturan
 * (openspec/changes/dynamic-llm-settings-in-db). "claude" dipakai lewat
 * base URL token router (mis. agentrouter/tokenrouter) yang kompatibel
 * dengan Anthropic Messages API — bukan cuma api.anthropic.com resmi. */
export type LlmProvider = "claude" | "mistral" | "gemini";

export const LLM_PROVIDERS: LlmProvider[] = ["claude", "mistral", "gemini"];

export function isLlmProvider(value: string): value is LlmProvider {
  return (LLM_PROVIDERS as string[]).includes(value);
}

export const DEFAULT_BASE_URLS: Record<LlmProvider, string> = {
  claude: "https://api.anthropic.com",
  mistral: "https://api.mistral.ai",
  gemini: "https://generativelanguage.googleapis.com",
};

interface BuildRequestParams {
  baseUrl: string;
  apiKey: string;
  model: string;
  system: string;
  user: string;
  toolName: string;
  toolDescription: string;
  jsonSchema: Record<string, unknown>;
  temperature: number;
}

/** Bentuk request tool-calling tiap provider beda-beda (Anthropic Messages API
 * vs OpenAI-style function calling Mistral vs Gemini function declarations) —
 * fungsi ini satu-satunya tempat yang tahu bedanya, supaya client.ts tetap
 * provider-agnostic. */
export function buildLlmRequest(provider: LlmProvider, p: BuildRequestParams): { url: string; init: RequestInit } {
  const baseUrl = p.baseUrl.replace(/\/+$/, "");
  switch (provider) {
    case "claude":
      return {
        url: `${baseUrl}/v1/messages`,
        init: {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "anthropic-version": "2023-06-01",
            "x-api-key": p.apiKey,
          },
          body: JSON.stringify({
            model: p.model,
            max_tokens: 4096,
            temperature: p.temperature,
            system: p.system,
            messages: [{ role: "user", content: p.user }],
            tools: [{ name: p.toolName, description: p.toolDescription, input_schema: p.jsonSchema }],
            tool_choice: { type: "tool", name: p.toolName },
          }),
        },
      };
    case "mistral":
      return {
        url: `${baseUrl}/v1/chat/completions`,
        init: {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${p.apiKey}`,
          },
          body: JSON.stringify({
            model: p.model,
            temperature: p.temperature,
            messages: [
              { role: "system", content: p.system },
              { role: "user", content: p.user },
            ],
            tools: [
              { type: "function", function: { name: p.toolName, description: p.toolDescription, parameters: p.jsonSchema } },
            ],
            tool_choice: { type: "function", function: { name: p.toolName } },
          }),
        },
      };
    case "gemini":
      return {
        url: `${baseUrl}/v1beta/models/${encodeURIComponent(p.model)}:generateContent?key=${encodeURIComponent(p.apiKey)}`,
        init: {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: p.system }] },
            contents: [{ role: "user", parts: [{ text: p.user }] }],
            tools: [{ functionDeclarations: [{ name: p.toolName, description: p.toolDescription, parameters: p.jsonSchema }] }],
            toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: [p.toolName] } },
            generationConfig: { temperature: p.temperature },
          }),
        },
      };
  }
}

/** Ambil argumen tool-call mentah dari body respons tiap provider — belum
 * divalidasi Zod, itu tanggung jawab pemanggil (client.ts). */
export function extractToolInput(provider: LlmProvider, body: unknown, toolName: string): unknown {
  switch (provider) {
    case "claude": {
      const content = (body as { content?: Array<{ type: string; name?: string; input?: unknown }> })?.content;
      const toolUse = content?.find((block) => block.type === "tool_use" && block.name === toolName);
      if (!toolUse) throw new LlmError("LLM tidak mengembalikan output terstruktur yang diharapkan.");
      return toolUse.input;
    }
    case "mistral": {
      const toolCalls = (
        body as { choices?: Array<{ message?: { tool_calls?: Array<{ function?: { name?: string; arguments?: string } }> } }> }
      )?.choices?.[0]?.message?.tool_calls;
      const call = toolCalls?.find((c) => c.function?.name === toolName) ?? toolCalls?.[0];
      if (!call?.function?.arguments) throw new LlmError("LLM tidak mengembalikan output terstruktur yang diharapkan.");
      try {
        return JSON.parse(call.function.arguments);
      } catch {
        throw new LlmError("LLM tidak mengembalikan output terstruktur yang diharapkan.");
      }
    }
    case "gemini": {
      const parts = (
        body as { candidates?: Array<{ content?: { parts?: Array<{ functionCall?: { name?: string; args?: unknown } }> } }> }
      )?.candidates?.[0]?.content?.parts;
      const fc = parts?.find((part) => part.functionCall?.name === toolName)?.functionCall ?? parts?.find((part) => part.functionCall)?.functionCall;
      if (!fc) throw new LlmError("LLM tidak mengembalikan output terstruktur yang diharapkan.");
      return fc.args;
    }
  }
}
