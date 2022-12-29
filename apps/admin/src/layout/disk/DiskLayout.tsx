import React, { useEffect, useState } from 'react';
import { Fa } from '@fa/ui';
import { Disk } from '@/types';
import { DiskContext, DiskContextProps } from '@/layout/disk/context';
import './DiskLayout.scss';
import { Empty } from 'antd';
import StoreBucketModal from '@/pages/admin/disk/buckets/modal/StoreBucketModal';
import { storeBucketApi } from '@/services/disk';
import {find, isNil, trim} from "lodash";

/**
 * 网盘布局文件
 * @author xu.pengfei
 * @date 2022/12/22 10:58
 */
export default function DiskLayout({ children }: Fa.BaseChildProps) {
  const [bucket, setBucket] = useState<Disk.StoreBucket>();

  function refreshList() {
    storeBucketApi.getMyList().then((res) => {
      if (res.data && res.data[0]) {
        // 获取之前缓存选择库
        const preBucketId = localStorage.getItem("disk:bucket:id")
        if (isNil(preBucketId)) {
          setBucket(res.data[0]);
          return;
        }

        const findBucket = find(res.data, i => trim(`${i.id}`) === trim(preBucketId))
        if (findBucket) {
          setBucket(findBucket)
        } else {
          setBucket(res.data[0]);
        }
      }
    });
  }

  useEffect(() => {
    refreshList();
  }, []);

  if (bucket === undefined) {
    return (
      <div className="fa-full-content fa-flex-column-center fa-flex-center">
        <Empty description="未找到库，请新建文件仓库" className="fa-mb12" />
        <StoreBucketModal title="新建文件仓库" addBtn fetchFinish={refreshList} />
      </div>
    );
  }

  const contextValue: DiskContextProps = {
    bucket,
    changeBucket: (bucketId) => {
      localStorage.setItem("disk:bucket:id", bucketId + "")
      storeBucketApi.getById(bucketId).then((res) => setBucket(res.data));
    },
  };

  return (
    <DiskContext.Provider value={contextValue}>
      {children}

      {/* TODO 展示正在上传的文件列表 */}
      {/*<div className="fa-disk-info-div">*/}
      {/*  <div className="fa-disk-title-div">*/}
      {/*    <div className="fa-disk-title fa-flex-1">完成上传</div>*/}
      {/*    <div className="fa-disk-title-close">*/}
      {/*      <CloseOutlined />*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*</div>*/}
    </DiskContext.Provider>
  );
}
