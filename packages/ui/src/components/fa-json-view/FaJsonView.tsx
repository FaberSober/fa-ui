import React, { CSSProperties, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Tooltip } from 'antd';
import { CompressOutlined, CopyOutlined, ExpandOutlined, LineHeightOutlined } from '@ant-design/icons';
import { copyToClipboard } from '@ui/utils/utils';
import JsonNode from './JsonNode';
import JsonValue from './JsonValue';
import {
  RenderContext,
  collectContainerPaths,
  computeInitialExpanded,
  isContainer,
  normalizeData,
  safeStringify,
} from './utils';
import './FaJsonView.css';

export interface FaJsonViewProps {
  /**
   * 待展示数据：
   * - string：按 JSON 字符串解析（解析失败展示错误信息）
   * - object / array：直接展示
   * - null / undefined / 空串：展示空状态
   */
  data: any;
  /**
   * 默认展开层级：
   * - 'all'：全部展开（默认）
   * - 0：全折叠
   * - N：展开到第 N 层（根为第 1 层）
   */
  defaultExpandDepth?: number | 'all';
  /** 是否展示工具栏（展开全部 / 折叠全部 / 复制 JSON），默认 true */
  showToolbar?: boolean;
  /** 内容区最大高度（px），超出后内部滚动，默认 300 */
  maxHeight?: number;
  /** 默认是否自动换行（超宽内容换行展示），默认 true；关闭后超宽内容横向滚动 */
  defaultWrap?: boolean;
  /** 渲染节点上限，防止超大 JSON 卡死，默认 5000 */
  maxRenderNodes?: number;
  /** 自定义异常渲染（默认使用 antd Alert 展示错误信息） */
  errorRender?: (error: Error) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * 简单 JSON 展示组件：
 * - 支持 JSON 字符串 / 对象 / 数组解析展示
 * - 节点点击折叠、展开，工具栏支持自动换行切换 / 展开全部 / 折叠全部 / 复制 JSON
 * - defaultExpandDepth 控制默认展开层级，defaultWrap 控制默认自动换行
 * - 异常数据（解析失败 / 空数据 / 循环引用 / 超大 JSON）均有兜底展示
 */
export default function FaJsonView({
  data,
  defaultExpandDepth = 'all',
  showToolbar = true,
  maxHeight = 300,
  defaultWrap = true,
  maxRenderNodes = 5000,
  errorRender,
  className,
  style,
}: FaJsonViewProps) {
  const norm = useMemo(() => normalizeData(data), [data]);
  // 首屏直接按 defaultExpandDepth 初始化，避免先折叠再展开的闪烁
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    norm.status === 'ok' ? computeInitialExpanded(norm.value, defaultExpandDepth, maxRenderNodes) : new Set(),
  );
  // 自动换行开关（视图偏好，data 变化时保留）
  const [wrap, setWrap] = useState<boolean>(defaultWrap);

  // data 或默认展开层级变化时，重置展开状态
  useEffect(() => {
    if (norm.status === 'ok') {
      setExpanded(computeInitialExpanded(norm.value, defaultExpandDepth, maxRenderNodes));
    } else {
      setExpanded(new Set());
    }
  }, [norm, defaultExpandDepth, maxRenderNodes]);

  const toggle = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    if (norm.status !== 'ok') return;
    setExpanded(collectContainerPaths(norm.value, maxRenderNodes));
  }, [norm, maxRenderNodes]);

  const handleCollapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const handleCopy = useCallback(() => {
    if (norm.status !== 'ok') return;
    copyToClipboard(safeStringify(norm.value), 'JSON');
  }, [norm]);

  let body: ReactNode;
  if (norm.status === 'empty') {
    body = <div className="fa-json-empty">暂无数据</div>;
  } else if (norm.status === 'error') {
    body = errorRender ? (
      errorRender(norm.error as Error)
    ) : (
      <div className="fa-json-error">
        <Alert type="error" showIcon message="JSON 解析失败" description={norm.error?.message} />
      </div>
    );
  } else {
    // 根为容器：递归渲染；根为标量：单行叶子
    if (isContainer(norm.value)) {
      const ctx: RenderContext = { maxNodes: maxRenderNodes, count: 0, truncated: false, ancestors: new WeakSet() };
      body = <JsonNode value={norm.value} segments={[]} level={0} expanded={expanded} onToggle={toggle} ctx={ctx} wrap={wrap} />;
    } else {
      body = <JsonValue value={norm.value} level={0} wrap={wrap} />;
    }
  }

  return (
    <div className={`fa-json-view${wrap ? ' fa-json-view-wrap' : ''}${className ? ` ${className}` : ''}`} style={style}>
      {showToolbar && (
        <div className="fa-json-view-toolbar">
          <Tooltip title={wrap ? '关闭自动换行' : '开启自动换行'}>
            <a className={`fa-json-toolbar-btn${wrap ? ' fa-json-toolbar-btn-active' : ''}`} onClick={() => setWrap((v) => !v)}>
              <LineHeightOutlined />
            </a>
          </Tooltip>
          <Tooltip title="展开全部">
            <a className="fa-json-toolbar-btn" onClick={handleExpandAll}>
              <ExpandOutlined />
            </a>
          </Tooltip>
          <Tooltip title="折叠全部">
            <a className="fa-json-toolbar-btn" onClick={handleCollapseAll}>
              <CompressOutlined />
            </a>
          </Tooltip>
          <Tooltip title="复制 JSON">
            <a className="fa-json-toolbar-btn" onClick={handleCopy}>
              <CopyOutlined />
            </a>
          </Tooltip>
        </div>
      )}
      <div className="fa-json-view-body" style={{ maxHeight }}>{body}</div>
    </div>
  );
}
