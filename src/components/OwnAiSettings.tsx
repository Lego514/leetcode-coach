import { useId, useState } from 'react';
import { useI18n } from '../i18n';
import { LLM_PROVIDERS, LlmError, listModels, PROVIDER_INFO, type LlmProvider } from '../lib/llm';
import { clearOwnAi, maskKey, saveOwnAi, useOwnAi } from '../store/ownAi';
import { useToast } from './toast';
import { ExternalIcon, Sheet } from './ui';

/**
 * 設定頁的「自己的 AI 金鑰」：選 Anthropic、OpenAI 或 OpenRouter，貼上金鑰，測試連線後選模型。
 * 金鑰只存在這個瀏覽器（src/store/ownAi.ts），AI 功能直接從瀏覽器呼叫
 */
export function OwnAiSettings() {
  const { t } = useI18n();
  const a = t.ai;
  const toast = useToast();
  const id = useId();
  const saved = useOwnAi();
  const [provider, setProvider] = useState<LlmProvider>(saved?.provider ?? 'anthropic');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(saved?.model ?? PROVIDER_INFO.anthropic.defaultModel);
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  // 已經存過金鑰時，欄位留空代表沿用原本的
  const keyToUse = apiKey.trim() || (saved && saved.provider === provider ? saved.apiKey : '');

  function changeProvider(next: LlmProvider) {
    setProvider(next);
    setModel(saved?.provider === next ? saved.model : PROVIDER_INFO[next].defaultModel);
    setModels([]);
    setMessage(null);
  }

  async function test() {
    setTesting(true);
    setMessage(null);
    try {
      const ids = await listModels({ provider, apiKey: keyToUse });
      setModels(ids);
      if (!model && ids.length > 0) setModel(ids[0]);
      setMessage({ ok: true, text: a.tested(ids.length) });
    } catch (err) {
      setMessage({ ok: false, text: a.failures[err instanceof LlmError ? err.reason : 'failed'] });
    } finally {
      setTesting(false);
    }
  }

  function save() {
    if (!model.trim()) {
      setMessage({ ok: false, text: a.needModel });
      return;
    }
    saveOwnAi({ provider, apiKey: keyToUse, model });
    setApiKey('');
    setMessage(null);
    toast(a.saved);
  }

  function remove() {
    clearOwnAi();
    setApiKey('');
    setModels([]);
    setMessage(null);
    toast(a.removed);
  }

  return (
    <Sheet title={a.title} id="own-ai">
      <div className="sheet-body stack" style={{ gap: 12 }}>
        <p className="sheet-note">{a.intro}</p>
        {saved && (
          <p className="own-ai-current" role="status">
            {a.current(PROVIDER_INFO[saved.provider].label, saved.model, maskKey(saved.apiKey))}
          </p>
        )}
        <div className="form-grid">
          <label className="field">
            <span className="field-label">{a.provider}</span>
            <select className="input" value={provider} onChange={(e) => changeProvider(e.target.value as LlmProvider)}>
              {LLM_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_INFO[p].label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{a.key}</span>
            <input
              className="input"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              placeholder={saved && saved.provider === provider ? maskKey(saved.apiKey) : ''}
              onChange={(e) => {
                setApiKey(e.target.value);
                setMessage(null);
              }}
            />
          </label>
          <label className="field span-2">
            <span className="field-label">{a.model}</span>
            <input className="input" list={`${id}-models`} spellCheck={false} value={model} onChange={(e) => setModel(e.target.value)} />
            <datalist id={`${id}-models`}>
              {models.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <span className="field-hint">{a.modelHint}</span>
          </label>
        </div>
        <a className="icon-link own-ai-get-key" href={PROVIDER_INFO[provider].keysUrl} target="_blank" rel="noreferrer">
          {a.getKey(PROVIDER_INFO[provider].label)}
          <ExternalIcon />
          <span className="visually-hidden">{t.common.opensInNewTab}</span>
        </a>
        {message && (
          <p className={message.ok ? 'own-ai-ok' : 'form-error'} role={message.ok ? 'status' : 'alert'}>
            {message.text}
          </p>
        )}
        <div className="btn-row">
          <button type="button" className="btn" disabled={!keyToUse || testing} onClick={() => void test()}>
            {testing ? a.testing : a.test}
          </button>
          <button type="button" className="btn btn-primary" disabled={!keyToUse} onClick={save}>
            {a.save}
          </button>
          {saved && (
            <button type="button" className="btn btn-quiet" onClick={remove}>
              {a.remove}
            </button>
          )}
        </div>
        <p className="field-hint">{a.privacy}</p>
        <p className="field-hint">{a.subscriptionNote}</p>
      </div>
    </Sheet>
  );
}
