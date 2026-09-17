import { useState } from 'react';
import { PageHead, Sheet } from '../components/ui';
import { EXPLANATION_SCAFFOLD, EXTRA_PHRASE_GROUPS, INTERVIEW_STEPS, type Phrase } from '../data/interview';
import { useI18n } from '../i18n';

export function PhrasesPage() {
  const { t, locale } = useI18n();
  // 中文翻譯與自我測驗是給中文使用者的學習輔助，英文介面不顯示
  const showTranslation = locale === 'zh-TW';
  const [quizOn, setQuiz] = useState(false);
  const [shown, setShown] = useState<Set<string>>(new Set());
  const quiz = quizOn && showTranslation;

  function reveal(en: string) {
    setShown((prev) => new Set(prev).add(en));
  }

  function toggleQuiz() {
    setQuiz((q) => !q);
    setShown(new Set());
  }

  const groups = [
    ...INTERVIEW_STEPS.map((s) => {
      const step = t.interview.steps[s.id];
      return { id: s.id, name: t.phrases.stepTitle(step.name, s.english), note: step.goal, phrases: s.phrases };
    }),
    ...EXTRA_PHRASE_GROUPS.map((g) => ({ id: g.id, name: t.interview.groups[g.id], note: undefined, phrases: g.phrases })),
  ];

  return (
    <div className="page">
      <PageHead title={t.phrases.title} lede={t.phrases.lede}>
        {showTranslation && (
          <div className="btn-row" style={{ marginTop: 16 }}>
            <button className="btn" aria-pressed={quiz} onClick={toggleQuiz}>
              {quiz ? t.phrases.endQuiz : t.phrases.startQuiz}
            </button>
          </div>
        )}
      </PageHead>

      <div className="stack">
        <Sheet title={t.phrases.scaffoldTitle} id="scaffold" note={t.phrases.scaffoldNote}>
          <pre className="sheet-body prose-block explain-scaffold" lang="en" style={{ margin: 0, fontFamily: 'inherit' }}>
            {EXPLANATION_SCAFFOLD}
          </pre>
        </Sheet>

        {groups.map((g) => (
          <Sheet key={g.id} title={g.name} note={g.note} id={`phrases-${g.id}`}>
            <ul className="sheet-body phrase-list" style={{ paddingTop: 4, paddingBottom: 8 }}>
              {g.phrases.map((ph) => (
                <PhraseItem
                  key={ph.en}
                  phrase={ph}
                  hidden={quiz && !shown.has(ph.en)}
                  showTranslation={showTranslation}
                  revealLabel={t.phrases.reveal}
                  onReveal={() => reveal(ph.en)}
                />
              ))}
            </ul>
          </Sheet>
        ))}
      </div>
    </div>
  );
}

interface PhraseItemProps {
  phrase: Phrase;
  hidden: boolean;
  showTranslation: boolean;
  revealLabel: string;
  onReveal: () => void;
}

function PhraseItem({ phrase, hidden, showTranslation, revealLabel, onReveal }: PhraseItemProps) {
  return (
    <li>
      {hidden ? (
        <button
          type="button"
          className="phrase-en"
          data-hidden="true"
          style={{ display: 'block', width: '100%', border: 0, padding: '0 4px', textAlign: 'left' }}
          onClick={onReveal}
        >
          <span aria-hidden>{phrase.en}</span>
          <span className="visually-hidden">{revealLabel}</span>
        </button>
      ) : (
        <p className="phrase-en" lang="en">
          {phrase.en}
        </p>
      )}
      {showTranslation && (
        <p className="phrase-zh" lang="zh-Hant">
          {phrase.zh}
        </p>
      )}
    </li>
  );
}
