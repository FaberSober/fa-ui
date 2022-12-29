import { Fa } from '@fa/ui';
import { requestPost } from '@/utils/request';

/**
 * 用户登录
 * @param username
 * @param password
 */
export function login(username: string, password: string): Promise<Fa.Ret<string>> {
  return requestPost('/api/base/auth/login', { username, password });
}
