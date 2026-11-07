import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Whiteboard, type BoardDoc } from 'dsa-whiteboard';
import type { Problem } from '../../data/problems';
import { loadReferenceBoard } from '../../data/referenceBoards';
import { useI18n } from '../../i18n';
import { saveBoard } from '../../store/actions';
import { useBoard } from '../../store/queries';
import { useToast } from '../toast';
import { DifficultyTag } from '../ui';
import { useBoardPrefs } from './BoardPrefs';

/**
 * 參考板書：做好的白板，按 ▶ 一步一步播放，字幕是參考講解的那一句。
 * 什麼時候想看都可以（題目頁、複習頁、白板的選單都有按鈕）。這裡的改動不會存；
 * 想留著就「複製到我的白板」，存成這一題自己的白板
 */
export function ReferenceBoardView({ problem, onClose }: { problem: Problem; onClose: () => void }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const prefs = useBoardPrefs();
  const mine = useBoard(`p${problem.id}`);
  // 記下載入的是哪一題：換題（只改網址）時第一次 render 還拿著上一題的板書，不能拿來開白板
  const [loaded, setLoaded] = useState<{ id: number; doc: BoardDoc | null } | undefined>(undefined);
  const doc = loaded?.id === problem.id ? loaded.doc : undefined;
  /** 現在畫面上的內容（可能播放後改過），複製時存這個 */
  const current = useRef<BoardDoc | null>(null);

  useEffect(() => {
    let active = true;
    void loadReferenceBoard(problem.id).then((board) => {
      if (active) setLoaded({ id: problem.id, doc: board ?? null });
    });
    return () => {
      active = false;
    };
  }, [problem.id]);

  if (doc === undefined) {
    return (
      <div className="board" aria-busy="true">
        <p className="board-loading">{t.common.loading}</p>
      </div>
    );
  }
  if (doc === null) return null;

  const copy = async () => {
    // 自己的白板已經有東西：先問，免得蓋掉
    if ((mine?.doc.elements.length ?? 0) > 0 && !window.confirm(t.reference.replaceConfirm)) return;
    await saveBoard(`p${problem.id}`, current.current ?? doc);
    toast(t.reference.copied);
    navigate(`/board/${problem.id}`, { replace: true });
  };

  return (
    <Whiteboard
      key={`reference:${problem.id}`}
      initial={doc}
      // 參考板書不存檔：看的時候可以隨手畫，關掉就沒了
      onSave={() => undefined}
      onChange={(next) => (current.current = next)}
      title={t.board.problemTitle(problem.id, problem.title)}
      caption={t.reference.boardCaption}
      badge={<DifficultyTag difficulty={problem.difficulty} />}
      savedLabel={t.reference.notSaved}
      locale={locale}
      onClose={onClose}
      exportName={`reference-${problem.id}`}
      onNotice={toast}
      actions={
        <button type="button" className="btn btn-small" onClick={() => void copy()}>
          {t.reference.copy}
        </button>
      }
      menu={prefs}
      // 一打開就從第一步播放；說明是講法的那一句，只能看、會換行
      startAtStep={0}
      readOnlySteps
    />
  );
}
