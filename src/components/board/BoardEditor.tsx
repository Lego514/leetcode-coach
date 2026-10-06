import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { BOARD_COLORS, BOARD_MAX_BYTES, CELL_COLORS, type BoardColor, type CellColor } from '../../../shared/constants';
import { useI18n } from '../../i18n';
import * as m from '../../lib/board/model';
import { Dialog } from '../ui';
import { saveBoard } from '../../store/actions';
import { useBoard } from '../../store/queries';
import { ElementView } from './BoardElements';

// 自己寫的數位白板：左邊拖元件、中間是可以平移縮放的畫布、下面是工具列。
// 元件是一般的 HTML（文字清楚、可以直接編輯），箭頭和筆跡畫在同一層的 SVG 上。

type Tool = 'select' | 'hand' | 'arrow' | 'pen' | 'eraser';

interface View {
  x: number;
  y: number;
  zoom: number;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const TOOLS: Tool[] = ['select', 'hand', 'arrow', 'pen', 'eraser'];
const TOOL_KEYS: Record<string, Tool> = { v: 'select', h: 'hand', a: 'arrow', p: 'pen', e: 'eraser' };

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
  | { kind: 'arrow'; pointerId: number; from: m.ArrowEnd; fromPoint: m.Point }
  | { kind: 'pinch'; startDistance: number; startMid: m.Point; view: View };

type Draft = { kind: 'pen'; points: number[] } | { kind: 'arrow'; from: m.Point; to: m.Point };

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

interface BoardEditorProps {
  boardId: string;
  title: string;
  onClose: () => void;
}

/** 全螢幕的白板；內容自動存檔，登入時會同步 */
export function BoardEditor({ boardId, title, onClose }: BoardEditorProps) {
  const { t } = useI18n();
  const record = useBoard(boardId);
  if (record === undefined) {
    return (
      <div className="board" aria-busy="true">
        <p className="board-loading">{t.common.loading}</p>
      </div>
    );
  }
  return <Editor key={boardId} boardId={boardId} title={title} initial={record?.doc ?? m.EMPTY_DOC} onClose={onClose} />;
}

function Editor({ boardId, title, initial, onClose }: BoardEditorProps & { initial: m.BoardDoc }) {
  const { t } = useI18n();
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
  const [sizes, setSizes] = useState<ReadonlyMap<string, { w: number; h: number }>>(() => new Map());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [snap, setSnap] = useState<{ id: string; index: number } | null>(null);
  const [ghost, setGhost] = useState<{ kind: m.PaletteKind; x: number; y: number } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
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
      if (e.ctrlKey || e.metaKey) {
        const r = node.getBoundingClientRect();
        zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
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
    // 先選了陣列再加指標，指標直接放在第一格下面
    if (el.type === 'pointer' && !at && single && m.isIndexed(single)) el = { ...el, attach: { id: single.id, index: 0 } };
    let next = m.addElement(doc, el);
    if (el.type === 'pointer' && !el.attach) next = m.dropPointer(next, id);
    apply(next);
    setSelection(new Set([id]));
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

  const addPointerOn = (list: m.ElementOf<'list'>, index: number) => {
    const id = m.newId(doc);
    apply(m.addPointerAt(doc, list.id, index, id));
    setSelection(new Set([id]));
    setCellSel(null);
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

  /** 清空整張白板；跟其他修改一樣可以復原 */
  const clearBoard = () => {
    setConfirmClear(false);
    setEditingId(null);
    setCellSel(null);
    setSelection(new Set());
    apply(m.EMPTY_DOC);
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

    const world = toWorld(e.clientX, e.clientY);
    const elId = target.closest<HTMLElement>('[data-el]')?.dataset.el;
    if (editingId && elId !== editingId) stopEditing();
    if (editingId && elId === editingId) return;

    const pan = tool === 'hand' || spaceDown.current || e.button === 1 || (tool === 'select' && !elId);
    if (pan) {
      if (tool === 'select' && !elId && !e.shiftKey) {
        setSelection(new Set());
        setCellSel(null);
      }
      gesture.current = { kind: 'pan', pointerId: e.pointerId, start: { x: e.clientX, y: e.clientY }, view };
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
          startEditing(elId, cell);
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
      case 'arrow': {
        const from: m.ArrowEnd = elId ? { id: elId } : { x: Math.round(world.x), y: Math.round(world.y) };
        gesture.current = { kind: 'arrow', pointerId: e.pointerId, from, fromPoint: world };
        setDraft({ kind: 'arrow', from: world, to: world });
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
        setDraft({ kind: 'arrow', from: g.fromPoint, to: world });
        return;
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
        }
        return;
      case 'pen': {
        // 只點一下也留一個點
        const points = g.points.length === 2 ? [...g.points, ...g.points] : g.points;
        apply(m.addElement(doc, { type: 'stroke', id: m.newId(doc), color, points }));
        return;
      }
      case 'arrow': {
        const world = toWorld(e.clientX, e.clientY);
        const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-el]')?.dataset.el;
        const to: m.ArrowEnd = hit ? { id: hit } : { x: Math.round(world.x), y: Math.round(world.y) };
        const same = 'id' in g.from && 'id' in to && g.from.id === to.id;
        const tiny = !('id' in g.from) && !('id' in to) && Math.hypot(world.x - g.fromPoint.x, world.y - g.fromPoint.y) < 8;
        if (!same && !tiny) apply(m.addElement(doc, { type: 'arrow', id: m.newId(doc), from: g.from, to, color }));
        return;
      }
      default:
        return;
    }
  };

  // ---------- 左側元件庫：點一下加到中間，拖曳就放到放開的位置 ----------

  const paletteHandlers = (kind: m.PaletteKind) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
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
      if (suppressClick.current) return;
      addKind(kind);
    },
  });

  // ---------- 鍵盤 ----------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select')) return;
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
      } else if (mod) {
        return;
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
        setSelection(new Set());
        setTool('select');
      } else if (e.key === 'Enter' && single && m.isPlaced(single)) {
        e.preventDefault();
        startEditing(single.id);
      } else if (e.key.startsWith('Arrow') && selected.size > 0) {
        e.preventDefault();
        const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
        const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
        // 吸附在陣列上的指標左右移一格，其他元件移 10
        if (single?.type === 'pointer' && single.attach && dx !== 0) apply(m.shiftPointer(doc, single.id, dx));
        else apply(m.moveElements(doc, selected, dx * 10, dy * 10));
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
  const placed = doc.elements.filter(m.isPlaced);
  const ink = doc.elements.filter((el): el is m.ElementOf<'arrow'> | m.ElementOf<'stroke'> => !m.isPlaced(el));
  const saving = doc !== savedDoc;
  const grid = 24 * view.zoom;

  return (
    <div className="board" role="dialog" aria-modal="true" aria-label={title}>
      <header className="board-head">
        <button type="button" className="btn btn-quiet btn-small" onClick={onClose}>
          {t.board.close}
        </button>
        <h1 className="board-title">{title}</h1>
        <span className="board-save" aria-live="polite">
          {tooLarge ? t.board.tooLarge : saving ? t.board.saving : t.board.saved}
        </span>
      </header>

      <div className="board-body">
        <aside className="board-palette" aria-label={t.board.palette}>
          <p className="board-palette-hint">{t.board.paletteHint}</p>
          {m.PALETTE.map(({ group, kinds }) => (
            <section key={group} className="board-palette-group" aria-label={t.board.groups[group]}>
              <h2>{t.board.groups[group]}</h2>
              <div className="board-palette-items">
                {kinds.map((kind) => (
                  <button key={kind} type="button" className="board-palette-item" {...paletteHandlers(kind)}>
                    <span className="board-palette-icon" aria-hidden data-kind={kind}>
                      {PALETTE_ICONS[kind]}
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
                doc={doc}
                selected={selected.has(el.id)}
                editing={editingId === el.id}
                snapIndex={snap?.id === el.id ? snap.index : undefined}
                cellIndex={pickedList?.id === el.id ? pickedIndex : undefined}
                focusIndex={editingId === el.id ? editFocus : undefined}
                onAddCell={canAdd(el) && el.type === 'list' ? () => insertCellAt(el, el.items.length) : undefined}
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
                if (el.type === 'stroke') return <path key={el.id} d={strokePath(el.points)} stroke={m.colorVar(el.color)} className="board-stroke" />;
                const ends = m.arrowPoints(doc, el, sizes);
                if (!ends) return null;
                return (
                  <line
                    key={el.id}
                    x1={ends[0].x}
                    y1={ends[0].y}
                    x2={ends[1].x}
                    y2={ends[1].y}
                    stroke={m.colorVar(el.color)}
                    className="board-arrow"
                    markerEnd={`url(#board-head-${el.color})`}
                  />
                );
              })}
              {draft?.kind === 'pen' && <path d={strokePath(draft.points)} stroke={m.colorVar(color)} className="board-stroke" />}
              {draft?.kind === 'arrow' && (
                <line
                  x1={draft.from.x}
                  y1={draft.from.y}
                  x2={draft.to.x}
                  y2={draft.to.y}
                  stroke={m.colorVar(color)}
                  className="board-arrow board-arrow-draft"
                  markerEnd={`url(#board-head-${color})`}
                />
              )}
            </svg>
          </div>

          {doc.elements.length === 0 && <p className="board-empty">{t.board.empty}</p>}

          {tool === 'select' && selected.size > 0 && (
            <div className="board-selbar" role="toolbar" aria-label={t.board.selectionLabel} data-ui>
              {pickedList && pickedIndex !== undefined ? (
                <CellActions
                  list={pickedList}
                  index={pickedIndex}
                  onColor={(color) => apply(m.setCellColor(doc, pickedList.id, pickedIndex, color))}
                  onAddPointer={() => addPointerOn(pickedList, pickedIndex)}
                  onInsert={(index) => insertCellAt(pickedList, index)}
                  onDelete={() => deleteCellAt(pickedList, pickedIndex)}
                />
              ) : (
                <>
                  {single && <SelectionActions el={single} doc={doc} apply={apply} onEdit={() => startEditing(single.id)} />}
                  <button type="button" className="btn btn-small" onClick={duplicateSelected}>
                    {t.board.actions.duplicate}
                  </button>
                  <button type="button" className="btn btn-small btn-danger" onClick={removeSelected}>
                    {t.board.actions.delete}
                  </button>
                </>
              )}
            </div>
          )}

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
            {BOARD_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="board-swatch"
                aria-pressed={color === c}
                aria-label={t.board.colors[c]}
                title={t.board.colors[c]}
                style={{ color: m.colorVar(c) }}
                onClick={() => setColor(c)}
              />
            ))}
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

          <div className="board-zoom" data-ui>
            <button type="button" className="board-tool" aria-label={t.board.zoomOut} title={t.board.zoomOut} onClick={() => zoomCenter(1 / 1.2)}>
              −
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
            <button type="button" className="board-tool" aria-label={t.board.zoomIn} title={t.board.zoomIn} onClick={() => zoomCenter(1.2)}>
              +
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
}

/** 選了陣列的一格：上底色、在這格加指標、在旁邊插入、刪掉這格 */
function CellActions({ list, index, onColor, onAddPointer, onInsert, onDelete }: CellActionsProps) {
  const { t } = useI18n();
  const a = t.board.actions;
  const current = list.colors?.[index] ?? null;
  // 堆疊是直的：index 越大越上面
  const vertical = list.variant === 'stack';
  return (
    <>
      <span className="board-selbar-title">{t.board.cellLabel(index)}</span>
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
      {m.isIndexed(list) && (
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

/** 選了一個元件時，依種類多出來的操作 */
function SelectionActions({ el, doc, apply, onEdit }: { el: m.BoardElement; doc: m.BoardDoc; apply: (doc: m.BoardDoc) => void; onEdit: () => void }) {
  const { t } = useI18n();
  const a = t.board.actions;
  const buttons: [string, () => void][] = [];
  if (m.isPlaced(el)) buttons.push([a.edit, onEdit]);
  // 加格子、加列、加欄用元件旁邊的「＋」；陣列刪格子先點那一格
  if (el.type === 'table') {
    buttons.push([a.removeRow, () => apply(m.resizeTable(doc, el.id, 'row', -1))], [a.removeCol, () => apply(m.resizeTable(doc, el.id, 'col', -1))]);
  }
  if (el.type === 'pointer' && el.attach) {
    buttons.push([a.pointerLeft, () => apply(m.shiftPointer(doc, el.id, -1))], [a.pointerRight, () => apply(m.shiftPointer(doc, el.id, 1))]);
  }
  return (
    <>
      {buttons.map(([label, onClick]) => (
        <button key={label} type="button" className="btn btn-small" onClick={onClick}>
          {label}
        </button>
      ))}
    </>
  );
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

const PALETTE_ICONS: Record<m.PaletteKind, string> = {
  heading: 'T',
  text: 't',
  code: '{}',
  sticky: '▤',
  array: '[ ]',
  pointer: '↑i',
  stack: '⊔',
  queue: '⇉',
  dict: 'k:v',
  set: '{ }',
  grid: '▦',
  var: 'x=',
  treeNode: '●',
  listNode: '▭→',
  graphNode: '○',
  table: '☰',
};
