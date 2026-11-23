export type LlmProvider = 'openai' | 'deepseek' | 'gemini' | 'openrouter' | 'none';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmCompletionOptions {
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  jsonMode?: boolean;
}

export interface LlmCompletionResult {
  text: string;
  provider: LlmProvider;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
}

export interface LlmConfig {
  provider: LlmProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

const DEFAULT_MODELS: Record<Exclude<LlmProvider, 'none'>, string> = {
  openai: 'gpt-4o-mini',
  deepseek: 'deepseek-chat',
  gemini: 'gemini-2.0-flash',
  openrouter: 'google/gemini-2.0-flash-001'
};

const DEFAULT_BASE_URLS: Record<Exclude<LlmProvider, 'none'>, string> = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  openrouter: 'https://openrouter.ai/api/v1'
};

function normalizeProvider(raw: string | undefined): LlmProvider {
  const value = (raw || '').trim().toLowerCase();
  if (value === 'openai' || value === 'deepseek' || value === 'gemini' || value === 'openrouter') {
    return value;
  }
  return 'none';
}

export function readLlmConfig(env: NodeJS.ProcessEnv = process.env): LlmConfig | null {
  const provider = normalizeProvider(env.LLM_PROVIDER);
  if (provider === 'none') return null;

  const apiKeyKey =
    provider === 'openai' ? 'OPENAI_API_KEY'
    : provider === 'deepseek' ? 'DEEPSEEK_API_KEY'
    : provider === 'gemini' ? 'GEMINI_API_KEY'
    : 'OPENROUTER_API_KEY';

  const apiKey = (env[apiKeyKey] || '').trim();
  if (!apiKey) return null;

  const baseUrl = (env.LLM_BASE_URL || DEFAULT_BASE_URLS[provider]).replace(/\/+$/, '');
  const model = (env.LLM_MODEL || DEFAULT_MODELS[provider]).trim();

  return { provider, apiKey, baseUrl, model };
}

export function isLlmConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return readLlmConfig(env) !== null;
}

function extractOpenAiStyleText(payload: unknown): string {
  const record = payload as Record<string, unknown> | null;
  if (!record) return '';
  const choices = record.choices;
  if (!Array.isArray(choices) || choices.length === 0) return '';
  const first = choices[0] as Record<string, unknown> | null;
  if (!first) return '';
  const message = first.message as Record<string, unknown> | null;
  if (message && typeof message.content === 'string') return message.content.trim();
  if (typeof first.text === 'string') return first.text.trim();
  return '';
}

function extractGeminiText(payload: unknown): string {
  const record = payload as Record<string, unknown> | null;
  if (!record) return '';
  const candidates = record.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return '';
  const first = candidates[0] as Record<string, unknown> | null;
  if (!first) return '';
  const content = first.content as Record<string, unknown> | null;
  if (!content) return '';
  const parts = content.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map(part => (part && typeof (part as Record<string, unknown>).text === 'string'
      ? String((part as Record<string, unknown>).text)
      : ''))
    .join('')
    .trim();
}

function splitSystemMessages(messages: LlmMessage[]): { system: string; rest: LlmMessage[] } {
  const systemParts: string[] = [];
  const rest: LlmMessage[] = [];
  for (const message of messages) {
    if (message.role === 'system') systemParts.push(message.content);
    else rest.push(message);
  }
  return { system: systemParts.join('\n\n'), rest };
}

async function callOpenAiCompatible(
  config: LlmConfig,
  messages: LlmMessage[],
  options: LlmCompletionOptions
): Promise<LlmCompletionResult> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxOutputTokens ?? 1500,
      ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {})
    }),
    signal: AbortSignal.timeout(options.timeoutMs ?? 30_000)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`LLM ${config.provider} HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }

  const payload = await response.json().catch(() => null);
  const text = extractOpenAiStyleText(payload);
  if (!text) throw new Error(`LLM ${config.provider} returned an empty completion.`);

  const usage = (payload as Record<string, unknown> | null)?.usage as Record<string, unknown> | undefined;
  return {
    text,
    provider: config.provider,
    model: config.model,
    ...(typeof usage?.prompt_tokens === 'number' ? { promptTokens: usage.prompt_tokens } : {}),
    ...(typeof usage?.completion_tokens === 'number' ? { completionTokens: usage.completion_tokens } : {})
  };
}

async function callGemini(
  config: LlmConfig,
  messages: LlmMessage[],
  options: LlmCompletionOptions
): Promise<LlmCompletionResult> {
  const { system, rest } = splitSystemMessages(messages);
  const url = `${config.baseUrl}/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: rest.map(message => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }]
      })),
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxOutputTokens ?? 1500,
        ...(options.jsonMode ? { responseMimeType: 'application/json' } : {})
      }
    }),
    signal: AbortSignal.timeout(options.timeoutMs ?? 30_000)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`LLM gemini HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }

  const payload = await response.json().catch(() => null);
  const text = extractGeminiText(payload);
  if (!text) throw new Error('LLM gemini returned an empty completion.');

  const usage = (payload as Record<string, unknown> | null)?.usageMetadata as Record<string, unknown> | undefined;
  return {
    text,
    provider: 'gemini',
    model: config.model,
    ...(typeof usage?.promptTokenCount === 'number' ? { promptTokens: usage.promptTokenCount } : {}),
    ...(typeof usage?.candidatesTokenCount === 'number' ? { completionTokens: usage.candidatesTokenCount } : {})
  };
}

export async function completeWithLlm(
  messages: LlmMessage[],
  options: LlmCompletionOptions = {},
  env: NodeJS.ProcessEnv = process.env
): Promise<LlmCompletionResult> {
  const config = readLlmConfig(env);
  if (!config) {
    throw new Error('LLM provider is not configured. Set LLM_PROVIDER and the matching API key.');
  }

  if (config.provider === 'gemini') {
    return callGemini(config, messages, options);
  }
  return callOpenAiCompatible(config, messages, options);
}

export function extractJsonObject<T>(raw: string): T | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
