// Run: node --test frontend/fa-ui/packages/ui/src/utils/cache.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const ts = createRequire(import.meta.url)('typescript');
const { outputText } = ts.transpileModule(readFileSync(new URL('./cache.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
});

test('clearing login removes the root cookie so getToken cannot restore the cleared account', () => {
  const values = new Map();
  let cookie = 'Authorization=old-token';
  const document = {
    get cookie() { return cookie; },
    set cookie(value) {
      assert.equal(value, 'Authorization=; Max-Age=0; Path=/');
      cookie = '';
    },
  };
  const exports = {};
  const dependencies = {
    '@ui/types': { Fa: { Constant: { TOKEN_KEY: 'Authorization' } } },
    lodash: { isNil: (value) => value == null },
    './utils': { getCookie: () => cookie ? cookie.split('=')[1] : null },
  };
  runInNewContext(outputText, {
    exports, document, require: (name) => dependencies[name],
    localStorage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) },
  });
  assert.equal(exports.getToken(), 'old-token');
  exports.clearToken();
  assert.equal(values.has('Authorization'), false);
  assert.equal(exports.getToken(), null);
});
