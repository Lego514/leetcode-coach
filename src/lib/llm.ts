import type { JsonSchema } from '../../shared/ai';

// 使用者自己的 AI 金鑰：從瀏覽器直接呼叫 Anthropic、OpenAI 或 OpenRouter，不經過我們的伺服器。
// 金鑰只存在這個瀏覽器（src/store/ownAi.ts），費用由使用者自己的帳號付。
// Anthropic 用官方 SDK（用到才載入）；OpenAI 和 OpenRouter 都是 OpenAI 格式的 chat completions，直接用 fetch。

export const LLM_PROVIDERS = ['anthropic', 'openai', 'openrouter'] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number];

export interface LlmConfig {
  provider: LlmProvider;
  apiKey: string;
  model: string;
}

export const PROVIDER_INFO: Record<LlmProvider, { label: string; defaultModel: string; keysUrl: string }> = {
  anthropic: { label: 'Anthropic (Claude)', defaultModel: 'claude-opus-5-5', keysUrl: 'https://platform.claude.com/settings/keys' },
  // OpenAI 和 OpenRouter 的模型名稱常常變，測試連線時從清單裡挑
  openai: { label: 'OpenAI', defaultModel: '', keysUrl: 'https://platform.openai.com/api-keys' },
  openrouter: { label: 'OpenRouter', defaultModel: '', keysUrl: 'https://openrouter.ai/settings/keys' },
};

const OPENAI_BASE: Record<Exclude<LlmProvider, 'anthropic'>, string> = {
  openai: 'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
};

/** key：金鑰錯了或沒權限；busy：太忙或額度用完；refused：模型婉拒；invalid_output：回覆不是要的格式 */
export type LlmFailure = 'key' | 'busy' | 'refused' | 'invalid_output' | 'network' | 'failed';

export class LlmError extends Error {
  constructor(
    readonly reason: LlmFailure,
    message: string,
    /** HTTP 狀態碼；400 時可以換一種輸出格式重試 */
    readonly status?: number,
  ) {
    super(message);
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** 照狀態碼分類錯誤 */
function failureOf(status: number): LlmFailure {
  if (status === 401 || status === 403) return 'key';
  if (status === 429 || status >= 500) return 'busy';
  return 'failed';
}

/** 從模型的回覆裡拿出 JSON：有些模型會包在 ```json 裡，或前後多說一句話 */
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new LlmError('invalid_output', 'No JSON object in the reply');
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new LlmError('invalid_output', 'The reply was not valid JSON');
  }
}

// ---------- Anthropic ----------

// Claude 婉拒時由 API 自動改用備援模型；只有這幾個模型支援
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5', 'claude-fable-5-1']);
// effort 只送給這一代的模型，舊模型會拒絕
const supportsEffort = (model: string) => /^claude-(opus|sonnet|haiku|fable)-5/.test(model);

async function anthropicClient(apiKey: string) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  // 金鑰是使用者自己的，只存在他的瀏覽器裡，所以這裡可以從瀏覽器直接呼叫
  return { Anthropic, client: new Anthropic({ apiKey, dangerouslyAllowBrowser: true, timeout: 120_000, maxRetries: 1 }) };
}

async function anthropicCall(
  config: LlmConfig,
  { system, messages, schema, effort }: { system: string; messages: ChatMessage[]; schema?: JsonSchema; effort: 'low' | 'medium' | 'high' },
): Promise<string> {
  const { Anthropic, client } = await anthropicClient(config.apiKey);
  let response;
  try {
    response = await client.beta.messages.create({
      model: config.model,
      max_tokens: 16000,
      ...(FALLBACK_MODELS.has(config.model) ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
      ...(supportsEffort(config.model) || schema
        ? {
            output_config: {
              ...(supportsEffort(config.model) ? { effort } : {}),
              ...(schema ? { format: { type: 'json_schema' as const, schema } } : {}),
            },
          }
        : {}),
      system,
      messages,
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) throw new LlmError('key', err.message);
    if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError) throw new LlmError('busy', err.message);
    if (err instanceof Anthropic.APIConnectionError) throw new LlmError('network', err.message);
    throw new LlmError('failed', err instanceof Error ? err.message : 'Claude request failed');
  }
  if (response.stop_reason === 'refusal') throw new LlmError('refused', 'Claude declined this request');
  if (response.stop_reason === 'max_tokens') throw new LlmError('invalid_output', 'The reply was cut off');
  return response.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
}

// ---------- OpenAI、OpenRouter ----------

async function openaiFetch(config: LlmConfig, path: string, body?: unknown): Promise<Record<string, unknown>> {
  const base = OPENAI_BASE[config.provider as Exclude<LlmProvider, 'anthropic'>];
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        ...(body ? { 'content-type': 'application/json' } : {}),
        // OpenRouter 用這個在它的後台顯示是哪個 App 呼叫的
        ...(config.provider === 'openrouter' ? { 'x-title': 'LeetCode Coach' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new LlmError('network', `Could not reach ${PROVIDER_INFO[config.provider].label}`);
  }
  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = (payload.error as { message?: string } | undefined)?.message ?? `HTTP ${res.status}`;
    throw new LlmError(failureOf(res.status), message, res.status);
  }
  return payload;
}

async function openaiCall(
  config: LlmConfig,
  { system, messages, schema }: { system: string; messages: ChatMessage[]; schema?: JsonSchema },
): Promise<string> {
  // 要 JSON 時把 schema 也寫進系統提示：不支援 json_schema 的模型照著寫也能過
  const systemText = schema ? `${system}\n\nRespond with only a JSON object that matches this JSON schema:\n${JSON.stringify(schema)}` : system;
  const base = { model: config.model, messages: [{ role: 'system', content: systemText }, ...messages] };
  // 先用嚴格的 json_schema；模型不支援（400）時退回 json_object，再不行就只靠提示
  const formats: unknown[] = schema
    ? [{ type: 'json_schema', json_schema: { name: 'response', strict: true, schema } }, { type: 'json_object' }, undefined]
    : [undefined];
  let lastError: unknown;
  for (const format of formats) {
    try {
      const payload = await openaiFetch(config, '/chat/completions', format ? { ...base, response_format: format } : base);
      const choice = (payload.choices as { message?: { content?: string; refusal?: string }; finish_reason?: string }[] | undefined)?.[0];
      if (choice?.message?.refusal) throw new LlmError('refused', choice.message.refusal);
      if (choice?.finish_reason === 'length') throw new LlmError('invalid_output', 'The reply was cut off');
      return choice?.message?.content ?? '';
    } catch (err) {
      lastError = err;
      if (!(err instanceof LlmError) || err.status !== 400) throw err;
    }
  }
  throw lastError;
}

// ---------- 對外的三個函式 ----------

function call(config: LlmConfig, request: { system: string; messages: ChatMessage[]; schema?: JsonSchema; effort: 'low' | 'medium' | 'high' }) {
  return config.provider === 'anthropic' ? anthropicCall(config, request) : openaiCall(config, request);
}

/** 照 JSON schema 回答，再用 normalize（跟伺服器同一份）整理成資料格式 */
export async function askJson<T>(
  config: LlmConfig,
  { system, message, schema, normalize }: { system: string; message: string; schema: JsonSchema; normalize: (raw: unknown) => T },
): Promise<T> {
  // 評分要抓出錯的做法和複雜度，跟伺服器一樣用 high
  const text = await call(config, { system, messages: [{ role: 'user', content: message }], schema, effort: 'high' });
  const raw = extractJson(text);
  try {
    return normalize(raw);
  } catch {
    throw new LlmError('invalid_output', 'The reply was not in the expected format');
  }
}

/** 一般的對話，回傳文字；AI 陪你想用 */
export function chat(config: LlmConfig, system: string, messages: ChatMessage[]): Promise<string> {
  // 一來一往的提示要快，思考少一點
  return call(config, { system, messages, effort: 'low' });
}

/** 測試連線：列出可以用的模型；金鑰錯了會丟 key */
export async function listModels(config: Pick<LlmConfig, 'provider' | 'apiKey'>): Promise<string[]> {
  if (config.provider === 'anthropic') {
    const { Anthropic, client } = await anthropicClient(config.apiKey);
    try {
      const page = await client.models.list({ limit: 100 });
      return page.data.map((m) => m.id);
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) throw new LlmError('key', err.message);
      if (err instanceof Anthropic.APIConnectionError) throw new LlmError('network', err.message);
      throw new LlmError('failed', err instanceof Error ? err.message : 'Request failed');
    }
  }
  const full = { ...config, model: '' };
  // OpenRouter 的模型清單不需要金鑰，所以另外問一次這把金鑰本身，確認它有效
  if (config.provider === 'openrouter') await openaiFetch(full, '/key');
  const payload = await openaiFetch(full, '/models');
  const ids = ((payload.data as { id: string }[] | undefined) ?? []).map((m) => m.id);
  // OpenAI 的清單裡還有語音、圖片、embedding 模型，只留能對話的
  return (config.provider === 'openai' ? ids.filter((id) => /^(gpt|o\d|chatgpt)/.test(id)) : ids).sort();
}
