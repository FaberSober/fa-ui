import React, { CSSProperties, ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import './index.css';
import { MenuOutlined } from '@ant-design/icons';

export interface FaSortItemProps {
  id: any;
  handle?: boolean;
  handleNode?: ReactNode;
  style?: CSSProperties;
  className?: string | undefined;
  handleStyle?: CSSProperties;
  children?: ReactNode;
  /** true-只变更x坐标，固定y坐标 */
  vertical?: boolean;
  /** true-只变更y坐标，固定x坐标 */
  horizontal?: boolean;
  /** 父容器缩放比例，碰撞检测仍使用原始视口坐标。 */
  scale?: number;
  dragging?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * @author xu.pengfei
 * @date 2022/12/3 9:54
 */
export default function FaSortItem({
  id,
  style,
  className,
  handle,
  handleNode,
  handleStyle,
  children,
  vertical,
  horizontal,
  scale = 1,
  dragging,
  onClick,
}: FaSortItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: id });
  const translateX = (transform?.x || 0) / scale;
  const translateY = (transform?.y || 0) / scale;

  const styleTrans: CSSProperties = {
    // transform: CSS.Transform.toString(transform),
    transform: transform ? `translate3d(${translateX}px, ${translateY}px, 0)` : '',
    transition,
    cursor: handle ? 'default' : 'grab',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: dragging ? 999 : undefined,
    boxShadow: dragging ? '8px 8px 8px rgba(0, 21, 41, 0.08)' : undefined,
    backgroundColor: 'var(--fa-bg-color)',
    position: 'relative',
  };
  if (vertical) {
    styleTrans.transform = transform
      ? `translate3d(0px, ${translateY}px, 0)`
      : '';
  }
  if (horizontal) {
    styleTrans.transform = transform
      ? `translate3d(${translateX}px, 0px, 0)`
      : '';
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: useSortable 提供 role 和键盘属性，拖拽把手承接交互。
    <div ref={setNodeRef} className={className} style={{ ...styleTrans, ...style }} onClick={onClick} {...(handle ? {} : listeners)} {...attributes}>
      {children}
      {handle && (
        <div className="fa-drag-handle" style={handleStyle} {...listeners}>
          {handleNode ? handleNode : <MenuOutlined />}
        </div>
      )}
    </div>
  );
}
