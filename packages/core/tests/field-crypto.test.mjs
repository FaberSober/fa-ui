import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFieldCryptoClient } from '../src/crypto.ts';
const pairs = await Promise.all([1,2].map(() => crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt'])));
const keys = await Promise.all(pairs.map(async (pair,index)=>({v:2,kid:`test-${index}`,publicKey:Buffer.from(await crypto.subtle.exportKey('spki',pair.publicKey)).toString('base64')})));
const target = { method:'POST',path:'/api/base/demo/crypto/roundtrip' };
function ready(key, replay=false) { return {v:2,kid:key.kid,purpose:'CRYPTO_DEMO',fields:['text'],replayEnabled:replay,challengeId:replay?Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url'):null,expiresAt:null}; }
async function decrypt(prepared, pair=pairs[0], field='text', path=target.path) {
  const [ek,iv,ct]=prepared.body.text.split('.').map(value=>Buffer.from(value,'base64'));
  const raw=await crypto.subtle.decrypt({name:'RSA-OAEP'},pair.privateKey,ek);
  const key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);
  const aad=new TextEncoder().encode(JSON.stringify([2,prepared.headers.FaCryptoKid,prepared.headers.FaCryptoChallengeId??null,'CRYPTO_DEMO','POST',path,field]));
  return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:aad,tagLength:128},key,ct));
}
test('field protocol preserves JSON shape, raw strings and plain fields in both replay modes',async()=>{
  for(const replay of [false,true]) {
    const client=createFieldCryptoClient({publicKey:async()=>keys[0],prepare:async()=>ready(keys[0],replay)});
    for(const text of ['', ' 中文🔐 \n', 'a'.repeat(4096)]) {
      const body={text,age:18}; const prepared=await client.prepare(body,['text'],target);
      assert.equal(await decrypt(prepared),text); assert.equal(body.text,text); assert.equal(prepared.body.age,18);
      assert.deepEqual(Object.keys(prepared.body),['text','age']); assert.equal(typeof prepared.body.text,'string');
      assert.equal(prepared.headers.FaCryptoVersion,'2'); assert.equal('FaCryptoChallengeId' in prepared.headers,replay);
    }
  }
});
test('every request has a separate challenge while concurrent requests share a cached public key',async()=>{
  let gets=0,prepares=0;
  const client=createFieldCryptoClient({publicKey:async()=>{gets++;return keys[0]},prepare:async()=>{prepares++;return ready(keys[0],true)}});
  const requests=await Promise.all(Array.from({length:6},()=>client.prepare({text:'test'},['text'],target)));
  assert.equal(gets,1);assert.equal(prepares,6);assert.equal(new Set(requests.map(r=>r.headers.FaCryptoChallengeId)).size,6);
  assert.equal(new Set(requests.map(r=>r.body.text)).size,6);
  for(const request of requests) assert.equal(await decrypt(request),'test');
});
test('kid rotation refreshes the cache and a mismatched preparation fails closed',async()=>{
  let index=0,gets=0;
  const client=createFieldCryptoClient({publicKey:async()=>{gets++;return keys[index]},prepare:async()=>ready(keys[index])});
  await client.prepare({text:'first'},['text'],target); index=1;
  const result=await client.prepare({text:'rotated'},['text'],target);
  assert.equal(await decrypt(result,pairs[1]),'rotated'); assert.equal(gets,2);
  const stale=createFieldCryptoClient({publicKey:async()=>keys[1],prepare:async()=>ready(keys[0])});
  await assert.rejects(stale.prepare({text:'test'},['text'],target),/配置已变化/);
});
test('rejects bad input, disallowed fields and forged preparation before sending any business request',async()=>{
  let prepares=0;
  const client=createFieldCryptoClient({publicKey:async()=>keys[0],prepare:async()=>{prepares++;return ready(keys[0])}});
  for(const [body,fields] of [[[],['text']],[{text:2},['text']],[{text:'a'},['missing']],[{text:'a'},['text','text']]]) {
    await assert.rejects(client.prepare(body,fields,target));
  }
  assert.equal(prepares,0);
  await assert.rejects(client.prepare({text:'中'.repeat(1400)},['text'],target),/4096/);
  const invalid=createFieldCryptoClient({publicKey:async()=>keys[0],prepare:async()=>({...ready(keys[0]),fields:['password']})});
  await assert.rejects(invalid.prepare({text:'a'},['text'],target),/准备信息无效/);
});
test('tampering or substituting the header, route or field fails authentication',async()=>{
  const client=createFieldCryptoClient({publicKey:async()=>keys[0],prepare:async()=>ready(keys[0],true)});
  const request=await client.prepare({text:'test'},['text'],target);
  await assert.rejects(decrypt(request,pairs[0],'password'));
  await assert.rejects(decrypt(request,pairs[0],'text','/api/other'));
  await assert.rejects(decrypt({...request,headers:{...request.headers,FaCryptoChallengeId:'a'.repeat(43)}}));
  const parts=request.body.text.split('.');parts[2]=(parts[2][0]==='A'?'B':'A')+parts[2].slice(1);
  await assert.rejects(decrypt({...request,body:{text:parts.join('.')}}));
});
