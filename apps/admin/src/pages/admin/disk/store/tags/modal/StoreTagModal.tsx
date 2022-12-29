import React, {useContext, useEffect, useState} from 'react';
import {get} from 'lodash';
import {Button, Form, Input} from 'antd';
import {EditOutlined, PlusOutlined} from "@ant-design/icons";
import {DragModal, FaHref, CommonModalProps} from '@fa/ui';
import {ApiEffectLayoutContext} from "@/layout/ApiEffectLayout";
import {formItemFullLayout, showResponse} from '@/utils/utils';
import api from '@/services/disk/store/storeTag';
import {Disk} from '@/types';
import {InputColor} from "@/components/base-field";
import StoreTagCascader from "@/pages/admin/disk/store/tags/helper/StoreTagCascader";
import {DiskContext} from "@/layout/disk/context";



/**
 * STORE-标签实体新增、编辑弹框
 */
export default function StoreTagModal({ children, title, record, fetchFinish, addBtn, editBtn, ...props }: CommonModalProps<Disk.StoreTag>) {
  const { bucket } = useContext(DiskContext);
  const {loadingEffect} = useContext(ApiEffectLayoutContext)
  const [form] = Form.useForm();

  const [open, setOpen] = useState(false);

  /** 新增Item */
  function invokeInsertTask(params: any) {
    api.save(params).then(res => {
      showResponse(res, '新增标签');
      setOpen(false);
      if (fetchFinish) fetchFinish();
    })
  }

  /** 更新Item */
  function invokeUpdateTask(params: any) {
    api.update(params.id, params).then(res => {
      showResponse(res, '更新标签');
      setOpen(false);
      if (fetchFinish) fetchFinish();
    })
  }

  /** 提交表单 */
  function onFinish(fieldsValue: any) {
    const values = {
      ...fieldsValue,
      bucketId: bucket.id,
      // birthday: getDateStr000(fieldsValue.birthday),
    };
    if (record) {
      invokeUpdateTask({ ...record, ...values });
    } else {
      invokeInsertTask({ ...values });
    }
  }

  function getInitialValues() {
    return {
      parentId: get(record, 'parentId'),
      name: get(record, 'name'),
      color: get(record, 'color', '#aaa'),
    }
  }

  function showModal() {
    setOpen(true)
    form.setFieldsValue(getInitialValues())
  }

  useEffect(() => {
    form.setFieldsValue(getInitialValues());
  }, [record]);

  const loading = loadingEffect[api.getUrl('add')] || loadingEffect[api.getUrl('update')];
  return (
    <span>
      <span onClick={showModal}>
        {children}
        {addBtn && <Button icon={<PlusOutlined />} type="primary">新增</Button>}
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
          <Form.Item name="parentId" label="上级标签" rules={[{ required: true }]} {...formItemFullLayout}>
            <StoreTagCascader showRoot />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]} {...formItemFullLayout}>
            <Input />
          </Form.Item>
          <Form.Item name="color" label="颜色" rules={[{ required: true }]} {...formItemFullLayout}>
            <InputColor />
          </Form.Item>
        </Form>
      </DragModal>
    </span>
  )
}
