export interface CryptoPublicKey {
  v: 1;
  kid: string;
  publicKey: string;
}

export interface CryptoPreparation {
  v: 1;
  kid: string;
  replayEnabled: boolean;
  challengeId: string | null;
  expiresAt: string | null;
}

export interface CryptoEnvelope {
  v: 1;
  kid: string;
  challengeId: string | null;
  purpose: string;
  encryptedKey: string;
  iv: string;
  ciphertext: string;
}

export interface CryptoTarget {
  purpose: string;
  method: string;
  path: string;
}

function base64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

export async function encryptRequest(
  data: object, publicKey: CryptoPublicKey, preparation: CryptoPreparation, target: CryptoTarget,
): Promise<CryptoEnvelope> {
  if (!globalThis.crypto?.subtle) throw new Error('当前环境不支持安全加密，请使用 HTTPS 或 localhost');
  if (publicKey.v !== 1 || preparation.v !== 1 || publicKey.kid !== preparation.kid) {
    throw new Error('加密配置已变化，请重新准备请求');
  }
  if (preparation.replayEnabled ? !preparation.challengeId : preparation.challengeId !== null) {
    throw new Error('防重放准备信息无效，请重新准备请求');
  }
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  if (plaintext.length > 4096) throw new Error('业务 JSON 的 UTF-8 编码不能超过 4096 字节');
  const rsa = await crypto.subtle.importKey('spki', Uint8Array.from(atob(publicKey.publicKey), c => c.charCodeAt(0)),
    { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = new TextEncoder().encode(JSON.stringify([
    1, publicKey.kid, preparation.challengeId, target.purpose, target.method, target.path,
  ]));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, key, plaintext);
  const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  try {
    const encryptedKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsa, rawKey);
    return {
      v: 1, kid: publicKey.kid, challengeId: preparation.challengeId, purpose: target.purpose,
      encryptedKey: base64(new Uint8Array(encryptedKey)), iv: base64(iv), ciphertext: base64(new Uint8Array(ciphertext)),
    };
  } finally {
    rawKey.fill(0);
  }
}
