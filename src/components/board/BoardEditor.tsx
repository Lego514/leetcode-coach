import { EMPTY_DOC, Whiteboard, type ExplainHooks } from 'dsa-whiteboard';
import type { Difficulty, Problem } from '../../data/problems';
import { useI18n } from '../../i18n';
import { saveBoard } from '../../store/actions';
import { useCloud } from '../../store/cloud';
import { useBoard } from '../../store/queries';
import { useToast } from '../toast';
import { DifficultyTag } from '../ui';
import { ExplainProblemContext, ExplainReview, ExplainSession, type ExplainResult } from './BoardExplain';

// 白板本身是 dsa-whiteboard 套件；這裡接上刷題教練的存檔、同步和講解模式。

const EXPLAIN: ExplainHooks<ExplainResult> = { Session: ExplainSession, Review: ExplainReview };

interface BoardEditorProps {
  /** scratch 是自由白板，p 加題號是那一題的白板 */
  boardId: string;
  title: string;
  /** 標題上面的小字：題目白板，或自由白板 */
  caption: string;
  difficulty?: Difficulty;
  /** 題目的白板：講解完可以存成講解練習、請 AI 回饋 */
  problem?: Problem;
  onClose: () => void;
}

/** 全螢幕的白板；內容自動存檔，登入時會同步 */
export function BoardEditor({ boardId, title, caption, difficulty, problem, onClose }: BoardEditorProps) {
  const { t, locale } = useI18n();
  const record = useBoard(boardId);
  const signedIn = useCloud().account.kind === 'signed-in';
  const toast = useToast();
  if (record === undefined) {
    return (
      <div className="board" aria-busy="true">
        <p className="board-loading">{t.common.loading}</p>
      </div>
    );
  }
  return (
    <ExplainProblemContext.Provider value={problem}>
      <Whiteboard
        key={boardId}
        initial={record?.doc ?? EMPTY_DOC}
        onSave={(doc) => saveBoard(boardId, doc)}
        title={title}
        caption={caption}
        badge={difficulty && <DifficultyTag difficulty={difficulty} />}
        // 說清楚存在哪裡：沒登入只在這台裝置，登入後會同步到雲端
        savedLabel={signedIn ? t.board.savedSynced : t.board.savedLocal}
        locale={locale}
        onClose={onClose}
        exportName={boardId === 'scratch' ? 'whiteboard' : `whiteboard-${boardId.slice(1)}`}
        onNotice={toast}
        explain={EXPLAIN}
      />
    </ExplainProblemContext.Provider>
  );
}
