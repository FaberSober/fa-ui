// Run: node --test frontend/fa-ui/packages/ui/src/components/fa-json-edit/FaJsonEdit.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function load(file, dependencies = {}) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  runInNewContext(outputText, { exports, require: (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name) });
  return exports;
}

const utils = load('../fa-json-view/utils.ts');
const searchUtils = load('./search.ts');

function createEditor(value, props = {}) {
  const changes = [];
  const states = [], effectDependencies = [], effects = [];
  let cursor = 0, effectCursor = 0;
  const bodyRef = { current: null };
  const { default: FaJsonEdit } = load('./FaJsonEdit.tsx', {
    react: {
      useState: (initial) => {
        const index = cursor++;
        if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
        return [states[index], (value) => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
      },
      useEffect: (fn, dependencies) => {
        const index = effectCursor++;
        if (!effectDependencies[index] || dependencies.some((value, dependencyIndex) => !Object.is(value, effectDependencies[index]?.[dependencyIndex]))) effects.push(fn);
        effectDependencies[index] = dependencies;
      },
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn,
      useRef: () => bodyRef,
    },
    antd: { Input: { Search: 'SearchInput', TextArea: 'JsonTextArea' }, Alert: 'Alert', Button: 'Button', Space: 'Space', Tooltip: 'Tooltip' },
    '@ant-design/icons': { CompressOutlined: 'Icon', CopyOutlined: 'Icon', DownOutlined: 'Icon', FileTextOutlined: 'Icon', FormatPainterOutlined: 'Icon', PartitionOutlined: 'Icon', UpOutlined: 'Icon' },
    '@ui/utils/utils': {},
    '../fa-json-view/utils': utils,
    './FaJsonEditNode': { default: 'JsonNode' },
    './search': searchUtils,
    './FaJsonEdit.css': {},
  });
  function render() {
    cursor = 0; effectCursor = 0;
    return FaJsonEdit({ defaultValue: JSON.stringify(value), onChange: (text) => changes.push(text), showToolbar: false, ...props });
  }
  const tree = render();
  return { rename: tree.props.children[1].props.children.props.onRename, changes, tree, render, bodyRef, flushEffects: () => effects.splice(0).forEach((fn) => { fn(); }) };
}

function find(tree, predicate) {
  if (Array.isArray(tree)) return tree.map((child) => find(child, predicate)).find(Boolean);
  if (!tree?.props) return undefined;
  return predicate(tree) ? tree : find(tree.props.children, predicate);
}

const plain = (value) => JSON.parse(JSON.stringify(value));

function createNode(props = {}) {
  const states = [], renamed = [], updated = [], changedTypes = [];
  let cursor = 0;
  const Input = Object.assign(() => null, { TextArea: 'JsonTextArea' });
  const { default: Node } = load('./FaJsonEditNode.tsx', {
    react: {
      useState: (initial) => {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (value) => { states[index] = value; }];
      },
      useEffect: () => {},
    },
    antd: { Button: 'Button', Dropdown: 'Dropdown', Input, InputNumber: 'InputNumber', Switch: 'Switch', Tooltip: 'Tooltip' },
    '@ant-design/icons': { DeleteOutlined: 'Icon', PlusOutlined: 'Icon', SwapOutlined: 'Icon' },
    '../fa-json-view/utils': utils,
  });
  const tree = Node({
    value: 'hello', label: 'name', segments: ['name'], level: 1, expanded: new Set(), readOnly: false,
    ctx: { maxNodes: 5000, count: 0, truncated: false }, onToggle: () => {}, onAdd: () => {}, onDelete: () => {},
    onRename: (path, key) => { renamed.push({ path, key }); },
    onUpdate: (path, value) => { updated.push({ path, value }); },
    onChangeType: (path, type) => { changedTypes.push({ path, type }); },
    ...props,
  });
  function child(name) {
    cursor = 0;
    const element = find(tree, (node) => typeof node.type === 'function' && node.type.name === name);
    return element.type(element.props);
  }
  return { tree, child, Input, renamed, updated, changedTypes };
}

test('submitting unchanged names preserves root, nested and array-contained properties without emitting changes', () => {
  const { rename, changes } = createEditor({ name: 'FaJsonEdit', author: { name: 'FA Admin' }, tags: ['json'], items: [{ name: 'item' }] });
  for (const path of [['name'], ['author'], ['tags'], ['author', 'name'], ['items', 0, 'name']]) {
    assert.equal(rename(path, path.at(-1)), undefined);
    assert.equal(changes.length, 0, `unchanged ${path.join('.')} must not update JSON`);
  }
});

test('renaming a field preserves its value and sibling properties', () => {
  const { rename, changes } = createEditor({ author: { name: 'FA Admin', enabled: true }, version: 1 });
  assert.equal(rename(['author', 'name'], 'displayName'), undefined);
  assert.equal(changes.length, 1);
  assert.deepEqual(JSON.parse(changes[0]), { author: { displayName: 'FA Admin', enabled: true }, version: 1 });

  const container = createEditor({ author: { name: 'FA Admin' }, enabled: false });
  assert.equal(container.rename(['author'], 'owner'), undefined);
  assert.deepEqual(JSON.parse(container.changes[0]), { owner: { name: 'FA Admin' }, enabled: false });
});

test('blank and duplicate names are rejected without changing JSON', () => {
  const { rename, changes } = createEditor({ name: 'FaJsonEdit', enabled: true });
  assert.equal(rename(['name'], '   '), '字段名不能为空');
  assert.equal(rename(['name'], 'enabled'), '字段名已存在');
  assert.equal(changes.length, 0);
});

test('tree search matches keys and scalar values once per row, including nested arrays and root scalars', () => {
  const value = { name: 'NAME', items: [{ title: 'Name' }], enabled: false, empty: null, version: 42 };
  assert.deepEqual(plain(searchUtils.findJsonMatches(value, 'name', 5000)), [['name'], ['items', 0, 'title']]);
  assert.deepEqual(plain(searchUtils.findJsonMatches(value, 'false', 5000)), [['enabled']]);
  assert.deepEqual(plain(searchUtils.findJsonMatches(value, 'null', 5000)), [['empty']]);
  assert.deepEqual(plain(searchUtils.findJsonMatches(value, '42', 5000)), [['version']]);
  assert.deepEqual(plain(searchUtils.findJsonMatches('Name', 'name', 5000)), [[]]);
  assert.deepEqual(plain(searchUtils.findJsonMatches(value, '', 5000)), []);
  assert.deepEqual(plain(searchUtils.findJsonMatches(value, 'missing', 5000)), []);
});

test('tree search respects the render limit and preserves property names containing path syntax', () => {
  const value = { 'a.b': { 'quoted"key': 'needle' }, tail: 'needle' };
  assert.deepEqual(plain(searchUtils.findJsonMatches(value, 'needle', 2)), []);
  assert.deepEqual(plain(searchUtils.findJsonMatches(value, 'needle', 3)), [['a.b', 'quoted"key']]);
});

test('source search treats metacharacters literally and returns original offsets even for invalid JSON', () => {
  const text = '{"a.b": "A.B", "broken": 中文';
  assert.deepEqual(plain(searchUtils.findTextMatches(text, 'a.b')), [{ start: 2, end: 5 }, { start: 9, end: 12 }]);
  assert.deepEqual(plain(searchUtils.findTextMatches(text, '中文')), [{ start: text.indexOf('中文'), end: text.length }]);
  assert.deepEqual(plain(searchUtils.findTextMatches(text, '[.*')), []);
  assert.deepEqual(plain(searchUtils.findTextMatches(text, '')), []);
});

test('search expands only the active branch, cycles results and restores folding without changing JSON', () => {
  const editor = createEditor({ outer: { needle: 'value' }, other: 'Needle' }, { showToolbar: true, defaultExpandDepth: 0 });
  const root = (tree) => find(tree, (node) => node.type === 'JsonNode').props;
  const input = find(editor.tree, (node) => node.type === 'SearchInput');
  const originalExpanded = [...root(editor.tree).expanded];
  let scrolled = 0;
  editor.bodyRef.current = { querySelector: () => ({ scrollIntoView: () => { scrolled += 1; } }) };
  editor.flushEffects();
  input.props.onSearch('needle');
  let tree = editor.render(); editor.flushEffects();
  assert.equal(root(tree).ctx.activeSearchPath, '$.outer.needle');
  assert.equal(root(tree).expanded.has('$'), true);
  assert.equal(root(tree).expanded.has('$.outer'), true);
  assert.equal(root(tree).ctx.searchPaths.size, 2);
  assert.equal(scrolled, 1);
  const next = () => find(tree, (node) => node.props['aria-label'] === '下一个匹配项').props.onClick();
  const previous = () => find(tree, (node) => node.props['aria-label'] === '上一个匹配项').props.onClick();
  next(); tree = editor.render();
  assert.equal(root(tree).ctx.activeSearchPath, '$.other');
  next(); tree = editor.render();
  assert.equal(root(tree).ctx.activeSearchPath, '$.outer.needle');
  previous(); tree = editor.render();
  assert.equal(root(tree).ctx.activeSearchPath, '$.other');
  input.props.onSearch(''); tree = editor.render();
  assert.deepEqual([...root(tree).expanded], originalExpanded);
  assert.equal(root(tree).ctx.searchPaths.size, 0);
  input.props.onSearch('missing'); tree = editor.render();
  assert.equal(find(tree, (node) => node.type === 'output').props.children, '无结果');
  assert.equal(find(tree, (node) => node.props['aria-label'] === '下一个匹配项').props.disabled, true);
  assert.equal(editor.changes.length, 0);
});

test('source search selects matches in invalid JSON and does not move the cursor during editing', () => {
  const source = '{"value": "Needle needle';
  const editor = createEditor(null, { defaultValue: source, defaultMode: 'text', showToolbar: true });
  const selections = [];
  let focuses = 0;
  editor.bodyRef.current = { querySelector: () => ({ setSelectionRange: (...range) => selections.push(range), focus: () => { focuses += 1; } }) };
  editor.flushEffects();
  find(editor.tree, (node) => node.type === 'SearchInput').props.onSearch('needle');
  let tree = editor.render(); editor.flushEffects();
  assert.deepEqual(selections, [[source.indexOf('Needle'), source.indexOf('Needle') + 6]]);
  assert.equal(editor.changes.length, 0);
  find(tree, (node) => node.props['aria-label'] === '下一个匹配项').props.onClick();
  tree = editor.render(); editor.flushEffects();
  assert.deepEqual(selections[1], [source.indexOf('needle'), source.indexOf('needle') + 6]);
  find(tree, (node) => node.type === 'JsonTextArea').props.onChange({ target: { value: `${source}!` } });
  editor.render(); editor.flushEffects();
  assert.equal(focuses, 2);
  assert.equal(editor.changes.length, 1);
});

test('toolbar keeps accessible mode buttons and omits search navigation until a query is submitted', () => {
  const editor = createEditor({ name: 'demo' }, { showToolbar: true });
  assert.ok(find(editor.tree, (node) => node.props['aria-label'] === '图形编辑'));
  const source = find(editor.tree, (node) => node.props['aria-label'] === '源文本编辑');
  assert.ok(source);
  assert.equal(find(editor.tree, (node) => node.type === 'output'), undefined);
  assert.equal(find(editor.tree, (node) => node.props['aria-label'] === '下一个匹配项'), undefined);
  source.props.onClick();
  assert.ok(find(editor.render(), (node) => node.type === 'JsonTextArea'));
  assert.equal(editor.changes.length, 0);
});

test('clicking a property name edits it and submits the new name on blur', () => {
  const node = createNode();
  const label = node.child('KeyEditor');
  assert.equal(label.type, 'Button');
  assert.equal(label.props.children, '"name"');
  assert.equal(label.props.icon, undefined);
  label.props.onClick({ stopPropagation() {} });
  let input = find(node.child('KeyEditor'), (element) => element.type === node.Input);
  assert.equal(input.props.value, 'name');
  input.props.onChange({ target: { value: 'title' } });
  input = find(node.child('KeyEditor'), (element) => element.type === node.Input);
  input.props.onBlur();
  assert.deepEqual(node.renamed, [{ path: ['name'], key: 'title' }]);
});

test('borderless values remain editable and type changes use the action menu', () => {
  const node = createNode();
  const scalar = node.child('ScalarEditor');
  const value = find(scalar, (element) => element.type === 'JsonTextArea');
  assert.equal(value.props.variant, 'borderless');
  value.props.onChange({ target: { value: 'changed' } });
  assert.deepEqual(node.updated, [{ path: ['name'], value: 'changed' }]);
  const menu = find(scalar, (element) => element.type === 'Dropdown').props.menu;
  assert.deepEqual(plain(menu.selectedKeys), ['string']);
  assert.equal(menu.items.length, 6);
  menu.onClick({ key: 'number', domEvent: { stopPropagation() {} } });
  assert.deepEqual(node.changedTypes, [{ path: ['name'], type: 'number' }]);

  const numeric = createNode({ value: 42 }).child('ScalarEditor');
  assert.equal(find(numeric, (element) => element.type === 'InputNumber').props.variant, 'borderless');
});

test('read-only nodes expose no rename, type-change or mutation controls', () => {
  const node = createNode({ readOnly: true });
  const label = node.child('KeyEditor');
  assert.equal(label.type, 'span');
  assert.equal(label.props.onClick, undefined);
  const scalar = node.child('ScalarEditor');
  assert.equal(find(scalar, (element) => element.type === 'Dropdown'), undefined);
  assert.equal(find(scalar, (element) => element.type === 'JsonTextArea').props.readOnly, true);
  assert.equal(node.child('NodeActions'), null);
  assert.equal(node.renamed.length + node.updated.length + node.changedTypes.length, 0);
});
