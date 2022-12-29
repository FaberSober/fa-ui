import { Fa, FaEnums } from '@fa/ui';
import {Admin} from "@/types";


namespace Disk {
  /** STORE-库 */
  export interface StoreBucket extends Fa.BaseDelEntity {
    /** ID */
    id: number;
    /** 库名称 */
    name: string;
  }

  /** STORE-库-人员关联 */
  export interface StoreBucketUser extends Fa.BaseDelEntity {
    /** ID */
    id: number;
    /** 库ID */
    bucketId: string;
    /** 用户ID */
    userId: string;
    /** 类型1-创建者/2-操作者 */
    type: FaEnums.StoreBucketUserTypeEnum;
    /** 查询返回-用户 */
    user: Admin.User;
  }

  export interface StoreFileInnerTag {
    id: number;
    /** 标签ID */
    tagId: number;
    /** 名称 */
    name: string;
    /** 颜色 */
    color: string;
  }

  /** STORE-文件 */
  export interface StoreFile extends Fa.BaseDelEntity {
    /** ID */
    id: number;
    /** 库ID */
    bucket: string;
    /** 文件夹名称 */
    name: string;
    /** 父级节点 */
    parentId: string;
    /** 是否文件夹 */
    dir: boolean;
    /** 文件类型 */
    type: string;
    /** 文件ID */
    fileId: string;
    /** 文件大小(KB) */
    size: number;
    /** 完整路径 */
    fullPath: string;
    tags: StoreFileInnerTag[];
  }

  /** STORE-文件-标签 */
  export interface StoreFileTag extends Fa.BaseDelEntity {
    /** ID */
    id: number;
    /** 文件ID */
    fileId: number;
    /** 标签ID */
    tagId: number;
  }

  /** STORE-标签 */
  export interface StoreTag extends Fa.BaseDelEntity {
    /** ID */
    id: number;
    /** 库ID */
    bucket: string;
    /** 父ID */
    parentId: number;
    /** 名称 */
    name: string;
    /** 排序ID */
    sort: number;
    /** 颜色 */
    color: string;
  }

}

export default Disk;
