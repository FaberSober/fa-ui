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


const LOGIN_MODE_KEY = "LOGIN_MODE"

export enum LoginMode {
  LOCAL = '1',
  CAS = '2',
}

export function getLoginMode(): LoginMode | null {
  return localStorage.getItem(LOGIN_MODE_KEY) as LoginMode;
}

export function setLoginMode(mode: LoginMode) {
  localStorage.setItem(LOGIN_MODE_KEY, mode);
}

export function clearLoginMode() {
  localStorage.removeItem(LOGIN_MODE_KEY);
}
