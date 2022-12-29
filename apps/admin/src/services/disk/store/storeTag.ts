import { GATE_APP } from '@/configs/server.config';
import { BaseTreeApi } from '@/services/base';
import { Disk } from '@/types';

/** ------------------------------------------ xx 操作接口 ------------------------------------------ */
class Api extends BaseTreeApi<Disk.StoreTag, number> {}

export default new Api(GATE_APP.disk.store, 'tag');
