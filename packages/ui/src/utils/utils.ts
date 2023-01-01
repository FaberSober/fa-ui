import {message} from 'antd';
import {Fa} from '@/types';
import {findIndex, isNil, isUndefined, map, trim} from 'lodash';
import dayjs from "dayjs";

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


export function tryHexToRgba(hex: string | undefined) {
  // console.log('hex', hex)
  if (hex === undefined) return '#FFF';
  if (hex === null) return '#FFF';
  let color = hex;
  if (hex.indexOf('#') === 0) {
    const rgb = hexToRgba(hex);
    color = rgb.RGBA;
  }
  return color;
}

// 将hex颜色转成rgb
export function hexToRgba(hex: string, opacity = 1) {
  let hexfull = hex;
  // 如果是#FFF这种缩写模式，转换为完整写法#FFFFFF
  if (hexfull.length === 4) {
    hexfull += hexfull.substring(1, 4);
  }
  // eslint-disable-next-line prefer-template
  const RGBA =
    // eslint-disable-next-line prefer-template
    'rgba(' +
    // eslint-disable-next-line prefer-template
    parseInt('0x' + hexfull.slice(1, 3), 16) +
    ',' +
    // eslint-disable-next-line prefer-template
    parseInt('0x' + hexfull.slice(3, 5), 16) +
    ',' +
    // eslint-disable-next-line prefer-template
    parseInt('0x' + hexfull.slice(5, 7), 16) +
    ',' +
    opacity +
    ')';
  return {
    // eslint-disable-next-line prefer-template
    r: parseInt('0x' + hexfull.slice(1, 3), 16),
    // eslint-disable-next-line prefer-template
    g: parseInt('0x' + hexfull.slice(3, 5), 16),
    // eslint-disable-next-line prefer-template
    b: parseInt('0x' + hexfull.slice(5, 7), 16),
    a: opacity,
    RGBA,
  };
}

/**
 * date('YYYY-MM-DD')格式化str
 * @param {*} date
 * @param {*} format
 */
export function getDateStr(date: string | any | null | undefined, format?: string) {
  return date === null || date === undefined ? '' : dayjs(date).format(format || 'YYYY-MM-DD');
}

/**
 * date('YYYY-MM-DD HH:mm:ss')格式化str
 * @param {*} date
 */
export function getDateFullStr(date: string | any | null | undefined) {
  return getDateStr(date, 'YYYY-MM-DD HH:mm:ss');
}

/**
 * 获取时间类型初始值
 * @param {*} date
 * @param {*} defaultValue
 */
export function getInitialTimeValue(date: string | any | null | undefined, defaultValue = undefined): any {
  return date === null || date === undefined ? defaultValue : dayjs(date); // eslint-disable-line
}

/**
 * 解析antd DateRangerPick选择
 * @param {*} rangeDate
 * @param {*} index
 * @param {*} suffix
 */
export function parseRangeDateSuffix(rangeDate: any, index: number, suffix: string) {
  if (rangeDate && rangeDate[index] !== null && rangeDate[index] !== undefined) {
    const date = rangeDate[index];
    if (date !== null) {
      return `${date.format('YYYY-MM-DD')} ${suffix}`;
    }
  }
  return '';
}

/**
 * 将Select选中的options解析为字符串，用于前段展示
 * @param option
 */
export function optionsToLabel(option: any): string {
  if (option instanceof Array) {
    return (option || []).map((i) => i.label).join();
  }
  return option && option.label;
}

/**
 * 驼峰转换下划线
 */
export function toLine(name: string) {
  return name.replace(/([A-Z])/g, '_$1').toLowerCase();
}

export function tryToFixed(value: any, num = 6) {
  if (value === undefined) {
    return value;
  }
  if (typeof value === 'number') {
    return value.toFixed(num);
  }
  if (typeof value === 'string') {
    return Number(value).toFixed(num);
  }
  return value;
}

export const formItemFullLayout = { labelCol: { span: 4 }, wrapperCol: { span: 19 } };

