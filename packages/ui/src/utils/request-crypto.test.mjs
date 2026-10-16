import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import * as core from '../../../core/src/crypto.ts';
const require = createRequire(import.meta.url);
const ts = require('typescript'), axios = require('axios'), {get} = require('lodash');
const {outputText} = ts.transpileModule(readFileSync(new URL('./request.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}});
const pair = await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt']);
const key = {v:2,kid:'test',publicKey:Buffer.from(await crypto.subtle.exportKey('spki',pair.publicKey)).toString('base64')};
const api = '/api/base/admin/auth/loginV2';
function setup({fail,delay}={}) {
  const calls=[],errors=[],counts=new Map();
  const state={start:url=>counts.set(url,(counts.get(url)??0)+1),end:url=>{const count=(counts.get(url)??0)-1;if(count<=0)counts.delete(url);else counts.set(url,count)}};
  const adapter=async config=>{
    const body=typeof config.data==='string'?JSON.parse(config.data):config.data;
    calls.push({url:config.url,body,headers:config.headers.toJSON()});
    if(config.url.endsWith('/prepare-login')) {
      if(delay) await delay;
      if(fail==='prepare') throw new axios.AxiosError('failed','ERR_BAD_REQUEST',config,{}, {status:400,data:{message:'prepare failed'},config});
      return {status:200,headers:{},config,data:{code:200,data:{v:2,kid:'test',purpose:'ADMIN_LOGIN',fields:['password'],replayEnabled:true,challengeId:Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url'),expiresAt:null}}};
    }
    if(config.url.endsWith('/public-key')) return {status:200,headers:{},config,data:{code:200,data:fail==='encrypt'?{...key,publicKey:'invalid'}:key}};
    if(fail==='business') throw new axios.AxiosError('failed','ERR_BAD_REQUEST',config,{}, {status:400,data:{message:'business failed'},config});
    return {status:200,headers:{},config,data:{code:200,data:{tokenValue:'test-token'}}};
  };
  const facade={...axios,create:()=>axios.create({adapter})};
  const deps={axios:{__esModule:true,default:facade},lodash:{get},antd:{message:{error:value=>errors.push(value)}},
    './cache':{addAuthHeaders:headers=>headers.set('Authorization','test-auth'),clearToken:()=>{}},'@ui/types':{},
    '@ui/utils/cipher':{md5WithSecret:(value,timestamp)=>`${value}@${timestamp}`},'@ui/stores':{useApiLoadingStore:{getState:()=>state}},'@fa/core/crypto':core};
  const exports={};
  runInNewContext(outputText,{exports,require:name=>{assert.ok(name in deps,name);return deps[name]},window:{location:{origin:'http://localhost',pathname:'/login',search:''}},URL,Blob,setTimeout,console});
  return {api:exports,calls,errors,counts};
}
test('request layer encrypts before body signature, merges headers and never mutates caller data',async()=>{
  const env=setup();const body={username:'account',password:' password '};
  await env.api.requestPost(api,body,{crypto:{fields:['password']},headers:{FaDeviceTrustToken:'test-trust'}});
  const sent=env.calls.find(call=>call.url===api);
  assert.deepEqual(body,{username:'account',password:' password '});assert.equal(sent.body.username,'account');
  assert.notEqual(sent.body.password,body.password);assert.equal(typeof sent.body.password,'string');
  assert.deepEqual(Object.keys(sent.body),['username','password']);
  assert.equal(sent.headers.FaCryptoVersion,'2');assert.equal(sent.headers.Authorization,'test-auth');assert.equal(sent.headers.FaDeviceTrustToken,'test-trust');
  assert.equal(sent.headers.bs,`${JSON.stringify(sent.body)}@${sent.headers.timestamp}`);
  assert.equal(env.calls.length,3);assert.equal(env.counts.size,0);
});
test('loading covers preparation, parallel requests have distinct challenges and public key is cached',async()=>{
  let release;const delay=new Promise(resolve=>{release=resolve});const env=setup({delay});
  const pending=env.api.requestPost(api,{username:'a',password:'b'},{crypto:{fields:['password']}});
  assert.equal(env.counts.get(api),1);release();await pending;
  await Promise.all([1,2].map(()=>env.api.requestPost(api,{username:'a',password:'b'},{crypto:{fields:['password']}})));
  assert.equal(env.calls.filter(call=>call.url.endsWith('/public-key')).length,1);
  const sent=env.calls.filter(call=>call.url===api);
  assert.equal(new Set(sent.map(call=>call.headers.FaCryptoChallengeId)).size,3);assert.equal(env.counts.size,0);
});
test('failures clean loading, show one error and never send plaintext or retry business',async()=>{
  for(const fail of ['prepare','encrypt','business']) {
    const env=setup({fail});
    await assert.rejects(env.api.requestPost(api,{username:'a',password:'b'},{crypto:{fields:['password']}}));
    assert.equal(env.counts.size,0);assert.equal(env.errors.length,1);
    assert.equal(env.calls.filter(call=>call.url===api).length,fail==='business'?1:0);
    assert.equal(env.calls.some(call=>call.url.endsWith('/login')),false);
  }
});
test('ordinary JSON calls keep their existing path and data; FormData cannot silently bypass encryption',async()=>{
  const env=setup();const body={age:18};
  await env.api.requestPost('/api/normal',body,{headers:{extra:'value'}});
  assert.equal(env.calls.length,1);assert.deepEqual(env.calls[0].body,body);assert.equal(env.calls[0].headers.extra,'value');assert.equal(env.counts.size,0);
  await assert.rejects(env.api.requestPost(api,new FormData(),{crypto:{fields:['password']}}));
  assert.equal(env.calls.length,1);assert.equal(env.counts.size,0);
});
