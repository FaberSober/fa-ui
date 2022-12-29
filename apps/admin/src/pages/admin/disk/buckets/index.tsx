import React, {useContext} from 'react';
import {SearchOutlined, UsergroupAddOutlined} from '@ant-design/icons';
import {Button, Form, Input, Space} from 'antd';
import {AuthDelBtn, BaseDrawer, FaHref} from '@fa/ui';
import BaseBizTable, {BaseTableUtils, FaberTable} from '@/components/base-table';
import {clearForm, useDelete, useTableQueryParams} from '@/utils/myHooks';
import {Disk} from '@/types';
import StoreBucketModal from './modal/StoreBucketModal';
import api from '@/services/disk/store/storeBucket';
import {UserLayoutContext} from "@/layout/UserLayout";
import BucketUserList from "@/pages/admin/disk/buckets/cube/BucketUserList";


const serviceName = '文件仓库';
const biz = 'disk_store_bucket';

/**
 * STORE-库表格查询
 */
export default function StoreBucketList() {
  const {user} = useContext(UserLayoutContext)
  const [form] = Form.useForm();

  const {
    queryParams,
    setFormValues,
    handleTableChange,
    setSceneId,
    setConditionList,
    fetchPageList,
    loading,
    list,
    paginationProps,
  } = useTableQueryParams<Disk.StoreBucket>(api.page, {extraParams: {crtUser: user.id}}, serviceName);

  const [handleDelete] = useDelete<number>(api.remove, fetchPageList, serviceName);

  /** 生成表格字段List */
  function genColumns() {
    const { sorter } = queryParams;
    return [
      BaseTableUtils.genIdColumn('ID', 'id', 70, sorter),
      BaseTableUtils.genSimpleSorterColumn('库名称', 'name', undefined, sorter),
      ...BaseTableUtils.genCtrColumns(sorter),
      ...BaseTableUtils.genUpdateColumns(sorter),
      {
        title: '操作',
        dataIndex: 'menu',
        render: (_, r) => (
          <Space>
            <BaseDrawer
              title="库用户列表"
              triggerDom={<FaHref icon={<UsergroupAddOutlined />} text="用户" />}
            >
              <BucketUserList bucketId={r.id} />
            </BaseDrawer>
            <StoreBucketModal editBtn title={`编辑${serviceName}信息`} record={r} fetchFinish={fetchPageList} />
            <AuthDelBtn handleDelete={() => handleDelete(r.id)} />
          </Space>
        ),
        width: 180,
        fixed: 'right',
        tcRequired: true,
        tcType: 'menu',
      },
    ] as FaberTable.ColumnsProp<Disk.StoreBucket>[];
  }

  return (
    <div className="fa-full-content fa-flex-column fa-bg-white">
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative', padding: 8 }}>
        <strong style={{ fontSize: '18px' }}>{serviceName}</strong>
        <div className="fa-table-subtitle">
          <span>展示本账户创建的库列表</span>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Form form={form} layout="inline" onFinish={setFormValues}>
            <Form.Item name="name" label="名称">
              <Input placeholder="请输入仓库名称" />
            </Form.Item>
          </Form>

          <Space>
            <Button onClick={() => form.submit()} loading={loading} icon={<SearchOutlined />}>
              查询
            </Button>
            <Button onClick={() => clearForm(form)} loading={loading}>
              重置
            </Button>
            <StoreBucketModal addBtn title={`新增${serviceName}信息`} fetchFinish={fetchPageList} />
          </Space>
        </div>
      </div>

      <BaseBizTable
        rowKey="id"
        biz={biz}
        columns={genColumns()}
        pagination={paginationProps}
        loading={loading}
        dataSource={list}
        onChange={handleTableChange}
        refreshList={() => fetchPageList()}
        batchDelete={(ids) => api.removeBatchByIds(ids)}
        onSceneChange={(v) => setSceneId(v)}
        onConditionChange={(cL) => setConditionList(cL)}
      />
    </div>
  );
}
