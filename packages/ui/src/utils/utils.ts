import {message} from 'antd';
import {Fa} from '@/types';
import {findIndex, isNil, isUndefined, map, trim} from 'lodash';

/**
 * 展示服务端返回数据提示
 */
export function showResponse(response: Fa.Ret, prefix: string) {
  if (response && response.status === Fa.RES_CODE.OK) {
    message.success(`${prefix}成功`);
  }
}

/**
 * 复制文本到剪贴板
 */
export function handleClipboard(text: string, successMsg = '') {
  if (trim(text) === '') {
    return;
  }
  const textField = document.createElement('textarea');
  textField.innerText = text;
  document.body.appendChild(textField);
  textField.select();
  document.execCommand('copy');
  textField.remove();
  if (!isNil(successMsg)) {
    message.success(`${successMsg} 复制成功, Ctrl + V 使用`);
  } else {
    message.success(`${text} 复制成功, Ctrl + V 使用`);
  }
}

/**
 * 检查是否有权限
 * @param {array} permissions 用户菜单权限列表
 * @param {string} permissionCode 需要鉴定的权限点
 */
export function hasPermission(permissions?: string[], permissionCode?: string | undefined) {
  if (isUndefined(permissionCode)) return true;
  if (isUndefined(permissions) || permissions.length === 0) return false;
  return findIndex(permissions, (e) => e === permissionCode) > -1;
}

export function isImg(type: string) {
  return ["png", "jpg", "jpeg", "gif"].indexOf(type) > -1
}

/**
 * 将obj/list中undefined的值，设置为null。解决undefined值丢失的情况
 * @param obj
 */
export function trimObj(obj: any): any {
  if (obj instanceof Array) {
    return obj.map((i) => trimObj(i));
  }

  const newObj: any = {};
  map(obj, (v, k) => {
    newObj[k] = v === undefined ? null : v;
  });
  return newObj;
}
