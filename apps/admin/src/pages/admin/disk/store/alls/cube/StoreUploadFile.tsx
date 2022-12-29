import React, {useContext, useRef} from 'react';
import fileSaveApi from "@/services/admin/fileSave";
import {storeFileApi} from "@/services/disk";
import {showResponse} from "@/utils/utils";
import {DiskContext} from "@/layout/disk/context";
import {Button} from "antd";
import {UploadOutlined} from "@ant-design/icons";


export interface StoreUploadFileProps {
  dirId: number;
  onSuccess?: () => void;
}

/**
 * @author xu.pengfei
 * @date 2022/12/26 14:21
 */
export default function StoreUploadFile({dirId, onSuccess}: StoreUploadFileProps) {
  const inputRef = useRef<any>(null);

  const { bucket } = useContext(DiskContext);

  function handleInputFileChange(e: any) {
    const file = e.target.files[0];

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      // 走自己服务器上传，会占据自己服务器带宽
      fileSaveApi
        .uploadFile(file, (pe) => console.log('progressEvent', pe))
        .then((res) => {
          // save file
          const params = {
            bucketId: bucket.id,
            parentId: dirId,
            fileId: res.data.id,
            dir: false,
            tags: [],
          }
          storeFileApi.save(params).then((res) => {
            showResponse(res, '上传文件');
            if (onSuccess) onSuccess();
          });

          // TODO update progress to layout
          // cb(res.data.localUrl, { title: file.name });
        });
    });
    reader.readAsDataURL(file);
  }

  function triggerClick() {
    if (inputRef.current) {
      inputRef.current.click()
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" onChange={handleInputFileChange} style={{display: 'none'}} />
      <Button type="primary" icon={<UploadOutlined />} onClick={triggerClick}>上传文件</Button>
    </div>
  )
}