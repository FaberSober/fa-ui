import React, { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Input, Space, Tooltip } from 'antd';
import { CompressOutlined, CopyOutlined, DownOutlined, FileTextOutlined, FormatPainterOutlined, PartitionOutlined, UpOutlined } from '@ant-design/icons';
import { copyToClipboard } from '@ui/utils/utils';
import { buildPath, computeInitialExpanded } from '../fa-json-view/utils';
import FaJsonEditNode from './FaJsonEditNode';
import type { JsonEditContext, JsonValue } from './FaJsonEditNode';
import { findJsonMatches, findTextMatches, type JsonSearchMatch } from './search';
import './FaJsonEdit.css';

export type { JsonValue };

export interface FaJsonEditProps {
  /** JSON 源文本，支持受控模式 */
  value?: string;
  /** 非受控初始 JSON 文本 */
  defaultValue?: string;
  /** 文本变化，包括暂时非法的 JSON */
  onChange?: (value: string) => void;
  /** 默认编辑模式 */
  defaultMode?: 'tree' | 'text';
  /** 默认展开层级：'all' 全部展开；0 全折叠；N 展开到第 N 层 */
  defaultExpandDepth?: number | 'all';
  /** 是否只读 */
  readOnly?: boolean;
  /** 是否展示工具栏 */
  showToolbar?: boolean;
  /** 内容区最大高度（px） */
  maxHeight?: number;
  /** JSON 格式化缩进空格数 */
  indent?: number;
  /** 树形编辑节点上限 */
  maxRenderNodes?: number;
  className?: string;
  style?: CSSProperties;
}

type ParseResult = { status: 'ok'; value: JsonValue } | { status: 'error'; error: Error };

function isJsonContainer(value: JsonValue | undefined): value is JsonValue[] | { [key: string]: JsonValue } {
  return Array.isArray(value) || (value !== null && typeof value === 'object');
}

function parseJson(text: string): ParseResult {
  try {
    return { status: 'ok', value: JSON.parse(text) as JsonValue };
  } catch (error) {
    return { status: 'error', error: error instanceof Error ? error : new Error(String(error)) };
  }
}

function stringifyJson(value: JsonValue, indent: number): string {
  return JSON.stringify(value, null, indent);
}

function getAtPath(value: JsonValue, path: (string | number)[]): JsonValue | undefined {
  let current: any = value;
  for (const segment of path) {
    if (current === null || current === undefined) return undefined;
    current = current[segment];
  }
  return current as JsonValue;
}

function updateAtPath(value: JsonValue, path: (string | number)[], updater: (current: JsonValue) => JsonValue): JsonValue {
  if (path.length === 0) return updater(value);

  const [segment, ...rest] = path;
  if (Array.isArray(value)) {
    const next = [...value];
    next[Number(segment)] = updateAtPath(next[Number(segment)], rest, updater);
    return next;
  }

  const next = { ...(value as Record<string, JsonValue>) };
  next[String(segment)] = updateAtPath(next[String(segment)], rest, updater);
  return next;
}

function removeAtPath(value: JsonValue, path: (string | number)[]): JsonValue {
  if (path.length === 0) return value;

  const parentPath = path.slice(0, -1);
  const segment = path[path.length - 1];
  return updateAtPath(value, parentPath, (parent) => {
    if (Array.isArray(parent)) {
      return parent.filter((_item, index) => index !== Number(segment));
    }

    const next = { ...(parent as Record<string, JsonValue>) };
    delete next[String(segment)];
    return next;
  });
}

function createDefaultValue(type: 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array'): JsonValue {
  switch (type) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'object':
      return {};
    case 'array':
      return [];
    default:
      return null;
  }
}

export default function FaJsonEdit({
  value,
  defaultValue = '',
  onChange,
  defaultMode = 'tree',
  defaultExpandDepth = 'all',
  readOnly = false,
  showToolbar = true,
  maxHeight = 400,
  indent = 2,
  maxRenderNodes = 5000,
  className,
  style,
}: FaJsonEditProps) {
  const isControlled = value !== undefined;
  const [text, setText] = useState(() => value ?? defaultValue);
  const [mode, setMode] = useState<'tree' | 'text'>(defaultMode);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const parsed = parseJson(value ?? defaultValue);
    return parsed.status === 'ok' ? computeInitialExpanded(parsed.value, defaultExpandDepth, maxRenderNodes) : new Set();
  });
  const [modeError, setModeError] = useState<string>();
  const [search, setSearch] = useState({ query: '', index: 0 });
  const bodyRef = useRef<HTMLDivElement>(null);
  const parsed = useMemo(() => parseJson(text), [text]);
  const matches = useMemo<JsonSearchMatch[]>(() => {
    if (mode === 'text') return findTextMatches(text, search.query);
    return parsed.status === 'ok' ? findJsonMatches(parsed.value, search.query, maxRenderNodes).map((path) => ({ path })) : [];
  }, [mode, text, parsed, search.query, maxRenderNodes]);
  const matchIndex = Math.min(search.index, Math.max(0, matches.length - 1));
  const activeMatch = matches[matchIndex];
  const searchPaths = new Set(matches.flatMap((match) => 'path' in match ? [buildPath(match.path)] : []));
  const visibleExpanded = activeMatch && 'path' in activeMatch ? new Set(expanded) : expanded;
  if (activeMatch && 'path' in activeMatch) {
    for (let index = 0; index < activeMatch.path.length; index += 1) {
      visibleExpanded.add(buildPath(activeMatch.path.slice(0, index)));
    }
  }

  // 仅在主动查找或切换模式时定位，避免编辑过程中抢夺光标。
  useEffect(() => {
    if (!activeMatch) return;
    if ('path' in activeMatch) {
      bodyRef.current?.querySelector('.fa-json-edit-search-active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } else {
      const textarea = bodyRef.current?.querySelector('textarea');
      textarea?.setSelectionRange(activeMatch.start, activeMatch.end);
      textarea?.focus();
    }
  }, [search, mode]);

  function moveSearch(step: number) {
    if (!matches.length) return;
    setSearch({ ...search, index: (matchIndex + step + matches.length) % matches.length });
  }

  useEffect(() => {
    if (!isControlled) return;
    setText(value ?? '');
    const next = parseJson(value ?? '');
    setExpanded(next.status === 'ok' ? computeInitialExpanded(next.value, defaultExpandDepth, maxRenderNodes) : new Set());
  }, [defaultExpandDepth, isControlled, maxRenderNodes, value]);

  const emitText = useCallback(
    (nextText: string) => {
      setText(nextText);
      onChange?.(nextText);
    },
    [onChange],
  );

  const handleModeChange = useCallback(
    (nextMode: 'tree' | 'text') => {
      if (nextMode === 'tree' && parsed.status !== 'ok') {
        setModeError('当前 JSON 无法解析，请先修复源文本后再切换到图形编辑。');
        return;
      }
      setModeError(undefined);
      setMode(nextMode);
    },
    [parsed],
  );

  const handleFormat = useCallback(() => {
    if (parsed.status === 'ok') emitText(stringifyJson(parsed.value, indent));
  }, [emitText, indent, parsed]);

  const handleMinify = useCallback(() => {
    if (parsed.status === 'ok') emitText(JSON.stringify(parsed.value));
  }, [emitText, parsed]);

  const handleCopy = useCallback(() => {
    copyToClipboard(text, 'JSON');
  }, [text]);

  const handleTreeChange = useCallback(
    (nextValue: JsonValue) => {
      emitText(stringifyJson(nextValue, indent));
    },
    [emitText, indent],
  );

  const handleUpdate = useCallback(
    (path: (string | number)[], nextValue: JsonValue) => {
      if (parsed.status !== 'ok') return;
      handleTreeChange(updateAtPath(parsed.value, path, () => nextValue));
    },
    [handleTreeChange, parsed],
  );

  const handleDelete = useCallback(
    (path: (string | number)[]) => {
      if (parsed.status !== 'ok' || path.length === 0) return;
      handleTreeChange(removeAtPath(parsed.value, path));
    },
    [handleTreeChange, parsed],
  );

  const handleAdd = useCallback(
    (path: (string | number)[]) => {
      if (parsed.status !== 'ok') return;
      const container = getAtPath(parsed.value, path);
      if (!isJsonContainer(container)) return;

      const nextValue = updateAtPath(parsed.value, path, (current) => {
        if (Array.isArray(current)) return [...current, null];
        const object = current as Record<string, JsonValue>;
        let key = 'newKey';
        let suffix = 1;
        while (Object.prototype.hasOwnProperty.call(object, key)) key = `newKey${suffix++}`;
        return { ...object, [key]: null };
      });
      setExpanded((previous) => new Set(previous).add(buildPath(path)));
      handleTreeChange(nextValue);
    },
    [handleTreeChange, parsed],
  );

  const handleRename = useCallback(
    (path: (string | number)[], nextKey: string): string | undefined => {
      if (parsed.status !== 'ok' || path.length === 0 || typeof path[path.length - 1] !== 'string') return;
      if (!nextKey.trim()) return '字段名不能为空';

      const parent = getAtPath(parsed.value, path.slice(0, -1));
      if (!parent || Array.isArray(parent) || !isJsonContainer(parent)) return '字段名无法修改';
      const oldKey = String(path[path.length - 1]);
      if (nextKey === oldKey) return;
      if (Object.prototype.hasOwnProperty.call(parent, nextKey)) return '字段名已存在';

      const nextValue = updateAtPath(parsed.value, path.slice(0, -1), (current) => {
        const object = { ...(current as Record<string, JsonValue>) };
        object[nextKey] = object[oldKey];
        delete object[oldKey];
        return object;
      });
      handleTreeChange(nextValue);
    },
    [handleTreeChange, parsed],
  );

  const context: JsonEditContext = {
    maxNodes: maxRenderNodes, count: 0, truncated: false, searchPaths,
    activeSearchPath: activeMatch && 'path' in activeMatch ? buildPath(activeMatch.path) : undefined,
  };
  let body: React.ReactNode;

  if (mode === 'text') {
    body = (
      <div className="fa-json-edit-text-body">
        <Input.TextArea
          value={text}
          readOnly={readOnly}
          onChange={(event) => emitText(event.target.value)}
          className="fa-json-edit-textarea"
          spellCheck={false}
          style={{ minHeight: maxHeight - 20 }}
        />
        {parsed.status === 'error' && (
          <Alert className="fa-json-edit-error" type="error" showIcon title="JSON 解析失败" description={parsed.error?.message} />
        )}
      </div>
    );
  } else if (parsed.status === 'error') {
    body = (
      <div className="fa-json-edit-invalid-tree">
        <Alert type="error" showIcon title="无法进行图形编辑" description={parsed.error?.message} />
        <Button size="small" icon={<FileTextOutlined />} onClick={() => handleModeChange('text')}>
          编辑源文本
        </Button>
      </div>
    );
  } else {
    body = (
      <FaJsonEditNode
        value={parsed.value}
        segments={[]}
        level={0}
        expanded={visibleExpanded}
        onToggle={(path) =>
          setExpanded((previous) => {
            const next = new Set(previous);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
          })
        }
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onAdd={handleAdd}
        onRename={handleRename}
        onChangeType={(path, type) => handleUpdate(path, createDefaultValue(type))}
        readOnly={readOnly}
        ctx={context}
      />
    );
  }

  return (
    <div className={`fa-json-edit${className ? ` ${className}` : ''}`} style={style}>
      {showToolbar && (
        <div className="fa-json-edit-toolbar">
          <Space size={4} className="fa-json-edit-tools">
            <Tooltip title="图形编辑">
              <Button
                size="small"
                aria-label="图形编辑"
                type={mode === 'tree' ? 'primary' : 'default'}
                icon={<PartitionOutlined />}
                onClick={() => handleModeChange('tree')}
              >
                <span className="fa-json-edit-mode-label">图形</span>
              </Button>
            </Tooltip>
            <Tooltip title="源文本编辑">
              <Button
                size="small"
                aria-label="源文本编辑"
                type={mode === 'text' ? 'primary' : 'default'}
                icon={<FileTextOutlined />}
                onClick={() => handleModeChange('text')}
              >
                <span className="fa-json-edit-mode-label">源文本</span>
              </Button>
            </Tooltip>
            <Tooltip title="格式化 JSON">
              <Button size="small" icon={<FormatPainterOutlined />} disabled={parsed.status !== 'ok' || readOnly} onClick={handleFormat} />
            </Tooltip>
            <Tooltip title="压缩 JSON">
              <Button size="small" icon={<CompressOutlined />} disabled={parsed.status !== 'ok' || readOnly} onClick={handleMinify} />
            </Tooltip>
            <Tooltip title="复制 JSON">
              <Button size="small" icon={<CopyOutlined />} onClick={handleCopy} />
            </Tooltip>
          </Space>
          <div className="fa-json-edit-search">
            <Input.Search size="small" placeholder="搜索属性或内容" aria-label="搜索 JSON 属性或内容" allowClear
              onSearch={(query) => setSearch({ query, index: 0 })} />
            {search.query && <>
              <output className="fa-json-edit-search-count" aria-live="polite">{matches.length ? `${matchIndex + 1}/${matches.length}` : '无结果'}</output>
              <Button size="small" type="text" aria-label="上一个匹配项" title="上一个匹配项" icon={<UpOutlined />} disabled={!matches.length} onClick={() => moveSearch(-1)} />
              <Button size="small" type="text" aria-label="下一个匹配项" title="下一个匹配项" icon={<DownOutlined />} disabled={!matches.length} onClick={() => moveSearch(1)} />
            </>}
          </div>
          {modeError && <span className="fa-json-edit-mode-error">{modeError}</span>}
        </div>
      )}
      <div ref={bodyRef} className="fa-json-edit-body" style={{ maxHeight }}>
        {body}
      </div>
    </div>
  );
}
