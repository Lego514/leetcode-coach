import { useNavigate, useParams } from 'react-router';
import { BoardEditor } from '../components/board/BoardEditor';
import { useI18n } from '../i18n';
import { useCatalog } from '../store/queries';

/** /board 是自由白板，/board/15 是第 15 題的白板 */
export function BoardPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const catalog = useCatalog();
  const problemId = Number(id);
  const problem = id ? catalog.byId.get(problemId) : undefined;

  if (id && !problem && !catalog.loaded) return null;

  const title = problem ? t.board.problemTitle(problem.id, problem.title) : t.board.scratchTitle;
  const boardId = problem ? `p${problem.id}` : 'scratch';

  // 從別的頁面點進來就回上一頁；直接開網址時回到題目或「更多」
  const close = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(problem ? `/problems/${problem.id}` : '/more', { replace: true });
  };

  return <BoardEditor boardId={boardId} title={title} onClose={close} />;
}
