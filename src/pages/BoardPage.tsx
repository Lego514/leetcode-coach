import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { BoardEditor } from '../components/board/BoardEditor';
import { Dialog, PageHead, Sheet } from '../components/ui';
import { useI18n } from '../i18n';
import { deleteBoard } from '../store/actions';
import { useCloud } from '../store/cloud';
import { useBoards, useCatalog } from '../store/queries';

/** 從別的頁面點進來就回上一頁；直接開網址時回到 fallback */
function useClose(fallback: string) {
  const navigate = useNavigate();
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  };
}

/** /board/scratch 是自由白板，/board/15 是第 15 題的白板 */
export function BoardPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const catalog = useCatalog();
  const problem = id === 'scratch' ? undefined : catalog.byId.get(Number(id));
  const close = useClose(problem ? `/problems/${problem.id}` : '/board');

  if (id === 'scratch') {
    return <BoardEditor boardId="scratch" title={t.board.scratchTitle} caption={t.board.scratchCaption} onClose={close} />;
  }
  if (!problem) {
    if (!catalog.loaded) return null;
    return (
      <div className="page">
        <PageHead title={t.common.problemNotFound} lede={t.common.problemNotFoundLede(id ?? '')}>
          <div className="btn-row" style={{ marginTop: 16 }}>
            <Link className="btn" to="/board">
              {t.board.listTitle}
            </Link>
          </div>
        </PageHead>
      </div>
    );
  }
  return (
    <BoardEditor
      boardId={`p${problem.id}`}
      title={t.board.problemTitle(problem.id, problem.title)}
      caption={t.board.problemCaption}
      difficulty={problem.difficulty}
      problem={problem}
      onClose={close}
    />
  );
}

/** 我的白板：列出自由白板和每一題的白板，並說明資料存在哪裡 */
export function BoardListPage() {
  const { t, fmt } = useI18n();
  const boards = useBoards();
  const catalog = useCatalog();
  const signedIn = useCloud().account.kind === 'signed-in';
  const [deleting, setDeleting] = useState<{ id: string; title: string } | null>(null);

  const scratch = boards?.find((b) => b.id === 'scratch');
  const problemBoards = (boards ?? [])
    .filter((b) => b.id !== 'scratch')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((b) => {
      const problemId = Number(b.id.slice(1));
      const problem = catalog.byId.get(problemId);
      return { ...b, problemId, title: problem ? t.board.problemTitle(problem.id, problem.title) : `#${problemId}` };
    });

  return (
    <div className="page">
      <PageHead title={t.board.listTitle} lede={t.board.listLede}>
        <p className="board-storage-note">{signedIn ? t.board.storageSynced : t.board.storageLocal}</p>
      </PageHead>

      <div className="stack">
        <Sheet
          title={t.board.scratchTitle}
          id="scratch-board"
          note={t.board.scratchCaption}
          actions={
            <Link className="btn btn-primary btn-small" to="/board/scratch">
              {t.board.openBoard}
            </Link>
          }
        >
          <p className="sheet-empty">
            {scratch && scratch.doc.elements.length > 0
              ? t.board.summary(scratch.doc.elements.length, fmt.dateTime(scratch.updatedAt))
              : t.board.scratchEmpty}
          </p>
        </Sheet>

        <Sheet title={t.board.problemBoards} count={problemBoards.length} id="problem-boards">
          {problemBoards.length === 0 ? (
            <p className="sheet-empty">{t.board.noProblemBoards}</p>
          ) : (
            <ul className="board-list">
              {problemBoards.map((b) => (
                <li key={b.id} className="board-list-row">
                  <Link className="board-list-link" to={`/board/${b.problemId}`}>
                    {b.title}
                  </Link>
                  <span className="board-list-meta">{t.board.summary(b.doc.elements.length, fmt.dateTime(b.updatedAt))}</span>
                  <button type="button" className="btn btn-small btn-quiet" onClick={() => setDeleting({ id: b.id, title: b.title })}>
                    {t.common.delete}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Sheet>
      </div>

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t.board.deleteTitle}
        footer={
          <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={() => setDeleting(null)}>
              {t.common.cancel}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (deleting) void deleteBoard(deleting.id);
                setDeleting(null);
              }}
            >
              {t.common.delete}
            </button>
          </div>
        }
      >
        <p>{deleting && t.board.deleteBody(deleting.title, signedIn)}</p>
      </Dialog>
    </div>
  );
}
