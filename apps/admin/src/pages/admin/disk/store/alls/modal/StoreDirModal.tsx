import React, { useContext, useState } from 'react';
import { get } from 'lodash';
import { Button, Form, Input } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { DragModal, FaHref, CommonModalProps } from '@fa/ui';
import { ApiEffectLayoutContext } from '@/layout/ApiEffectLayout';
import { showResponse, formItemFullLayout } from '@/utils/utils';
import api from '@/services/disk/store/storeFile';
import { Disk } from '@/types';
import { DiskContext } from '@/layout/disk/context';

export interface StoreDirModalProps extends CommonModalProps<Disk.StoreBucket> {
  dirId: number;
}

/**
 * STORE-目录新增、编辑弹框
 */
export default function StoreDirModal({
  children,
  title,
  record,
  fetchFinish,
  addBtn,
  editBtn,
  onOpen,
  dirId,
  ...props
}: StoreDirModalProps) {
  const { bucket } = useContext(DiskContext);
  const { loadingEffect } = useContext(ApiEffectLayoutContext);
  const [form] = Form.useForm();

  const [open, setOpen] = useState(false);

  /** 提交表单 */
  async function onFinish(fieldsValue: any) {
    const values = {
      size: 0,
      dir: true,
      tags: [],
      ...record,
      ...fieldsValue,
      bucketId: bucket.id,
      parentId: dirId,
    };
    if (record) {
      const res = await api.update(record.id, values);
      showResponse(res, '更新信息');
    } else {
      const res = await api.save(values);
      showResponse(res, '新增目录信息');
    }

    setOpen(false);
    if (fetchFinish) fetchFinish();
  }

  function getInitialValues() {
    return {
      name: get(record, 'name'),
    };
  }

  function showModal() {
    setOpen(true);
    form.setFieldsValue(getInitialValues());
    if (onOpen) onOpen();
  }

  const loading = loadingEffect[api.getUrl('saveOrUpdate')];
  return (
    <span>
      <span onClick={showModal}>
        {children}
        {addBtn && (
          <Button icon={<PlusOutlined />} type="primary">
            新建目录
          </Button>
        )}
        {editBtn && <FaHref icon={<EditOutlined />} text="编辑" />}
      </span>
      <DragModal
        title={title}
        open={open}
        onOk={() => form.submit()}
        confirmLoading={loading}
        onCancel={() => setOpen(false)}
        width={700}
        {...props}
      >
        <Form form={form} onFinish={onFinish}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]} {...formItemFullLayout}>
            <Input />
          </Form.Item>
        </Form>
      </DragModal>
    </span>
  );
}
