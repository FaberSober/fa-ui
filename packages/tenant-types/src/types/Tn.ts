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
    corpName: string;
    /** 租户ID */
    tenantName: string;
  }

  /** 租户-企业表 */
  export interface TenantCorp extends Fa.BaseDelEntity {
    /** ID */
    id: string;
    /** 名称 */
    name: string;
    /** 状态[1-正常2-停用] */
    status: TnEnums.TenantStatusEnum;
    /** 企业微信ID */
    wxCorpid: string;
    /** 第三方服务商企业id */
    openWxCorpid: string;
    /** 永久授权码 */
    permanentCode: string;
    /** 企业代码(企业统一社会信用代码) */
    socialCode: string;
    /** 企业通讯录secret */
    employeeSecret: string;
    /** 事件回调地址 */
    eventCallback: string;
    /** 企业外部联系人secret */
    contactSecret: string;
    /** 回调token */
    token: string;
    /** 回调消息加密串 */
    encodingAesKey: string;
    /** 授权类型 1-内部开发+自建应用 2-内部开发+自建应用代开发 3-第三方应用授权+自建应用代开发 4代开发应用 */
    authType: string;
    /** 租户ID */
    tenantId: string;
  }

  /** 租户-企业应用表 */
  export interface TenantCorpAgent extends Fa.BaseDelEntity {
    /** ID */
    id: string;
    /** 状态[1-正常2-停用] */
    status: TnEnums.TenantStatusEnum;
    /** 微信应用ID */
    wxAgentId: string;
    /** 微信应用secret */
    wxSecret: string;
    /** 应用名称 */
    name: string;
    /** 应用方形头像 */
    squareLogoUrl: string;
    /** 应用详情 */
    description: string;
    /** 应用是否被停用 0否1是 */
    close: boolean;
    /** 应用可信域名 */
    redirectDomain: string;
    /** 应用是否打开地理位置上报 0：不上报；1：进入会话上报； */
    reportLocationFlag: boolean;
    /** 是否上报用户进入应用事件。0：不接收；1：接收 */
    isReportenter: boolean;
    /** 应用主页url */
    homeUrl: string;
    /** 应用类型 1-侧边栏 2-应用提醒 3-工作台 */
    type: number;
    /** 是否自建应用代开发 0 - 不是 1-是 */
    isCustomizedApp: boolean;
    /** 应用权限信息 */
    privilege: string;
    /** 代开发应用发布状态 1：未上线；2：已上线 */
    customizedPublishStatus: boolean;
    /** 企业ID */
    corpId: string;
    /** 租户ID */
    tenantId: string;
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
