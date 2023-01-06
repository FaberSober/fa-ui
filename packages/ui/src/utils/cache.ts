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
