import {GATE_APP} from '@/configs';
import {BaseApi} from '@/services';
import {Admin} from '@/types';

/** ------------------------------------------ xx 操作接口 ------------------------------------------ */
const serviceModule = 'notice';

class Notice extends BaseApi<Admin.Notice, number> {}

export default new Notice(GATE_APP.admin, serviceModule);
