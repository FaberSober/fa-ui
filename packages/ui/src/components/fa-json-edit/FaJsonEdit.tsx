import React, { CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, Space, Tooltip } from 'antd';
import { CompressOutlined, CopyOutlined, FileTextOutlined, FormatPainterOutlined, PartitionOutlined } from '@ant-design/icons';
import { copyToClipboard } from '@ui/utils/utils';
import { buildPath, computeInitialExpanded } from '../fa-json-view/utils';
import FaJsonEditNode from './FaJsonEditNode';
import type { JsonEditContext, JsonValue } from './FaJsonEditNode';
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
  const parsed = useMemo(() => parseJson(text), [text]);

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
      if (nextKey !== oldKey && Object.prototype.hasOwnProperty.call(parent, nextKey)) return '字段名已存在';

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

  const context: JsonEditContext = { maxNodes: maxRenderNodes, count: 0, truncated: false };
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
          <Alert className="fa-json-edit-error" type="error" showIcon message="JSON 解析失败" description={parsed.error?.message} />
        )}
      </div>
    );
  } else if (parsed.status === 'error') {
    body = (
      <div className="fa-json-edit-invalid-tree">
        <Alert type="error" showIcon message="无法进行图形编辑" description={parsed.error?.message} />
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
        expanded={expanded}
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
          <Space size={4}>
            <Tooltip title="图形编辑">
              <Button
                size="small"
                type={mode === 'tree' ? 'primary' : 'default'}
                icon={<PartitionOutlined />}
                onClick={() => handleModeChange('tree')}
              >
                图形
              </Button>
            </Tooltip>
            <Tooltip title="源文本编辑">
              <Button
                size="small"
                type={mode === 'text' ? 'primary' : 'default'}
                icon={<FileTextOutlined />}
                onClick={() => handleModeChange('text')}
              >
                源文本
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
          {modeError && <span className="fa-json-edit-mode-error">{modeError}</span>}
        </div>
      )}
      <div className="fa-json-edit-body" style={{ maxHeight }}>
        {body}
      </div>
    </div>
  );
}
