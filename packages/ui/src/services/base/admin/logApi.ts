import {GATE_APP} from '@/configs';
import {BaseApi} from '@/services';
import {Admin} from '@/types';

/** ------------------------------------------ xx 操作接口 ------------------------------------------ */
class LogApiApi extends BaseApi<Admin.LogApi, string> {}

export default new LogApiApi(GATE_APP.admin, 'logApi');
