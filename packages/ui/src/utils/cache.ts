import { Fa } from '@ui/types';
import { each, isNil } from "lodash";
import { getCookie } from './utils';

const CLIENT_INSTANCE_ID_KEY = 'fa.client.instance-id';
let fallbackClientInstanceId: string | undefined;

/** 返回当前浏览器安装的稳定标识。该标识仅用于客户端识别，不是可信凭据。 */
export function getClientInstanceId(): string {
  try {
    const stored = localStorage.getItem(CLIENT_INSTANCE_ID_KEY);
    if (stored) return stored;
  } catch {
    // 存储不可用时，在当前页面生命周期内复用内存标识。
  }

  if (!fallbackClientInstanceId) {
    fallbackClientInstanceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }

  try {
    localStorage.setItem(CLIENT_INSTANCE_ID_KEY, fallbackClientInstanceId);
  } catch {
    // 存储不可用时仍返回当前会话内稳定的标识。
  }

  return fallbackClientInstanceId;
}

export function getToken(): string | null {
  let token = localStorage.getItem(Fa.Constant.TOKEN_KEY);
  if (isNil(token)) {
    // try cookie
    token = getCookie(Fa.Constant.TOKEN_KEY)
    if (token) {
      setToken(token)
    }
  }
  return token;
}

export function setToken(token: string) {
  localStorage.setItem(Fa.Constant.TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(Fa.Constant.TOKEN_KEY);
}


export enum LoginMode {
  LOCAL = '1',
  CAS = '2',
}

export function getLoginMode(): LoginMode | null {
  return localStorage.getItem(Fa.Constant.LOGIN_MODE_KEY) as LoginMode;
}

export function setLoginMode(mode: LoginMode) {
  localStorage.setItem(Fa.Constant.LOGIN_MODE_KEY, mode);
}

export function clearLoginMode() {
  localStorage.removeItem(Fa.Constant.LOGIN_MODE_KEY);
}

export function getTnCorpId(): string | null {
  return localStorage.getItem(Fa.Constant.FA_TN_CORP_ID);
}

export function setTnCorpId(corpId: string) {
  localStorage.setItem(Fa.Constant.FA_TN_CORP_ID, corpId);
}

export function clearTnCorpId() {
  localStorage.removeItem(Fa.Constant.FA_TN_CORP_ID);
}

export function getTnTenantId(): string | null {
  return localStorage.getItem(Fa.Constant.FA_TN_TENANT_ID);
}

export function setTnTenantId(tenantId: string) {
  localStorage.setItem(Fa.Constant.FA_TN_TENANT_ID, tenantId);
}

export function clearTnTenantId() {
  localStorage.removeItem(Fa.Constant.FA_TN_TENANT_ID);
}

/**
 * 返回请求headers中的鉴权内容
 */
export function genAuthHeaders() {
  const headers:any = {};

  const token = getToken();
  if (token) {
    headers[Fa.Constant.TOKEN_KEY] = token;
  }
  headers[Fa.Constant.FA_TN_CORP_ID] = getTnCorpId();
  headers[Fa.Constant.FA_TN_TENANT_ID] = getTnTenantId();
  headers[Fa.Constant.FA_FROM] = window.FaFrom;
  headers[Fa.Constant.FA_VERSION_CODE] = window.FaVersionCode;
  headers[Fa.Constant.FA_VERSION_NAME] = window.FaVersionName;
  headers.FaClientInstanceId = getClientInstanceId();

  // 读取window.faHeader中配置的
  if (window.faHeader) {
    each(window.faHeader, (v,k) => {
      // console.log('v', v, 'k', k)
      headers[k] = v;
    })
  }

  return headers;
}

/**
 * 将鉴权的headers内容添加到指定对象中
 * @param headersToAdd
 */
export function addAuthHeaders(headers:any) {
  const headersAuth = genAuthHeaders();
  each(headersAuth, (v,k) => {
    // console.log('v', v, 'k', k)
    headers[k] = v;
  })
}
