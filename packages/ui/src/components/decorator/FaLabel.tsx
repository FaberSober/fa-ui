import React, { CSSProperties } from 'react';

export interface FaLabelProps {
  title: string;
  barColor?: string;
  className?: string;
  style?: CSSProperties;
  textStyle?: CSSProperties;
  block?: boolean; // 是否块式
}

/**
 * @author xu.pengfei
 * @date 2021/6/16
 */
export default function FaLabel({ title, barColor, className, style, textStyle, block }: FaLabelProps) {
  return (
    <div
      style={{
        display: block ? 'flex' : 'inline-flex',
        alignItems: 'center',
        padding: '4px 12px',
        borderLeft: `4px solid #00878b`,
        backgroundColor: 'var(--fa-bg-color)',
        ...style,
      }}
      className={className}
    >
      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fa-text-color)', ...textStyle }}>{title}</div>
    </div>
  );
}
