import { GATE_APP } from '@/configs/server.config';
import { BaseApi } from '@/services/base';
import { Disk } from '@/types';

/** ------------------------------------------ xx 操作接口 ------------------------------------------ */
class Api extends BaseApi<Disk.StoreFileTag, number> {}

export default new Api(GATE_APP.disk.store, 'fileTag');
