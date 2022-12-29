import { GATE_APP } from '@/configs/server.config';
import { BaseApi } from '@/services/base';
import { Admin } from '@/types';

/** ------------------------------------------ xx 操作接口 ------------------------------------------ */
class LogApiApi extends BaseApi<Admin.LogApi, string> {}

export default new LogApiApi(GATE_APP.admin, 'logApi');
