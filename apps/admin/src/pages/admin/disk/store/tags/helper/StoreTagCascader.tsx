import React, {useContext} from 'react';
import {BaseCascader, BaseCascaderProps} from '@fa/ui';
import api from '@/services/disk/store/storeTag';
import {Disk} from '@/types';
import {DiskContext} from "@/layout/disk/context";

export interface StoreTagCascaderProps extends Omit<BaseCascaderProps<Disk.StoreTag, number>, 'serviceApi'> {}

/**
 * @author xu.pengfei
 * @date 2020/12/25
 */
export default function StoreTagCascader(props: StoreTagCascaderProps) {
  const { bucket } = useContext(DiskContext);

  return (
    <BaseCascader
      showRoot={false}
      serviceApi={{
        ...api,
        allTree: () => api.getTree({ query: { bucketId: bucket.id } })
      }}
      placeholder="请选择标签"
      extraParams={bucket}
      {...props}
    />
  );
}
