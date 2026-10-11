import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { AiStatus, BehavioralFeedback, BehavioralFeedbackRequest } from '../../shared/protocol';
import { useI18n } from '../i18n';
import { rich } from '../i18n/rich';
import { fetchAiStatus, requestBehavioralFeedback } from '../store/ai';
import { errorCode } from '../store/api';
import { useCloud } from '../store/cloud';

/** 送出前至少要有這麼多字，跟後端的檢查一致 */
const MIN_TRANSCRIPT_LENGTH = 20;

interface BehavioralFeedbackPanelProps {
  /** 送出的內容：題目、故事的筆記、逐字稿 */
  request: Omit<BehavioralFeedbackRequest, 'language'>;
  feedback: BehavioralFeedback | null;
  onFeedback: (feedback: BehavioralFeedback) => void;
}

/** 行為面試回答的 AI 回饋：跟講解回饋共用每日次數 */
export function BehavioralFeedbackPanel({ request, feedback, onFeedback }: BehavioralFeedbackPanelProps) {
  const { t, locale } = useI18n();
  const signedIn = useCloud().account.kind === 'signed-in';
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestedFor, setRequestedFor] = useState<string | null>(null);
  const text = request.transcript.trim();

  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    fetchAiStatus()
      .then((s) => active && setStatus(s))
      .catch(() => active && setStatus({ available: false, dailyLimit: 0, usedToday: 0 }));
    return () => {
      active = false;
    };
  }, [signedIn]);

  async function send() {
    setLoading(true);
    setError(null);
    try {
      const response = await requestBehavioralFeedback({ ...request, transcript: text, language: locale });
      onFeedback(response.feedback);
      setRequestedFor(text);
      setStatus({ available: true, dailyLimit: response.dailyLimit, usedToday: response.usedToday });
    } catch (err) {
      const code = errorCode(err);
      setError(t.errors.api[code]);
      if (code === 'ai_quota_exceeded' && status) setStatus({ ...status, usedToday: status.dailyLimit });
    } finally {
      setLoading(false);
    }
  }

  let action;
  if (!signedIn) {
    action = <p className="sheet-note">{rich(t.mock.aiSignIn, { link: (s) => <Link to="/account">{s}</Link> })}</p>;
  } else if (!status) {
    action = <p className="sheet-note">{t.common.loading}</p>;
  } else if (!status.available) {
    action = <p className="sheet-note">{status.reason === 'not_allowed' ? t.mock.aiNotAllowed : t.mock.aiOff}</p>;
  } else {
    const remaining = Math.max(0, status.dailyLimit - status.usedToday);
    const tooShort = text.length < MIN_TRANSCRIPT_LENGTH;
    action = (
      <div className="stack" style={{ gap: 8 }}>
        <div className="btn-row">
          <button type="button" className="btn btn-primary btn-small" disabled={loading || tooShort || remaining === 0} onClick={() => void send()}>
            {feedback ? t.mock.aiRequestAgain : t.mock.aiRequest}
          </button>
          <span className="sheet-note">{t.mock.aiRemaining(remaining, status.dailyLimit)}</span>
        </div>
        {tooShort && <p className="field-hint">{t.mock.aiNeedsText}</p>}
        {loading && (
          <p className="sheet-note" role="status">
            {t.rehearse.aiLoading}
          </p>
        )}
        {feedback && requestedFor !== null && requestedFor !== text && !loading && <p className="field-hint">{t.mock.aiEdited}</p>}
      </div>
    );
  }

  return (
    <div className="ai-feedback stack" style={{ gap: 12 }}>
      <h3 className="ai-feedback-title">{t.mock.aiTitle}</h3>
      <p className="sheet-note">{t.rehearse.aiIntro}</p>
      {action}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {feedback && <BehavioralFeedbackView feedback={feedback} />}
    </div>
  );
}

export function BehavioralFeedbackView({ feedback }: { feedback: BehavioralFeedback }) {
  const { t } = useI18n();
  const total = feedback.points.reduce((sum, p) => sum + p.score, 0);
  return (
    <div className="stack" style={{ gap: 14 }}>
      <p className="prose-block">
        <strong>{t.mock.aiTotal(total, feedback.points.length * 2)}</strong> {feedback.summary}
      </p>
      <ul className="ai-points">
        {feedback.points.map((point) => (
          <li key={point.id}>
            <span className="ai-score" data-score={point.score}>
              {t.mock.aiScore(point.score)}
            </span>
            <span>
              <strong>{t.rehearse.points[point.id]}</strong>
              <br />
              {point.comment}
            </span>
          </li>
        ))}
      </ul>
      {feedback.strengths.length > 0 && (
        <div>
          <h4 className="ai-subtitle">{t.mock.aiStrengths}</h4>
          <ul className="bullets">
            {feedback.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {feedback.improvements.length > 0 && (
        <div>
          <h4 className="ai-subtitle">{t.mock.aiImprovements}</h4>
          <ul className="bullets">
            {feedback.improvements.map((item) => (
              <li key={`${item.quote}|${item.suggestion}`}>
                {item.quote && (
                  <>
                    <q lang="en">{item.quote}</q>
                    {' → '}
                  </>
                )}
                {item.suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
      {feedback.improvedAnswer && (
        <div>
          <h4 className="ai-subtitle">{t.rehearse.improvedAnswer}</h4>
          <p className="prose-block" lang="en">
            {feedback.improvedAnswer}
          </p>
        </div>
      )}
    </div>
  );
}
