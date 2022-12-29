import React from 'react';
import { BaseSelect, BaseSelectProps } from '@fa/ui';
import api from '@/services/rbac/rbacRole';
import { Rbac } from '@/types';

/**
 * @author xu.pengfei
 * @date 2022/9/28
 */
export default function RbacRoleSelect({ ...props }: Omit<BaseSelectProps<Rbac.RbacRole>, 'serviceApi'>) {
  return <BaseSelect serviceApi={api} placeholder="请选择角色" {...props} />;
}
