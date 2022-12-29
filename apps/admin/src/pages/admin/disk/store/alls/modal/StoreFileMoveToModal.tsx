import React, {useContext, useState} from 'react';
import {Button, Form} from 'antd';
import {DragModal, CommonModalProps} from '@fa/ui';
import {ApiEffectLayoutContext} from '@/layout/ApiEffectLayout';
import {formItemFullLayout, showResponse} from '@/utils/utils';
import {Disk} from '@/types';
import StoreFileCascader from "@/pages/admin/disk/store/alls/helper/StoreFileCascader";
import {storeFileApi} from "@/services/disk";

export interface StoreDirModalProps extends CommonModalProps<Disk.StoreBucket> {
  fileIds: number[];
}

/**
 * STORE-移动到文件夹
 */
export default function StoreFileMoveToModal({
  children,
  title,
  record,
  fetchFinish,
  addBtn,
  editBtn,
  onOpen,
                                               fileIds,
  ...props
}: StoreDirModalProps) {
  const { loadingEffect } = useContext(ApiEffectLayoutContext);
  const [form] = Form.useForm();

  const [open, setOpen] = useState(false);

  /** 提交表单 */
  function onFinish(fieldsValue: any) {
    storeFileApi.moveToDir(fileIds, fieldsValue.toDirId).then(res => {
      showResponse(res, "移动到目录")
      setOpen(false);
      if (fetchFinish) fetchFinish();
    })
  }

  function getInitialValues() {
    return {
      toDirId: undefined,
    };
  }

  function showModal() {
    setOpen(true);
    form.setFieldsValue(getInitialValues());
    if (onOpen) onOpen();
  }

  const loading = loadingEffect[storeFileApi.getUrl('moveToDir')];
  return (
    <span>
      <span onClick={showModal}>
        {children || <Button>移动到...</Button>}
      </span>
      <DragModal
        title="移动到"
        open={open}
        onOk={() => form.submit()}
        confirmLoading={loading}
        onCancel={() => setOpen(false)}
        width={700}
        {...props}
      >
        <Form form={form} onFinish={onFinish}>
          <Form.Item name="toDirId" label="移动到" rules={[{ required: true }]} {...formItemFullLayout}>
            <StoreFileCascader disabledIds={fileIds} />
          </Form.Item>
        </Form>
      </DragModal>
    </span>
  );
}
