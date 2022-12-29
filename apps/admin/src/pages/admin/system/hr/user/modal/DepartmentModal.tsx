import React, { useContext, useEffect, useState } from 'react';
import { get } from 'lodash';
import { Form, Input } from 'antd';
import { DragModal, DragModalProps } from '@fa/ui';
import { showResponse, formItemFullLayout } from '@/utils/utils';
import modelService from '@/services/admin/department';
import { Admin } from '@/types';
import DepartmentCascade from '../helper/DepartmentCascade';
import UserSearchSelect from '../helper/UserSearchSelect';
import { ApiEffectLayoutContext } from '@/layout/ApiEffectLayout';

const serviceName = '部门';

interface IProps extends DragModalProps {
  parentId?: number;
  title?: string;
  record?: Admin.Department;
  fetchFinish?: () => void;
}

/**
 * 部门实体新增、编辑弹框
 */
export default function DepartmentModal({ children, parentId, title, record, fetchFinish, ...props }: IProps) {
  const { loadingEffect } = useContext(ApiEffectLayoutContext);
  const [form] = Form.useForm();

  const [open, setOpen] = useState(false);

  /** 新增Item */
  function invokeInsertTask(params: any) {
    modelService.save(params).then((res) => {
      showResponse(res, `新增${serviceName}`);
      setOpen(false);
      if (props.onCancel) props.onCancel(params);
      if (fetchFinish) fetchFinish();
    });
  }

  /** 更新Item */
  function invokeUpdateTask(params: any) {
    modelService.update(params.id, params).then((res) => {
      showResponse(res, `更新${serviceName}`);
      setOpen(false);
      if (props.onCancel) props.onCancel(params);
      if (fetchFinish) fetchFinish();
    });
  }

  /** 提交表单 */
  function onFinish(fieldsValue: any) {
    const values = {
      ...fieldsValue,
    };
    if (record) {
      invokeUpdateTask({ ...record, ...values });
    } else {
      invokeInsertTask({ ...values });
    }
  }

  function getInitialValues() {
    return {
      name: get(record, 'name'),
      parentId: get(record, 'parentId', parentId),
      type: get(record, 'type'),
      managerId: get(record, 'managerId'),
      description: get(record, 'description'),
    };
  }

  function showModal() {
    setOpen(true);
    form.setFieldsValue(getInitialValues());
  }

  useEffect(() => {
    form.setFieldsValue(getInitialValues());
  }, [props.open]);

  const loading = loadingEffect[modelService.getUrl('save')] || loadingEffect[modelService.getUrl('update')];
  return (
    <span>
      <span onClick={showModal}>{children}</span>
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
          <Form.Item name="parentId" label="上级部门" rules={[{ required: true }]} {...formItemFullLayout}>
            <DepartmentCascade showRoot />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]} {...formItemFullLayout}>
            <Input />
          </Form.Item>
          <Form.Item name="managerId" label="负责人" {...formItemFullLayout}>
            <UserSearchSelect placeholder="请输入负责人姓名进行搜索" />
          </Form.Item>
          <Form.Item name="description" label="描述" {...formItemFullLayout}>
            <Input.TextArea />
          </Form.Item>
        </Form>
      </DragModal>
    </span>
  );
}
