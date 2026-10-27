import type { JsonPath, JsonValue } from './FaJsonEditNode';

export type JsonSearchMatch = { path: JsonPath } | { start: number; end: number };

export function findJsonMatches(value: JsonValue, query: string, maxNodes: number): JsonPath[] {
  if (!query) return [];
  const needle = query.toLowerCase();
  const matches: JsonPath[] = [];
  let count = 0;

  function visit(current: JsonValue, path: JsonPath) {
    if (count >= maxNodes) return;
    count += 1;
    const key = path[path.length - 1];
    const container = current !== null && typeof current === 'object';
    if ((typeof key === 'string' && key.toLowerCase().includes(needle)) || (!container && String(current).toLowerCase().includes(needle))) {
      matches.push(path);
    }
    if (container) {
      for (const key of Object.keys(current)) {
        if (count >= maxNodes) break;
        const segment = Array.isArray(current) ? Number(key) : key;
        visit(Array.isArray(current) ? current[Number(key)] : current[key], [...path, segment]);
      }
    }
  }

  visit(value, []);
  return matches;
}

export function findTextMatches(text: string, query: string): { start: number; end: number }[] {
  if (!query) return [];
  const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return Array.from(text.matchAll(pattern), (match) => ({ start: match.index, end: match.index + match[0].length }));
}
