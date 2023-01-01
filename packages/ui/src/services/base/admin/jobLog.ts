import {GATE_APP} from '@/configs';
import {BaseApi} from '@/services';
import {Admin} from '@/types';

/** ------------------------------------------ xx 操作接口 ------------------------------------------ */
class JobLogApi extends BaseApi<Admin.JobLog, number> {}

export default new JobLogApi(GATE_APP.admin, 'jobLog');
