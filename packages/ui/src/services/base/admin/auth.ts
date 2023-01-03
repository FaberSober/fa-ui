import { Fa } from '@/types';
import { BaseZeroApi } from "@/services";
import { GATE_APP } from "@/configs";

class Api extends BaseZeroApi {
  /** 登录 */
  login = (username: string, password: string): Promise<Fa.Ret<string>> => this.post('login', { username, password });

}

export default new Api(GATE_APP.admin, 'auth');
