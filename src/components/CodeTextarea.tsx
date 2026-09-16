import { useRef, type KeyboardEvent } from 'react';

interface CodeTextareaProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  'aria-describedby'?: string;
}

const INDENT = '    ';

/** Tab 插入四個空白；先按 Esc 再按 Tab 可以離開輸入框 */
export function CodeTextarea({ value, onChange, rows = 12, ...rest }: CodeTextareaProps) {
  const escaped = useRef(false);

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      escaped.current = true;
      return;
    }
    if (e.key !== 'Tab' || e.shiftKey || escaped.current) {
      escaped.current = false;
      return;
    }
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart, selectionEnd } = el;
    const next = value.slice(0, selectionStart) + INDENT + value.slice(selectionEnd);
    onChange(next);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = selectionStart + INDENT.length;
    });
  }

  return (
    <textarea
      {...rest}
      className="textarea code-input"
      rows={rows}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}
