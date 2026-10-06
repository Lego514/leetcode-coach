import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useI18n } from '../../i18n';
import {
  CELL,
  colorVar,
  INDEX_H,
  isIndexed,
  LABEL_H,
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
      data-selected={selected || undefined}
      data-editing={editing || undefined}
      role="group"
      aria-label={describe(el, t)}
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
      return <ListBody el={el} editing={editing} onChange={onChange} onDoneEditing={onDoneEditing} {...rest} />;
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
}: {
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
  const style = { width: wide ? WIDE_CELL : CELL, height: CELL };
  const data = {
    'data-cell': index,
    'data-color': color ?? undefined,
    'data-snap': snap || undefined,
    'data-picked': picked || undefined,
  };
  if (!editing) {
    return (
      <span className="board-cell" style={style} title={value} {...data}>
        {value}
      </span>
    );
  }
  return (
    <input
      className="board-cell board-cell-input"
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
function describe(el: Placed, t: ReturnType<typeof useI18n>['t']): string {
  switch (el.type) {
    case 'text':
      return `${t.board.kinds[el.variant]}: ${el.text}`;
    case 'list':
      return `${t.board.kinds[el.variant]} ${el.label}: ${el.items.join(', ')}`;
    case 'table':
      return `${t.board.kinds[el.variant]} ${el.label}: ${el.rows.map((r) => r.join(' ')).join('; ')}`;
    case 'var':
      return `${t.board.kinds.var} ${el.name} = ${el.value}`;
    case 'node':
      return `${t.board.kinds[el.variant === 'tree' ? 'treeNode' : el.variant === 'list' ? 'listNode' : 'graphNode']} ${el.value}`;
    case 'pointer':
      return el.attach ? t.board.pointerAt(el.name, el.attach.index) : `${t.board.kinds.pointer} ${el.name}`;
    case 'shape':
      return t.board.shapes[el.variant];
  }
}
