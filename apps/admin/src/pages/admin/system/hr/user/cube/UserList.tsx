import React, { useEffect } from 'react';
import { get } from 'lodash';
import { DownloadOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Form, Input, Space } from 'antd';
import BaseBizTable, { BaseTableUtils, FaberTable } from '@/components/base-table';
import modelService from '@/services/admin/user';
import { Admin } from '@/types';
import UserModal from '../modal/UserModal';
import DepartmentCascade from '../helper/DepartmentCascade';
import { clearForm, useDelete, useExport, useTableQueryParams } from '@/utils/myHooks';
import { AuthDelBtn, FaHref } from '@fa/ui';

const serviceName = '用户';
const biz = 'UserList-v2';

interface IProps {
  departmentId?: string;
}

export default function UserList({ departmentId }: IProps) {
  const [form] = Form.useForm();

  const {
    queryParams,
    setFormValues,
    handleTableChange,
    setExtraParams,
    setSceneId,
    setConditionList,
    fetchPageList,
    loading,
    list,
    dicts,
    paginationProps,
  } = useTableQueryParams<Admin.UserWeb>(
    modelService.page,
    { extraParams: { departmentIdSuper: departmentId }, sorter: { field: 'crtTime', order: 'descend' } },
    serviceName,
  );

  const [exporting, fetchExportExcel] = useExport(modelService.exportExcel, {
    ...queryParams,
    extraParams: { departmentIdSuper: departmentId },
  });
  const [handleDelete] = useDelete<string>(modelService.remove, fetchPageList, serviceName);

  useEffect(() => setExtraParams({ departmentIdSuper: departmentId }), [departmentId]);

  /** 生成表格字段List */
  function genColumns() {
    const { sorter } = queryParams;
    return [
      BaseTableUtils.genSimpleSorterColumn('ID', 'id', 340, sorter, false),
      BaseTableUtils.genSimpleSorterColumn('手机号', 'tel', 120, sorter),
      BaseTableUtils.genSimpleSorterColumn('账户', 'username', 100, sorter),
      BaseTableUtils.genSimpleSorterColumn('姓名', 'name', 100, sorter),
      BaseTableUtils.genSimpleSorterColumn('角色', 'roleNames', undefined, sorter),
      {
        ...BaseTableUtils.genSimpleSorterColumn('部门', 'departmentId', 200, sorter),
        render: (_, record: any) => record.departmentName,
        tcCondComponent: ({ index, value, callback, ...props }: FaberTable.TcCondProp) => (
          <DepartmentCascade
            value={value}
            onChangeWithItem={(v: any, item: any) => callback(v, index, get(item, 'name'))}
            {...props}
          />
        ),
      },
      BaseTableUtils.genBoolSorterColumn('账户有效', 'status', 100, sorter),
      BaseTableUtils.genDictSorterColumn('性别', 'sex', 100, sorter, dicts, 'common_sex'),
      BaseTableUtils.genSimpleSorterColumn('邮箱', 'email', 150, sorter, false),
      BaseTableUtils.genSimpleSorterColumn('地址', 'address', 200, sorter, false),
      BaseTableUtils.genSimpleSorterColumn('描述', 'description', undefined, sorter, false),
      ...BaseTableUtils.genCtrColumns(sorter),
      ...BaseTableUtils.genUpdateColumns(sorter),
      {
        title: '操作',
        dataIndex: 'opr',
        render: (_, record) => (
          <Space>
            <UserModal title={`编辑${serviceName}信息`} record={record} fetchFinish={fetchPageList}>
              <FaHref icon={<EditOutlined />} text="编辑" />
            </UserModal>
            <AuthDelBtn handleDelete={() => handleDelete(record.id)} />
          </Space>
        ),
        width: 120,
        fixed: 'right',
        tcRequired: true,
        tcType: 'menu',
      },
    ] as FaberTable.ColumnsProp<Admin.UserWeb>[];
  }

  return (
    <div className="fa-full-content fa-flex-column fa-p12 fa-bg-white">
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative', marginBottom: 12 }}>
        <strong style={{ fontSize: '18px' }}>{serviceName}</strong>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Form form={form} layout="inline" onFinish={setFormValues}>
            <Form.Item name="tel" label="手机号">
              <Input placeholder="请输入手机号" />
            </Form.Item>
            <Form.Item name="name" label="姓名">
              <Input placeholder="请输入姓名" />
            </Form.Item>
          </Form>

          <Space>
            <Button onClick={() => form.submit()} loading={loading} icon={<SearchOutlined />}>
              查询
            </Button>
            <Button onClick={() => clearForm(form)} loading={loading}>
              重置
            </Button>
            <UserModal title={`新增${serviceName}信息`} fetchFinish={fetchPageList}>
              <Button icon={<PlusOutlined />} type="primary">
                新增
              </Button>
            </UserModal>
            <Button loading={exporting} icon={<DownloadOutlined />} onClick={fetchExportExcel}>
              导出
            </Button>
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
        showBatchBelBtn={false}
        onSceneChange={(v) => setSceneId(v)}
        onConditionChange={(cL) => setConditionList(cL)}
      />
    </div>
  );
}
