import { Fa } from '@ui/types';
import { trimObj } from '@ui/utils/utils';
import BaseZeroApi from './BaseZeroApi';

export default class BaseApi<T, KeyType, PageT = T> extends BaseZeroApi {
  /** 增加实体信息 */
  save = (params: any): Promise<Fa.Ret<T>> => this.post('save', params);

  /** 增加实体信息 */
  saveBatch = (params: any[]): Promise<Fa.Ret<T>> => this.post('saveBatch', params);

  /** 获取唯一实体 */
  getById = (id: KeyType): Promise<Fa.Ret<T>> => this.get(`getById/${id}`);

  /** 获取唯一实体 */
  getDetail = (id: KeyType): Promise<Fa.Ret<T>> => this.get(`getDetail/${id}`);

  /** 获取唯一实体 */
  getByIds = (ids: KeyType[]): Promise<Fa.Ret<T[]>> => this.post(`getByIds`, ids);

  /** 更新实体 */
  update = (id: KeyType, params: any): Promise<Fa.Ret> => this.post('update', { id, ...trimObj(params) });

  /** 新增or更新 */
  saveOrUpdate = (params: any): Promise<Fa.Ret> => this.post('saveOrUpdate', params);

  /** 批量新增or更新 */
  saveOrUpdateBatch = (params: any[]): Promise<Fa.Ret<T>> => this.post('saveOrUpdateBatch', params);

  /** 更新实体 */
  updateBatch = (entityList: T[]): Promise<Fa.Ret> => this.post('updateBatch', trimObj(entityList));

  /** 删除实体 */
  remove = (id: KeyType): Promise<Fa.Ret> => this.delete(`remove/${id}`);

  /** 批量删除实体 */
  removeBatchByIds = (ids: KeyType[]): Promise<Fa.Ret> => this.post('removeBatchByIds', ids);

  /** id永久删除 */
  removePer = (id: KeyType): Promise<Fa.Ret> => this.delete(`removePer/${id}`);

  /** ids批量永久删除 */
  removePerBatchByIds = (ids: KeyType[]): Promise<Fa.Ret> => this.post('removePerBatchByIds', ids);

  /** 获取所有实体 */
  all = (): Promise<Fa.Ret<T[]>> => this.get('all');

  /** 获取实体List */
  list = (params: Fa.BaseQueryParams): Promise<Fa.Ret<T[]>> => this.post('list', params);

  /** 获取实体List-用户创建 */
  mineList = (params: Fa.BaseQueryParams): Promise<Fa.Ret<T[]>> => this.post('mineList', params);

  /** 获取实体List */
  count = (params: Fa.BaseQueryParams): Promise<Fa.Ret<number>> => this.post('count', params);

  /** 获取实体 分页 */
  page = (params: Fa.BasePageProps): Promise<Fa.Ret<Fa.Page<PageT>>> => this.post('page', params);

  /** 导出Excel[分页查询] */
  exportExcel = (params: Fa.BasePageProps): Promise<undefined> => this.download('exportExcel', params);
}
