// Run: node --test frontend/fa-ui/packages/ui/src/services/base/admin/fileSave.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const ts = createRequire(import.meta.url)('typescript');
const { outputText } = ts.transpileModule(readFileSync(new URL('./fileSave.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
});

function setup(onPost = () => {}) {
  const context = { token: 'login-token', corp: 'corp-1', tenant: 'tenant-1' };
  const calls = [];
  let count = 0;
  class BaseApi {
    getUrl = (path) => `/api/base/admin/fileSave/${path}`;
    async post(path, body, config) {
      calls.push({ path, body, config });
      await onPost(path, context);
      return { data: path === 'createPreviewTicket' ? { ticket: `ticket-${++count}` } : {
        fileId: 'file-1', filename: '中文 文件.doc', previewUrl: `/api/base/admin/fileSave/getPreviewFile/session-${count}`,
        downloadUrl: `/api/base/admin/fileSave/getPreviewDownload/session-${count}`, downloadAllowed: true,
      } };
    }
  }
  const dependencies = {
    '@ui/configs': { GATE_APP: { admin: '/api/base/admin' } },
    '@ui/services/core/BaseApi': { __esModule: true, default: BaseApi },
    lodash: { trim: (value) => (value ?? '').trim() },
    '@ui/utils/cache': { getToken: () => context.token, getTnCorpId: () => context.corp, getTnTenantId: () => context.tenant },
  };
  const exports = {};
  runInNewContext(outputText, { exports, require: (name) => dependencies[name], JSON, Error });
  return { api: exports.default, calls, context };
}

test('preview obtains a new one-use ticket and session for every call, without login tokens in URLs', async () => {
  const { api, calls } = setup();
  const config = { signal: new AbortController().signal };
  const first = await api.getPreviewResource('file-1', config);
  const second = await api.getPreviewResource('file-1', config);
  assert.notEqual(first.previewUrl, second.previewUrl);
  assert.deepEqual(calls.map(({ path }) => path), ['createPreviewTicket', 'exchangePreviewTicket', 'createPreviewTicket', 'exchangePreviewTicket']);
  assert.equal(calls[0].body.fileId, 'file-1');
  assert.equal(calls[1].body.ticket, 'ticket-1');
  assert.ok(calls.every((call) => call.config === config));
  assert.ok(!JSON.stringify([first, second, calls]).includes('login-token'));
  assert.equal(api.genLocalGetFile('file-1'), '/api/base/admin/fileSave/getFile/file-1');
  assert.equal(api.genLocalGetFilePreview('file-1'), '/api/base/admin/fileSave/getFilePreview/file-1');
});

for (const field of ['token', 'corp', 'tenant']) {
  test(`changing ${field} before ticket exchange rejects the stale request`, async () => {
    const { api, calls } = setup((_path, context) => { context[field] = 'new-context'; });
    await assert.rejects(api.getPreviewResource('file-1'), /登录或租户已切换/);
    assert.equal(calls.length, 1);
  });
}

test('changing account during exchange discards the returned resource', async () => {
  const { api } = setup((path, context) => { if (path === 'exchangePreviewTicket') context.token = null; });
  await assert.rejects(api.getPreviewResource('file-1'), /登录或租户已切换/);
});

test('aborting a preview stops ticket exchange', async () => {
  const controller = new AbortController();
  const { api, calls } = setup(() => controller.abort());
  await assert.rejects(api.getPreviewResource('file-1', { signal: controller.signal }));
  assert.equal(calls.length, 1);
});

test('failed ticket creation never falls back to an anonymous file URL', async () => {
  const { api, calls } = setup(() => { throw new Error('Unauthorized'); });
  await assert.rejects(api.getPreviewResource('file-1'), /Unauthorized/);
  assert.equal(calls.length, 1);
});
