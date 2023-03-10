import { Fa, FaEnums } from '@fa/ui';
import TnEnums from './TnEnums'

namespace Tn {
  /** 租户-租户表 */
  export interface Tenant extends Fa.BaseDelEntity {
    /** ID */
    id: string;
    /** 租户名称 */
    name: string;
    /** 租户状态[1-正常2-停用] */
    status: TnEnums.TenantStatusEnum;
    /** 所属用户ID */
    ownerId: string;
    /** 所属用户 */
    ownerName: string;
    /** 所属用户 */
    owner: TenantUser;
  }

  /** 租户-用户表 */
  export interface TenantUser extends Fa.BaseDelEntity {
    /** ID */
    id: string;
    /** 名称 */
    name: string;
    /** 状态[1-正常2-停用] */
    status: TnEnums.TenantStatusEnum;
    /** 手机号 */
    tel: string;
    /** 密码 */
    password: string;
    /** 当前选择的企业ID */
    corpId: string;
    /** 租户ID */
    tenantId: string;
    /** 当前选择的企业ID */
    corpName: number;
    /** 租户ID */
    tenantName: number;
  }

  /** 租户-企业表 */
  export interface TenantCorp extends Fa.BaseDelEntity {
    /** ID */
    id: string;
    /** 名称 */
    name: string;
    /** 状态[1-正常2-停用] */
    status: TnEnums.TenantStatusEnum;
    /** 租户ID */
    tenantId: string;
    /** 租户ID */
    tenantName: string;
  }

  /** 租户-企业用户表 */
  export interface TenantCorpUser extends Fa.TnBaseDelEntity {
    /** ID */
    id: string;
    /** 租户用户ID */
    userId: string;
    /** 状态[1-正常2-停用] */
    status: TnEnums.TenantStatusEnum;
  }

  /** 租户-URL请求日志 */
  export interface TenantLogApi extends Fa.TnBaseDelEntity {
    /** ID */
    id: string;
    /** 模块 */
    biz: string;
    /** 操作 */
    opr: string;
    /** CRUD类型 */
    crud: FaEnums.LogCrudEnum;
    /** 请求URL */
    url: string;
    /** 请求类型 */
    method: string;
    /** 访问客户端 */
    agent: string;
    /** 操作系统 */
    os: string;
    /** 浏览器 */
    browser: string;
    /** 浏览器版本 */
    version: string;
    /** 客户端来源 */
    faFrom: string;
    /** 客户端版本号 */
    versionCode: string;
    /** 客户端版本名 */
    versionName: string;
    /** 是否为移动终端 */
    mobile: boolean;
    /** 请求花费时间 */
    duration: number;
    /** 省 */
    pro: string;
    /** 市 */
    city: string;
    /** 地址 */
    addr: string;
    /** 请求内容 */
    request: string;
    /** 请求体大小 */
    reqSize: number;
    /** 返回内容 */
    response: string;
    /** 返回内容大小 */
    retSize: number;
    /** 返回码 */
    retStatus: string;
    /** 企业名称 */
    corpName: string;
    /** 租户名称 */
    tenantName: string;
  }

  /** 租户-登录日志 */
  export interface TenantLogLogin extends Fa.TnBaseDelEntity {
    /** ID */
    id: string;
    /** 访问客户端 */
    agent: string;
    /** 操作系统 */
    os: string;
    /** 浏览器 */
    browser: string;
    /** 浏览器版本 */
    version: string;
    /** 是否为移动终端 */
    mobile: boolean;
    /** 省 */
    pro: string;
    /** 市 */
    city: string;
    /** 地址 */
    addr: string;
    /** 企业名称 */
    corpName: string;
    /** 租户名称 */
    tenantName: string;
  }

  export interface TenantConfig {
    tenantName: string;
    logo: string;
    title: string;
  }
}

export default Tn;
