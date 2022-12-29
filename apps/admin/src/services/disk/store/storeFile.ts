import {GATE_APP} from '@/configs/server.config';
import {BaseTreeApi} from '@/services/base';
import { Fa } from '@fa/ui';
import {Disk} from '@/types';

/** ------------------------------------------ xx 操作接口 ------------------------------------------ */
class Api extends BaseTreeApi<Disk.StoreFile, number> {

  /** 批量下载 */
  downloadZip = (ids: number[]): Promise<undefined> => this.download('downloadZip', ids);

  /** 移动到 */
  moveToDir = (fileIds: number[], toDirId: number): Promise<Fa.Ret<boolean>> => this.post('moveToDir', { fileIds, toDirId });

  /** 复制到 */
  copyToDir = (fileIds: number[], toDirId: number): Promise<Fa.Ret<boolean>> => this.post('copyToDir', { fileIds, toDirId });

  /** 打标签 */
  addTags = (fileIds: number[], tagIds: any[]): Promise<Fa.Ret<boolean>> => this.post('addTags', { fileIds, tagIds });

  /** 获取实体List */
  queryFile = (params: any): Promise<Fa.Ret<Disk.StoreFile[]>> => this.post('queryFile', params);

}

export default new Api(GATE_APP.disk.store, 'file');
