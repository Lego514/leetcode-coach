import { useState } from 'react';
import { PageHead, Sheet } from '../components/ui';
import { EXPLANATION_SCAFFOLD, EXTRA_PHRASE_GROUPS, INTERVIEW_STEPS, type Phrase } from '../data/interview';

export function PhrasesPage() {
  const [quiz, setQuiz] = useState(false);
  const [shown, setShown] = useState<Set<string>>(new Set());

  function reveal(en: string) {
    setShown((prev) => new Set(prev).add(en));
  }

  function toggleQuiz() {
    setQuiz((q) => !q);
    setShown(new Set());
  }

  const groups = [
    ...INTERVIEW_STEPS.map((s) => ({ id: s.id, name: `${s.name}（${s.english}）`, note: s.goal, phrases: s.phrases })),
    ...EXTRA_PHRASE_GROUPS.map((g) => ({ id: g.id, name: g.name, note: undefined, phrases: g.phrases })),
  ];

  return (
    <div className="page">
      <PageHead
        title="英文句型"
        lede="依面試流程整理的常用句子。自我測驗模式會先藏住英文，看著中文試著說出口，再點一下對答案。"
      >
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn" aria-pressed={quiz} onClick={toggleQuiz}>
            {quiz ? '結束自我測驗' : '開始自我測驗'}
          </button>
        </div>
      </PageHead>

      <div className="stack">
        <Sheet title="講解一題的架構" id="scaffold" note="寫講解稿和講解練習都用這個順序">
          <pre className="sheet-body prose-block explain-scaffold" lang="en" style={{ margin: 0, fontFamily: 'inherit' }}>
            {EXPLANATION_SCAFFOLD}
          </pre>
        </Sheet>

        {groups.map((g) => (
          <Sheet key={g.id} title={g.name} note={g.note} id={`phrases-${g.id}`}>
            <ul className="sheet-body phrase-list" style={{ paddingTop: 4, paddingBottom: 8 }}>
              {g.phrases.map((ph) => (
                <PhraseItem key={ph.en} phrase={ph} hidden={quiz && !shown.has(ph.en)} onReveal={() => reveal(ph.en)} />
              ))}
            </ul>
          </Sheet>
        ))}
      </div>
    </div>
  );
}

function PhraseItem({ phrase, hidden, onReveal }: { phrase: Phrase; hidden: boolean; onReveal: () => void }) {
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
          <span className="visually-hidden">顯示英文</span>
        </button>
      ) : (
        <p className="phrase-en" lang="en">
          {phrase.en}
        </p>
      )}
      <p className="phrase-zh">{phrase.zh}</p>
    </li>
  );
}
