namespace TnEnums {
  // ------------------------------------ BASE ------------------------------------
  export enum TenantStatusEnum {
    NORMAL = 1,
    STOP = 2,
  }

  // ------------------------------------ RBAC ------------------------------------
  export enum TenantRbacMenuLevelEnum {
    APP = 0,
    MENU = 1,
    BUTTON = 9,
  }

  export const TenantRbacMenuLevelEnumMap = {
    [TenantRbacMenuLevelEnum.APP]: '模块',
    [TenantRbacMenuLevelEnum.MENU]: '菜单',
    [TenantRbacMenuLevelEnum.BUTTON]: '按钮',
  };

  export enum TenantRbacLinkTypeEnum {
    INNER = 1,
    OUT = 2,
  }

}

export default TnEnums;
