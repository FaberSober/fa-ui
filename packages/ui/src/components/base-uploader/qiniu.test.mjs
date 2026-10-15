// Run: node frontend/fa-ui/packages/ui/src/components/base-uploader/qiniu.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadModule(filename, dependencies, globals = {}) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(filename, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  runInNewContext(outputText, { exports, require: (name) => dependencies[name] ?? require(name), Error, console, ...globals });
  return exports;
}

function setupUpload(accessType, registrationError) {
  let key;
  let completed;
  const events = [];
  const fileSaveApi = {
    getQiniuUploadToken: async () => ({ data: { token: 'test-upload-token', domain: 'https://files.example.com/', basePath: 'prod/', accessType } }),
    getWorkerId: async () => ({ data: '123' }),
    syncUrlQiniu: async ({ url }) => {
      events.push(['register', url]);
      if (registrationError) throw registrationError;
      return { data: { id: '123', url } };
    },
    genLocalGetFile: (id) => `/api/base/admin/fileSave/getFile/${id}`,
  };
  const api = loadModule('./utils.ts', {
    '@ui/services/base': { fileSaveApi },
    '@ui/utils': { ApiQiniuLoader: class { async load() {} } },
  }, {
    window: {
      FA_QINIU_ZONE: 'test',
      qiniu: { region: { test: 'test-region' }, upload: (_file, uploadKey) => {
        key = uploadKey;
        return { subscribe: (_progress, _error, complete) => { completed = complete; } };
      } },
    },
  });
  return { api, events, complete: () => completed({ key, hash: 'test-hash' }) };
}

test('private upload registers the object before reporting a stable file ID URL', async () => {
  const upload = setupUpload('PRIVATE');
  await upload.api.fetchUploadImgQiniu({ name: '中文 #image.png' }, 'file', '中文 #image.png', (path, result) => {
    upload.events.push(['success', path, result.fileSave.id, result.hash]);
  });
  assert.equal(upload.events.length, 0);
  await upload.complete();
  assert.match(upload.events[0][1], /%E4%B8%AD%E6%96%87%20%23image_/);
  assert.deepEqual(upload.events[1], ['success', '/api/base/admin/fileSave/getFile/123', '123', 'test-hash']);
});

test('public and legacy token responses keep the public URL callback', async () => {
  for (const mode of ['PUBLIC', undefined]) {
    const upload = setupUpload(mode);
    let result;
    await upload.api.fetchUploadImgQiniu({ name: 'file.txt' }, 'file', 'file.txt', (path) => { result = path; });
    await upload.complete();
    assert.equal(result, upload.events[0][1]);
    assert.match(result, /^https:\/\/files\.example\.com\/prod\/file\//);
  }
});

test('registration failure reaches the error callback and never reports upload success', async () => {
  const error = new Error('registration failed');
  const upload = setupUpload('PRIVATE', error);
  let successes = 0;
  let failure;
  await upload.api.fetchUploadImgQiniu({ name: 'file.txt' }, 'file', 'file.txt', () => { successes++; }, undefined, (value) => { failure = value; });
  await upload.complete();
  assert.equal(successes, 0);
  assert.equal(failure, error);
});

function setupComponent(filename, props = {}) {
  const loading = [];
  let callbacks;
  const createElement = (type, elementProps, ...children) => ({ type, props: elementProps, children });
  const component = loadModule(filename, {
    react: { __esModule: true, default: { createElement }, useState: (initial) => [initial, (value) => loading.push(value)] },
    antd: { Upload: 'Upload', Button: 'Button', message: { error() {} } },
    '@ant-design/icons': { UploadOutlined: 'UploadOutlined', LoadingOutlined: 'LoadingOutlined', PlusOutlined: 'PlusOutlined' },
    './utils': { fetchUploadImgQiniu: (...args) => { callbacks = args; } },
  }).default;
  return { element: component({ prefix: 'file', ...props }), loading, get callbacks() { return callbacks; } };
}

test('both upload components stop loading and report registration errors', () => {
  for (const filename of ['./UploadFileQiniu.tsx', './UploadImgQiniu.tsx']) {
    const component = setupComponent(filename);
    const failure = new Error('registration failed');
    let reported;
    let successes = 0;
    component.element.props.customRequest({ file: { name: 'image.png' }, onProgress() {}, onSuccess() { successes++; }, onError(error) { reported = error; } });
    component.callbacks[5](failure);
    assert.deepEqual(component.loading, [true, false]);
    assert.equal(reported, failure);
    assert.equal(successes, 0);
  }
});

test('registered file and image callbacks preserve their form value contracts', () => {
  for (const [filename, expected] of [['./UploadFileQiniu.tsx', '123'], ['./UploadImgQiniu.tsx', '/api/base/admin/fileSave/getFile/123']]) {
    let changed;
    const component = setupComponent(filename, { onChange: (value) => { changed = value; } });
    let success;
    component.element.props.customRequest({ file: { name: 'image.png' }, onProgress() {}, onError() {}, onSuccess(value) { success = value; } });
    component.callbacks[3]('/api/base/admin/fileSave/getFile/123', { fileSave: { id: '123' } });
    assert.equal(changed, expected);
    assert.equal(success.path, '/api/base/admin/fileSave/getFile/123');
    assert.deepEqual(component.loading, [true, false]);
  }
});

test('private image display keeps the authorized endpoint intact', () => {
  const value = '/api/base/admin/fileSave/getFile/123';
  const privateImage = setupComponent('./UploadImgQiniu.tsx', { value });
  assert.equal(privateImage.element.children[0].props.src, value);
  const publicImage = setupComponent('./UploadImgQiniu.tsx', { value: 'https://files.example.com/image.png' });
  assert.equal(publicImage.element.children[0].props.src, 'https://files.example.com/image.png?imageView2/1/w/100/h/100');
});
