import React, {useContext, useState} from 'react';
import {Button} from 'antd';
import {DragModal, TreeTransfer, CommonModalProps} from '@fa/ui';
import {ApiEffectLayoutContext} from '@/layout/ApiEffectLayout';
import {Disk} from '@/types';
import {storeFileApi} from "@/services/disk";
import {DiskContext} from "@/layout/disk/context";
import api from "@/services/disk/store/storeTag";
import {showResponse} from "@/utils/utils";


export interface StoreDirModalProps extends CommonModalProps<Disk.StoreBucket> {
  fileIds: number[];
}

/**
 * STORE-文件打标签
 */
export default function StoreFileTagsModal({
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
  const {bucket} = useContext(DiskContext);
  const { loadingEffect } = useContext(ApiEffectLayoutContext);

  const [open, setOpen] = useState(false);

  const [tagIds, setTagIds] = useState<string[]>([]);

  /** 提交表单 */
  function handleSubmit() {
    storeFileApi.addTags(fileIds, tagIds).then(res => {
      showResponse(res, "打标签")
      setOpen(false);
      if (fetchFinish) fetchFinish();
    })
  }

  function showModal() {
    setOpen(true);
    if (onOpen) onOpen();
  }
  const onChange = (keys: string[]) => {
    setTagIds(keys);
  };

  const loading = loadingEffect[storeFileApi.getUrl('copyToDir')];
  return (
    <span>
      <span onClick={showModal}>
        {children || <Button>打标签</Button>}
      </span>
      <DragModal
        title="打标签"
        open={open}
        onOk={handleSubmit}
        confirmLoading={loading}
        onCancel={() => setOpen(false)}
        width={700}
        {...props}
      >
        <TreeTransfer
          serviceApi={{
            allTree: () => api.getTree({query: {bucketId: bucket.id}})
          }}
          extraEffectArgs={[bucket]}
          targetKeys={tagIds}
          onChange={onChange}
        />
      </DragModal>
    </span>
  );
}
