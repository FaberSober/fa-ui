import { GATE_APP } from '@/configs/server.config';
import { BaseApi } from '@/services/base';
import { Rbac } from '@/types';

/** ------------------------------------------ xx 操作接口 ------------------------------------------ */
class RbacRoleApi extends BaseApi<Rbac.RbacRole, string> {}

export default new RbacRoleApi(GATE_APP.rbac, 'rbacRole');
