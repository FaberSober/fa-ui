import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFieldCryptoClient, encryptRequest } from '../src/crypto.ts';

const webCrypto = globalThis.crypto;
const pair = await webCrypto.subtle.generateKey({
  name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256',
}, true, ['encrypt', 'decrypt']);
const publicKey = Buffer.from(await webCrypto.subtle.exportKey('spki', pair.publicKey)).toString('base64');
const key = { v: 2, kid: 'http-test', publicKey };
const target = { method: 'POST', path: '/api/base/admin/auth/loginV2' };

function httpContext(t) {
  t.mock.getter(globalThis, 'crypto', () => ({ getRandomValues: webCrypto.getRandomValues.bind(webCrypto) }));
}

function preparation(replayEnabled = false) {
  return {
    v: 2, kid: key.kid, purpose: 'ADMIN_LOGIN', fields: ['password'], replayEnabled,
    challengeId: replayEnabled ? 'a'.repeat(43) : null, expiresAt: null,
  };
}

async function decrypt(encryptedKey, iv, ciphertext, aad) {
  const rawKey = await webCrypto.subtle.decrypt({ name: 'RSA-OAEP' }, pair.privateKey, Buffer.from(encryptedKey, 'base64'));
  const aes = await webCrypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
  const decoded = await webCrypto.subtle.decrypt({
    name: 'AES-GCM', iv: Buffer.from(iv, 'base64'),
    additionalData: new TextEncoder().encode(JSON.stringify(aad)), tagLength: 128,
  }, aes, Buffer.from(ciphertext, 'base64'));
  return new TextDecoder().decode(decoded);
}

test('HTTP login encrypts raw UTF-8 password fields with the existing v2 protocol in both replay modes', async t => {
  httpContext(t);
  for (const replay of [false, true]) {
    const ready = preparation(replay);
    const client = createFieldCryptoClient({ publicKey: async () => key, prepare: async () => ready });
    for (const password of ['', ' 中文🔐 \n', 'a'.repeat(4096)]) {
      const body = { username: 'account', password };
      const result = await client.prepare(body, ['password'], target);
      const parts = result.body.password.split('.');
      const aad = [2, key.kid, ready.challengeId, ready.purpose, target.method, target.path, 'password'];
      assert.equal(await decrypt(...parts, aad), password);
      assert.deepEqual(body, { username: 'account', password });
      assert.equal(result.body.username, 'account');
      assert.equal(result.headers.FaCryptoVersion, '2');
      assert.equal('FaCryptoChallengeId' in result.headers, replay);
      assert.equal(Buffer.from(parts[0], 'base64').length, 256);
      assert.equal(Buffer.from(parts[1], 'base64').length, 12);
      assert.equal(Buffer.from(parts[2], 'base64').length, new TextEncoder().encode(password).length + 16);
    }
  }
});

test('HTTP uses fresh keys and IVs and preserves authentication of ciphertext, challenge, route and field', async t => {
  httpContext(t);
  const ready = preparation(true);
  const client = createFieldCryptoClient({ publicKey: async () => key, prepare: async () => ready });
  const first = await client.prepare({ password: 'test' }, ['password'], target);
  const second = await client.prepare({ password: 'test' }, ['password'], target);
  const parts = first.body.password.split('.');
  for (const [i, part] of second.body.password.split('.').entries()) assert.notEqual(parts[i], part);
  const aad = [2, key.kid, ready.challengeId, ready.purpose, target.method, target.path, 'password'];
  for (const [index, replacement] of [[1, 'other-key'], [2, 'b'.repeat(43)], [3, 'CRYPTO_DEMO'], [4, 'PUT'], [5, '/api/other'], [6, 'text']]) {
    const altered = [...aad];
    altered[index] = replacement;
    await assert.rejects(decrypt(...parts, altered));
  }
  const altered = Buffer.from(parts[2], 'base64');
  altered[0] ^= 1;
  await assert.rejects(decrypt(parts[0], parts[1], altered.toString('base64'), aad));
});

test('HTTP legacy envelopes retain the v1 wire format and decrypt with native Web Crypto', async t => {
  httpContext(t);
  const data = { text: '中文 🔐\n', age: 18 };
  const requestTarget = { ...target, purpose: 'ADMIN_LOGIN' };
  for (const replayEnabled of [false, true]) {
    const ready = { v: 1, kid: key.kid, replayEnabled, challengeId: replayEnabled ? 'a'.repeat(43) : null, expiresAt: null };
    const envelope = await encryptRequest(data, { ...key, v: 1 }, ready, requestTarget);
    const aad = [1, key.kid, ready.challengeId, requestTarget.purpose, target.method, target.path];
    assert.deepEqual(JSON.parse(await decrypt(envelope.encryptedKey, envelope.iv, envelope.ciphertext, aad)), data);
  }
});

test('HTTP rejects invalid keys and oversized input instead of returning plaintext', async t => {
  httpContext(t);
  const invalid = createFieldCryptoClient({ publicKey: async () => ({ ...key, publicKey: 'invalid' }), prepare: async () => preparation() });
  await assert.rejects(invalid.prepare({ password: 'test' }, ['password'], target));
  const client = createFieldCryptoClient({ publicKey: async () => key, prepare: async () => preparation() });
  await assert.rejects(client.prepare({ password: '中'.repeat(1400) }, ['password'], target), /4096/);
});

test('a missing or failed secure random source rejects encryption', async t => {
  const client = createFieldCryptoClient({ publicKey: async () => key, prepare: async () => preparation() });
  for (const unavailable of [undefined, {}, { getRandomValues() { throw new Error('random failed'); } }]) {
    const mock = t.mock.getter(globalThis, 'crypto', () => unavailable);
    await assert.rejects(client.prepare({ password: 'test' }, ['password'], target), /安全随机数|random failed/);
    mock.mock.restore();
  }
});

test('native encryption errors propagate without silently switching implementations', async t => {
  t.mock.getter(globalThis, 'crypto', () => ({
    getRandomValues: webCrypto.getRandomValues.bind(webCrypto),
    subtle: { importKey() { throw new Error('native encryption failed'); } },
  }));
  const client = createFieldCryptoClient({ publicKey: async () => key, prepare: async () => preparation() });
  await assert.rejects(client.prepare({ password: 'test' }, ['password'], target), /native encryption failed/);
});
