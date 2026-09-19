import React, { useEffect, useState } from 'react';
import { Button, Input, InputNumber, Select, Switch, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { buildPath, formatKeyLabel, getContainerKeys, getContainerMeta } from '../fa-json-view/utils';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonPath = (string | number)[];
export type JsonScalarType = 'string' | 'number' | 'boolean' | 'null';
export type JsonNodeType = JsonScalarType | 'object' | 'array';

function isJsonContainer(value: JsonValue): value is JsonValue[] | { [key: string]: JsonValue } {
  return Array.isArray(value) || (value !== null && typeof value === 'object');
}

function getChildValue(value: JsonValue[] | { [key: string]: JsonValue }, key: string | number): JsonValue {
  return Array.isArray(value) ? value[Number(key)] : value[String(key)];
}

export interface JsonEditContext {
  maxNodes: number;
  count: number;
  truncated: boolean;
}

export interface FaJsonEditNodeProps {
  value: JsonValue;
  label?: string | number;
  segments: JsonPath;
  level: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onUpdate: (path: JsonPath, value: JsonValue) => void;
  onDelete: (path: JsonPath) => void;
  onAdd: (path: JsonPath) => void;
  onRename: (path: JsonPath, key: string) => string | undefined;
  onChangeType: (path: JsonPath, type: JsonNodeType) => void;
  readOnly: boolean;
  ctx: JsonEditContext;
}

function getScalarType(value: JsonPrimitive): JsonScalarType {
  if (value === null) return 'null';
  return typeof value as JsonScalarType;
}

function renderTypeOptions() {
  return [
    { value: 'string', label: '字符串' },
    { value: 'number', label: '数字' },
    { value: 'boolean', label: '布尔' },
    { value: 'null', label: 'null' },
    { value: 'object', label: '对象' },
    { value: 'array', label: '数组' },
  ];
}

function KeyEditor({ label, onRename }: { label: string; onRename: (value: string) => string | undefined }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!editing) setDraft(label);
  }, [editing, label]);

  if (!editing) {
    return (
      <>
        <span className="fa-json-edit-key">{formatKeyLabel(label)}</span>
        <Button
          type="text"
          size="small"
          className="fa-json-edit-inline-btn"
          icon={<EditOutlined />}
          onClick={(event) => {
            event.stopPropagation();
            setError(undefined);
            setEditing(true);
          }}
        />
      </>
    );
  }

  const commit = () => {
    const nextError = onRename(draft);
    if (nextError) {
      setError(nextError);
      return;
    }
    setEditing(false);
  };

  return (
    <span className="fa-json-edit-key-editor" onClick={(event) => event.stopPropagation()}>
      <Input
        size="small"
        autoFocus
        value={draft}
        status={error ? 'error' : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
          if (event.key === 'Escape') setEditing(false);
        }}
      />
      {error && <span className="fa-json-edit-key-error">{error}</span>}
    </span>
  );
}

function NodeActions({
  path,
  isContainerNode,
  readOnly,
  onAdd,
  onDelete,
}: {
  path: JsonPath;
  isContainerNode: boolean;
  readOnly: boolean;
  onAdd: (path: JsonPath) => void;
  onDelete: (path: JsonPath) => void;
}) {
  if (readOnly) return null;
  return (
    <span className="fa-json-edit-actions" onClick={(event) => event.stopPropagation()}>
      {isContainerNode && (
        <Tooltip title="新增子项">
          <Button type="text" size="small" icon={<PlusOutlined />} onClick={() => onAdd(path)} />
        </Tooltip>
      )}
      {path.length > 0 && (
        <Tooltip title="删除">
          <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => onDelete(path)} />
        </Tooltip>
      )}
    </span>
  );
}

function ScalarEditor({
  value,
  path,
  readOnly,
  onUpdate,
  onChangeType,
}: {
  value: JsonPrimitive;
  path: JsonPath;
  readOnly: boolean;
  onUpdate: (path: JsonPath, value: JsonValue) => void;
  onChangeType: (path: JsonPath, type: JsonNodeType) => void;
}) {
  const type = getScalarType(value);
  return (
    <span className="fa-json-edit-scalar">
      {!readOnly && (
        <Select
          size="small"
          value={type}
          options={renderTypeOptions()}
          onChange={(nextType) => onChangeType(path, nextType as JsonNodeType)}
        />
      )}
      {type === 'string' && (
        <Input.TextArea
          size="small"
          value={value as string}
          readOnly={readOnly}
          autoSize={{ minRows: 1, maxRows: 6 }}
          onChange={(event) => onUpdate(path, event.target.value)}
        />
      )}
      {type === 'number' && (
        <InputNumber
          size="small"
          value={value as number}
          disabled={readOnly}
          onChange={(nextValue) => {
            if (typeof nextValue === 'number') onUpdate(path, nextValue);
          }}
        />
      )}
      {type === 'boolean' && (
        <Switch size="small" checked={value as boolean} disabled={readOnly} onChange={(nextValue) => onUpdate(path, nextValue)} />
      )}
      {type === 'null' && <span className="fa-json-edit-null">null</span>}
    </span>
  );
}

export default function FaJsonEditNode({
  value,
  label,
  segments,
  level,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
  onAdd,
  onRename,
  onChangeType,
  readOnly,
  ctx,
}: FaJsonEditNodeProps) {
  if (ctx.truncated) return null;
  ctx.count += 1;
  if (ctx.count > ctx.maxNodes) {
    ctx.truncated = true;
    return (
      <div className="fa-json-edit-truncate" style={{ paddingLeft: level * 16 }}>
        … 内容过多，已截断（超过 {ctx.maxNodes} 个节点上限）
      </div>
    );
  }

  const path = buildPath(segments);
  const key = typeof label === 'string' ? label : undefined;
  const keyContent = key !== undefined ? <KeyEditor label={key} onRename={(nextKey) => onRename(segments, nextKey)} /> : null;

  if (!isJsonContainer(value)) {
    return (
      <div className={`fa-json-edit-row${typeof value === 'string' ? ' fa-json-edit-text-row' : ''}`} style={{ paddingLeft: level * 16 }}>
        {keyContent}
        {label !== undefined && <span className="fa-json-edit-colon">: </span>}
        <ScalarEditor value={value} path={segments} readOnly={readOnly} onUpdate={onUpdate} onChangeType={onChangeType} />
        <NodeActions path={segments} isContainerNode={false} readOnly={readOnly} onAdd={onAdd} onDelete={onDelete} />
      </div>
    );
  }

  const keys = getContainerKeys(value);
  const isEmpty = keys.length === 0;
  const isExpanded = expanded.has(path);
  const meta = getContainerMeta(value);

  return (
    <div>
      <div
        className={`fa-json-edit-row fa-json-edit-container-row${isEmpty ? '' : ' fa-json-edit-row-clickable'}`}
        style={{ paddingLeft: level * 16 }}
        onClick={() => !isEmpty && onToggle(path)}
      >
        {!isEmpty && <span className="fa-json-edit-arrow">{isExpanded ? '▾' : '▸'}</span>}
        {keyContent}
        {label !== undefined && <span className="fa-json-edit-colon">: </span>}
        <span className="fa-json-edit-brace">{isExpanded ? meta.open : meta.summary}</span>
        <NodeActions path={segments} isContainerNode readOnly={readOnly} onAdd={onAdd} onDelete={onDelete} />
      </div>
      {isExpanded && !isEmpty && (
        <div>
          {keys.map((childKey) => (
            <FaJsonEditNode
              key={String(childKey)}
              value={getChildValue(value, childKey)}
              label={childKey}
              segments={[...segments, childKey]}
              level={level + 1}
              expanded={expanded}
              onToggle={onToggle}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAdd={onAdd}
              onRename={onRename}
              onChangeType={onChangeType}
              readOnly={readOnly}
              ctx={ctx}
            />
          ))}
          {!ctx.truncated && (
            <div className="fa-json-edit-row" style={{ paddingLeft: level * 16 }}>
              <span className="fa-json-edit-brace">{meta.close}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
