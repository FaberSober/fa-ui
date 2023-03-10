import {message} from 'antd';
import { Fa, FaEnums } from '@ui/types';
import {findIndex, isNil, isUndefined, map, trim} from 'lodash';
import dayjs from "dayjs";
import { filesize } from "filesize";

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
export function copyToClipboard(text: string, successMsg = '') {
  handleClipboard(text, successMsg)
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

/**
 * 判断连接是否为图片
 * @param url
 */
export function isUrlImg(url: string) {
  if (url === undefined || url === null) return false;
  if (url.indexOf('.') === -1) return false;

  const suffix = url.substr(url.lastIndexOf('.') + 1).toLowerCase();

  return ['png', 'jpg', 'jpeg', 'ico', 'bmp', 'gif'].indexOf(suffix) > -1;
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
 * date('YYYY-MM-DD HH:mm:ss')str
 */
export function getCurDateTime(format = 'YYYY-MM-DD HH:mm:ss') {
  return dayjs().format(format);
}

/**
 * date('HH:mm:ss')str
 */
export function getCurTime(format = 'HH:mm:ss.SSS') {
  return dayjs().format(format);
}


/**
 * date('YYYY-MM-DD')格式化str
 * @param {*} date
 * @param {*} format
 */
export function getDateStr000(date: string | any | null | undefined, format = 'YYYY-MM-DD 00:00:00') {
  return date === null || date === undefined ? undefined : dayjs(date).format(format);
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

export function getInitialKeyTimeValue(record: any, key: string, defaultValue: any = undefined) {
  return record && record[key] ? dayjs(record[key]) : defaultValue; // eslint-disable-line
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
 * 下划线转换驼峰
 * @param {*} name
 */
export function toHump(name: string) {
  return name.replace(/_(\w)/g, (_, letter) => letter.toUpperCase());
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



/** * 是否为mac系统（包含iphone手机） * */
export function isMac() {
  return /macintosh|mac os x/i.test(navigator.userAgent);
}

/** * 是否为windows系统 * */
export function isWindows() {
  return /windows|win32/i.test(navigator.userAgent);
}

/**
 * 判断str是否是json
 * @param input
 */
export function isJson(input: string | undefined): boolean {
  if (input === undefined) return false;
  try {
    // json格式化
    JSON.stringify(JSON.parse(input), null, '\t');
    return true;
  } catch (err) {
    // console.error(err)
  }
  return false;
}

export function tryFormatJson(input: string | undefined): string {
  if (input === undefined) return '';
  try {
    // json格式化
    return JSON.stringify(JSON.parse(input), null, '\t');
  } catch (err) {
    // console.error(err)
  }
  return input;
}

/**
 * 将canvas转换为文件
 * @param canvas
 * @param quality
 * @param fn
 */
export function canvasResizeToFile(canvas: any, quality: any, fn: any) {
  canvas.toBlob(
    (blob: any) => {
      fn(blob);
    },
    'image/jpeg',
    quality,
  );
}

/**
 * 字符超过省略
 * @param val
 * @param maxLength
 */
export function ellipsis(val: string | undefined, maxLength = 55): string {
  if (isNil(val)) return '';
  if (val.length > maxLength) {
    return `${val.substr(0, maxLength)}...`;
  }
  return val;
}


export function arrayMoveMutable(array: any[], fromIndex: number, toIndex: number) {
  const startIndex = fromIndex < 0 ? array.length + fromIndex : fromIndex;

  if (startIndex >= 0 && startIndex < array.length) {
    const endIndex = toIndex < 0 ? array.length + toIndex : toIndex;

    const [item] = array.splice(fromIndex, 1);
    array.splice(endIndex, 0, item);
  }
}

export function arrayMoveImmutable(array: any[], fromIndex: number, toIndex: number) {
  const newArray = [...array];
  arrayMoveMutable(newArray, fromIndex, toIndex);
  return newArray;
}

/**
 * 数组移动
 * @param arr
 * @param fromIndex
 * @param toIndex
 */
export function arrayMove(arr: any[], fromIndex: number, toIndex: number) {
  // 直接使用array-move第三方组件
  return arrayMoveImmutable(arr, fromIndex, toIndex);

  // 老方法，有bug
  //如果当前元素在拖动目标位置的下方，先将当前元素从数组拿出，数组长度-1，我们直接给数组拖动目标位置的地方新增一个和当前元素值一样的元素，
  //我们再把数组之前的那个拖动的元素删除掉，所以要len+1
  // if (index > tindex) {
  // 	arr.splice(tindex, 0, arr[index]);
  // 	arr.splice(index + 1, 1);
  // } else {
  // 	//如果当前元素在拖动目标位置的上方，先将当前元素从数组拿出，数组长度-1，我们直接给数组拖动目标位置+1的地方新增一个和当前元素值一样的元素，
  // 	//这时，数组len不变，我们再把数组之前的那个拖动的元素删除掉，下标还是index
  // 	arr.splice(tindex + 1, 0, arr[index]);
  // 	arr.splice(index, 1);
  // }
}

export function judgeGoBack(noHistoryNavigate: () => void) {
  if (window.history.length > 0) {
    window.history.go(-1);
  } else {
    if (noHistoryNavigate) {
      noHistoryNavigate();
    }
  }
}

/**
 * 七牛云的图片预览
 * @param url 七牛云图片url
 * @param width 预览图片宽
 * @param height 预览图片高
 */
export function previewImageQiniu(url: string, width = 200, height?: number) {
  let previewUrl = `${url}?imageView2/3/w/${width}`;
  if (height) {
    previewUrl += `/h/${height}`;
  }
  return previewUrl;
}

/**
 * 文件大小可视化
 * @param size
 */
export function sizeToHuman(size: number, base = 2): string {
  return filesize(size, { base, standard: 'jedec' }) as string;
}

export const REGEX_TEL_NO = /^(13[0-9]|14[5-9]|15[012356789]|166|17[0-8]|18[0-9]|19[8-9])[0-9]{8}$/;
export const REGEX_CHAR_NUM = /^[0-9a-zA-Z]+$/;
export const formItemFullLayout = { labelCol: { span: 4 }, wrapperCol: { span: 20 } };
export const formItemHalfLayout = { labelCol: { span: 8 }, wrapperCol: { span: 16 } };

export const FormRules = {
  PATTERN_WORD: { pattern: /^[\u4e00-\u9fa5a-zA-Z0-9]*$/, message: '只能输入中英文字符、数字' },
  PATTERN_CHAR_AND_NUM: { pattern: /^[a-zA-Z]+[a-zA-Z0-9_-]*$/, message: '只能输入英文字符、数字、下划线、中划线' },
  PATTERN_WORD_ZH_ONLY: { pattern: /^[\u4e00-\u9fa5]*$/, message: '只能输入中文字符' },
  PATTERN_CHAR_UPPER_AND_NUM: { pattern: /^[A-Z0-9]*$/, message: '只能输入英文字符、数字' },
  PATTERN_TEL: { pattern: REGEX_TEL_NO, message: '请输入正确格式的手机号' },
};

/**
 * file的accept属性（文件上传的类型）
 * https://blog.csdn.net/weixin_44599143/article/details/107932099
 */
export const FileAccept = {
  EXCEL: '.csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  PDF: 'application/pdf',
};

export const FA_TYPE_WORD = [".doc", ".docx", ".docm",
  ".dot", ".dotx", ".dotm",
  ".odt", ".fodt", ".ott", ".rtf", ".txt",
  ".html", ".htm", ".mht", ".xml",
  ".pdf", ".djvu", ".fb2", ".epub", ".xps", ".oform"];

export const FA_TYPE_EXCEL = [".xls", ".xlsx", ".xlsm", ".xlsb",
  ".xlt", ".xltx", ".xltm",
  ".ods", ".fods", ".ots", ".csv"];

export const FA_TYPE_PPT = [".pps", ".ppsx", ".ppsm",
  ".ppt", ".pptx", ".pptm",
  ".pot", ".potx", ".potm",
  ".odp", ".fodp", ".otp"];

export function getDocumentType(ext: string):FaEnums.DocumentType|undefined {
  if (FA_TYPE_WORD.indexOf('.' + ext) > -1) return FaEnums.DocumentType.word;
  if (FA_TYPE_EXCEL.indexOf('.' + ext) > -1) return FaEnums.DocumentType.cell;
  if (FA_TYPE_PPT.indexOf('.' + ext) > -1) return FaEnums.DocumentType.slide;
}
