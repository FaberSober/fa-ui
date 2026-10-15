import assert from 'node:assert/strict';
import { test } from 'node:test';
import { encryptRequest } from '../src/crypto.ts';

const pair = await crypto.subtle.generateKey({
  name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256',
}, true, ['encrypt', 'decrypt']);
const publicKey = { v: 1, kid: 'test-v1', publicKey: Buffer.from(await crypto.subtle.exportKey('spki', pair.publicKey)).toString('base64') };
const preparation = { v: 1, kid: 'test-v1', replayEnabled: false, challengeId: null, expiresAt: null };
const target = { purpose: 'CRYPTO_DEMO', method: 'POST', path: '/api/base/demo/crypto/roundtrip' };

async function decrypt(envelope, requestTarget = target) {
  const rawKey = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, pair.privateKey, Buffer.from(envelope.encryptedKey, 'base64'));
  const aes = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
  const aad = new TextEncoder().encode(JSON.stringify([
    envelope.v, envelope.kid, envelope.challengeId, envelope.purpose, requestTarget.method, requestTarget.path,
  ]));
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(envelope.iv, 'base64'), additionalData: aad, tagLength: 128 },
    aes, Buffer.from(envelope.ciphertext, 'base64'));
  return JSON.parse(new TextDecoder().decode(bytes));
}

test('往返保留中文、Emoji、空文本、换行和密码中的空格', async () => {
  for (const text of ['', '中文 🔐', 'line 1\n"line 2"', '  password  ']) {
    const envelope = await encryptRequest({ text }, publicKey, preparation, target);
    assert.deepEqual(await decrypt(envelope), { text });
    assert.equal(Buffer.from(envelope.iv, 'base64').length, 12);
    assert.equal(Buffer.from(envelope.encryptedKey, 'base64').length, 256);
  }
});

test('同一正文每次生成新密钥、IV 和密文', async () => {
  const first = await encryptRequest({ text: 'test' }, publicKey, preparation, target);
  const second = await encryptRequest({ text: 'test' }, publicKey, preparation, target);
  for (const field of ['iv', 'encryptedKey', 'ciphertext']) assert.notEqual(first[field], second[field]);
});

test('密文篡改、用途或目标接口替换均无法通过认证', async () => {
  const envelope = await encryptRequest({ text: 'test' }, publicKey, preparation, target);
  const bytes = Buffer.from(envelope.ciphertext, 'base64');
  bytes[0] ^= 1;
  await assert.rejects(decrypt({ ...envelope, ciphertext: bytes.toString('base64') }));
  await assert.rejects(decrypt({ ...envelope, purpose: 'ADMIN_LOGIN' }));
  await assert.rejects(decrypt(envelope, { ...target, path: '/api/base/admin/auth/loginV2' }));
});

test('防重放挑战参与认证，关闭模式保持 null', async () => {
  const ready = { ...preparation, replayEnabled: true, challengeId: 'a'.repeat(43), expiresAt: '2000000000000' };
  const envelope = await encryptRequest({ text: 'test' }, publicKey, ready, target);
  assert.deepEqual(await decrypt(envelope), { text: 'test' });
  await assert.rejects(decrypt({ ...envelope, challengeId: 'b'.repeat(43) }));
  await assert.rejects(encryptRequest({}, publicKey, { ...preparation, replayEnabled: true }, target));
  await assert.rejects(encryptRequest({}, publicKey, { ...preparation, challengeId: ready.challengeId }, target));
});

test('拒绝超限 JSON、版本与密钥标识不匹配', async () => {
  await assert.rejects(encryptRequest({ text: '中'.repeat(1400) }, publicKey, preparation, target), /4096/);
  await assert.rejects(encryptRequest({}, publicKey, { ...preparation, kid: 'other' }, target), /配置/);
  await assert.rejects(encryptRequest({}, { ...publicKey, v: 2 }, preparation, target), /配置/);
  const text = 'a'.repeat(4096 - new TextEncoder().encode(JSON.stringify({ text: '' })).length);
  assert.deepEqual(await decrypt(await encryptRequest({ text }, publicKey, preparation, target)), { text });
});
