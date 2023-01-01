import {GATE_APP} from '@/configs';
import {BaseApi} from '@/services';
import {Admin} from '@/types';

/** ------------------------------------------ xx 操作接口 ------------------------------------------ */
class EntityLogApi extends BaseApi<Admin.EntityLog, number> {}

export default new EntityLogApi(GATE_APP.admin, 'entityLog');
