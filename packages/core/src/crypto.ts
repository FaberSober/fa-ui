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

async function encryptBytes(plaintext: Uint8Array<ArrayBuffer>, publicKey: string, aad: Uint8Array<ArrayBuffer>) {
  if (!globalThis.crypto?.getRandomValues) throw new Error('当前浏览器不支持安全随机数，请升级浏览器');
  const subtle = globalThis.crypto.subtle;
  if (!subtle) {
    // HTTP 下仍有 getRandomValues；显式提供 OAEP seed，避免密码库自行降级随机源。
    const { default: forge } = await import('node-forge');
    const rsa = forge.pki.publicKeyFromAsn1(forge.asn1.fromDer(atob(publicKey)));
    const rawKey = crypto.getRandomValues(new Uint8Array(32));
    try {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const cipher = forge.cipher.createCipher('AES-GCM', String.fromCharCode(...rawKey));
      cipher.start({ iv: String.fromCharCode(...iv), additionalData: String.fromCharCode(...aad), tagLength: 128 });
      cipher.update(forge.util.createBuffer(plaintext));
      if (!cipher.finish()) throw new Error('请求加密失败');
      const encryptedKey = rsa.encrypt(String.fromCharCode(...rawKey), 'RSA-OAEP', {
        md: forge.md.sha256.create(), mgf1: { md: forge.md.sha256.create() },
        seed: String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
      });
      return {
        encryptedKey: btoa(encryptedKey), iv: base64(iv),
        ciphertext: btoa(cipher.output.getBytes() + cipher.mode.tag.getBytes()),
      };
    } finally { rawKey.fill(0); }
  }
  const rsa = await subtle.importKey('spki', Uint8Array.from(atob(publicKey), c => c.charCodeAt(0)),
    { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const key = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, key, plaintext);
  const rawKey = new Uint8Array(await subtle.exportKey('raw', key));
  try {
    const encryptedKey = await subtle.encrypt({ name: 'RSA-OAEP' }, rsa, rawKey);
    return {
      encryptedKey: base64(new Uint8Array(encryptedKey)), iv: base64(iv), ciphertext: base64(new Uint8Array(ciphertext)),
    };
  } finally { rawKey.fill(0); }
}

export async function encryptRequest(
  data: object, publicKey: CryptoPublicKey, preparation: CryptoPreparation, target: CryptoTarget,
): Promise<CryptoEnvelope> {
  if (publicKey.v !== 1 || preparation.v !== 1 || publicKey.kid !== preparation.kid) {
    throw new Error('加密配置已变化，请重新准备请求');
  }
  if (preparation.replayEnabled ? !preparation.challengeId : preparation.challengeId !== null) {
    throw new Error('防重放准备信息无效，请重新准备请求');
  }
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  if (plaintext.length > 4096) throw new Error('业务 JSON 的 UTF-8 编码不能超过 4096 字节');
  const aad = new TextEncoder().encode(JSON.stringify([
    1, publicKey.kid, preparation.challengeId, target.purpose, target.method, target.path,
  ]));
  return {
    v: 1, kid: publicKey.kid, challengeId: preparation.challengeId, purpose: target.purpose,
    ...await encryptBytes(plaintext, publicKey.publicKey, aad),
  };
}

export interface FieldCryptoPublicKey { v: 2; kid: string; publicKey: string }
export interface FieldCryptoPreparation {
  v: 2; kid: string; purpose: string; fields: string[];
  replayEnabled: boolean; challengeId: string | null; expiresAt: string | null;
}
export interface FieldCryptoTarget { method: string; path: string }
export interface PreparedCryptoRequest {
  body: Record<string, unknown>;
  headers: Record<string, string>;
  preparation: FieldCryptoPreparation;
}

export function cryptoPreparePath(path: string): string {
  const login = ['/api/base/admin/auth/loginV2', '/api/portal/auth/loginV2'].includes(path);
  return '/api/base/security/crypto/' + (login ? 'prepare-login' : 'prepare');
}

export async function encryptField(value: string, key: FieldCryptoPublicKey, ready: FieldCryptoPreparation,
  target: FieldCryptoTarget, field: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length > 4096) throw new Error('加密字段的 UTF-8 编码不能超过 4096 字节');
  const aad = new TextEncoder().encode(JSON.stringify([2, key.kid, ready.challengeId, ready.purpose, target.method, target.path, field]));
  const { encryptedKey, iv, ciphertext } = await encryptBytes(bytes, key.publicKey, aad);
  return [encryptedKey, iv, ciphertext].join('.');
}

export function createFieldCryptoClient(transport: {
  publicKey: () => Promise<FieldCryptoPublicKey>;
  prepare: (target: FieldCryptoTarget) => Promise<FieldCryptoPreparation>;
}) {
  let cached: FieldCryptoPublicKey | undefined;
  let fetching: Promise<FieldCryptoPublicKey> | undefined;
  return {
    async prepare(data: object, fields: string[], target: FieldCryptoTarget): Promise<PreparedCryptoRequest> {
      if (!data || (Object.getPrototypeOf(data) !== Object.prototype && Object.getPrototypeOf(data) !== null)
        || !Array.isArray(fields) || fields.length === 0 || new Set(fields).size !== fields.length
        || fields.some(field => !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(field)
          || !Object.prototype.hasOwnProperty.call(data, field) || typeof (data as Record<string, unknown>)[field] !== 'string')) {
        throw new Error('字段加密仅支持 JSON 中指定的顶层字符串字段');
      }
      if (fields.some(field => new TextEncoder().encode((data as Record<string, string>)[field]).length > 4096)) {
        throw new Error('加密字段的 UTF-8 编码不能超过 4096 字节');
      }
      if (!['POST', 'PUT', 'PATCH'].includes(target.method) || !/^\/api\/[A-Za-z0-9/_-]+$/.test(target.path)) {
        throw new Error('不支持的字段加密目标');
      }
      const ready = await transport.prepare(target);
      if (!ready || ready.v !== 2 || typeof ready.kid !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(ready.kid)
        || typeof ready.purpose !== 'string' || !/^[A-Z_]{1,64}$/.test(ready.purpose) || !Array.isArray(ready.fields)
        || ready.fields.length !== fields.length || fields.some(field => !ready.fields.includes(field))
        || typeof ready.replayEnabled !== 'boolean'
        || (ready.replayEnabled ? typeof ready.challengeId !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(ready.challengeId) : ready.challengeId !== null)) {
        throw new Error('字段加密准备信息无效，请重新准备请求');
      }
      if (!cached || cached.kid !== ready.kid) {
        fetching ??= transport.publicKey().finally(() => { fetching = undefined; });
        cached = await fetching;
      }
      if (cached.v !== 2 || cached.kid !== ready.kid) throw new Error('加密配置已变化，请重新准备请求');
      const key = cached;
      const body = { ...data } as Record<string, unknown>;
      for (const field of fields) body[field] = await encryptField(body[field] as string, key, ready, target, field);
      const headers: Record<string, string> = { FaCryptoVersion: '2', FaCryptoKid: key.kid };
      if (ready.replayEnabled) headers.FaCryptoChallengeId = ready.challengeId!;
      return { body, headers, preparation: ready };
    },
  };
}
