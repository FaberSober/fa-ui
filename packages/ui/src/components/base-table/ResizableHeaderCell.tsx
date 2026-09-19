import {
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
} from 'react';

export const DEFAULT_COLUMN_WIDTH = 200;
const MIN_COLUMN_WIDTH = 80;

export type ResizableHeaderCellProps = Omit<HTMLAttributes<HTMLTableCellElement>, 'onResize'> & {
  width?: number;
  onResize?: (width: number) => void;
  onResizeStop?: (width: number) => void;
  children?: ReactNode;
};

export default function ResizableHeaderCell({ width, onResize, onResizeStop, style, className, children, ...props }: ResizableHeaderCellProps) {
  const resizeRef = useRef<{ startX: number; startWidth: number; pointerId: number }>();

  useEffect(
    () => () => {
      document.body.classList.remove('fa-drag-area-no-select');
    },
    [],
  );

  function getNextWidth(clientX: number) {
    const resize = resizeRef.current;
    if (!resize) return width || DEFAULT_COLUMN_WIDTH;
    return Math.max(MIN_COLUMN_WIDTH, Math.round(resize.startWidth + clientX - resize.startX));
  }

  function startResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const cellWidth = event.currentTarget.closest('th')?.getBoundingClientRect().width;
    resizeRef.current = {
      startX: event.clientX,
      startWidth: Math.max(MIN_COLUMN_WIDTH, cellWidth || width || DEFAULT_COLUMN_WIDTH),
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.classList.add('fa-drag-area-no-select');
  }

  function moveResize(event: ReactPointerEvent<HTMLButtonElement>) {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    onResize?.(getNextWidth(event.clientX));
  }

  function finishResize(event: ReactPointerEvent<HTMLButtonElement>) {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    const nextWidth = getNextWidth(event.clientX);
    onResize?.(nextWidth);
    onResizeStop?.(nextWidth);
    resizeRef.current = undefined;
    document.body.classList.remove('fa-drag-area-no-select');
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function cancelResize(event: ReactPointerEvent<HTMLButtonElement>) {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    resizeRef.current = undefined;
    document.body.classList.remove('fa-drag-area-no-select');
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    event.stopPropagation();
    const cellWidth = event.currentTarget.closest('th')?.getBoundingClientRect().width;
    const currentWidth = Math.max(MIN_COLUMN_WIDTH, cellWidth || width || DEFAULT_COLUMN_WIDTH);
    const nextWidth = Math.max(MIN_COLUMN_WIDTH, currentWidth + (event.key === 'ArrowRight' ? 10 : -10));
    onResize?.(nextWidth);
    onResizeStop?.(nextWidth);
  }

  return (
    <th {...props} className={['fa-table-resizable-header', className].filter(Boolean).join(' ')} style={style}>
      {children}
      {onResize ? (
        <button
          type="button"
          className="fa-table-resize-handle"
          aria-label="调整列宽"
          onPointerDown={startResize}
          onPointerMove={moveResize}
          onPointerUp={finishResize}
          onPointerCancel={cancelResize}
          onKeyDown={handleKeyDown}
          onClick={(event) => event.stopPropagation()}
        />
      ) : null}
    </th>
  );
}
