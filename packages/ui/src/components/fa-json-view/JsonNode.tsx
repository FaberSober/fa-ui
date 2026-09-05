import React, { ReactNode } from 'react';
import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import JsonValue, { JSON_INDENT } from './JsonValue';
import {
  RenderContext,
  buildPath,
  formatKeyLabel,
  getContainerKeys,
  getContainerMeta,
  isContainer,
} from './utils';

export interface JsonNodeProps {
  /** 任意 JSON 值（容器或标量） */
  value: any;
  /** 父级中的 key / 数组索引；根节点不传 */
  label?: string | number;
  /** 路径片段，用于生成展开状态 key */
  segments: (string | number)[];
  /** 层级（决定缩进） */
  level: number;
  /** 已展开节点路径集合 */
  expanded: Set<string>;
  /** 点击容器行切换展开状态 */
  onToggle: (path: string) => void;
  /** 递归渲染共享上下文（容量计数 + 循环引用检测） */
  ctx: RenderContext;
}

/**
 * 递归渲染节点：
 * - 容器（对象/数组）：可折叠行，展开后渲染子节点与闭合括号
 * - 标量：交给 JsonValue 渲染
 * - 循环引用：渲染 [Circular] 标记，不再递归
 * - 超出 maxRenderNodes：渲染截断提示并停止递归
 */
export default function JsonNode({ value, label, segments, level, expanded, onToggle, ctx }: JsonNodeProps) {
  // 已达上限：后续节点一律不渲染
  if (ctx.truncated) return null;

  ctx.count += 1;
  if (ctx.count > ctx.maxNodes) {
    ctx.truncated = true;
    return (
      <div className="fa-json-truncate" style={{ paddingLeft: level * JSON_INDENT }}>
        … 内容过多，已截断（超过 {ctx.maxNodes} 个节点上限）
      </div>
    );
  }

  // 标量叶子
  if (!isContainer(value)) {
    return <JsonValue value={value} label={label} level={level} />;
  }

  // 循环引用：出现在自身祖先链上，渲染标记不再递归
  if (ctx.ancestors.has(value)) {
    return (
      <div className="fa-json-row" style={{ paddingLeft: level * JSON_INDENT }}>
        {label !== undefined && (
          <>
            <span className="fa-json-key">{formatKeyLabel(label)}</span>
            <span className="fa-json-colon">: </span>
          </>
        )}
        <span className="fa-json-circular">[Circular]</span>
      </div>
    );
  }

  const path = buildPath(segments);
  const meta = getContainerMeta(value);
  const keys = getContainerKeys(value);
  const isEmpty = keys.length === 0;
  const isExpanded = expanded.has(path);

  let children: ReactNode[] = [];
  if (isExpanded && !isEmpty) {
    ctx.ancestors.add(value);
    try {
      for (const key of keys) {
        children.push(
          <JsonNode
            key={String(key)}
            value={value[key]}
            label={key}
            segments={[...segments, key]}
            level={level + 1}
            expanded={expanded}
            onToggle={onToggle}
            ctx={ctx}
          />,
        );
        if (ctx.truncated) break;
      }
    } finally {
      ctx.ancestors.delete(value);
    }
  }

  return (
    <div>
      {/* 容器行：空容器不可折叠 */}
      <div
        className={`fa-json-row${isEmpty ? '' : ' fa-json-row-clickable'}`}
        style={{ paddingLeft: level * JSON_INDENT }}
        onClick={() => !isEmpty && onToggle(path)}
      >
        {!isEmpty && <span className="fa-json-arrow">{isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}</span>}
        {label !== undefined && (
          <>
            <span className="fa-json-key">{formatKeyLabel(label)}</span>
            <span className="fa-json-colon">: </span>
          </>
        )}
        {isExpanded ? <span className="fa-json-brace">{meta.open}</span> : <span className="fa-json-summary">{meta.summary}</span>}
      </div>

      {/* 展开后的子节点与闭合括号 */}
      {isExpanded && !isEmpty && (
        <div>
          {children}
          <div className="fa-json-row" style={{ paddingLeft: level * JSON_INDENT }}>
            <span className="fa-json-brace">{meta.close}</span>
          </div>
        </div>
      )}
    </div>
  );
}
