import React from 'react';
import { Tooltip } from 'antd';
import { formatKeyLabel, getScalarDisplay } from './utils';

export interface JsonValueProps {
  /** 标量值 */
  value: any;
  /** 父级中的 key / 数组索引；根节点标量不传 */
  label?: string | number;
  /** 层级（决定缩进） */
  level: number;
}

/** 单行内边距（与 JsonNode 保持一致） */
export const JSON_INDENT = 16;
/** 超长文本省略阈值 */
const MAX_TEXT_LENGTH = 200;

/**
 * 标量叶子节点渲染：按类型着色，超长字符串省略 + Tooltip 全文
 */
export default function JsonValue({ value, label, level }: JsonValueProps) {
  const { text, type } = getScalarDisplay(value);

  let content: React.ReactNode;
  if (text.length > MAX_TEXT_LENGTH) {
    content = (
      <Tooltip title={text} mouseEnterDelay={0.3}>
        <span className={`fa-json-value fa-json-${type}`}>{`${text.slice(0, MAX_TEXT_LENGTH)}…`}</span>
      </Tooltip>
    );
  } else {
    content = <span className={`fa-json-value fa-json-${type}`}>{text}</span>;
  }

  return (
    <div className="fa-json-row" style={{ paddingLeft: level * JSON_INDENT }}>
      {label !== undefined && (
        <>
          <span className="fa-json-key">{formatKeyLabel(label)}</span>
          <span className="fa-json-colon">: </span>
        </>
      )}
      {content}
    </div>
  );
}
