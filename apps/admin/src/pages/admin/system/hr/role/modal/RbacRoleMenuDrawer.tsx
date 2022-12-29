import React, { useContext, useState } from 'react';
import { Button, Drawer, DrawerProps, Tree } from 'antd';
import { Rbac } from '@/types';
import { Fa } from '@fa/ui';
import rbacMenuApi from '@/services/rbac/rbacMenu';
import rbacRoleMenuApi from '@/services/rbac/rbacRoleMenu';
import { showResponse } from '@/utils/utils';
import { ApiEffectLayoutContext } from '@/layout/ApiEffectLayout';

export interface RbacRoleMenuDrawerProps extends DrawerProps {
  record: Rbac.RbacRole;
  success?: () => void;
}

/**
 * BASE-角色表实体新增、编辑弹框
 */
export default function RbacRoleMenuDrawer({ children, record, ...props }: RbacRoleMenuDrawerProps) {
  const { loadingEffect } = useContext(ApiEffectLayoutContext);
  const [tree, setTree] = useState<Fa.TreeNode<Rbac.RbacMenu>[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
  const [halfCheckedKeys, setHalfCheckedKeys] = useState<React.Key[]>([]);

  const [open, setOpen] = useState(false);

  function refreshData() {
    rbacMenuApi.allTree().then((res) => {
      setTree(res.data);

      rbacRoleMenuApi.getRoleMenu(record.id).then((res) => {
        setCheckedKeys(res.data.checkedRoleIds);
        setHalfCheckedKeys(res.data.halfCheckedRoleIds);
      });
    });
  }

  function handleSave() {
    rbacRoleMenuApi
      .updateRoleMenu({
        roleId: record.id,
        checkedRoleIds: checkedKeys.map((i) => Number(i)),
        halfCheckedRoleIds: halfCheckedKeys.map((i) => Number(i)),
      })
      .then((res) => {
        showResponse(res, '更新角色权限');
        setOpen(false);
      });
  }

  function showModal() {
    setOpen(true);
    refreshData();
  }

  const loading = loadingEffect[rbacRoleMenuApi.getUrl('updateRoleMenu')];
  return (
    <span>
      <span onClick={showModal}>{children}</span>
      <Drawer
        title="角色权限设置"
        open={open}
        onClose={() => setOpen(false)}
        width={700}
        extra={
          <Button size="small" type="primary" onClick={handleSave} loading={loading}>
            更新
          </Button>
        }
        {...props}
      >
        <Tree
          checkable
          treeData={tree}
          fieldNames={{ title: 'name', key: 'id' }}
          checkedKeys={checkedKeys}
          onCheck={(checked: any, e: any) => {
            setCheckedKeys(checked);
            setHalfCheckedKeys(e.halfCheckedKeys || []);
          }}
        />
      </Drawer>
    </span>
  );
}
