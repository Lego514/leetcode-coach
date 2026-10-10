import { Fragment, useEffect, useRef, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useI18n } from '../../i18n';
import {
  CELL,
  colorVar,
  CYCLE_H,
  edgeShape,
  graphLayout,
  hasTreeNode,
  heapLayout,
  heapViolations,
  INDEX_H,
  isIndexed,
  LABEL_H,
  LINK_GAP,
  linksOf,
  pointsDown,
  TREE_D,
  TREE_GAP,
  TREE_LEVEL,
  TREE_MAX_NODES,
  treeLayout,
  treeParent,
  type Link,
  type Point,
  LIST_NODE_H,
  LIST_NODE_W,
  NODE_D,
  pointerPosition,
  pointerTone,
  POINTER_H,
  POINTER_W,
  ROW_INDEX_W,
  sizeOf,
  WIDE_CELL,
  type BoardDoc,
  type CellColor,
  type ElementOf,
  type Placed,
} from '../../lib/board/model';
import { serializeGraph, serializeTree } from '../../lib/board/structures';

// 白板上每一種元件的樣子。雙擊進入編輯時，格子和文字變成輸入框。

interface ElementViewProps {
  el: Placed;
  doc: BoardDoc;
  selected: boolean;
  editing: boolean;
  /** 拖曳指標時要吸附的那一格，畫面上標出來 */
  snapIndex?: number;
  /** 選取的那一格 */
  cellIndex?: number;
  /** 進入編輯時游標放在哪一格 */
  focusIndex?: number;
  /** 選取時才有：陣列最後的「＋」格、表格的「＋列」「＋欄」 */
  onAddCell?: () => void;
  /** 選取鏈結串列時，點兩個節點之間的箭頭切換方向 */
  onToggleLink?: (gap: number) => void;
  /** 選了二元樹的一個節點時，點空的子節點位置加一個子節點 */
  onAddChild?: (index: number) => void;
  /** 選取圖時：右下角的「＋」加節點、點一條邊選取它 */
  onAddNode?: () => void;
  onPickEdge?: (edge: number) => void;
  /** 選取的那條邊 */
  edgeIndex?: number;
  onAddRow?: () => void;
  onAddCol?: () => void;
  register: (id: string, node: HTMLElement | null) => void;
  /** 編輯中的即時更新 */
  onChange: (patch: Partial<Placed>) => void;
  onDoneEditing: () => void;
}

export function ElementView({ el, doc, selected, editing, register, ...rest }: ElementViewProps) {
  const { t } = useI18n();
  const at = el.type === 'pointer' ? pointerPosition(doc, el) : el;
  const fixedSize = el.type === 'text' || el.type === 'var' ? undefined : sizeOf(el);
  return (
    <div
      ref={(node) => register(el.id, node)}
      className={`board-el board-el-${el.type}`}
      data-el={el.id}
      data-variant={'variant' in el ? el.variant : undefined}
      data-tone={el.type === 'pointer' ? pointerTone(el.name) : undefined}
      data-down={(el.type === 'pointer' && pointsDown(doc, el)) || undefined}
      data-selected={selected || undefined}
      data-editing={editing || undefined}
      role="group"
      aria-label={describe(el, doc, t)}
      style={{
        left: at.x,
        top: at.y,
        ...(fixedSize ? { width: fixedSize.w, height: fixedSize.h } : el.type === 'text' ? { width: el.w } : {}),
      }}
    >
      {el.type === 'shape' ? <ShapeBody el={el} selected={selected} /> : <Body el={el} editing={editing} {...rest} />}
    </div>
  );
}

/**
 * 矩形框、圓形框。整個元件不接收點擊（框住的東西照樣點得到），
 * 只有框線上一條看不見的粗線可以點，選取後右下角有調整大小的把手。
 */
function ShapeBody({ el, selected }: { el: ElementOf<'shape'>; selected: boolean }) {
  const { t } = useI18n();
  const stroke = colorVar(el.color);
  const outline =
    el.variant === 'rect'
      ? (className: string) => <rect className={className} x={1} y={1} width={el.w - 2} height={el.h - 2} rx={8} />
      : (className: string) => <ellipse className={className} cx={el.w / 2} cy={el.h / 2} rx={el.w / 2 - 1} ry={el.h / 2 - 1} />;
  return (
    <>
      <svg className="board-shape" width={el.w} height={el.h} style={{ stroke }} aria-hidden>
        {outline('board-shape-hit')}
        {outline('board-shape-line')}
      </svg>
      {selected && <span className="board-resize" data-handle="resize" title={t.board.resize} />}
    </>
  );
}

type BodyProps = Omit<ElementViewProps, 'doc' | 'selected' | 'register'>;

function Body({ el, editing, onChange, onDoneEditing, ...rest }: BodyProps) {
  switch (el.type) {
    case 'shape':
      return null;
    case 'text':
      return <TextBody el={el} editing={editing} onChange={onChange} onDoneEditing={onDoneEditing} />;
    case 'list':
      if (el.variant === 'linked') return <LinkedBody el={el} editing={editing} onChange={onChange} onDoneEditing={onDoneEditing} {...rest} />;
      if (el.variant === 'heap') return <HeapBody el={el} editing={editing} onChange={onChange} onDoneEditing={onDoneEditing} {...rest} />;
      return <ListBody el={el} editing={editing} onChange={onChange} onDoneEditing={onDoneEditing} {...rest} />;
    case 'tree':
      return <TreeBody el={el} editing={editing} onChange={onChange} onDoneEditing={onDoneEditing} {...rest} />;
    case 'graph':
      return <GraphBody el={el} editing={editing} onChange={onChange} onDoneEditing={onDoneEditing} {...rest} />;
    case 'table':
      return <TableBody el={el} editing={editing} onChange={onChange} onDoneEditing={onDoneEditing} {...rest} />;
    case 'var':
      return <VarBody el={el} editing={editing} onChange={onChange} onDoneEditing={onDoneEditing} />;
    case 'node':
      return <NodeBody el={el} editing={editing} onChange={onChange} onDoneEditing={onDoneEditing} />;
    case 'pointer':
      return <PointerBody el={el} editing={editing} onChange={onChange} onDoneEditing={onDoneEditing} />;
  }
}

/** 輸入框裡按 Enter 或 Esc 結束編輯；按鍵不往外傳，免得觸發白板的快捷鍵 */
function editKeys(onDone: () => void, multiline = false) {
  return (e: ReactKeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape' || (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey))) {
      e.preventDefault();
      onDone();
    }
  };
}

function Cell({
  value,
  editing,
  autoFocus,
  label,
  onChange,
  onDone,
  wide,
  snap,
  index,
  color,
  picked,
  className = '',
  style: extraStyle,
}: {
  /** 鏈結串列和二元樹的節點加上自己的樣式和位置 */
  className?: string;
  style?: CSSProperties;
  value: string;
  editing: boolean;
  autoFocus?: boolean;
  label: string;
  onChange: (value: string) => void;
  onDone: () => void;
  wide?: boolean;
  snap?: boolean;
  /** 陣列的格子帶著索引，點下去可以單獨選這一格 */
  index?: number;
  color?: CellColor | null;
  picked?: boolean;
}) {
  const style = { width: wide ? WIDE_CELL : CELL, height: CELL, ...extraStyle };
  const data = {
    'data-cell': index,
    'data-color': color ?? undefined,
    'data-snap': snap || undefined,
    'data-picked': picked || undefined,
  };
  if (!editing) {
    return (
      <span className={`board-cell ${className}`} style={style} title={value} {...data}>
        {value}
      </span>
    );
  }
  return (
    <input
      className={`board-cell board-cell-input ${className}`}
      style={style}
      {...data}
      value={value}
      aria-label={label}
      maxLength={40}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={editKeys(onDone)}
    />
  );
}

function Label({ value, editing, onChange, onDone }: { value: string; editing: boolean; onChange: (v: string) => void; onDone: () => void }) {
  const { t } = useI18n();
  if (!editing) return <span className="board-label">{value}</span>;
  return (
    <input
      className="board-label board-label-input"
      value={value}
      placeholder={t.board.labelPlaceholder}
      aria-label={t.board.labelPlaceholder}
      maxLength={40}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={editKeys(onDone)}
    />
  );
}

function TextBody({ el, editing, onChange, onDoneEditing }: { el: ElementOf<'text'> } & Omit<BodyProps, 'el' | 'snapIndex'>) {
  const { t } = useI18n();
  const ref = useRef<HTMLTextAreaElement>(null);
  // 編輯時高度跟著內容長
  useEffect(() => {
    const area = ref.current;
    if (!area) return;
    area.style.height = 'auto';
    area.style.height = `${area.scrollHeight}px`;
  }, [editing, el.text]);
  if (!editing) return <div className="board-text">{el.text || ' '}</div>;
  return (
    <textarea
      ref={ref}
      className="board-text board-text-input"
      value={el.text}
      aria-label={t.board.kinds[el.variant]}
      maxLength={2000}
      autoFocus
      spellCheck={el.variant !== 'code'}
      onChange={(e) => onChange({ text: e.target.value })}
      onKeyDown={editKeys(onDoneEditing, true)}
    />
  );
}

function ListBody({
  el,
  editing,
  snapIndex,
  cellIndex,
  focusIndex,
  onAddCell,
  onChange,
  onDoneEditing,
}: { el: ElementOf<'list'> } & Omit<BodyProps, 'el'>) {
  const { t } = useI18n();
  // 堆疊畫成直的，最上面是最後放進去的
  const order = el.variant === 'stack' ? el.items.map((_, i) => el.items.length - 1 - i) : el.items.map((_, i) => i);
  const setItem = (index: number, value: string) => onChange({ items: el.items.map((v, i) => (i === index ? value : v)) });
  // 沒指定要編輯哪一格時，從最上面（堆疊）或第一格開始
  const focus = focusIndex ?? order[0];
  return (
    <>
      <Label value={el.label} editing={editing} onChange={(label) => onChange({ label })} onDone={onDoneEditing} />
      <div className="board-cells">
        {order.map((index) => (
          <Cell
            // 格子數量變了就重建輸入框，游標才會落在新插入的那格
            key={`${index}:${el.items.length}`}
            index={index}
            value={el.items[index]}
            color={el.colors?.[index]}
            picked={cellIndex === index}
            editing={editing}
            autoFocus={index === focus}
            label={t.board.cellLabel(index)}
            snap={snapIndex === index}
            onChange={(value) => setItem(index, value)}
            onDone={onDoneEditing}
          />
        ))}
      </div>
      {onAddCell && (
        <button type="button" className="board-add board-add-cell" aria-label={t.board.actions.addCell} title={t.board.actions.addCell} onClick={onAddCell}>
          +
        </button>
      )}
      {isIndexed(el) && (
        <div className="board-indices" aria-hidden>
          {el.items.map((_, i) => (
            <span key={i} style={{ width: CELL }}>
              {el.variant === 'queue' ? (i === 0 ? t.board.front : i === el.items.length - 1 ? t.board.back : '') : i}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

/** 兩個節點之間的連線；選取串列時是按鈕，點一下切換方向 */
function LinkArrow({ state, label, onToggle }: { state: Link; label: string; onToggle?: () => void }) {
  const mid = CELL / 2;
  const icon = (
    <svg width={LINK_GAP} height={CELL} viewBox={`0 0 ${LINK_GAP} ${CELL}`} aria-hidden>
      {state === 'none' ? (
        <path className="board-link-cut" d={`M${LINK_GAP / 2 - 4} ${mid - 4}l8 8m0-8l-8 8`} />
      ) : state === 'next' ? (
        <path className="board-link-line" d={`M3 ${mid}H${LINK_GAP - 4}M${LINK_GAP - 9} ${mid - 5}L${LINK_GAP - 3} ${mid}L${LINK_GAP - 9} ${mid + 5}`} />
      ) : (
        <path className="board-link-line" d={`M${LINK_GAP - 3} ${mid}H4M9 ${mid - 5}L3 ${mid}L9 ${mid + 5}`} />
      )}
    </svg>
  );
  if (!onToggle) {
    return (
      <span className="board-link" data-state={state}>
        {icon}
      </span>
    );
  }
  return (
    <button type="button" className="board-link" data-state={state} aria-label={label} title={label} onClick={onToggle}>
      {icon}
    </button>
  );
}

/** 鏈結串列：節點排成一列，中間是可以切換方向的箭頭，尾巴接 null 或接回某個節點 */
function LinkedBody({
  el,
  editing,
  snapIndex,
  cellIndex,
  focusIndex,
  onAddCell,
  onToggleLink,
  onChange,
  onDoneEditing,
}: { el: ElementOf<'list'> } & Omit<BodyProps, 'el'>) {
  const { t } = useI18n();
  const n = el.items.length;
  const links = linksOf(el);
  const setItem = (index: number, value: string) => onChange({ items: el.items.map((v, i) => (i === index ? value : v)) });
  // 最後一段反過來時，尾巴那個節點指回前面，就不畫往後的 null
  const tailNull = n === 1 || links[n - 2] !== 'prev';
  const focus = focusIndex ?? 0;
  return (
    <>
      <Label value={el.label} editing={editing} onChange={(label) => onChange({ label })} onDone={onDoneEditing} />
      <div className="board-cells board-linked">
        {el.items.map((value, i) => (
          <Fragment key={`${i}:${n}`}>
            <Cell
              index={i}
              value={value}
              color={el.colors?.[i]}
              picked={cellIndex === i}
              editing={editing}
              autoFocus={i === focus}
              label={t.board.cellLabel(i)}
              snap={snapIndex === i}
              className="board-linked-node"
              onChange={(v) => setItem(i, v)}
              onDone={onDoneEditing}
            />
            {i < n - 1 && (
              <LinkArrow
                state={links[i]}
                label={t.board.linkLabel(i, t.board.linkStates[links[i]])}
                onToggle={onToggleLink && !editing ? () => onToggleLink(i) : undefined}
              />
            )}
          </Fragment>
        ))}
        {el.cycle === undefined && (
          <span className="board-link-tail" aria-hidden>
            {tailNull && (
              <>
                <LinkArrow state="next" label="" />
                <span className="board-link-null">null</span>
              </>
            )}
          </span>
        )}
      </div>
      {el.cycle !== undefined && <CycleArrow n={n} target={el.cycle} />}
      {onAddCell && (
        <button type="button" className="board-add board-add-cell" aria-label={t.board.actions.addCell} title={t.board.actions.addCell} onClick={onAddCell}>
          +
        </button>
      )}
    </>
  );
}

/** 有環：從尾巴往下、往回走到接回去的那個節點下面 */
function CycleArrow({ n, target }: { n: number; target: number }) {
  const step = CELL + LINK_GAP;
  const top = LABEL_H + CELL;
  const bottom = top + CYCLE_H - 6;
  // 接回自己時兩端錯開一點，看得出是一個圈
  const from = (n - 1) * step + CELL / 2 + (target === n - 1 ? 8 : 0);
  const to = target * step + CELL / 2 - (target === n - 1 ? 8 : 0);
  return (
    <svg className="board-cycle" width={n * step} height={top + CYCLE_H} aria-hidden>
      <path className="board-link-line" d={`M${from} ${top + 1}V${bottom}H${to}V${top + 3}M${to - 5} ${top + 8}L${to} ${top + 2}L${to + 5} ${top + 8}`} />
    </svg>
  );
}

/** 兩點之間的線段，兩端各縮進 r（從圓的邊緣畫到圓的邊緣） */
function trimSegment(a: Point, b: Point, r: number): [Point, Point] {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / d;
  const uy = (b.y - a.y) / d;
  return [
    { x: a.x + ux * r, y: a.y + uy * r },
    { x: b.x - ux * r, y: b.y - uy * r },
  ];
}

/** 二元樹：依中序自動排版；選了一個節點時，空的子節點位置出現虛線「＋」 */
function TreeBody({ el, editing, snapIndex, cellIndex, focusIndex, onAddChild, onChange, onDoneEditing }: { el: ElementOf<'tree'> } & Omit<BodyProps, 'el'>) {
  const { t } = useI18n();
  const layout = treeLayout(el);
  const setNode = (index: number, value: string) => onChange({ nodes: el.nodes.map((v, i) => (i === index ? value : v)) });
  const focus = focusIndex ?? 0;
  const parent = cellIndex === undefined ? undefined : layout.centers.get(cellIndex);
  const slots =
    onAddChild && !editing && cellIndex !== undefined && parent
      ? (['left', 'right'] as const)
          .map((side) => ({
            side,
            index: 2 * cellIndex + (side === 'left' ? 1 : 2),
            at: { x: parent.x + ((side === 'left' ? -1 : 1) * TREE_GAP) / 2, y: parent.y + TREE_LEVEL },
          }))
          .filter((slot) => slot.index < TREE_MAX_NODES && !hasTreeNode(el, slot.index))
      : [];
  return (
    <>
      <Label value={el.label} editing={editing} onChange={(label) => onChange({ label })} onDone={onDoneEditing} />
      <svg className="board-tree-edges" width={layout.w} height={layout.h} aria-hidden>
        {[...layout.centers].map(([i, c]) => {
          const p = layout.centers.get(treeParent(i));
          if (!p) return null;
          const [a, b] = trimSegment(p, c, TREE_D / 2);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
        {parent &&
          slots.map((slot) => {
            const [a, b] = trimSegment(parent, slot.at, TREE_D / 2);
            return <line key={slot.side} className="board-tree-slot-edge" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
          })}
      </svg>
      {[...layout.centers].map(([i, c]) => (
        <Cell
          key={i}
          index={i}
          value={el.nodes[i] ?? ''}
          color={el.colors?.[i]}
          picked={cellIndex === i}
          editing={editing}
          autoFocus={i === focus}
          label={t.board.treeSlotLabel(i)}
          snap={snapIndex === i}
          className="board-tree-node"
          style={{ left: c.x - TREE_D / 2, top: c.y - TREE_D / 2, width: TREE_D, height: TREE_D }}
          onChange={(v) => setNode(i, v)}
          onDone={onDoneEditing}
        />
      ))}
      {slots.map((slot) => {
        const name = slot.side === 'left' ? t.board.actions.addLeftChild : t.board.actions.addRightChild;
        return (
          <button
            key={slot.side}
            type="button"
            className="board-add board-tree-slot"
            style={{ left: slot.at.x - 16, top: slot.at.y - 16 }}
            aria-label={name}
            title={name}
            onClick={() => onAddChild?.(slot.index)}
          >
            +
          </button>
        );
      })}
    </>
  );
}

/** 堆積：上面是完全二元樹，下面是同一份資料的陣列；比父節點更該在上面的節點標紅 */
function HeapBody({ el, editing, snapIndex, cellIndex, focusIndex, onChange, onDoneEditing }: { el: ElementOf<'list'> } & Omit<BodyProps, 'el'>) {
  const { t } = useI18n();
  const layout = heapLayout(el);
  const bad = heapViolations(el);
  const n = el.items.length;
  const setItem = (index: number, value: string) => onChange({ items: el.items.map((v, i) => (i === index ? value : v)) });
  const focus = focusIndex ?? 0;
  // 編輯時只在一個地方放輸入框：有陣列就在陣列上，只畫樹時在樹上
  const editTree = editing && !layout.showArray;
  const editArray = editing && layout.showArray;
  return (
    <>
      <Label value={el.label} editing={editing} onChange={(label) => onChange({ label })} onDone={onDoneEditing} />
      {layout.showTree && (
        <>
          <svg className="board-tree-edges" width={layout.w} height={layout.arrayTop} aria-hidden>
            {[...layout.centers].map(([i, c]) => {
              const p = layout.centers.get(treeParent(i));
              if (!p) return null;
              const [a, b] = trimSegment(p, c, TREE_D / 2);
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={bad.has(i) ? 'board-heap-bad-edge' : undefined} />;
            })}
          </svg>
          {[...layout.centers].map(([i, c]) => (
            <Cell
              key={`t${i}:${n}`}
              index={i}
              value={el.items[i]}
              color={el.colors?.[i]}
              picked={cellIndex === i}
              editing={editTree}
              autoFocus={editTree && i === focus}
              label={t.board.treeSlotLabel(i)}
              snap={!layout.showArray && snapIndex === i}
              className={bad.has(i) ? 'board-tree-node board-heap-bad' : 'board-tree-node'}
              style={{ left: c.x - TREE_D / 2, top: c.y - TREE_D / 2, width: TREE_D, height: TREE_D }}
              onChange={(v) => setItem(i, v)}
              onDone={onDoneEditing}
            />
          ))}
        </>
      )}
      {layout.showArray && (
        <div className="board-heap-array" style={{ top: layout.arrayTop }}>
          <div className="board-cells">
            {el.items.map((value, i) => (
              <Cell
                key={`a${i}:${n}`}
                index={i}
                value={value}
                color={el.colors?.[i]}
                picked={cellIndex === i}
                editing={editArray}
                autoFocus={editArray && i === focus}
                label={t.board.cellLabel(i)}
                snap={snapIndex === i}
                onChange={(v) => setItem(i, v)}
                onDone={onDoneEditing}
              />
            ))}
            {n === 0 && <span className="board-heap-empty">{t.board.heap.empty}</span>}
          </div>
          <div className="board-indices" aria-hidden>
            {el.items.map((_, i) => (
              <span key={i} style={{ width: CELL }}>
                {i}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/** 圖：節點排成一圈，邊依有向、無向畫箭頭或直線；選取時邊可以點，右下角可以加節點 */
function GraphBody({
  el,
  editing,
  snapIndex,
  cellIndex,
  focusIndex,
  edgeIndex,
  onAddNode,
  onPickEdge,
  onChange,
  onDoneEditing,
}: { el: ElementOf<'graph'> } & Omit<BodyProps, 'el'>) {
  const { t } = useI18n();
  const layout = graphLayout(el);
  const setNode = (index: number, value: string) => onChange({ nodes: el.nodes.map((v, i) => (i === index ? value : v)) });
  const focus = focusIndex ?? 0;
  const head = `board-graph-head-${el.id}`;
  const markedHead = `board-graph-head-marked-${el.id}`;
  return (
    <>
      <Label value={el.label} editing={editing} onChange={(label) => onChange({ label })} onDone={onDoneEditing} />
      <svg className="board-graph-edges" width={layout.w} height={layout.h} aria-hidden>
        <defs>
          {/* 箭頭固定大小，標記的邊線條比較粗也不會跟著變大 */}
          <marker id={head} viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" className="board-graph-head" />
          </marker>
          <marker id={markedHead} viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" className="board-graph-head-marked" />
          </marker>
        </defs>
        {el.edges.map((edge, i) => {
          const shape = edgeShape(el, layout.centers, edge);
          if (!shape) return null;
          return (
            <g key={i} data-marked={edge.mark || undefined} data-picked={edgeIndex === i || undefined}>
              {onPickEdge && !editing && <path d={shape.path} className="board-graph-edge-hit" data-ui data-edge={i} onClick={() => onPickEdge(i)} />}
              <path d={shape.path} className="board-graph-edge" markerEnd={el.directed ? `url(#${edge.mark ? markedHead : head})` : undefined} />
              {edge.w && (
                <text x={shape.label.x} y={shape.label.y} className="board-graph-weight">
                  {edge.w}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {layout.centers.map((c, i) => (
        <Cell
          key={`${i}:${el.nodes.length}`}
          index={i}
          value={el.nodes[i]}
          color={el.colors?.[i]}
          picked={cellIndex === i}
          editing={editing}
          autoFocus={i === focus}
          label={t.board.graphNodeLabel(i)}
          snap={snapIndex === i}
          className="board-graph-node"
          style={{ left: c.x - TREE_D / 2, top: c.y - TREE_D / 2, width: TREE_D, height: TREE_D }}
          onChange={(v) => setNode(i, v)}
          onDone={onDoneEditing}
        />
      ))}
      {onAddNode && !editing && (
        <button type="button" className="board-add board-graph-add" aria-label={t.board.actions.addNode} title={t.board.actions.addNode} onClick={onAddNode}>
          +
        </button>
      )}
    </>
  );
}

function TableBody({ el, editing, onChange, onDoneEditing, onAddRow, onAddCol }: { el: ElementOf<'table'> } & Omit<BodyProps, 'el'>) {
  const { t } = useI18n();
  const cols = Math.max(1, ...el.rows.map((r) => r.length));
  const wide = el.variant !== 'grid';
  const setCell = (r: number, c: number, value: string) =>
    onChange({
      rows: el.rows.map((row, i) =>
        i === r ? Array.from({ length: cols }, (_, j) => (j === c ? value : (row[j] ?? ''))) : row,
      ),
    });
  return (
    <>
      <Label value={el.label} editing={editing} onChange={(label) => onChange({ label })} onDone={onDoneEditing} />
      {el.variant === 'grid' && (
        <div className="board-indices board-col-indices" aria-hidden style={{ paddingLeft: ROW_INDEX_W }}>
          {Array.from({ length: cols }, (_, j) => (
            <span key={j} style={{ width: CELL }}>
              {j}
            </span>
          ))}
        </div>
      )}
      {el.rows.map((row, r) => (
        <div key={r} className="board-row" data-header={el.variant === 'table' && r === 0 ? '' : undefined}>
          {el.variant === 'grid' && (
            <span className="board-row-index" aria-hidden style={{ width: ROW_INDEX_W }}>
              {r}
            </span>
          )}
          {Array.from({ length: cols }, (_, c) => (
            <Cell
              key={c}
              value={row[c] ?? ''}
              editing={editing}
              autoFocus={r === 0 && c === 0}
              wide={wide}
              label={t.board.tableCellLabel(r, c)}
              onChange={(value) => setCell(r, c, value)}
              onDone={onDoneEditing}
            />
          ))}
        </div>
      ))}
      {onAddRow && (
        <button type="button" className="board-add board-add-row" aria-label={t.board.actions.addRow} title={t.board.actions.addRow} onClick={onAddRow}>
          +
        </button>
      )}
      {onAddCol && (
        <button
          type="button"
          className="board-add board-add-col"
          aria-label={t.board.actions.addCol}
          title={t.board.actions.addCol}
          style={{ top: LABEL_H + (el.variant === 'grid' ? INDEX_H : 0), height: el.rows.length * CELL }}
          onClick={onAddCol}
        >
          +
        </button>
      )}
    </>
  );
}

function VarBody({ el, editing, onChange, onDoneEditing }: { el: ElementOf<'var'> } & Omit<BodyProps, 'el' | 'snapIndex'>) {
  const { t } = useI18n();
  if (!editing) {
    return (
      <span className="board-var">
        <span className="board-var-name">{el.name}</span> = <span className="board-var-value">{el.value}</span>
      </span>
    );
  }
  return (
    <span className="board-var">
      <input
        className="board-var-input"
        value={el.name}
        aria-label={t.board.varName}
        maxLength={40}
        size={Math.max(3, el.name.length)}
        autoFocus
        onChange={(e) => onChange({ name: e.target.value })}
        onKeyDown={editKeys(onDoneEditing)}
      />
      =
      <input
        className="board-var-input"
        value={el.value}
        aria-label={t.board.varValue}
        maxLength={80}
        size={Math.max(3, el.value.length)}
        onChange={(e) => onChange({ value: e.target.value })}
        onKeyDown={editKeys(onDoneEditing)}
      />
    </span>
  );
}

function NodeBody({ el, editing, onChange, onDoneEditing }: { el: ElementOf<'node'> } & Omit<BodyProps, 'el' | 'snapIndex'>) {
  const { t } = useI18n();
  const size = el.variant === 'list' ? { width: LIST_NODE_W - 24, height: LIST_NODE_H } : { width: NODE_D, height: NODE_D };
  const value = editing ? (
    <input
      className="board-node-input"
      style={size}
      value={el.value}
      aria-label={t.board.kinds[el.variant === 'tree' ? 'treeNode' : el.variant === 'list' ? 'listNode' : 'graphNode']}
      maxLength={40}
      autoFocus
      onChange={(e) => onChange({ value: e.target.value })}
      onKeyDown={editKeys(onDoneEditing)}
    />
  ) : (
    <span className="board-node-value" style={size} title={el.value}>
      {el.value}
    </span>
  );
  if (el.variant !== 'list') return value;
  return (
    <>
      {value}
      {/* 串列節點右邊是 next 指標的位置 */}
      <span className="board-node-next" aria-hidden />
    </>
  );
}

function PointerBody({ el, editing, onChange, onDoneEditing }: { el: ElementOf<'pointer'> } & Omit<BodyProps, 'el' | 'snapIndex'>) {
  const { t } = useI18n();
  return (
    <>
      {/* 一支往上指的細箭頭，箭頭尖剛好碰到格子下方的索引 */}
      <svg className="board-pointer-arrow" width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        <path d="M6 0.5 10.5 6H7.25V12H4.75V6H1.5Z" />
      </svg>
      {editing ? (
        <input
          className="board-pointer-input"
          style={{ width: POINTER_W }}
          value={el.name}
          aria-label={t.board.pointerName}
          maxLength={12}
          autoFocus
          onChange={(e) => onChange({ name: e.target.value })}
          onKeyDown={editKeys(onDoneEditing)}
        />
      ) : (
        <span className="board-pointer-name" style={{ height: POINTER_H - 12 }}>
          {el.name}
        </span>
      )}
    </>
  );
}

/** 螢幕閱讀器念的元件內容 */
function describe(el: Placed, doc: BoardDoc, t: ReturnType<typeof useI18n>['t']): string {
  switch (el.type) {
    case 'text':
      return `${t.board.kinds[el.variant]}: ${el.text}`;
    case 'list':
      if (el.variant === 'heap') {
        return `${t.board.kinds.heap} ${el.label} (${el.order === 'max' ? t.board.heap.max : t.board.heap.min}): ${el.items.join(', ')}`;
      }
      return `${t.board.kinds[el.variant]} ${el.label}: ${el.items.join(el.variant === 'linked' ? ' → ' : ', ')}`;
    case 'tree':
      return `${t.board.kinds.binaryTree} ${el.label}: ${serializeTree(el)}`;
    case 'graph':
      return `${t.board.kinds.graph} ${el.label}${el.directed ? ` (${t.board.directed})` : ''}: ${serializeGraph(el)}`;
    case 'table':
      return `${t.board.kinds[el.variant]} ${el.label}: ${el.rows.map((r) => r.join(' ')).join('; ')}`;
    case 'var':
      return `${t.board.kinds.var} ${el.name} = ${el.value}`;
    case 'node':
      return `${t.board.kinds[el.variant === 'tree' ? 'treeNode' : el.variant === 'list' ? 'listNode' : 'graphNode']} ${el.value}`;
    case 'pointer': {
      if (!el.attach) return `${t.board.kinds.pointer} ${el.name}`;
      const target = doc.elements.find((x) => x.id === el.attach!.id);
      if (target?.type === 'tree' || target?.type === 'graph') return t.board.pointerAtNode(el.name, target.nodes[el.attach.index] ?? '');
      return t.board.pointerAt(el.name, el.attach.index);
    }
    case 'shape':
      return t.board.shapes[el.variant];
  }
}
