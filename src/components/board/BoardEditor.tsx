import { useRef, useState } from 'react';
import { useHref, useNavigate, useSearchParams } from 'react-router';
import { EMPTY_DOC, guestName, isOldGuestName, newRoomId, ROOM_ID, ShareControls, Whiteboard, type BoardDoc, type ExplainHooks } from 'dsa-whiteboard';
import { PROBLEM_EXAMPLES } from '../../data/examples';
import { REFERENCE_BOARD_IDS } from '../../data/referenceBoards';
import type { Difficulty, Problem } from '../../data/problems';
import { useI18n, type Locale } from '../../i18n';
import { saveBoard } from '../../store/actions';
import { useBoardPrefs } from './BoardPrefs';
import { useCloud } from '../../store/cloud';
import { useBoard } from '../../store/queries';
import { useToast } from '../toast';
import { DifficultyTag } from '../ui';
import { ExplainProblemContext, ExplainReview, ExplainSession, type ExplainResult } from './BoardExplain';

// 白板本身是 dsa-whiteboard 套件；這裡接上刷題教練的存檔、同步、講解模式和共用。
// 共用：網址加上 ?room=…，打開連結的人一起編輯同一張白板（房間在 dsa-whiteboard 的伺服器上）。

const EXPLAIN: ExplainHooks<ExplainResult> = { Session: ExplainSession, Review: ExplainReview };

/** 共用房間的伺服器；建置時沒設定就不顯示「共用」 */
const COLLAB_URL = import.meta.env.VITE_COLLAB_URL;
/** 共用時別人看到的名字 */
const NAME_KEY = 'leetcode-coach:collab-name';

/**
 * 共用時別人看到的名字：第一次用時取一個形容詞加動物（白板套件的 guestName，頭像會是那種動物）；
 * 舊版自動取的「訪客 17」也換掉，自己取的名字不動
 */
function storedName(locale: Locale): string {
  try {
    const saved = localStorage.getItem(NAME_KEY)?.trim();
    if (saved && !isOldGuestName(saved)) return saved;
    const name = guestName(locale);
    localStorage.setItem(NAME_KEY, name);
    return name;
  } catch {
    return guestName(locale);
  }
}

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
  // 語言、深淺色：寬的畫面在標題列，手機上收進白板的「⋯」選單
  const prefs = useBoardPrefs();
  const navigate = useNavigate();
  // 有參考板書的題目，選單多一項「看參考板書」
  const menu =
    problem && REFERENCE_BOARD_IDS.has(problem.id)
      ? [{ label: t.reference.openBoard, icon: ICON_REFERENCE, onSelect: () => navigate(`/board/${problem.id}?view=reference`) }, ...prefs]
      : prefs;
  const [params, setParams] = useSearchParams();
  const param = params.get('room');
  const room = COLLAB_URL && param && ROOM_ID.test(param) ? param : null;
  /** 這個分頁建立的房間，和建立時的白板：房間是空的時候放上去 */
  const [created, setCreated] = useState<{ id: string; doc: BoardDoc } | null>(null);
  const [name, setName] = useState(() => storedName(locale));
  /** 白板現在的內容（共用時是房間的內容） */
  const current = useRef<BoardDoc>(EMPTY_DOC);
  // 共用的連結一律打開白板頁，練習頁裡的白板分享出去也一樣
  const boardHref = useHref(`/board/${boardId === 'scratch' ? 'scratch' : boardId.slice(1)}`);

  if (record === undefined) {
    return (
      <div className="board" aria-busy="true">
        <p className="board-loading">{t.common.loading}</p>
      </div>
    );
  }

  // 用 hash 路由：連結是 …/#/board/15?room=…
  const linkTo = (id: string) => new URL(`${boardHref}?room=${id}`, window.location.href).href;
  const setRoom = (id: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id) next.set('room', id);
        else next.delete('room');
        return next;
      },
      { replace: true },
    );

  const share = () => {
    // 最後一次修改可能還沒存：先存起來，房間也從現在看到的內容開始
    const doc = current.current;
    void saveBoard(boardId, doc);
    const id = newRoomId();
    setCreated({ id, doc });
    setRoom(id);
    return linkTo(id);
  };

  const saveCopy = () => {
    if (!window.confirm(t.board.saveCopyConfirm)) return;
    void saveBoard(boardId, current.current).then(() => toast(t.board.savedCopy));
  };

  const rename = (next: string) => {
    setName(next);
    try {
      localStorage.setItem(NAME_KEY, next);
    } catch {
      // 存不下就只用在這次
    }
  };

  const seed = room !== null && created?.id === room;
  return (
    <ExplainProblemContext.Provider value={problem}>
      <Whiteboard
        key={room ? `room:${room}` : boardId}
        initial={room ? (seed ? (created?.doc ?? EMPTY_DOC) : EMPTY_DOC) : (record?.doc ?? EMPTY_DOC)}
        // 共用時內容存在房間裡，不動自己的白板
        onSave={(doc) => (room ? undefined : saveBoard(boardId, doc))}
        onChange={(doc) => (current.current = doc)}
        title={title}
        caption={room ? t.board.sharedCaption : caption}
        badge={difficulty && <DifficultyTag difficulty={difficulty} />}
        // 說清楚存在哪裡：沒登入只在這台裝置，登入後會同步到雲端
        savedLabel={signedIn ? t.board.savedSynced : t.board.savedLocal}
        locale={locale}
        onClose={onClose}
        exportName={boardId === 'scratch' ? 'whiteboard' : `whiteboard-${boardId.slice(1)}`}
        onNotice={toast}
        explain={EXPLAIN}
        actions={
          <ShareControls
            onShare={COLLAB_URL ? share : undefined}
            link={room ? linkTo(room) : undefined}
            onRename={rename}
            onSaveCopy={saveCopy}
            onLeave={() => {
              setCreated(null);
              setRoom(null);
            }}
          />
        }
        menu={menu}
        // 題目的白板是空的時候，一鍵放上這題的範例（跟參考講解用同一組資料）；自己新增的題目沒有
        example={problem && !problem.custom ? PROBLEM_EXAMPLES[problem.id] : undefined}
        collab={room && COLLAB_URL ? { url: `${COLLAB_URL.replace(/^http/, 'ws').replace(/\/$/, '')}/room/${room}`, name, seed } : undefined}
      />
    </ExplainProblemContext.Provider>
  );
}

/** 參考板書：一塊板子上有播放的三角形 */
const ICON_REFERENCE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3.5" y="5" width="17" height="12" rx="2" />
    <path d="M10.5 8.8v4.4l3.6-2.2zM8 20.5h8" />
  </svg>
);
