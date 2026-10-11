import { useMemo, useState } from 'react';
import type { ExplanationFeedback } from '../../shared/protocol';
import type { Problem } from '../data/problems';
import { useI18n } from '../i18n';
import { transcriptStats } from '../lib/transcript';
import { saveNote } from '../store/actions';
import { AiFeedbackPanel } from './AiFeedbackPanel';
import { useToast } from './toast';
import { Dialog, Sheet } from './ui';

// 講完之後看逐字稿：可以修改、看字數和語速、存成講解稿、請 Claude 給回饋。
// 模擬面試的講解練習和白板的講解模式都用這個。

interface TranscriptReviewProps {
  /** 自由白板沒有題目：只看逐字稿和語速，不能存成講解稿或請 AI 回饋 */
  problem?: Problem;
  feedback: ExplanationFeedback | null;
  onFeedback: (feedback: ExplanationFeedback) => void;
  value: string;
  onChange: (value: string) => void;
  usedSec: number;
  currentScript: string;
}

export function TranscriptReview({ problem, feedback, onFeedback, value, onChange, usedSec, currentScript }: TranscriptReviewProps) {
  const { t } = useI18n();
  const toast = useToast();
  // 等待確認要存成講解稿的文字：逐字稿本身或 AI 的參考講法
  const [pendingScript, setPendingScript] = useState<string | null>(null);
  const text = value.trim();
  const stats = useMemo(() => transcriptStats(text, usedSec), [text, usedSec]);

  async function saveScript(script: string) {
    setPendingScript(null);
    if (!problem) return;
    await saveNote(problem.id, { explanation: script });
    toast(t.mock.scriptSaved);
  }

  function requestSave(script: string) {
    if (currentScript.trim() && currentScript.trim() !== script.trim()) setPendingScript(script);
    else void saveScript(script);
  }

  return (
    <Sheet title={t.mock.transcriptTitle} id="transcript-review" note={t.mock.transcriptReviewNote}>
      <div className="sheet-body stack" style={{ gap: 12 }}>
        <label className="visually-hidden" htmlFor="transcript-input">
          {t.mock.transcriptLabel}
        </label>
        <textarea
          id="transcript-input"
          className="textarea"
          rows={6}
          lang="en"
          value={value}
          placeholder={t.mock.transcriptNone}
          onChange={(e) => onChange(e.target.value)}
        />
        {text && (
          <ul className="bullets">
            <li>
              {t.mock.transcriptStats(stats.words, stats.wpm)}
              {stats.wpm !== null && ` ${t.mock.pace(stats.wpm)}`}
            </li>
            <li>
              {stats.fillers.length > 0
                ? t.mock.fillers(stats.fillers.map((f) => t.mock.fillerItem(f.word, f.count)).join(', '))
                : t.mock.noFillers}
            </li>
          </ul>
        )}
        {problem && (
          <>
            <div>
              <button type="button" className="btn btn-small" disabled={!text} onClick={() => requestSave(text)}>
                {t.mock.saveAsScript}
              </button>
            </div>
            <AiFeedbackPanel
              problem={problem}
              transcript={value}
              usedSec={usedSec}
              feedback={feedback}
              onFeedback={onFeedback}
              onUseScript={requestSave}
            />
          </>
        )}
      </div>
      <Dialog
        open={pendingScript !== null}
        onClose={() => setPendingScript(null)}
        title={t.mock.replaceScriptTitle}
        footer={
          <>
            <button className="btn btn-quiet" onClick={() => setPendingScript(null)}>
              {t.common.cancel}
            </button>
            <button className="btn btn-primary" onClick={() => pendingScript !== null && void saveScript(pendingScript)}>
              {t.mock.replaceScript}
            </button>
          </>
        }
      >
        <p>{t.mock.replaceScriptBody}</p>
      </Dialog>
    </Sheet>
  );
}
