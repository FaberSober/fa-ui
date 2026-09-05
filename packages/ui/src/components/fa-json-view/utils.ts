/**
 * FaJsonView 内部工具：数据归一化、类型判定、路径生成、循环引用检测、容量控制
 */

/** 数据归一化结果 */
export interface NormalizeResult {
  status: 'ok' | 'empty' | 'error';
  /** status=ok 时的解析结果 */
  value?: any;
  /** status=error 时的异常对象 */
  error?: Error;
}

/**
 * 归一化 data：
 * - string：尝试 JSON.parse，失败返回 error
 * - null / undefined / 空串：返回 empty
 * - 其他（object / array / 标量）：直接使用
 */
export function normalizeData(data: any): NormalizeResult {
  if (data === null || data === undefined) return { status: 'empty' };
  if (typeof data === 'string') {
    if (data.trim() === '') return { status: 'empty' };
    try {
      return { status: 'ok', value: JSON.parse(data) };
    } catch (e) {
      return { status: 'error', error: e instanceof Error ? e : new Error(String(e)) };
    }
  }
  return { status: 'ok', value: data };
}

/** 是否为可递归的对象/数组容器（Date 等按标量展示） */
export function isContainer(v: any): boolean {
  if (Array.isArray(v)) return true;
  if (v !== null && typeof v === 'object' && !(v instanceof Date)) return true;
  return false;
}

/** 容器元信息：开/闭括号与折叠摘要 */
export function getContainerMeta(v: any): { open: string; close: string; summary: string } {
  if (Array.isArray(v)) {
    return { open: '[', close: ']', summary: `[…] ${v.length} items` };
  }
  const keys = Object.keys(v);
  return { open: '{', close: '}', summary: `{…} ${keys.length} keys` };
}

/** 容器条目 key 列表：数组返回索引，对象返回自身 key */
export function getContainerKeys(v: any): (string | number)[] {
  return Array.isArray(v) ? v.map((_, i) => i) : Object.keys(v);
}

/** key 展示：对象 key 带引号，数组索引不带 */
export function formatKeyLabel(key: string | number): string {
  return typeof key === 'number' ? `${key}` : `"${key}"`;
}

/** 标量展示：返回展示文本与类型样式名 */
export function getScalarDisplay(v: any): { text: string; type: 'string' | 'number' | 'boolean' | 'null' | 'misc' } {
  if (v === null) return { text: 'null', type: 'null' };
  const t = typeof v;
  switch (t) {
    case 'string':
      return { text: JSON.stringify(v), type: 'string' };
    case 'number':
      return Number.isNaN(v) ? { text: 'NaN', type: 'misc' } : { text: String(v), type: 'number' };
    case 'boolean':
      return { text: String(v), type: 'boolean' };
    case 'undefined':
      return { text: 'undefined', type: 'misc' };
    case 'function':
      return { text: `function ${v.name || ''}() {…}`.trim(), type: 'misc' };
    case 'symbol':
      return { text: String(v), type: 'misc' };
    case 'bigint':
      return { text: `${v}n`, type: 'misc' };
    default:
      return { text: String(v), type: 'misc' };
  }
}

/**
 * 由路径片段生成节点路径 key（Set 成员），用于展开状态管理。
 * 根节点为 '$'；对象 key 追加 .name（含特殊字符时 JSON 引号包裹）；数组索引追加 [i]。
 */
export function buildPath(segments: (string | number)[]): string {
  if (segments.length === 0) return '$';
  let path = '$';
  for (const seg of segments) {
    if (typeof seg === 'number') {
      path += `[${seg}]`;
    } else {
      path += /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(seg) ? `.${seg}` : `[${JSON.stringify(seg)}]`;
    }
  }
  return path;
}

/**
 * 安全序列化：循环引用替换为 "[Circular]"，避免 JSON.stringify 抛异常。
 * 适用于“复制 JSON”等兜底场景。
 */
export function safeStringify(value: any): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(
    value,
    (_key, val) => {
      if (val !== null && typeof val === 'object') {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
      }
      return val;
    },
    2,
  );
}

/** 递归渲染共享上下文：容量计数与祖先链（循环引用检测） */
export interface RenderContext {
  maxNodes: number;
  /** 已渲染节点数 */
  count: number;
  /** 是否已达渲染上限 */
  truncated: boolean;
  /** 当前祖先链上的容器，用于检测循环引用 */
  ancestors: WeakSet<object>;
}

/**
 * 收集所有容器节点路径（用于“展开全部”），
 * 带循环引用保护与容量上限。
 */
export function collectContainerPaths(value: any, maxNodes: number): Set<string> {
  const paths = new Set<string>();
  let count = 0;
  let truncated = false;
  const ancestors = new WeakSet<object>();

  const walk = (v: any, segments: (string | number)[]) => {
    if (truncated || !isContainer(v) || ancestors.has(v)) return;
    count++;
    if (count > maxNodes) {
      truncated = true;
      return;
    }
    paths.add(buildPath(segments));
    ancestors.add(v);
    for (const key of getContainerKeys(v)) {
      walk(v[key], [...segments, key]);
      if (truncated) break;
    }
    ancestors.delete(v);
  };

  walk(value, []);
  return paths;
}

/**
 * 根据 defaultExpandDepth 计算初始展开路径集合：
 * - 'all'：全部展开
 * - 0：全折叠
 * - N：展开到第 N 层（根为第 1 层）
 * 带循环引用保护与容量上限。
 */
export function computeInitialExpanded(value: any, depth: number | 'all', maxNodes: number): Set<string> {
  const paths = new Set<string>();
  let count = 0;
  let truncated = false;
  const ancestors = new WeakSet<object>();

  const walk = (v: any, segments: (string | number)[], level: number) => {
    if (truncated || !isContainer(v) || ancestors.has(v)) return;
    count++;
    if (count > maxNodes) {
      truncated = true;
      return;
    }
    if (depth === 'all' || level < depth) {
      paths.add(buildPath(segments));
      ancestors.add(v);
      for (const key of getContainerKeys(v)) {
        walk(v[key], [...segments, key], level + 1);
        if (truncated) break;
      }
      ancestors.delete(v);
    }
  };

  walk(value, [], 0);
  return paths;
}
