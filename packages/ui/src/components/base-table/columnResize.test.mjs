// Run: node frontend/fa-ui/packages/ui/src/components/base-table/columnResize.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const dataIndexToString = (value) => Array.isArray(value) ? value.join('.') : value;
let states;
let stateIndex;
let refs;
const bodyClasses = new Set();
const hooks = {
  ...React,
  useMemo: (fn) => fn(),
  useCallback: (fn) => fn,
  useEffect: () => {},
  useRef: (current) => { const ref = { current }; refs.push(ref); return ref; },
  useState: (initial) => {
    const index = stateIndex++;
    if (states[index] === undefined) states[index] = initial;
    return [states[index], (value) => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
  },
};

function load(file) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports,
    document: { body: { classList: { add: (name) => bodyClasses.add(name), remove: (name) => bodyClasses.delete(name) } } },
    require: (name) => {
      if (name === 'react') return hooks;
      if (name === './utils') return { dataIndexToString, useScrollY: () => [400] };
      if (name === './ResizableHeaderCell') return { default: HeaderCell, DEFAULT_COLUMN_WIDTH: 200 };
      if (name === 'antd') return { Table: 'Table', Button: 'Button' };
      if (name === '@ant-design/icons') return { SettingOutlined: 'SettingOutlined', ClearOutlined: 'ClearOutlined', DeleteOutlined: 'DeleteOutlined' };
      if (name.startsWith('@') || name.startsWith('.')) return { default: 'Component', FaFlexRestLayout: 'Layout' };
      return require(name);
    },
  });
  return exports.default;
}

const HeaderCell = load('./ResizableHeaderCell.tsx');
const BaseBizTable = load('./BaseBizTable.tsx');
const columns = [
  { dataIndex: 'name', width: 180, tcChecked: true },
  { dataIndex: 'description', width: 220, tcChecked: true },
  { dataIndex: 'opr', width: 280, fixed: 'right', tcRequired: true },
  { dataIndex: 'extra', width: 100, fixed: 'right', tcChecked: true },
];

function render(props = {}, widths = {}) {
  states = [undefined, undefined, widths];
  stateIndex = 0;
  refs = [];
  const tree = BaseBizTable({ biz: 'test', columns, showTopDiv: false, ...props });
  return tree.props.children.props.children[1].props.children[0].props;
}

const table = render({}, { description: 340 });
const header = (index) => table.columns[index].onHeaderCell(table.columns[index]);
assert.equal(header(1).onResize, undefined, 'covered handle moves to the fixed header');
assert.equal(header(2).resizeLeft.width, 340, 'uses the resized previous column width');
assert.equal(header(3).resizeLeft, undefined, 'only the first right fixed column gets a left handle');
assert.equal(typeof header(0).onResize, 'function');
assert.equal(typeof header(2).onResize, 'function', 'fixed column keeps its own handle');

const saved = [];
refs[1].current = { updateColumnWidth: (...args) => saved.push(args) };
const cell = HeaderCell(header(2));
const leftElement = cell.props.children[1];
const left = leftElement.type(leftElement.props).props;
assert.match(left.className, /fa-table-resize-handle-left/);
let captured = false;
const currentTarget = {
  closest: () => ({ getBoundingClientRect: () => ({ width: 280 }), previousElementSibling: { getBoundingClientRect: () => ({ width: 360 }) } }),
  setPointerCapture: () => { captured = true; },
  hasPointerCapture: () => captured,
  releasePointerCapture: () => { captured = false; },
};
const event = (clientX, pointerId = 1) => ({ clientX, pointerId, currentTarget, preventDefault() {}, stopPropagation() {} });
left.onPointerDown(event(100));
left.onPointerMove(event(160, 2));
assert.equal(states[2].description, 340, 'ignores unrelated pointers');
left.onPointerMove(event(160));
assert.equal(states[2].description, 420, 'measures the previous cell, including layout expansion');
left.onPointerUp(event(200));
assert.equal(states[2].description, 460);
assert.deepEqual(saved, [['description', 460]], 'persists the previous column, not the operation column');
assert.equal(states[2].opr, undefined);
assert.equal(captured, false);
assert.equal(bodyClasses.size, 0);
left.onKeyDown({ ...event(0), key: 'ArrowRight' });
assert.equal(states[2].description, 370);
left.onPointerDown(event(100));
left.onPointerMove(event(-1000));
assert.equal(states[2].description, 80, 'preserves minimum width');
left.onPointerCancel(event(-1000));
assert.equal(captured, false);
assert.equal(bodyClasses.size, 0);
assert.equal(saved.length, 2, 'cancel does not persist');

const normal = render({ columns: columns.slice(0, 2) });
assert.equal(typeof normal.columns[1].onHeaderCell(normal.columns[1]).onResize, 'function');
assert.equal(render({ showTableColConfigBtn: false }).columns[2].onHeaderCell, undefined);
const rowNum = render({ showRowNum: true, columns: columns.slice(2) });
assert.equal(rowNum.columns[1].onHeaderCell(rowNum.columns[1]).resizeLeft, undefined, 'does not resize the generated row number');
console.log('Column resize: fixed boundary, callbacks, persistence, pointer capture, keyboard and minimum width checks passed');
