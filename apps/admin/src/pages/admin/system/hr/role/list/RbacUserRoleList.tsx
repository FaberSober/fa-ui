import React, { useEffect } from 'react';
import {PlusOutlined, SearchOutlined} from '@ant-design/icons';
import { Button, Form, Input, Space } from 'antd';
import BaseBizTable, { BaseTableUtils, FaberTable } from '@/components/base-table';
import { clearForm, useDelete, useTableQueryParams } from '@/utils/myHooks';
import modelService from '@/services/rbac/rbacUserRole';
import { Rbac } from '@/types';
import {AuthDelBtn, FaUtils} from '@fa/ui';
import {BizUserSelect, SelectedUser} from "@/components/biz-user-select";
import {rbacUserRoleApi} from "@/services/rbac";

const serviceName = '角色用户';
const biz = 'RbacUserRoleList';

export interface RbacUserRoleListProps {
  rbacRole: Rbac.RbacRole;
}

export default function RbacUserRoleList({ rbacRole }: RbacUserRoleListProps) {
  const [form] = Form.useForm();

  const {
    queryParams,
    setFormValues,
    setExtraParams,
    handleTableChange,
    fetchPageList,
    loading,
    list,
    paginationProps,
  } = useTableQueryParams<Rbac.RbacUserRoleRetVo>(
    modelService.pageVo,
    { extraParams: { roleId: rbacRole.id }, sorter: { field: 'crtTime', order: 'descend' } },
    serviceName,
  );

  useEffect(() => {
    setExtraParams({ roleId: rbacRole.id });
  }, [rbacRole]);

  const [handleDelete] = useDelete<string>(modelService.remove, fetchPageList, serviceName);

  function handleAddUsers(users: SelectedUser[], callback: any) {
    rbacUserRoleApi.addUsers(users.map(i => i.id), rbacRole.id).then(res => {
      FaUtils.showResponse(res, '添加用户角色')
      callback()
      fetchPageList()
    })
  }

  /** 生成表格字段List */
  function genColumns() {
    const { sorter } = queryParams;
    return [
      BaseTableUtils.genSimpleSorterColumn('用户名称', 'name', 150, sorter),
      BaseTableUtils.genSimpleSorterColumn('用户账户', 'username', undefined, sorter),
      ...BaseTableUtils.genCtrColumns(sorter),
      ...BaseTableUtils.genUpdateColumns(sorter),
      {
        title: '操作',
        dataIndex: 'opr',
        render: (_, record) => (
          <Space>
            <AuthDelBtn handleDelete={() => handleDelete(record.id)} />
          </Space>
        ),
        width: 80,
        fixed: 'right',
        tcRequired: true,
        tcType: 'menu',
      },
    ] as FaberTable.ColumnsProp<Rbac.RbacUserRoleRetVo>[];
  }

  return (
    <div className="fa-full-content fa-flex-column fa-bg-white">
      <div className="fa-flex-row-center fa-p8">
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Form form={form} layout="inline" onFinish={setFormValues}>
            <Form.Item name="name" label="用户名称">
              <Input placeholder="请输入用户名称" />
            </Form.Item>
          </Form>

          <Space>
            <Button onClick={() => form.submit()} loading={loading} icon={<SearchOutlined />}>查询</Button>
            <Button onClick={() => clearForm(form)} loading={loading}>重置</Button>
            <BizUserSelect onChange={handleAddUsers}>
              <Button icon={<PlusOutlined />} type="primary">新增用户</Button>
            </BizUserSelect>
          </Space>
        </div>
      </div>

      <BaseBizTable
        biz={biz}
        columns={genColumns()}
        pagination={paginationProps}
        loading={loading}
        dataSource={list}
        rowKey={(item) => item.id}
        onChange={handleTableChange}
        refreshList={() => fetchPageList()}
        batchDelete={(ids) => modelService.removeBatchByIds(ids)}
        showComplexQuery={false}
      />
    </div>
  );
}
