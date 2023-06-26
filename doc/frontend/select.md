# select

## 通用业务数据Select查询框
```typescript jsx
import React from 'react';
import { BaseSelect, BaseSelectProps } from '@fa/ui';
import { Rbac } from '@/types';
import { rbacRoleApi as api } from '@/services';

/**
 * @author xu.pengfei
 * @date 2022/9/28
 */
export default function RbacRoleSelect({ ...props }: Omit<BaseSelectProps<Rbac.RbacRole>, 'serviceApi'>) {
  return <BaseSelect serviceApi={api} placeholder="请选择角色" {...props} />;
}

```
