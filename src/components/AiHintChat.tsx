import { useState } from 'react';
import { Link } from 'react-router';
import { INTERVIEW_STEPS, type StepId } from '../data/interview';
import type { Problem } from '../data/problems';
import { useI18n } from '../i18n';
import { rich } from '../i18n/rich';
import { hintSystemPrompt } from '../lib/aiHint';
import { chat, LlmError, type ChatMessage } from '../lib/llm';
import { useOwnAi } from '../store/ownAi';
import { useNote } from '../store/queries';

/**
 * AI 陪你想：用自己的 AI 金鑰，跟 AI 一來一往。AI 一次問一個問題，不給程式碼。
 * 第一句是我們代使用者說的「我卡住了」，畫面上只從 AI 的第一個問題開始顯示
 */
export function AiHintChat({ problem, stuck, onStart }: { problem: Problem; stuck: StepId | null; onStart: () => void }) {
  const { t, locale } = useI18n();
  const a = t.ai;
  const config = useOwnAi();
  const note = useNote(problem.id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!config) {
    return (
      <div className="ai-hint">
        <p className="field-label">{a.hintTitle}</p>
        <p className="field-hint">{rich(a.hintSetup, { link: (s) => <Link to="/settings#own-ai">{s}</Link> })}</p>
      </div>
    );
  }

  async function ask(next: ChatMessage[]) {
    if (!config) return;
    setMessages(next);
    setLoading(true);
    setError(null);
    try {
      const system = hintSystemPrompt({
        title: problem.title,
        difficulty: problem.difficulty,
        language: locale,
        stuckStep: stuck ? INTERVIEW_STEPS.find((s) => s.id === stuck)?.english : undefined,
        notes: note?.steps ?? {},
      });
      const reply = await chat(config, system, next);
      setMessages([...next, { role: 'assistant', content: reply.trim() }]);
    } catch (err) {
      setError(a.failures[err instanceof LlmError ? err.reason : 'failed']);
    } finally {
      setLoading(false);
    }
  }

  function start() {
    onStart();
    void ask([{ role: 'user', content: a.hintOpening }]);
  }

  function send(e: { preventDefault: () => void }) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    void ask([...messages, { role: 'user', content: text }]);
  }

  return (
    <div className="ai-hint">
      <p className="field-label">{a.hintTitle}</p>
      {messages.length === 0 ? (
        <>
          <p className="field-hint">{a.hintIntro}</p>
          <div className="btn-row">
            <button type="button" className="btn btn-small" onClick={start}>
              {a.hintStart}
            </button>
          </div>
        </>
      ) : (
        <>
          <ol className="ai-chat" aria-label={a.hintLabel}>
            {messages.slice(1).map((m, i) => (
              <li key={i} className="ai-chat-message" data-role={m.role}>
                <span className="ai-chat-who">{m.role === 'user' ? a.hintYou : a.hintAi}</span>
                <span className="ai-chat-text">{m.content}</span>
              </li>
            ))}
          </ol>
          {loading && (
            <p className="sheet-note" role="status">
              {a.hintThinking}
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <form className="ai-chat-form" onSubmit={send}>
            <textarea
              className="textarea"
              rows={2}
              maxLength={1000}
              value={input}
              aria-label={a.hintPlaceholder}
              placeholder={a.hintPlaceholder}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Ctrl/Cmd+Enter 送出，一般的 Enter 換行
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(e);
              }}
            />
            <div className="btn-row">
              <button type="submit" className="btn btn-small btn-primary" disabled={loading || !input.trim()}>
                {a.hintSend}
              </button>
              <button
                type="button"
                className="btn btn-small btn-quiet"
                disabled={loading}
                onClick={() => {
                  setMessages([]);
                  setError(null);
                }}
              >
                {a.hintRestart}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
