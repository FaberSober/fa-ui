import {GATE_APP} from '@/configs';
import {BaseApi} from '@/services';
import {Admin} from '@/types';

/** ------------------------------------------ xx 操作接口 ------------------------------------------ */
class LogLoginApi extends BaseApi<Admin.LogLogin, number> {}

export default new LogLoginApi(GATE_APP.admin, 'logLogin');
