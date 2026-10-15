// Run: node frontend/fa-ui/packages/ui/src/utils/utils.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const ts = createRequire(import.meta.url)('typescript');
const source = readFileSync(new URL('./utils.ts', import.meta.url), 'utf8');
const ast = ts.createSourceFile('utils.ts', source, ts.ScriptTarget.Latest, true);
const functions = ast.statements.filter((node) =>
  ts.isFunctionDeclaration(node) && ['copyToClipboard', 'handleClipboard'].includes(node.name?.text),
);
const { outputText } = ts.transpileModule(functions.map((node) => node.getText(ast)).join('\n'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
});

function setup(result = true, inDialog = false, clipboardApi) {
  const success = [];
  const errors = [];
  let clipboard = 'previous content';
  let selection = '查询规格';
  let removed = false;
  let created = false;
  let parent;
  const dialog = { appendChild(element) { assert.equal(element, field); parent = dialog; } };
  const originalFocus = {
    closest(selector) { assert.match(selector, /dialog/); return inDialog ? dialog : null; },
    focus() { document.activeElement = originalFocus; },
  };
  const field = {
    value: '',
    style: {},
    focus() { document.activeElement = inDialog && parent !== dialog ? originalFocus : field; },
    select() { if (document.activeElement === field) selection = field.value; },
    remove() { removed = true; },
  };
  const document = {
    activeElement: originalFocus,
    createElement(tag) { assert.equal(tag, 'textarea'); created = true; return field; },
    body: { appendChild(element) { assert.equal(element, field); parent = document.body; } },
    execCommand(command) {
      assert.equal(command, 'copy');
      if (result instanceof Error) throw result;
      if (result) clipboard = selection;
      return result;
    },
  };
  const exports = {};
  runInNewContext(outputText, {
    exports,
    navigator: { clipboard: clipboardApi },
    trim: (value) => String(value ?? '').trim(),
    isNil: (value) => value == null,
    message: { success: (value) => success.push(value), error: (value) => errors.push(value) },
    document,
  });
  return { exports, success, errors, get clipboard() { return clipboard; },
    get removed() { return removed; }, get created() { return created; },
    get focusRestored() { return document.activeElement === originalFocus; } };
}

const json = JSON.stringify({ name: '中文', values: [0, false, null], text: 'line1\nline2' }, null, 2);
const copied = setup();
await copied.exports.copyToClipboard(json, 'JSON');
assert.equal(copied.clipboard, json);
assert.equal(copied.success.length, 1);
assert.equal(copied.errors.length, 0);
assert.equal(copied.removed, true);

const drawer = setup(true, true);
await drawer.exports.copyToClipboard(json, 'JSON');
assert.equal(drawer.clipboard, json);
assert.equal(drawer.success.length, 1);
assert.equal(drawer.removed, true);
assert.equal(drawer.focusRestored, true);

for (const result of [false, new Error('Copy blocked')]) {
  const failed = setup(result);
  await failed.exports.handleClipboard(json, 'JSON');
  assert.equal(failed.clipboard, 'previous content');
  assert.equal(failed.success.length, 0);
  assert.equal(failed.errors.length, 1);
  assert.equal(failed.removed, true);
}

const empty = setup();
await empty.exports.copyToClipboard('   ');
assert.equal(empty.created, false);
assert.equal(empty.success.length, 0);
assert.equal(empty.errors.length, 0);
let written;
const native = setup(true, true, { async writeText(text) { written = text; } });
await native.exports.copyToClipboard(json, 'JSON');
assert.equal(written, json);
assert.equal(native.created, false);
assert.equal(native.success.length, 1);

const denied = setup(true, true, { async writeText() { throw new Error('Permission denied'); } });
await denied.exports.copyToClipboard(json, 'JSON');
assert.equal(denied.clipboard, json);
assert.equal(denied.errors.length, 0);
assert.equal(denied.success.length, 1);
console.log('Clipboard API, dialog focus, JSON content, failure handling and cleanup checks passed');
