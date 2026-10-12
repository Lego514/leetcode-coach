import { useState } from 'react';
import { useI18n } from '../i18n';
import { useToast } from './toast';

// 用自己的 ChatGPT 或 Claude：複製提示詞貼到新對話，再把回覆貼回來，跟這次練習一起存。
// 不用登入、不用額度，所有人都能用。

export interface ChatPrompt {
  key: string;
  label: string;
  build: () => string;
}

interface ChatPromptPanelProps {
  prompts: ChatPrompt[];
  /** 還沒有逐字稿時不能複製 */
  disabled: boolean;
  reply: string;
  onReply: (reply: string) => void;
}

export function ChatPromptPanel({ prompts, disabled, reply, onReply }: ChatPromptPanelProps) {
  const { t } = useI18n();
  const c = t.chatPrompt;
  const toast = useToast();
  // 瀏覽器不讓寫入剪貼簿時，改成顯示出來讓使用者自己複製
  const [manual, setManual] = useState<string | null>(null);

  async function copy(prompt: ChatPrompt) {
    const text = prompt.build();
    try {
      await navigator.clipboard.writeText(text);
      setManual(null);
      toast(c.copied);
    } catch {
      setManual(text);
    }
  }

  return (
    <div className="ai-feedback chat-prompt stack" style={{ gap: 12 }}>
      <h3 className="ai-feedback-title">{c.title}</h3>
      <p className="sheet-note">{c.intro}</p>
      <div className="btn-row">
        {prompts.map((prompt) => (
          <button key={prompt.key} type="button" className="btn btn-small" disabled={disabled} onClick={() => void copy(prompt)}>
            {c.copy(prompt.label)}
          </button>
        ))}
        <a className="btn btn-small btn-quiet" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">
          {c.openChatGpt}
          <span aria-hidden> ↗</span>
        </a>
        <a className="btn btn-small btn-quiet" href="https://claude.ai/new" target="_blank" rel="noopener noreferrer">
          {c.openClaude}
          <span aria-hidden> ↗</span>
        </a>
      </div>
      {disabled && <p className="field-hint">{c.needsText}</p>}
      {manual !== null && (
        <div className="stack" style={{ gap: 6 }}>
          <p className="field-hint">{c.copyFailed}</p>
          <textarea
            className="textarea chat-prompt-manual"
            rows={6}
            readOnly
            value={manual}
            aria-label={c.manualLabel}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      )}
      <label className="field">
        <span className="field-label">{c.replyLabel}</span>
        <textarea className="textarea" rows={5} value={reply} maxLength={20_000} placeholder={c.replyPlaceholder} onChange={(e) => onReply(e.target.value)} />
      </label>
    </div>
  );
}

/** 紀錄裡顯示貼回來的回覆 */
export function ChatReply({ text }: { text: string }) {
  const { t } = useI18n();
  return (
    <details>
      <summary>{t.chatPrompt.showReply}</summary>
      <p className="prose-block chat-reply-text" style={{ marginTop: 8 }}>
        {text}
      </p>
    </details>
  );
}
