import { GATE_APP } from '@/configs';
import { BaseTreeApi } from '@/services';
import { Rbac } from '@/types';

/** ------------------------------------------ xx 操作接口 ------------------------------------------ */
class RbacMenuApi extends BaseTreeApi<Rbac.RbacMenu, string> {}

export default new RbacMenuApi(GATE_APP.rbac, 'rbacMenu');
