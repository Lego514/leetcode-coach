import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { BOARD_COLORS, BOARD_MAX_BYTES, CELL_COLORS, type BoardColor, type CellColor } from '../../../shared/constants';
import type { Difficulty } from '../../data/problems';
import { useI18n } from '../../i18n';
import { boardToSvg, estimateWidth, type Measure } from '../../lib/board/exportSvg';
import * as m from '../../lib/board/model';
import { acceptsText, applyStructureText, structureText, type TextElement } from '../../lib/board/structures';
import { insertTemplate, TEMPLATES, type TemplateKind } from '../../lib/board/templates';
import { useCloud } from '../../store/cloud';
import { useToast } from '../toast';
import { DifficultyTag, Dialog } from '../ui';
import { saveBoard } from '../../store/actions';
import { useBoard } from '../../store/queries';
import { ElementView } from './BoardElements';
import { PlaybackBar, StepsWidget } from './BoardSteps';

// 自己寫的數位白板：左邊拖元件、中間是可以平移縮放的畫布、下面是工具列。
// 元件是一般的 HTML（文字清楚、可以直接編輯），箭頭和筆跡畫在同一層的 SVG 上。

type Tool = 'select' | 'hand' | 'arrow' | 'line' | 'rect' | 'ellipse' | 'pen' | 'eraser';

interface View {
  x: number;
  y: number;
  zoom: number;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const TOOLS: Tool[] = ['select', 'hand', 'arrow', 'line', 'rect', 'ellipse', 'pen', 'eraser'];
const TOOL_KEYS: Record<string, Tool> = { v: 'select', h: 'hand', a: 'arrow', l: 'line', r: 'rect', o: 'ellipse', p: 'pen', e: 'eraser' };

type Gesture =
  | { kind: 'pan'; pointerId: number; start: m.Point; view: View }
  | {
      kind: 'move';
      pointerId: number;
      start: m.Point;
      ids: ReadonlySet<string>;
      base: m.BoardDoc;
      moved: boolean;
      clicked: string;
      cell?: number;
    }
  | { kind: 'pen'; pointerId: number; points: number[] }
  | { kind: 'erase'; pointerId: number; erased: boolean }
  | { kind: 'arrow'; pointerId: number; from: m.ArrowEnd; fromPoint: m.Point; head: 'end' | 'none' }
  | { kind: 'shape'; pointerId: number; variant: m.ShapeVariant; from: m.Point }
  | { kind: 'marquee'; pointerId: number; start: m.Point; base: ReadonlySet<string> }
  | { kind: 'resize'; pointerId: number; id: string; start: m.Point; base: m.BoardDoc; w: number; h: number; moved: boolean }
  | { kind: 'pinch'; startDistance: number; startMid: m.Point; view: View };

type Draft =
  | { kind: 'pen'; points: number[] }
  | { kind: 'arrow'; from: m.Point; to: m.Point; head: 'end' | 'none' }
  | { kind: 'shape'; shape: m.ElementOf<'shape'> }
  | { kind: 'marquee'; rect: m.Rect };

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

interface BoardEditorProps {
  boardId: string;
  title: string;
  /** 標題上面的小字：題目白板，或自由白板 */
  caption: string;
  difficulty?: Difficulty;
  onClose: () => void;
}

/** 全螢幕的白板；內容自動存檔，登入時會同步 */
export function BoardEditor({ boardId, onClose, ...heading }: BoardEditorProps) {
  const { t } = useI18n();
  const record = useBoard(boardId);
  if (record === undefined) {
    return (
      <div className="board" aria-busy="true">
        <p className="board-loading">{t.common.loading}</p>
      </div>
    );
  }
  return <Editor key={boardId} boardId={boardId} {...heading} initial={record?.doc ?? m.EMPTY_DOC} onClose={onClose} />;
}

function Editor({ boardId, title, caption, difficulty, initial, onClose }: BoardEditorProps & { initial: m.BoardDoc }) {
  const { t } = useI18n();
  const signedIn = useCloud().account.kind === 'signed-in';
  const toast = useToast();
  const [history, setHistory] = useState(() => m.initHistory(initial));
  const doc = history.present;
  const [view, setView] = useState<View>({ x: 0, y: 0, zoom: 1 });
  const [tool, setTool] = useState<Tool>('select');
  const [color, setColor] = useState<BoardColor>('ink');
  const [selection, setSelection] = useState<ReadonlySet<string>>(() => new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  /** 進入編輯時游標放在哪一格 */
  const [editFocus, setEditFocus] = useState<number | undefined>(undefined);
  /** 選取的陣列格子；選了一格時，操作列換成這一格的操作 */
  const [cellSel, setCellSel] = useState<{ id: string; index: number } | null>(null);
  /** 圖選了一條邊 */
  const [edgeSel, setEdgeSel] = useState<{ id: string; index: number } | null>(null);
  const [sizes, setSizes] = useState<ReadonlyMap<string, { w: number; h: number }>>(() => new Map());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [snap, setSnap] = useState<{ id: string; index: number } | null>(null);
  const [ghost, setGhost] = useState<{ kind: m.PaletteKind; x: number; y: number } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  /** 手機上顏色收成一顆，點了才展開 */
  const [colorsOpen, setColorsOpen] = useState(false);
  /** 正在播放第幾步；null 是一般編輯 */
  const [playing, setPlaying] = useState<number | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [savedDoc, setSavedDoc] = useState(initial);
  const [tooLarge, setTooLarge] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, m.Point>());
  const spaceDown = useRef(false);
  const lastTap = useRef<{ id: string; cell?: number; time: number } | null>(null);
  const paletteDrag = useRef<{ kind: m.PaletteKind; start: m.Point; dragging: boolean } | null>(null);
  const suppressClick = useRef(false);

  // ---------- 存檔 ----------

  // 停下來 0.6 秒後存檔；關掉白板時把還沒存的存起來
  useEffect(() => {
    if (doc === savedDoc) return;
    const timer = window.setTimeout(() => {
      setTooLarge(JSON.stringify(doc).length > BOARD_MAX_BYTES);
      void saveBoard(boardId, doc).then(() => setSavedDoc(doc));
    }, 600);
    return () => window.clearTimeout(timer);
  }, [doc, savedDoc, boardId]);

  const pending = useRef<{ doc: m.BoardDoc; saved: m.BoardDoc }>({ doc: initial, saved: initial });
  useEffect(() => {
    pending.current = { doc, saved: savedDoc };
  }, [doc, savedDoc]);
  useEffect(
    () => () => {
      const { doc: last, saved } = pending.current;
      if (last !== saved) void saveBoard(boardId, last);
    },
    [boardId],
  );

  // ---------- 量元件大小（文字和變數的高度會變，箭頭要停在邊緣） ----------

  const observer = useRef<ResizeObserver | null>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      setSizes((prev) => {
        let next = prev;
        for (const entry of entries) {
          const node = entry.target as HTMLElement;
          const id = node.dataset.el;
          if (!id) continue;
          const w = node.offsetWidth;
          const h = node.offsetHeight;
          const old = prev.get(id);
          if (old && Math.abs(old.w - w) < 0.5 && Math.abs(old.h - h) < 0.5) continue;
          if (next === prev) next = new Map(prev);
          (next as Map<string, { w: number; h: number }>).set(id, { w, h });
        }
        return next;
      });
    });
    observer.current = ro;
    for (const node of nodes.current.values()) ro.observe(node);
    return () => ro.disconnect();
  }, []);
  const register = useCallback((id: string, node: HTMLElement | null) => {
    const prev = nodes.current.get(id);
    if (prev && prev !== node) observer.current?.unobserve(prev);
    if (node) {
      nodes.current.set(id, node);
      observer.current?.observe(node);
    } else {
      nodes.current.delete(id);
    }
  }, []);

  // ---------- 座標與縮放 ----------

  const viewportRect = () => viewportRef.current!.getBoundingClientRect();
  const toWorld = (clientX: number, clientY: number): m.Point => {
    const r = viewportRect();
    return { x: (clientX - r.left - view.x) / view.zoom, y: (clientY - r.top - view.y) / view.zoom };
  };
  const centerWorld = (): m.Point => {
    const r = viewportRect();
    return toWorld(r.left + r.width / 2, r.top + r.height / 2);
  };

  const zoomAt = useCallback((factor: number, sx: number, sy: number) => {
    setView((v) => {
      const zoom = clampZoom(v.zoom * factor);
      const k = zoom / v.zoom;
      return { zoom, x: sx - (sx - v.x) * k, y: sy - (sy - v.y) * k };
    });
  }, []);

  const zoomCenter = (factor: number) => {
    const r = viewportRect();
    zoomAt(factor, r.width / 2, r.height / 2);
  };

  const fitTo = useCallback((target: m.BoardDoc, measured: m.Sizes) => {
    const node = viewportRef.current;
    if (!node) return;
    const r = node.getBoundingClientRect();
    const bounds = m.contentBounds(target, measured);
    if (!bounds) {
      setView({ x: r.width / 2, y: r.height / 2, zoom: 1 });
      return;
    }
    const pad = 60;
    const zoom = clampZoom(Math.min((r.width - pad * 2) / Math.max(bounds.w, 1), (r.height - pad * 2) / Math.max(bounds.h, 1), 1.25));
    setView({ zoom, x: r.width / 2 - (bounds.x + bounds.w / 2) * zoom, y: r.height / 2 - (bounds.y + bounds.h / 2) * zoom });
  }, []);

  // 打開時把內容放在畫面中間，只做這一次。
  // 存檔後資料庫的內容會更新、initial 跟著變，不能因此又把畫面拉回中間。
  const [openedWith] = useState(initial);
  useEffect(() => {
    const frame = requestAnimationFrame(() => fitTo(openedWith, new Map()));
    return () => cancelAnimationFrame(frame);
  }, [fitTo, openedWith]);

  // 滾輪平移；按著 Ctrl 或觸控板捏合時縮放
  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // 換成像素：滑鼠滾輪一格大約 100，Firefox 有時以「行」為單位
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? node.clientHeight : 1;
      const dx = e.deltaX * unit;
      const dy = e.deltaY * unit;
      if (e.ctrlKey || e.metaKey) {
        // 每次最多縮放約 12%：滑鼠一格不會一下跳太多，觸控板捏合也一樣平順
        const r = node.getBoundingClientRect();
        const step = Math.max(-60, Math.min(60, dy));
        zoomAt(Math.exp(-step * 0.002), e.clientX - r.left, e.clientY - r.top);
      } else {
        setView((v) => ({ ...v, x: v.x - dx, y: v.y - dy }));
      }
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  // ---------- 修改 ----------

  const apply = (next: m.BoardDoc) => setHistory((h) => m.commit(h, next));
  const selected = new Set([...selection].filter((id) => doc.elements.some((el) => el.id === id)));
  const single = selected.size === 1 ? m.findElement(doc, [...selected][0]) : undefined;
  // 選取的格子要還在：陣列被刪、格子被刪或改選別的元件時就不算
  const pickedList =
    cellSel && single?.type === 'list' && single.id === cellSel.id && cellSel.index < single.items.length ? single : undefined;
  const pickedIndex = pickedList ? cellSel!.index : undefined;
  // 二元樹選了一個節點
  const pickedTree =
    cellSel && single?.type === 'tree' && single.id === cellSel.id && m.hasTreeNode(single, cellSel.index) ? single : undefined;
  const pickedNode = pickedTree ? cellSel!.index : undefined;
  // 圖選了一個節點，或選了一條邊
  const pickedGraph =
    single?.type === 'graph' &&
    ((cellSel?.id === single.id && cellSel.index < single.nodes.length) || (edgeSel?.id === single.id && edgeSel.index < single.edges.length))
      ? single
      : undefined;
  const graphNode = pickedGraph && cellSel?.id === pickedGraph.id ? cellSel.index : undefined;
  const graphEdge = pickedGraph && graphNode === undefined && edgeSel?.id === pickedGraph.id ? edgeSel.index : undefined;
  // 遞迴樹選了一個呼叫
  const pickedRec =
    cellSel && single?.type === 'recursion' && single.id === cellSel.id && cellSel.index < single.nodes.length ? single : undefined;
  const recNode = pickedRec ? cellSel!.index : undefined;

  const startEditing = (id: string, focus?: number) => {
    setHistory((h) => m.checkpoint(h));
    setEditingId(id);
    setEditFocus(focus);
    setSelection(new Set([id]));
  };
  const stopEditing = () => {
    if (!editingId) return;
    setHistory((h) => m.dropEmptyCheckpoint(h));
    setEditingId(null);
  };
  const editElement = (id: string, patch: Partial<m.Placed>) =>
    setHistory((h) => m.replace(h, m.updateElement(h.present, id, patch)));

  const addKind = (kind: m.PaletteKind, at?: m.Point) => {
    stopEditing();
    const id = m.newId(doc);
    const fresh = m.createElement(kind, { x: 0, y: 0 }, id, t.board.defaults);
    if (fresh.type === 'pointer') fresh.name = m.nextPointerName(doc);
    // 拖進來的放在放開的位置；點一下的放在畫面中間附近的空位
    let el = at ? { ...fresh, ...centered(fresh, at) } : m.placeAtCenter(doc, fresh, centerWorld(), sizes);
    // 先選了陣列、串列或樹再加指標，指標直接放在第一格（樹是根節點）；要放在別格，先點那格再按「＋指標」
    if (el.type === 'pointer' && !at && m.holdsPointers(single)) el = { ...el, attach: { id: single.id, index: 0 } };
    let next = m.addElement(doc, el);
    if (el.type === 'pointer' && !el.attach) next = m.dropPointer(next, id);
    apply(next);
    setSelection(new Set([id]));
    setTool('select');
  };

  /** 幫兩個指標加範圍框，選取新的框（可以直接換色） */
  const frameBetween = ([from, to]: [string, string]) => {
    const id = m.newId(doc);
    apply(m.addElement(doc, { type: 'range', id, from, to, color: 'orange' }));
    setSelection(new Set([id]));
  };

  /** 模板整組放在畫面中間附近的空位，全部選取，可以直接一起拖走 */
  const addTemplate = (kind: TemplateKind) => {
    stopEditing();
    setCellSel(null);
    const { doc: next, ids } = insertTemplate(doc, kind, centerWorld(), sizes);
    apply(next);
    setSelection(new Set(ids));
    setTool('select');
  };

  // ---------- 陣列的單一格 ----------

  /** 在 index 插入一格，選取它並直接開始輸入 */
  const insertCellAt = (list: m.ElementOf<'list'>, index: number) => {
    if (list.items.length >= m.MAX_CELLS) return;
    apply(m.insertCell(doc, list.id, index));
    setCellSel({ id: list.id, index });
    startEditing(list.id, index);
  };

  const deleteCellAt = (list: m.ElementOf<'list'>, index: number) => {
    apply(m.deleteCell(doc, list.id, index));
    setCellSel({ id: list.id, index: Math.max(0, Math.min(index, list.items.length - 2)) });
  };

  const addPointerOn = (target: m.ElementOf<'list'> | m.NodeHolder, index: number) => {
    const id = m.newId(doc);
    apply(m.addPointerAt(doc, target.id, index, id));
    setSelection(new Set([id]));
    setCellSel(null);
  };

  // ---------- 鏈結串列與二元樹 ----------

  const toggleLinkAt = (list: m.ElementOf<'list'>, gap: number) => apply(m.toggleLink(doc, list.id, gap));

  /** 在空的子節點位置長出一個節點，選取它並直接開始輸入 */
  const addChildAt = (tree: m.ElementOf<'tree'>, index: number) => {
    const result = m.addTreeChild(doc, tree.id, m.treeParent(index), index % 2 === 1 ? 'left' : 'right');
    if (!result) return;
    apply(result.doc);
    setCellSel({ id: tree.id, index: result.index });
    startEditing(tree.id, result.index);
  };

  const addGraphNodeTo = (graph: m.ElementOf<'graph'>) => {
    const result = m.addGraphNode(doc, graph.id);
    if (!result) return;
    apply(result.doc);
    setEdgeSel(null);
    setCellSel({ id: graph.id, index: result.index });
  };

  const pickEdge = (graph: m.ElementOf<'graph'>, index: number) => {
    setSelection(new Set([graph.id]));
    setCellSel(null);
    setEdgeSel({ id: graph.id, index });
  };

  const deleteGraphNodeAt = (graph: m.ElementOf<'graph'>, index: number) => {
    apply(m.deleteGraphNode(doc, graph.id, index));
    setCellSel(null);
  };

  const deleteEdgeAt = (graph: m.ElementOf<'graph'>, index: number) => {
    apply(m.removeGraphEdge(doc, graph.id, index));
    setEdgeSel(null);
  };

  const deleteNodeAt = (tree: m.ElementOf<'tree'>, index: number) => {
    if (index <= 0) return;
    apply(m.deleteTreeNode(doc, tree.id, index));
    setCellSel({ id: tree.id, index: m.treeParent(index) });
  };

  /** 在遞迴樹的一個呼叫底下加子呼叫，選取它並直接開始輸入 */
  const addCallAt = (tree: m.ElementOf<'recursion'>, parent: number) => {
    const result = m.addRecursionChild(doc, tree.id, parent);
    if (!result) return;
    apply(result.doc);
    setCellSel({ id: tree.id, index: result.index });
    startEditing(tree.id, result.index);
  };

  /** 刪掉這個呼叫和底下的呼叫，改選呼叫它的那個（位置在前面，不會變） */
  const deleteCallAt = (tree: m.ElementOf<'recursion'>, index: number) => {
    if (index <= 0) return;
    apply(m.deleteRecursionNode(doc, tree.id, index));
    setCellSel({ id: tree.id, index: tree.nodes[index].parent });
  };

  const removeSelected = () => {
    if (selected.size === 0) return;
    apply(m.removeElements(doc, selected));
    setSelection(new Set());
    setEditingId(null);
  };

  const duplicateSelected = () => {
    if (selected.size === 0) return;
    const { doc: next, ids } = m.duplicateElements(doc, selected);
    apply(next);
    setSelection(new Set(ids));
  };

  const pickColor = (c: BoardColor) => {
    // 手機上顏色只顯示一顆：點目前的顏色展開或收起，點別的顏色就選它
    if (c === color) {
      setColorsOpen((open) => !open);
      return;
    }
    setColor(c);
    setColorsOpen(false);
    if ([...selected].some((id) => m.hasColor(m.findElement(doc, id)))) apply(m.recolorElements(doc, selected, c));
  };

  /** 清空整張白板；跟其他修改一樣可以復原 */
  // ---------- 逐步播放 ----------

  const steps = doc.steps ?? [];
  // 步驟被刪掉或復原時，播放的位置可能已經不存在
  const playIndex = playing !== null && playing < steps.length ? playing : null;
  /** 畫面上顯示的內容：播放時是那一步的快照，平常是目前的白板 */
  const shownDoc = playIndex === null ? doc : m.stepDoc(doc, playIndex);

  const captureCurrentStep = () => {
    if (steps.length >= m.MAX_STEPS) return;
    stopEditing();
    apply(m.captureStep(doc, m.newStepId(doc)));
  };

  const startPlayback = (index: number) => {
    stopEditing();
    setSelection(new Set());
    setCellSel(null);
    setShowHelp(false);
    setAutoPlay(false);
    setPlaying(index);
  };

  const exitPlayback = () => {
    setAutoPlay(false);
    setPlaying(null);
  };

  const goToStep = (index: number) => setPlaying(Math.max(0, Math.min(index, steps.length - 1)));

  const toggleAutoPlay = () => {
    if (playIndex === null) return;
    // 在最後一步按播放就從頭開始
    if (!autoPlay && playIndex === steps.length - 1) setPlaying(0);
    setAutoPlay((on) => !on);
  };

  const restoreFromStep = () => {
    if (playIndex === null) return;
    apply(m.restoreStep(doc, playIndex));
    exitPlayback();
  };

  const deleteCurrentStep = () => {
    if (playIndex === null) return;
    apply(m.deleteStep(doc, playIndex));
    if (steps.length <= 1) exitPlayback();
    else setPlaying(Math.min(playIndex, steps.length - 2));
  };

  // 自動播放：每一步停 1.4 秒，播到最後一步就停
  useEffect(() => {
    if (!autoPlay || playIndex === null) return;
    const timer = window.setTimeout(() => {
      if (playIndex >= steps.length - 1) setAutoPlay(false);
      else setPlaying(playIndex + 1);
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [autoPlay, playIndex, steps.length]);

  /** 匯出目前畫面上的內容（播放時是那一步）成 PNG */
  const exportImage = async () => {
    const out = boardToSvg(shownDoc, sizes, { measure: canvasMeasure(), front: t.board.front, back: t.board.back });
    if (!out) return;
    try {
      const blob = await svgToPng(out.svg, out.width, out.height);
      const base = boardId === 'scratch' ? 'whiteboard' : `whiteboard-${boardId.slice(1)}`;
      download(blob, `${base}${playIndex === null ? '' : `-step-${playIndex + 1}`}.png`);
    } catch {
      toast(t.board.exportFailed);
    }
  };

  const clearBoard = () => {
    setConfirmClear(false);
    setEditingId(null);
    setCellSel(null);
    setSelection(new Set());
    apply(m.clearElements(doc));
  };

  const undo = () => {
    setEditingId(null);
    setHistory((h) => m.undo(h));
  };
  const redo = () => {
    setEditingId(null);
    setHistory((h) => m.redo(h));
  };

  const chooseTool = (next: Tool) => {
    stopEditing();
    setTool(next);
    if (next !== 'select') setSelection(new Set());
  };

  // ---------- 選取列不要擋住選到的東西 ----------

  /** 選取時手指或滑鼠還按著（可能接著拖），等放開再挪 */
  const revealLater = useRef(false);

  /** 選到的東西（或選到的那一格、那條邊）被選取列擋住時，把畫面上下挪開 */
  const revealSelection = () => {
    const viewport = viewportRef.current;
    const bar = viewport?.querySelector<HTMLElement>('.board-selbar');
    if (!viewport || !bar || selected.size !== 1) return;
    const id = [...selected][0];
    const host = viewport.querySelector<HTMLElement>(`[data-el="${id}"]`);
    if (!host) return;
    const part =
      cellSel?.id === id
        ? host.querySelector(`[data-cell="${cellSel.index}"]`)
        : edgeSel?.id === id
          ? host.querySelector(`[data-edge="${edgeSel.index}"]`)
          : null;
    const box = (node: Element): m.Rect => {
      const r = node.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    };
    const dy = m.revealShift(box(part ?? host), box(bar), box(viewport));
    if (dy !== 0) setView((v) => ({ ...v, y: v.y + dy }));
  };

  const selectionKey =
    playIndex === null && tool === 'select'
      ? `${[...selected].join(',')}|${cellSel ? `${cellSel.id}:${cellSel.index}` : ''}|${edgeSel ? `${edgeSel.id}:${edgeSel.index}` : ''}`
      : '';
  const revealOnChange = useEffectEvent(() => {
    if (gesture.current) revealLater.current = true;
    else revealSelection();
  });
  // 選取列畫出來之後、畫面顯示之前就挪好，不會先閃一下被擋住的樣子
  useLayoutEffect(() => {
    if (selectionKey) revealOnChange();
  }, [selectionKey]);

  // ---------- 畫布上的指標事件 ----------

  const eraseAt = (world: m.Point, g: Extract<Gesture, { kind: 'erase' }>) => {
    const hits = m.hitInk(doc, world, 10 / view.zoom, sizes);
    if (hits.length === 0) return;
    const next = m.removeElements(doc, new Set(hits));
    if (!g.erased) {
      g.erased = true;
      setHistory((h) => m.commit(h, next));
    } else {
      setHistory((h) => m.replace(h, next));
    }
  };

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    setDraft(null);
    setSnap(null);
    const r = viewportRect();
    gesture.current = {
      kind: 'pinch',
      startDistance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      startMid: { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top },
      view,
    };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // 輸入框和畫布上的按鈕自己處理；中間按過別的東西，就不算連點兩下
    if (target.closest('input, textarea, button, [data-ui]')) {
      lastTap.current = null;
      return;
    }
    viewportRef.current!.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      startPinch();
      return;
    }
    if (pointers.current.size > 2) return;
    if (playIndex !== null) {
      gesture.current = { kind: 'pan', pointerId: e.pointerId, start: { x: e.clientX, y: e.clientY }, view };
      return;
    }

    const world = toWorld(e.clientX, e.clientY);
    const elId = target.closest<HTMLElement>('[data-el]')?.dataset.el;
    if (editingId && elId !== editingId) stopEditing();
    if (editingId && elId === editingId) return;

    // 拖框框右下角的把手調整大小
    const handleOf = target.closest<HTMLElement>('[data-handle]') ? elId : undefined;
    const handled = handleOf ? m.findElement(doc, handleOf) : undefined;
    if (tool === 'select' && handled?.type === 'shape') {
      gesture.current = { kind: 'resize', pointerId: e.pointerId, id: handled.id, start: world, base: doc, w: handled.w, h: handled.h, moved: false };
      return;
    }

    const connector = tool === 'select' && !elId && !spaceDown.current ? m.hitConnector(doc, world, 8 / view.zoom, sizes) : undefined;
    if (connector) {
      setCellSel(null);
      if (e.shiftKey) {
        const next = new Set(selected);
        if (next.has(connector)) next.delete(connector);
        else next.add(connector);
        setSelection(next);
      } else {
        setSelection(new Set([connector]));
      }
      return;
    }

    const pan = tool === 'hand' || spaceDown.current || e.button === 1;
    if (pan) {
      gesture.current = { kind: 'pan', pointerId: e.pointerId, start: { x: e.clientX, y: e.clientY }, view };
      return;
    }

    // 選取工具在空白處拖曳：框選；按住 Shift 是加選
    if (tool === 'select' && !elId) {
      setCellSel(null);
      setEdgeSel(null);
      if (!e.shiftKey) setSelection(new Set());
      gesture.current = { kind: 'marquee', pointerId: e.pointerId, start: world, base: e.shiftKey ? selected : new Set() };
      return;
    }

    switch (tool) {
      case 'select': {
        if (!elId) return;
        const cellAttr = target.closest<HTMLElement>('[data-cell]')?.dataset.cell;
        const cell = cellAttr === undefined ? undefined : Number(cellAttr);
        // 連點兩下（滑鼠或手指）進入編輯，游標放在點的那一格
        const now = e.timeStamp;
        const tap = lastTap.current;
        if (tap?.id === elId && tap.cell === cell && now - tap.time < 350) {
          lastTap.current = null;
          if (m.findElement(doc, elId)?.type !== 'shape') startEditing(elId, cell);
          return;
        }
        if (e.shiftKey) {
          const next = new Set(selected);
          if (next.has(elId)) next.delete(elId);
          else next.add(elId);
          setSelection(next);
          setCellSel(null);
          return;
        }
        const ids = selected.has(elId) ? selected : new Set([elId]);
        if (!selected.has(elId)) setSelection(ids);
        setCellSel(cell === undefined ? null : { id: elId, index: cell });
        setEdgeSel(null);
        gesture.current = { kind: 'move', pointerId: e.pointerId, start: world, ids, base: doc, moved: false, clicked: elId, cell };
        return;
      }
      case 'pen': {
        const points = m.appendPoint([], world);
        gesture.current = { kind: 'pen', pointerId: e.pointerId, points };
        setDraft({ kind: 'pen', points });
        return;
      }
      case 'eraser': {
        const g = { kind: 'erase' as const, pointerId: e.pointerId, erased: false };
        gesture.current = g;
        eraseAt(world, g);
        return;
      }
      case 'rect':
      case 'ellipse': {
        gesture.current = { kind: 'shape', pointerId: e.pointerId, variant: tool, from: world };
        setDraft({ kind: 'shape', shape: m.shapeFromDrag('draft', tool, world, world, color) });
        return;
      }
      case 'arrow':
      case 'line': {
        const from: m.ArrowEnd = elId ? { id: elId } : { x: Math.round(world.x), y: Math.round(world.y) };
        const head = tool === 'line' ? 'none' : 'end';
        gesture.current = { kind: 'arrow', pointerId: e.pointerId, from, fromPoint: world, head };
        setDraft({ kind: 'arrow', from: world, to: world, head });
        return;
      }
      default:
        return;
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'pinch') {
      const [a, b] = [...pointers.current.values()];
      if (!b) return;
      const r = viewportRect();
      const zoom = clampZoom((g.view.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / g.startDistance);
      const mid = { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top };
      const anchor = { x: (g.startMid.x - g.view.x) / g.view.zoom, y: (g.startMid.y - g.view.y) / g.view.zoom };
      setView({ zoom, x: mid.x - anchor.x * zoom, y: mid.y - anchor.y * zoom });
      return;
    }
    if (g.pointerId !== e.pointerId) return;
    const world = toWorld(e.clientX, e.clientY);
    switch (g.kind) {
      case 'pan':
        setView({ ...g.view, x: g.view.x + e.clientX - g.start.x, y: g.view.y + e.clientY - g.start.y });
        return;
      case 'move': {
        const dx = world.x - g.start.x;
        const dy = world.y - g.start.y;
        if (!g.moved && Math.hypot(dx, dy) * view.zoom < 3) return;
        if (!g.moved) {
          g.moved = true;
          setHistory((h) => m.checkpoint(h));
        }
        const next = m.moveElements(g.base, g.ids, dx, dy);
        setHistory((h) => m.replace(h, next));
        // 拖一個指標時，標出放開後會吸附的格子
        const only = g.ids.size === 1 ? m.findElement(next, [...g.ids][0]) : undefined;
        setSnap(only?.type === 'pointer' ? (m.snapTarget(next, only) ?? null) : null);
        return;
      }
      case 'pen':
        g.points = m.appendPoint(g.points, world);
        setDraft({ kind: 'pen', points: g.points });
        return;
      case 'erase':
        eraseAt(world, g);
        return;
      case 'arrow':
        setDraft({ kind: 'arrow', from: g.fromPoint, to: world, head: g.head });
        return;
      case 'shape':
        setDraft({ kind: 'shape', shape: m.shapeFromDrag('draft', g.variant, g.from, world, color, e.shiftKey) });
        return;
      case 'marquee': {
        const rect = m.rectFromCorners(g.start, world);
        setDraft({ kind: 'marquee', rect });
        setSelection(new Set([...g.base, ...m.elementsInRect(doc, rect, sizes)]));
        return;
      }
      case 'resize': {
        const dx = world.x - g.start.x;
        const dy = world.y - g.start.y;
        if (!g.moved) {
          g.moved = true;
          setHistory((h) => m.checkpoint(h));
        }
        setHistory((h) => m.replace(h, m.resizeShape(g.base, g.id, g.w + dx, g.h + dy)));
        return;
      }
    }
  };

  const finishGesture = (e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'pinch') {
      if (pointers.current.size === 0) gesture.current = null;
      return;
    }
    if (g.pointerId !== e.pointerId) return;
    gesture.current = null;
    setDraft(null);
    setSnap(null);
    const reveal = revealLater.current;
    revealLater.current = false;
    if (cancelled) return;

    switch (g.kind) {
      case 'move':
        if (g.moved) {
          setHistory((h) => {
            let next = h.present;
            for (const id of g.ids) next = m.dropPointer(next, id);
            return m.replace(h, next);
          });
        } else {
          lastTap.current = { id: g.clicked, cell: g.cell, time: e.timeStamp };
          // 選了一群東西時，點其中一個（沒拖動）就只選它；要一起拖就直接拖
          if (g.ids.size > 1) setSelection(new Set([g.clicked]));
          else if (reveal) revealSelection();
        }
        return;
      case 'pen': {
        // 只點一下也留一個點
        const points = g.points.length === 2 ? [...g.points, ...g.points] : g.points;
        apply(m.addElement(doc, { type: 'stroke', id: m.newId(doc), color, points }));
        return;
      }
      case 'shape': {
        const world = toWorld(e.clientX, e.clientY);
        // 只是點一下（沒拖出大小）就不畫
        if (Math.hypot(world.x - g.from.x, world.y - g.from.y) * view.zoom < 6) return;
        const shape = m.shapeFromDrag(m.newId(doc), g.variant, g.from, world, color, e.shiftKey);
        apply(m.addElement(doc, shape));
        setSelection(new Set([shape.id]));
        setTool('select');
        return;
      }
      case 'arrow': {
        const world = toWorld(e.clientX, e.clientY);
        const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-el]')?.dataset.el;
        const to: m.ArrowEnd = hit ? { id: hit } : { x: Math.round(world.x), y: Math.round(world.y) };
        const same = 'id' in g.from && 'id' in to && g.from.id === to.id;
        const tiny = !('id' in g.from) && !('id' in to) && Math.hypot(world.x - g.fromPoint.x, world.y - g.fromPoint.y) < 8;
        if (!same && !tiny) {
          apply(m.addElement(doc, { type: 'arrow', id: m.newId(doc), from: g.from, to, color, ...(g.head === 'none' ? { head: 'none' as const } : {}) }));
        }
        return;
      }
      default:
        return;
    }
  };

  // ---------- 左側元件庫：點一下加到中間，拖曳就放到放開的位置 ----------

  const paletteHandlers = (kind: m.PaletteKind) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0 || playIndex !== null) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      paletteDrag.current = { kind, start: { x: e.clientX, y: e.clientY }, dragging: false };
    },
    onPointerMove: (e: ReactPointerEvent<HTMLButtonElement>) => {
      const d = paletteDrag.current;
      if (!d) return;
      if (!d.dragging && Math.hypot(e.clientX - d.start.x, e.clientY - d.start.y) > 6) d.dragging = true;
      if (d.dragging) setGhost({ kind: d.kind, x: e.clientX, y: e.clientY });
    },
    onPointerUp: (e: ReactPointerEvent<HTMLButtonElement>) => {
      const d = paletteDrag.current;
      paletteDrag.current = null;
      setGhost(null);
      if (!d?.dragging) return;
      // 接下來的 click 是拖曳造成的，不要再加一次
      suppressClick.current = true;
      window.setTimeout(() => (suppressClick.current = false), 0);
      const r = viewportRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        addKind(kind, toWorld(e.clientX, e.clientY));
      }
    },
    onPointerCancel: () => {
      paletteDrag.current = null;
      setGhost(null);
    },
    onClick: () => {
      if (suppressClick.current || playIndex !== null) return;
      addKind(kind);
    },
  });

  // ---------- 鍵盤 ----------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select')) return;
      if (playIndex !== null) {
        if (e.type !== 'keydown' || e.metaKey || e.ctrlKey) return;
        // 焦點在按鈕上時，Enter 和空白鍵交給按鈕
        if (target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return;
        if (e.key === 'ArrowRight') goToStep(playIndex + 1);
        else if (e.key === 'ArrowLeft') goToStep(playIndex - 1);
        else if (e.key === ' ') toggleAutoPlay();
        else if (e.key === 'Escape') exitPlayback();
        else return;
        e.preventDefault();
        return;
      }
      if (e.key === ' ' && !target.closest('button')) {
        spaceDown.current = e.type === 'keydown';
        e.preventDefault();
        return;
      }
      if (e.type !== 'keydown') return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelected();
      } else if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        stopEditing();
        setCellSel(null);
        setTool('select');
        setSelection(new Set(doc.elements.map((el) => el.id)));
      } else if (mod) {
        return;
      } else if (pickedGraph && graphEdge !== undefined && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        deleteEdgeAt(pickedGraph, graphEdge);
      } else if (pickedGraph && graphNode !== undefined && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        deleteGraphNodeAt(pickedGraph, graphNode);
      } else if (pickedGraph && graphNode !== undefined && e.key === 'Enter') {
        e.preventDefault();
        startEditing(pickedGraph.id, graphNode);
      } else if (pickedGraph && graphNode !== undefined && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        // 節點排成一圈：← → 換到前一個、下一個
        e.preventDefault();
        const n = pickedGraph.nodes.length;
        setCellSel({ id: pickedGraph.id, index: (graphNode + (e.key === 'ArrowRight' ? 1 : -1) + n) % n });
      } else if (pickedRec && recNode !== undefined && (e.key === 'Delete' || e.key === 'Backspace')) {
        // 選了遞迴樹的一個呼叫：刪的是這一枝（根節點不刪）
        e.preventDefault();
        deleteCallAt(pickedRec, recNode);
      } else if (pickedRec && recNode !== undefined && e.key === 'Enter') {
        e.preventDefault();
        startEditing(pickedRec.id, recNode);
      } else if (pickedRec && recNode !== undefined && e.key.startsWith('Arrow')) {
        // ← → 照呼叫的順序走，↑ 回到呼叫者，↓ 到第一個子呼叫
        e.preventDefault();
        const next = m.recursionStep(pickedRec, recNode, recursionDirection(e.key));
        if (next !== null) setCellSel({ id: pickedRec.id, index: next });
      } else if (pickedTree && pickedNode !== undefined && (e.key === 'Delete' || e.key === 'Backspace')) {
        // 選了樹的一個節點：刪的是這個子樹，不是整棵樹（根節點不刪）
        e.preventDefault();
        deleteNodeAt(pickedTree, pickedNode);
      } else if (pickedTree && pickedNode !== undefined && e.key === 'Enter') {
        e.preventDefault();
        startEditing(pickedTree.id, pickedNode);
      } else if (pickedTree && pickedNode !== undefined && e.key.startsWith('Arrow')) {
        // ← → 到左右子節點，↑ 回到父節點，↓ 往下走（先左後右）
        e.preventDefault();
        const next = m.treeStep(pickedTree, pickedNode, arrowDirection(e.key));
        if (next !== null) setCellSel({ id: pickedTree.id, index: next });
      } else if (pickedList && pickedIndex !== undefined && (e.key === 'Delete' || e.key === 'Backspace')) {
        // 選了一格：刪的是這一格，不是整個陣列
        e.preventDefault();
        deleteCellAt(pickedList, pickedIndex);
      } else if (pickedList && pickedIndex !== undefined && e.key === 'Enter') {
        e.preventDefault();
        startEditing(pickedList.id, pickedIndex);
      } else if (pickedList && pickedIndex !== undefined && e.key.startsWith('Arrow')) {
        // 方向鍵換格；堆疊是直的，上下換格
        e.preventDefault();
        const forward = pickedList.variant === 'stack' ? 'ArrowUp' : 'ArrowRight';
        const backward = pickedList.variant === 'stack' ? 'ArrowDown' : 'ArrowLeft';
        const step = e.key === forward ? 1 : e.key === backward ? -1 : 0;
        const index = Math.min(Math.max(0, pickedIndex + step), pickedList.items.length - 1);
        setCellSel({ id: pickedList.id, index });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeSelected();
      } else if (e.key === 'Escape') {
        setShowHelp(false);
        setCellSel(null);
        setEdgeSel(null);
        setSelection(new Set());
        setTool('select');
      } else if (e.key === 'Enter' && single && m.isPlaced(single) && single.type !== 'shape') {
        e.preventDefault();
        startEditing(single.id);
      } else if (e.key.startsWith('Arrow') && selected.size > 0) {
        e.preventDefault();
        const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
        const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
        // 吸附在陣列上的指標左右移一格；吸附在樹上的走到子節點或父節點；其他元件移 10
        const target = single?.type === 'pointer' && single.attach ? m.findElement(doc, single.attach.id) : undefined;
        if (target?.type === 'tree') apply(m.stepTreePointer(doc, single!.id, arrowDirection(e.key)));
        else if (target?.type === 'recursion') apply(m.stepRecursionPointer(doc, single!.id, recursionDirection(e.key)));
        // 吸附著的指標用上下鍵不會被拖離
        else if (m.holdsPointers(target)) {
          if (dx !== 0) apply(m.shiftPointer(doc, single!.id, dx));
        } else apply(m.moveElements(doc, selected, dx * 10, dy * 10));
      } else if (e.key === 's') {
        captureCurrentStep();
      } else if (TOOL_KEYS[e.key]) {
        chooseTool(TOOL_KEYS[e.key]);
      } else if (e.key === '+' || e.key === '=') {
        zoomCenter(1.2);
      } else if (e.key === '-') {
        zoomCenter(1 / 1.2);
      } else if (e.key === '0') {
        fitTo(doc, sizes);
      } else if (e.key === '?') {
        setShowHelp((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  });

  // ---------- 畫面 ----------

  // 只有單獨選取時才顯示「＋」格，平常畫面保持乾淨
  const canAdd = (el: m.Placed) => tool === 'select' && selected.size === 1 && selected.has(el.id);
  // 框框畫在最上層，框線才不會被格子的底色蓋住；框裡面點得穿，不會擋到框住的東西
  const shown = shownDoc.elements;
  const placed = [...shown.filter((el) => m.isPlaced(el) && el.type !== 'shape'), ...shown.filter((el) => el.type === 'shape')] as m.Placed[];
  const ink = shown.filter((el): el is m.ElementOf<'arrow'> | m.ElementOf<'stroke'> | m.ElementOf<'range'> => !m.isPlaced(el));
  // 選了同一個陣列上的兩個指標：可以幫它們加範圍框
  const pair = m.rangePair(doc, selected);
  const saving = doc !== savedDoc;
  const grid = 24 * view.zoom;

  return (
    <div className="board" role="dialog" aria-modal="true" aria-label={title} data-playing={playIndex !== null || undefined}>
      <header className="board-head">
        <button type="button" className="btn btn-quiet btn-small" onClick={onClose}>
          {t.board.close}
        </button>
        <div className="board-heading">
          <span className="board-caption">{caption}</span>
          <h1 className="board-title">
            <span>{title}</span>
            {difficulty && <DifficultyTag difficulty={difficulty} />}
          </h1>
        </div>
        {/* 說清楚存在哪裡：沒登入只在這台裝置，登入後會同步到雲端 */}
        <span className="board-save" aria-live="polite">
          {tooLarge ? t.board.tooLarge : saving ? t.board.saving : signedIn ? t.board.savedSynced : t.board.savedLocal}
        </span>
        <button
          type="button"
          className="btn btn-small board-export"
          disabled={shownDoc.elements.length === 0}
          aria-label={t.board.export}
          title={t.board.export}
          onClick={() => void exportImage()}
        >
          {ICON_EXPORT}
          <span className="board-export-text">{t.board.export}</span>
        </button>
      </header>

      <div className="board-body">
        <aside className="board-palette" aria-label={t.board.palette}>
          <p className="board-palette-hint">{t.board.paletteHint}</p>
          <section className="board-palette-group board-templates" aria-label={t.board.groups.templates}>
            <h2>{t.board.groups.templates}</h2>
            <div className="board-template-items">
              {TEMPLATES.map((kind) => (
                <button key={kind} type="button" className="board-template" title={t.board.templates[kind].hint} onClick={() => addTemplate(kind)}>
                  <span className="board-palette-icon" aria-hidden>
                    <Icon>{TEMPLATE_ICONS[kind]}</Icon>
                  </span>
                  <span className="board-template-text">
                    <span className="board-template-name">{t.board.templates[kind].name}</span>
                    <span className="board-template-hint">{t.board.templates[kind].hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
          {m.PALETTE.map(({ group, kinds }) => (
            <section key={group} className="board-palette-group" aria-label={t.board.groups[group]}>
              <h2>{t.board.groups[group]}</h2>
              <div className="board-palette-items">
                {kinds.map((kind) => (
                  <button key={kind} type="button" className="board-palette-item" {...paletteHandlers(kind)}>
                    <span className="board-palette-icon" aria-hidden data-kind={kind}>
                      <Icon>{PALETTE_ICONS[kind]}</Icon>
                    </span>
                    {t.board.kinds[kind]}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </aside>

        <div
          ref={viewportRef}
          className="board-viewport"
          data-tool={tool}
          role="region"
          aria-label={t.board.canvasLabel}
          style={{ backgroundSize: `${grid}px ${grid}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => finishGesture(e, false)}
          onPointerCancel={(e) => finishGesture(e, true)}
        >
          <div className="board-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
            {placed.map((el) => (
              <ElementView
                key={el.id}
                el={el}
                doc={shownDoc}
                selected={selected.has(el.id)}
                editing={editingId === el.id}
                snapIndex={snap?.id === el.id ? snap.index : undefined}
                cellIndex={
                  pickedList?.id === el.id
                    ? pickedIndex
                    : pickedTree?.id === el.id
                      ? pickedNode
                      : pickedGraph?.id === el.id
                        ? graphNode
                        : pickedRec?.id === el.id
                          ? recNode
                          : undefined
                }
                edgeIndex={pickedGraph?.id === el.id ? graphEdge : undefined}
                onAddNode={canAdd(el) && el.type === 'graph' ? () => addGraphNodeTo(el) : undefined}
                onPickEdge={canAdd(el) && el.type === 'graph' ? (index) => pickEdge(el, index) : undefined}
                focusIndex={editingId === el.id ? editFocus : undefined}
                onAddCell={canAdd(el) && el.type === 'list' ? () => insertCellAt(el, el.items.length) : undefined}
                onToggleLink={canAdd(el) && m.isLinked(el) ? (gap) => toggleLinkAt(el, gap) : undefined}
                onAddChild={canAdd(el) && el.type === 'tree' ? (index) => addChildAt(el, index) : undefined}
                onAddCall={canAdd(el) && el.type === 'recursion' ? (parent) => addCallAt(el, parent) : undefined}
                onAddRow={canAdd(el) && el.type === 'table' ? () => apply(m.resizeTable(doc, el.id, 'row', 1)) : undefined}
                onAddCol={canAdd(el) && el.type === 'table' ? () => apply(m.resizeTable(doc, el.id, 'col', 1)) : undefined}
                register={register}
                onChange={(patch) => editElement(el.id, patch)}
                onDoneEditing={stopEditing}
              />
            ))}
            <svg className="board-ink" aria-hidden>
              <defs>
                {BOARD_COLORS.map((c) => (
                  <marker key={c} id={`board-head-${c}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0 0L10 5L0 10z" fill={m.colorVar(c)} />
                  </marker>
                ))}
              </defs>
              {ink.map((el) => {
                if (el.type === 'range') {
                  const r = m.rangeRect(shownDoc, el);
                  if (!r) return null;
                  return (
                    <g key={el.id}>
                      {selected.has(el.id) && <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={8} className="board-range-selected" />}
                      <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={8} stroke={m.colorVar(el.color)} className="board-range" data-range={el.id} />
                    </g>
                  );
                }
                if (el.type === 'stroke') {
                  return (
                    <g key={el.id}>
                      {selected.has(el.id) && <path d={strokePath(el.points)} className="board-stroke-selected" />}
                      <path d={strokePath(el.points)} stroke={m.colorVar(el.color)} className="board-stroke" />
                    </g>
                  );
                }
                const ends = m.arrowPoints(shownDoc, el, sizes);
                if (!ends) return null;
                return (
                  <g key={el.id}>
                    {selected.has(el.id) && (
                      <line x1={ends[0].x} y1={ends[0].y} x2={ends[1].x} y2={ends[1].y} className="board-arrow-selected" />
                    )}
                    <line
                      x1={ends[0].x}
                      y1={ends[0].y}
                      x2={ends[1].x}
                      y2={ends[1].y}
                      stroke={m.colorVar(el.color)}
                      className="board-arrow"
                      markerEnd={el.head === 'none' ? undefined : `url(#board-head-${el.color})`}
                    />
                  </g>
                );
              })}
              {draft?.kind === 'pen' && <path d={strokePath(draft.points)} stroke={m.colorVar(color)} className="board-stroke" />}
              {draft?.kind === 'marquee' && (
                <rect className="board-marquee" x={draft.rect.x} y={draft.rect.y} width={draft.rect.w} height={draft.rect.h} />
              )}
              {draft?.kind === 'shape' &&
                (draft.shape.variant === 'rect' ? (
                  <rect
                    className="board-shape-draft"
                    x={draft.shape.x}
                    y={draft.shape.y}
                    width={draft.shape.w}
                    height={draft.shape.h}
                    rx={8}
                    stroke={m.colorVar(color)}
                  />
                ) : (
                  <ellipse
                    className="board-shape-draft"
                    cx={draft.shape.x + draft.shape.w / 2}
                    cy={draft.shape.y + draft.shape.h / 2}
                    rx={draft.shape.w / 2}
                    ry={draft.shape.h / 2}
                    stroke={m.colorVar(color)}
                  />
                ))}
              {draft?.kind === 'arrow' && (
                <line
                  x1={draft.from.x}
                  y1={draft.from.y}
                  x2={draft.to.x}
                  y2={draft.to.y}
                  stroke={m.colorVar(color)}
                  className="board-arrow board-arrow-draft"
                  markerEnd={draft.head === 'none' ? undefined : `url(#board-head-${color})`}
                />
              )}
            </svg>
          </div>

          {playIndex === null && doc.elements.length === 0 && <p className="board-empty">{t.board.empty}</p>}

          {playIndex === null && (
            <StepsWidget
              count={steps.length}
              full={steps.length >= m.MAX_STEPS}
              onCapture={captureCurrentStep}
              onPlay={() => startPlayback(0)}
            />
          )}

          {playIndex !== null && (
            <PlaybackBar
              steps={steps}
              index={playIndex}
              autoPlay={autoPlay}
              onGo={goToStep}
              onToggleAuto={toggleAutoPlay}
              onExit={exitPlayback}
              onRestore={restoreFromStep}
              onDelete={deleteCurrentStep}
              onCaptionStart={() => setHistory((h) => m.checkpoint(h))}
              onCaption={(caption) => setHistory((h) => m.replace(h, m.setStepCaption(h.present, playIndex, caption)))}
              onCaptionEnd={() => setHistory((h) => m.dropEmptyCheckpoint(h))}
            />
          )}

          {playIndex === null && tool === 'select' && selected.size > 0 && (
            <div className="board-selbar" role="toolbar" aria-label={t.board.selectionLabel} data-ui>
              {pickedGraph && graphEdge !== undefined ? (
                <EdgeActions
                  key={`${pickedGraph.id}:${graphEdge}`}
                  graph={pickedGraph}
                  index={graphEdge}
                  onChange={(patch) => apply(m.updateGraphEdge(doc, pickedGraph.id, graphEdge, patch))}
                  onDelete={() => deleteEdgeAt(pickedGraph, graphEdge)}
                />
              ) : pickedGraph && graphNode !== undefined ? (
                <GraphNodeActions
                  graph={pickedGraph}
                  index={graphNode}
                  onColor={(color) => apply(m.setGraphColor(doc, pickedGraph.id, graphNode, color))}
                  onAddPointer={() => addPointerOn(pickedGraph, graphNode)}
                  onConnect={(to) => apply(m.addGraphEdge(doc, pickedGraph.id, graphNode, to))}
                  onDelete={() => deleteGraphNodeAt(pickedGraph, graphNode)}
                />
              ) : pickedRec && recNode !== undefined ? (
                <RecursionNodeActions
                  key={`${pickedRec.id}:${recNode}`}
                  tree={pickedRec}
                  index={recNode}
                  onChange={(patch) => apply(m.updateRecursionNode(doc, pickedRec.id, recNode, patch))}
                  onAddChild={() => addCallAt(pickedRec, recNode)}
                  onAddPointer={() => addPointerOn(pickedRec, recNode)}
                  onDelete={() => deleteCallAt(pickedRec, recNode)}
                />
              ) : pickedTree && pickedNode !== undefined ? (
                <NodeActions
                  tree={pickedTree}
                  index={pickedNode}
                  onColor={(color) => apply(m.setNodeColor(doc, pickedTree.id, pickedNode, color))}
                  onAddPointer={() => addPointerOn(pickedTree, pickedNode)}
                  onAddChild={(index) => addChildAt(pickedTree, index)}
                  onDelete={() => deleteNodeAt(pickedTree, pickedNode)}
                />
              ) : pickedList && pickedIndex !== undefined ? (
                <CellActions
                  list={pickedList}
                  index={pickedIndex}
                  onColor={(color) => apply(m.setCellColor(doc, pickedList.id, pickedIndex, color))}
                  onAddPointer={() => addPointerOn(pickedList, pickedIndex)}
                  onInsert={(index) => insertCellAt(pickedList, index)}
                  onDelete={() => deleteCellAt(pickedList, pickedIndex)}
                  onCycle={(index) => apply(m.setCycle(doc, pickedList.id, index))}
                />
              ) : (
                <>
                  {selected.size > 1 && <span className="board-selbar-title">{t.board.selectedCount(selected.size)}</span>}
                  {pair && (
                    <button type="button" className="btn btn-small" onClick={() => frameBetween(pair)}>
                      {t.board.actions.frameBetween}
                    </button>
                  )}
                  {single && <SelectionActions key={single.id} el={single} doc={doc} sizes={sizes} apply={apply} onEdit={() => startEditing(single.id)} />}
                  {/* 箭頭和範圍框要連著的東西一起選才複製得出來 */}
                  {[...selected].some((id) => !['arrow', 'range'].includes(m.findElement(doc, id)?.type ?? '')) && (
                    <button type="button" className="btn btn-small" onClick={duplicateSelected}>
                      {t.board.actions.duplicate}
                    </button>
                  )}
                  <button type="button" className="btn btn-small btn-danger" onClick={removeSelected}>
                    {t.board.actions.delete}
                  </button>
                </>
              )}
            </div>
          )}

          {/* 播放時下方換成播放列 */}
          {playIndex === null && (
            <div className="board-tools" role="toolbar" aria-label={t.board.toolbarLabel} data-ui>
              {TOOLS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="board-tool"
                  aria-pressed={tool === id}
                  aria-label={t.board.tools[id]}
                  title={t.board.tools[id]}
                  onClick={() => chooseTool(id)}
                >
                  {TOOL_ICONS[id]}
                </button>
              ))}
              <span className="board-tools-sep" aria-hidden />
              <span className="board-colors" data-open={colorsOpen || undefined}>
                {BOARD_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="board-swatch"
                    aria-pressed={color === c}
                    aria-label={t.board.colors[c]}
                    title={t.board.colors[c]}
                    style={{ color: m.colorVar(c) }}
                    onClick={() => pickColor(c)}
                  />
                ))}
              </span>
              <span className="board-tools-sep" aria-hidden />
              <button type="button" className="board-tool" aria-label={t.board.undo} title={t.board.undo} disabled={history.past.length === 0} onClick={undo}>
                {ICON_UNDO}
              </button>
              <button type="button" className="board-tool" aria-label={t.board.redo} title={t.board.redo} disabled={history.future.length === 0} onClick={redo}>
                {ICON_REDO}
              </button>
              <span className="board-tools-sep" aria-hidden />
              <button
                type="button"
                className="board-tool board-tool-danger"
                aria-label={t.board.clear}
                title={t.board.clear}
                disabled={doc.elements.length === 0}
                onClick={() => setConfirmClear(true)}
              >
                {ICON_CLEAR}
              </button>
            </div>
          )}

          <div className="board-zoom" data-ui>
            <button type="button" className="board-tool board-zoom-in" aria-label={t.board.zoomIn} title={t.board.zoomIn} onClick={() => zoomCenter(1.2)}>
              +
            </button>
            <button
              type="button"
              className="board-zoom-value"
              aria-label={t.board.zoomReset}
              title={t.board.zoomReset}
              onClick={() => zoomCenter(1 / view.zoom)}
            >
              {Math.round(view.zoom * 100)}%
            </button>
            <button type="button" className="board-tool board-zoom-out" aria-label={t.board.zoomOut} title={t.board.zoomOut} onClick={() => zoomCenter(1 / 1.2)}>
              −
            </button>
            <button type="button" className="board-tool" aria-label={t.board.fit} title={t.board.fit} onClick={() => fitTo(doc, sizes)}>
              {ICON_FIT}
            </button>
            <button type="button" className="board-tool" aria-label={t.board.help} title={t.board.help} aria-expanded={showHelp} onClick={() => setShowHelp((v) => !v)}>
              ?
            </button>
          </div>

          {showHelp && (
            <div className="board-help" data-ui>
              <h2>{t.board.help}</h2>
              <ul>
                {t.board.shortcuts.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title={t.board.clearTitle}
        footer={
          <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={() => setConfirmClear(false)}>
              {t.common.cancel}
            </button>
            <button type="button" className="btn btn-danger" onClick={clearBoard}>
              {t.board.clearConfirm}
            </button>
          </div>
        }
      >
        <p>{t.board.clearBody}</p>
      </Dialog>

      {ghost && (
        <div className="board-ghost" style={{ left: ghost.x, top: ghost.y }} aria-hidden>
          {t.board.kinds[ghost.kind]}
        </div>
      )}
    </div>
  );
}

interface CellActionsProps {
  list: m.ElementOf<'list'>;
  index: number;
  onColor: (color: CellColor | null) => void;
  onAddPointer: () => void;
  onInsert: (index: number) => void;
  onDelete: () => void;
  /** 鏈結串列：尾巴接回這一格；undefined 是拿掉環 */
  onCycle: (index: number | undefined) => void;
}

/** 底色選擇：不上色和六種顏色 */
function CellColors({ current, onColor }: { current: CellColor | null; onColor: (color: CellColor | null) => void }) {
  const { t } = useI18n();
  return (
    <span className="board-cell-colors" role="group" aria-label={t.board.cellColor}>
      <button
        type="button"
        className="board-cell-swatch"
        data-color="none"
        aria-label={t.board.cellColors.none}
        title={t.board.cellColors.none}
        aria-pressed={current === null}
        onClick={() => onColor(null)}
      />
      {CELL_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className="board-cell-swatch"
          data-color={color}
          aria-label={t.board.cellColors[color]}
          title={t.board.cellColors[color]}
          aria-pressed={current === color}
          onClick={() => onColor(color)}
        />
      ))}
    </span>
  );
}

/** 選了陣列的一格：上底色、在這格加指標、在旁邊插入、刪掉這格；鏈結串列還可以讓尾巴接回這裡 */
function CellActions({ list, index, onColor, onAddPointer, onInsert, onDelete, onCycle }: CellActionsProps) {
  const { t } = useI18n();
  const a = t.board.actions;
  // 堆疊是直的：index 越大越上面
  const vertical = list.variant === 'stack';
  return (
    <>
      <span className="board-selbar-title">{list.variant === 'linked' ? t.board.nodeLabel(list.items[index]) : t.board.cellLabel(index)}</span>
      <CellColors current={list.colors?.[index] ?? null} onColor={onColor} />
      {list.variant === 'linked' && (
        <button type="button" className="btn btn-small" onClick={() => onCycle(list.cycle === index ? undefined : index)}>
          {list.cycle === index ? a.removeCycle : a.cycleHere}
        </button>
      )}
      {m.holdsPointers(list) && (
        <button type="button" className="btn btn-small" onClick={onAddPointer}>
          {a.addPointer}
        </button>
      )}
      <button type="button" className="btn btn-small" onClick={() => onInsert(vertical ? index + 1 : index)}>
        {vertical ? a.insertAbove : a.insertLeft}
      </button>
      <button type="button" className="btn btn-small" onClick={() => onInsert(vertical ? index : index + 1)}>
        {vertical ? a.insertBelow : a.insertRight}
      </button>
      <button type="button" className="btn btn-small btn-danger" disabled={list.items.length <= 1} onClick={onDelete}>
        {a.deleteCell}
      </button>
    </>
  );
}

interface NodeActionsProps {
  tree: m.ElementOf<'tree'>;
  index: number;
  onColor: (color: CellColor | null) => void;
  onAddPointer: () => void;
  /** 參數是新子節點的位置 */
  onAddChild: (index: number) => void;
  onDelete: () => void;
}

/** 選了二元樹的一個節點：上底色、加指標、加左右子節點、刪掉這個子樹 */
function NodeActions({ tree, index, onColor, onAddPointer, onAddChild, onDelete }: NodeActionsProps) {
  const { t } = useI18n();
  const a = t.board.actions;
  const left = 2 * index + 1;
  const right = 2 * index + 2;
  const canAdd = (child: number) => child < m.TREE_MAX_NODES && !m.hasTreeNode(tree, child);
  return (
    <>
      <span className="board-selbar-title">{t.board.nodeLabel(tree.nodes[index] ?? '')}</span>
      <CellColors current={tree.colors?.[index] ?? null} onColor={onColor} />
      <button type="button" className="btn btn-small" onClick={onAddPointer}>
        {a.addPointer}
      </button>
      <button type="button" className="btn btn-small" disabled={!canAdd(left)} onClick={() => onAddChild(left)}>
        {a.addLeftChild}
      </button>
      <button type="button" className="btn btn-small" disabled={!canAdd(right)} onClick={() => onAddChild(right)}>
        {a.addRightChild}
      </button>
      <button type="button" className="btn btn-small btn-danger" disabled={index === 0} onClick={onDelete}>
        {a.deleteSubtree}
      </button>
    </>
  );
}

interface RecursionNodeActionsProps {
  tree: m.ElementOf<'recursion'>;
  index: number;
  onChange: (patch: m.RecursionPatch) => void;
  onAddChild: () => void;
  onAddPointer: () => void;
  onDelete: () => void;
}

/** 選了遞迴樹的一個呼叫：上底色、加子呼叫、寫回傳值和上面那條邊的字、剪掉這枝、加指標、刪除 */
function RecursionNodeActions({ tree, index, onChange, onAddChild, onAddPointer, onDelete }: RecursionNodeActionsProps) {
  const { t } = useI18n();
  const a = t.board.actions;
  const r = t.board.recursion;
  const node = tree.nodes[index];
  const canAdd = m.addRecursionChild({ elements: [tree] }, tree.id, index) !== null;
  return (
    <>
      <span className="board-selbar-title">{t.board.nodeLabel(node.text)}</span>
      <CellColors current={node.color ?? null} onColor={(color) => onChange({ color })} />
      <button type="button" className="btn btn-small" disabled={!canAdd} title={canAdd ? undefined : r.full} onClick={onAddChild}>
        {r.addCall}
      </button>
      <SelbarField key={`ret:${node.ret ?? ''}`} label={r.ret} value={node.ret ?? ''} onCommit={(ret) => onChange({ ret })} />
      {index > 0 && <SelbarField key={`edge:${node.edge ?? ''}`} label={r.edge} value={node.edge ?? ''} onCommit={(edge) => onChange({ edge })} />}
      {index > 0 && (
        <button type="button" className="btn btn-small" aria-pressed={!!node.cut} onClick={() => onChange({ cut: !node.cut })}>
          {node.cut ? r.uncut : r.cut}
        </button>
      )}
      <button type="button" className="btn btn-small" onClick={onAddPointer}>
        {a.addPointer}
      </button>
      <button type="button" className="btn btn-small btn-danger" disabled={index === 0} onClick={onDelete}>
        {a.deleteSubtree}
      </button>
    </>
  );
}

/** 選取列上的小輸入框：按 Enter 或離開時才寫進白板，一次一筆復原紀錄 */
function SelbarField({ label, value, onCommit }: { label: string; value: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const commit = () => {
    if (draft.trim() !== value) onCommit(draft.trim());
  };
  return (
    <input
      className="input board-weight board-rec-field"
      value={draft}
      aria-label={label}
      placeholder={label}
      maxLength={12}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') commit();
      }}
    />
  );
}

interface GraphNodeActionsProps {
  graph: m.ElementOf<'graph'>;
  index: number;
  onColor: (color: CellColor | null) => void;
  onAddPointer: () => void;
  onConnect: (to: number) => void;
  onDelete: () => void;
}

/** 選了圖的一個節點：上底色、加指標、連到別的節點、刪掉它 */
function GraphNodeActions({ graph, index, onColor, onAddPointer, onConnect, onDelete }: GraphNodeActionsProps) {
  const { t } = useI18n();
  const a = t.board.actions;
  const connected = (to: number) => graph.edges.some((e) => (e.a === index && e.b === to) || (!graph.directed && e.a === to && e.b === index));
  const targets = graph.nodes.map((_, i) => i).filter((i) => i !== index && !connected(i));
  return (
    <>
      <span className="board-selbar-title">{t.board.nodeLabel(graph.nodes[index])}</span>
      <CellColors current={graph.colors?.[index] ?? null} onColor={onColor} />
      <button type="button" className="btn btn-small" onClick={onAddPointer}>
        {a.addPointer}
      </button>
      {targets.length > 0 && graph.edges.length < m.GRAPH_MAX_EDGES && (
        <select
          className="select board-connect"
          aria-label={a.connectTo}
          value=""
          onChange={(e) => {
            if (e.target.value !== '') onConnect(Number(e.target.value));
          }}
        >
          <option value="">{a.connectTo}</option>
          {targets.map((i) => (
            <option key={i} value={i}>
              {graph.nodes[i]}
            </option>
          ))}
        </select>
      )}
      <button type="button" className="btn btn-small btn-danger" disabled={graph.nodes.length <= 1} onClick={onDelete}>
        {a.deleteNode}
      </button>
    </>
  );
}

interface EdgeActionsProps {
  graph: m.ElementOf<'graph'>;
  index: number;
  onChange: (patch: { w?: string; mark?: boolean }) => void;
  onDelete: () => void;
}

/** 選了圖的一條邊：標記走過、寫權重、刪掉它 */
function EdgeActions({ graph, index, onChange, onDelete }: EdgeActionsProps) {
  const { t } = useI18n();
  const a = t.board.actions;
  const edge = graph.edges[index];
  const [weight, setWeight] = useState(edge.w ?? '');
  const commitWeight = () => {
    if (weight.trim() !== (edge.w ?? '')) onChange({ w: weight.trim() });
  };
  return (
    <>
      <span className="board-selbar-title">{t.board.edgeLabel(graph.nodes[edge.a], graph.nodes[edge.b], !!graph.directed)}</span>
      <button type="button" className="btn btn-small" aria-pressed={!!edge.mark} onClick={() => onChange({ mark: !edge.mark })}>
        {edge.mark ? a.unmarkEdge : a.markEdge}
      </button>
      <input
        className="input board-weight"
        value={weight}
        aria-label={t.board.edgeWeight}
        placeholder={t.board.edgeWeight}
        maxLength={12}
        onChange={(e) => setWeight(e.target.value)}
        onBlur={commitWeight}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') commitWeight();
        }}
      />
      <button type="button" className="btn btn-small btn-danger" onClick={onDelete}>
        {a.deleteEdge}
      </button>
    </>
  );
}

/** 鏈結串列和二元樹：貼題目的範例直接建立 */
interface StructureTextFormProps {
  el: TextElement;
  doc: m.BoardDoc;
  sizes: m.Sizes;
  apply: (doc: m.BoardDoc) => void;
  onClose: () => void;
}

function StructureTextForm({ el, doc, sizes, apply, onClose }: StructureTextFormProps) {
  const { t } = useI18n();
  const s = t.board.structureText;
  const [text, setText] = useState(() => structureText(el));
  const [error, setError] = useState('');
  // 遞迴樹一行一個呼叫：Enter 換行，Ctrl+Enter 套用
  const outline = el.type === 'recursion';
  const field = {
    value: text,
    'aria-label': s.label,
    placeholder: textPlaceholder(el, s),
    autoFocus: true,
    spellCheck: false,
  };
  const onTextChange = (value: string) => {
    setText(value);
    setError('');
  };
  return (
    <form
      className="board-text-form"
      onSubmit={(e) => {
        e.preventDefault();
        const result = applyStructureText(doc, el.id, text);
        if ('error' in result) {
          setError(s.errors[result.error]);
          return;
        }
        apply(m.settleElement(result.doc, el.id, sizes));
        onClose();
      }}
    >
      {outline ? (
        <textarea
          {...field}
          className="input board-text-outline"
          rows={Math.min(12, Math.max(5, text.split('\n').length + 1))}
          maxLength={6000}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
      ) : (
        <input
          {...field}
          className="input"
          maxLength={2000}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') onClose();
          }}
        />
      )}
      <button type="submit" className="btn btn-small btn-primary">
        {t.board.actions.applyText}
      </button>
      <button type="button" className="btn btn-small btn-quiet" onClick={onClose}>
        {t.common.cancel}
      </button>
      {error && (
        <span className="board-text-error" role="alert">
          {error}
        </span>
      )}
    </form>
  );
}

/** 「用文字建立」的輸入框提示：依元件種類舉例 */
function textPlaceholder(el: TextElement, s: ReturnType<typeof useI18n>['t']['board']['structureText']): string {
  switch (el.type) {
    case 'tree':
      return s.tree;
    case 'graph':
      return s.graph;
    case 'recursion':
      return s.recursion;
    case 'table':
      return el.variant === 'dict' ? s.dict : s.grid;
    case 'list':
      return el.variant === 'linked' ? s.linked : s.list;
  }
}

/** 選了一個元件時，依種類多出來的操作 */
interface SelectionActionsProps {
  el: m.BoardElement;
  doc: m.BoardDoc;
  sizes: m.Sizes;
  apply: (doc: m.BoardDoc) => void;
  onEdit: () => void;
}

function SelectionActions({ el, doc, sizes, apply, onEdit }: SelectionActionsProps) {
  const { t } = useI18n();
  const a = t.board.actions;
  const r = t.board.recursion;
  const [writing, setWriting] = useState(false);
  const buttons: [string, () => void][] = [];
  const structure = acceptsText(el) ? el : undefined;
  const heapControls = m.isHeap(el) && !writing ? <HeapActions key={el.id} el={el} doc={doc} apply={apply} /> : null;
  if (structure && writing) return <StructureTextForm el={structure} doc={doc} sizes={sizes} apply={apply} onClose={() => setWriting(false)} />;
  if (structure) buttons.push([a.fromText, () => setWriting(true)]);
  if (el.type === 'graph') {
    buttons.push([el.directed ? a.makeUndirected : a.makeDirected, () => apply(m.setDirected(doc, el.id, !el.directed))]);
  }
  if (el.type === 'recursion') {
    buttons.push([el.repeats ? r.repeatsOff : r.repeatsOn, () => apply(m.setRepeats(doc, el.id, !el.repeats))]);
  }
  if (m.isPlaced(el) && el.type !== 'shape') buttons.push([a.edit, onEdit]);
  // 元件庫只有「文字」，選取後可以切換成標題
  if (el.type === 'text' && (el.variant === 'text' || el.variant === 'heading')) {
    const heading = el.variant === 'heading';
    buttons.push([
      heading ? a.makeBody : a.makeHeading,
      () => apply(m.updateElement<m.ElementOf<'text'>>(doc, el.id, { variant: heading ? 'text' : 'heading' })),
    ]);
  }
  // 加格子、加列、加欄用元件旁邊的「＋」；陣列刪格子先點那一格
  if (el.type === 'table') {
    buttons.push([a.removeRow, () => apply(m.resizeTable(doc, el.id, 'row', -1))], [a.removeCol, () => apply(m.resizeTable(doc, el.id, 'col', -1))]);
  }
  if (el.type === 'arrow') {
    const plain = el.head === 'none';
    buttons.push([plain ? a.makeArrow : a.makeLine, () => apply(m.setArrowHead(doc, el.id, plain ? 'end' : 'none'))]);
  }
  const attachedTo = el.type === 'pointer' && el.attach ? m.findElement(doc, el.attach.id)?.type : undefined;
  if (el.type === 'pointer' && attachedTo === 'tree') {
    buttons.push(
      [a.pointerToParent, () => apply(m.stepTreePointer(doc, el.id, 'up'))],
      [a.pointerToLeft, () => apply(m.stepTreePointer(doc, el.id, 'left'))],
      [a.pointerToRight, () => apply(m.stepTreePointer(doc, el.id, 'right'))],
    );
  } else if (el.type === 'pointer' && attachedTo === 'recursion') {
    // 照呼叫的順序走，追蹤 DFS 跑到哪裡
    buttons.push(
      [r.prevCall, () => apply(m.stepRecursionPointer(doc, el.id, 'prev'))],
      [r.nextCall, () => apply(m.stepRecursionPointer(doc, el.id, 'next'))],
      [r.toCaller, () => apply(m.stepRecursionPointer(doc, el.id, 'up'))],
    );
  } else if (el.type === 'pointer' && el.attach) {
    buttons.push([a.pointerLeft, () => apply(m.shiftPointer(doc, el.id, -1))], [a.pointerRight, () => apply(m.shiftPointer(doc, el.id, 1))]);
  }
  return (
    <>
      {heapControls}
      {buttons.map(([label, onClick]) => (
        <button key={label} type="button" className="btn btn-small" onClick={onClick}>
          {label}
        </button>
      ))}
    </>
  );
}

/** 堆積：push、pop、heapify，切換最小堆／最大堆和畫法；可以把每一次交換記成逐步播放 */
function HeapActions({ el, doc, apply }: { el: m.ElementOf<'list'>; doc: m.BoardDoc; apply: (doc: m.BoardDoc) => void }) {
  const { t } = useI18n();
  const h = t.board.heap;
  const toast = useToast();
  const [value, setValue] = useState('');
  const [record, setRecord] = useState(false);
  const run = (steps: m.HeapStep[]) => {
    if (steps.length === 0) return;
    apply(record ? m.recordHeapSteps(doc, steps) : steps[steps.length - 1].doc);
  };
  const full = el.items.length >= m.HEAP_MAX;
  const view = el.view ?? 'both';
  return (
    <>
      <form
        className="board-heap-push"
        onSubmit={(e) => {
          e.preventDefault();
          if (!value.trim() || full) return;
          run(m.heapPush(doc, el.id, value.trim()));
          setValue('');
        }}
      >
        <input
          className="input board-weight"
          value={value}
          aria-label={h.value}
          placeholder={h.value}
          maxLength={40}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
        />
        <button type="submit" className="btn btn-small" disabled={!value.trim() || full} title={full ? h.full : undefined}>
          {h.push}
        </button>
      </form>
      <button
        type="button"
        className="btn btn-small"
        disabled={el.items.length === 0}
        onClick={() => {
          const popped = m.heapPop(doc, el.id);
          if (!popped) return;
          run(popped.steps);
          toast(h.popped(popped.value));
        }}
      >
        {h.pop}
      </button>
      <button type="button" className="btn btn-small" disabled={m.heapViolations(el).size === 0} onClick={() => run(m.heapify(doc, el.id))}>
        {h.heapify}
      </button>
      <button type="button" className="btn btn-small" onClick={() => apply(m.setHeapOrder(doc, el.id, el.order === 'max' ? 'min' : 'max'))}>
        {el.order === 'max' ? h.makeMin : h.makeMax}
      </button>
      <button type="button" className="btn btn-small" title={h.viewHint} onClick={() => apply(m.cycleHeapView(doc, el.id))}>
        {h.views[view]}
      </button>
      <label className="board-heap-record">
        <input type="checkbox" checked={record} onChange={(e) => setRecord(e.target.checked)} />
        {h.record}
      </label>
    </>
  );
}

/** 在二元樹上，方向鍵對應的走法 */
function arrowDirection(key: string): m.TreeDirection {
  return key === 'ArrowLeft' ? 'left' : key === 'ArrowRight' ? 'right' : key === 'ArrowUp' ? 'up' : 'down';
}

/** 在遞迴樹上：← → 照呼叫的順序走，↑ 回到呼叫者，↓ 到第一個子呼叫 */
function recursionDirection(key: string): m.RecursionDirection {
  return key === 'ArrowLeft' ? 'prev' : key === 'ArrowRight' ? 'next' : key === 'ArrowUp' ? 'up' : 'down';
}

/** 用 canvas 量文字寬度，匯出時換行和截斷才跟畫面一致 */
function canvasMeasure(): Measure {
  const context = document.createElement('canvas').getContext('2d');
  return (value, font) => {
    if (!context) return estimateWidth(value, font);
    context.font = font;
    return context.measureText(value).width;
  };
}

/** SVG 畫到 canvas 上轉成 PNG；兩倍解析度，但邊長不超過瀏覽器 canvas 的上限 */
async function svgToPng(svg: string, width: number, height: number): Promise<Blob> {
  const scale = Math.min(2, 8000 / Math.max(width, height));
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');
  context.scale(scale, scale);
  context.drawImage(image, 0, 0, width, height);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))), 'image/png'));
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 讓元件的中心落在 at */
function centered(el: m.Placed, at: m.Point): m.Point {
  const { w, h } = m.sizeOf(el);
  return { x: Math.round(at.x - w / 2), y: Math.round(at.y - h / 2) };
}

function strokePath(points: number[]): string {
  if (points.length < 2) return '';
  let d = `M${points[0]} ${points[1]}`;
  for (let i = 2; i + 1 < points.length; i += 2) d += `L${points[i]} ${points[i + 1]}`;
  return d;
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

const TOOL_ICONS: Record<Tool, ReactNode> = {
  select: (
    <Icon>
      <path d="M5 3l14 8-6 2-2 6z" />
    </Icon>
  ),
  hand: (
    <Icon>
      <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12m0-1V4.5a1.5 1.5 0 0 1 3 0V12m0-6.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.6-2.2L3 16.5a1.6 1.6 0 0 1 2.4-2l2.6 2.4" />
    </Icon>
  ),
  arrow: (
    <Icon>
      <path d="M5 19L19 5M11 5h8v8" />
    </Icon>
  ),
  line: (
    <Icon>
      <path d="M5 19L19 5" />
    </Icon>
  ),
  rect: (
    <Icon>
      <rect x="4" y="6" width="16" height="12" rx="2" />
    </Icon>
  ),
  ellipse: (
    <Icon>
      <ellipse cx="12" cy="12" rx="8.5" ry="6.5" />
    </Icon>
  ),
  pen: (
    <Icon>
      <path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3" />
    </Icon>
  ),
  eraser: (
    <Icon>
      <path d="M9 20h11M5.5 15.5l9-9a2 2 0 0 1 2.8 0l1.2 1.2a2 2 0 0 1 0 2.8L11 18H8z" />
    </Icon>
  ),
};

const ICON_UNDO = (
  <Icon>
    <path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
  </Icon>
);

const ICON_REDO = (
  <Icon>
    <path d="M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" />
  </Icon>
);

const ICON_EXPORT = (
  <Icon>
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14" />
  </Icon>
);

const ICON_CLEAR = (
  <Icon>
    <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </Icon>
);

const ICON_FIT = (
  <Icon>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </Icon>
);

/** 元件庫的線條圖示：同樣大小、同樣粗細，24×24 的座標 */
const PALETTE_ICONS: Record<m.PaletteKind, ReactNode> = {
  heading: <path d="M6 5v14M18 5v14M6 12h12" />,
  text: <path d="M5 7h14M5 12h14M5 17h9" />,
  code: <path d="M9 8l-4 4 4 4M15 8l4 4-4 4" />,
  sticky: (
    <>
      <path className="board-icon-sticky" d="M5 5h14v9l-5 5H5z" />
      <path d="M14 19v-5h5" />
    </>
  ),
  array: <path d="M2.5 8.5h19v7h-19zM8.8 8.5v7M15.2 8.5v7" />,
  pointer: <path d="M12 3.5V14M8 7.5l4-4 4 4M8.5 17.5h7a2 2 0 0 1 0 4h-7a2 2 0 0 1 0-4z" />,
  stack: <path d="M5 4v15.5h14V4M5 10.5h14M5 15h14" />,
  queue: <path d="M2.5 8.5h13v7h-13zM7 8.5v7M11.3 8.5v7M18 12h4M20 10l2 2-2 2" />,
  dict: (
    <>
      <circle cx="7.5" cy="12" r="3.5" />
      <path d="M11 12h10M17 12v3M20 12v2.5" />
    </>
  ),
  set: (
    <>
      <circle cx="7" cy="9" r="2.6" />
      <circle cx="16.5" cy="8" r="2.6" />
      <circle cx="11.5" cy="16" r="2.6" />
    </>
  ),
  grid: <path d="M4 4h16v16H4zM4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16" />,
  var: <path d="M3.5 8.5c0-1.4 1.1-2.5 2.5-2.5h12c1.4 0 2.5 1.1 2.5 2.5v7c0 1.4-1.1 2.5-2.5 2.5H6c-1.4 0-2.5-1.1-2.5-2.5zM7 10l3 4M10 10l-3 4M13.5 10.8h4M13.5 13.2h4" />,
  binaryTree: (
    <>
      <circle cx="12" cy="5" r="2.4" />
      <circle cx="6" cy="18.5" r="2.4" />
      <circle cx="18" cy="18.5" r="2.4" />
      <path d="M10.7 7.1 7.2 16.4M13.3 7.1l3.5 9.3" />
    </>
  ),
  linkedList: <path d="M2 9h6.5v6H2zM15.5 9H22v6h-6.5zM8.5 12h6M12.5 10l2 2-2 2" />,
  treeNode: <circle cx="12" cy="12" r="6" />,
  listNode: <path d="M3 9h12v6H3zM11 9v6M15 12h6M19 10l2 2-2 2" />,
  heap: (
    <>
      <circle cx="12" cy="4.5" r="2.2" />
      <circle cx="7" cy="10.5" r="2.2" />
      <circle cx="17" cy="10.5" r="2.2" />
      <path d="M10.7 6.2 8.3 8.8M13.3 6.2l2.4 2.6M2.5 15.5h19v5h-19zM8.8 15.5v5M15.2 15.5v5" />
    </>
  ),
  graph: (
    <>
      <circle cx="6" cy="7" r="2.4" />
      <circle cx="18" cy="9" r="2.4" />
      <circle cx="10" cy="18" r="2.4" />
      <path d="M8.3 7.5 15.6 8.6M7.1 9.2l1.9 6.6M16.4 10.9l-4.7 5.5" />
    </>
  ),
  graphNode: (
    <>
      <circle cx="6" cy="7" r="2.4" />
      <circle cx="18" cy="9" r="2.4" />
      <circle cx="10" cy="18" r="2.4" />
      <path d="M8.3 7.5 15.6 8.6M7.1 9.2l1.9 6.6M16.4 10.9l-4.7 5.5" />
    </>
  ),
  table: <path d="M4 5h16v14H4zM4 10h16M4 14.5h16M10 5v14" />,
  recursionTree: (
    <>
      <rect x="8.5" y="2.5" width="7" height="4.5" rx="1.2" />
      <rect x="1.5" y="17" width="6" height="4.5" rx="1.2" />
      <rect x="9" y="17" width="6" height="4.5" rx="1.2" />
      <rect x="16.5" y="17" width="6" height="4.5" rx="1.2" />
      <path d="M12 7v10M10.5 7 4.5 17M13.5 7l6 10" />
    </>
  ),
};

const TEMPLATE_ICONS: Record<TemplateKind, ReactNode> = {
  twoPointers: <path d="M2.5 5.5h19v6h-19zM8.8 5.5v6M15.2 5.5v6M5.7 20v-5.5M3.7 16.5l2-2 2 2M18.3 20v-5.5M16.3 16.5l2-2 2 2" />,
  slidingWindow: <path d="M2.5 9h19v6h-19zM8.8 9v6M15.2 9v6M1.5 6.5h14v11h-14z" />,
  reverseList: <path d="M2 9h6v6H2zM16 9h6v6h-6zM14.5 12h-5M11.5 10l-2 2 2 2" />,
  treeDfs: (
    <>
      <circle cx="12" cy="5" r="2.4" />
      <circle cx="6" cy="18.5" r="2.4" />
      <circle cx="18" cy="18.5" r="2.4" />
      <path d="M10.7 7.1 7.2 16.4M13.3 7.1l3.5 9.3M3.5 9.5 5 13l3.5-1" />
    </>
  ),
  gridBfs: <path d="M3 3h12v12H3zM3 9h12M9 3v12M18 18l3 3M20.5 15.5a4 4 0 1 1-5 5" />,
  backtracking: (
    <>
      <rect x="8.5" y="2.5" width="7" height="4.5" rx="1.2" />
      <rect x="2" y="17" width="6.5" height="4.5" rx="1.2" />
      <path d="M10.5 7 5.5 17M13.5 7l3 5.5M15 15l4 4M19 15l-4 4" />
    </>
  ),
};
