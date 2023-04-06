import { Fa } from '@ui/types';

export function getToken(): string | null {
  return localStorage.getItem(Fa.Constant.TOKEN_KEY);
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
