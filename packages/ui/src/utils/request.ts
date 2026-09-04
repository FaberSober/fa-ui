import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { get } from 'lodash';
import { message } from 'antd';
import { addAuthHeaders } from './cache';
import { Fa } from '@ui/types';
import { md5WithSecret } from "@ui/utils/cipher";
import { useApiLoadingStore } from '@ui/stores';

// Set config defaults when creating the instance
const instance = axios.create({
  // baseURL: SERVER,
});

// 覆写库的超时默认值
// 现在，在超时前，所有请求都会等待 2.5 秒
instance.defaults.timeout = 60000;

const codeMessage: any = {
  200: '服务器成功返回请求的数据。',
  201: '新建或修改数据成功。',
  202: '一个请求已经进入后台排队（异步任务）。',
  204: '删除数据成功。',
  400: '发出的请求有错误，服务器没有进行新建或修改数据的操作。',
  401: '用户没有权限（令牌、用户名、密码错误）。',
  403: '用户得到授权，但是访问是被禁止的。',
  404: '发出的请求针对的是不存在的记录，服务器没有进行操作。',
  406: '请求的格式不可得。',
  410: '请求的资源被永久删除，且不会再得到的。',
  422: '当创建一个对象时，发生一个验证错误。',
  500: '服务器发生错误，请检查服务器。',
  502: '网关错误。',
  503: '服务不可用，服务器暂时过载或维护。',
  504: '网关超时。',
};

// 添加请求拦截器
instance.interceptors.request.use(
  (config) => {
    // 在发送请求之前做些什么
    addAuthHeaders(config.headers)

    // axios 拦截器统一在接口增加时间戳参数，防止走缓存。
    // if (config.method == 'post') {
    // 	if (config.headers['Content-Type'] !== 'application/x-www-form-urlencoded') {
    // 		// @ts-ignore
    // 		config.data = { ...config.data, _t: Date.parse(new Date()) / 1000 };
    // 	}
    // } else
    const timestamp = Date.parse(`${new Date()}`) / 1000
    if (config.method === 'get') {
      config.params = { ...config.params, _t: timestamp };
    }
    config.headers.set('timestamp', timestamp)

    // uri signature
    // console.log('config', axios.getUri(config), config)
    const uri = axios.getUri(config)
    const signatureUri = md5WithSecret(uri, timestamp)
    config.headers.set('us', signatureUri) // us-uri signature

    // config body data signature using md5
    const signatureBody = md5WithSecret(JSON.stringify(config.data || {}), timestamp)
    config.headers.set('bs', signatureBody) // bs-body signature

    // 通知全局api加载状态
    // dispatch({ type: '@@api/CHANGE_URL_LOADING', payload: { url: config.url, loading: true } });
    useApiLoadingStore.getState().start(config.url || ''); // ← 直接用 url 作为唯一 key

    return config;
  },
  (error) => Promise.reject(error),
);

// 添加响应拦截器
instance.interceptors.response.use(
  (response) => {
    // 通知全局api加载状态
    // dispatch({ type: '@@api/CHANGE_URL_LOADING', payload: { url: response.config.url, loading: false } });
    useApiLoadingStore.getState().end(response.config.url || '');

    return response;
  },
  (error) => {
    // 通知全局api加载状态
    useApiLoadingStore.getState().end(get(error, 'config.url', '') || '');

    const httpStatus: number | undefined = get(error, 'response.status');
    const bizCode: number | undefined = get(error, 'response.data.status') ?? get(error, 'response.data.code');
    const bizMsg: string | undefined = get(error, 'response.data.message');
    // 是否在请求 headers 中配置了 hideErrorMsg: '1'，配置后不弹业务错误提示
    const hideErrorMsg = get(error, 'config.headers.hideErrorMsg') === '1';
    const needLogin = isNeedLogin(httpStatus, bizCode);

    // 文件流错误（POST 下载类接口失败时后端返回 json 文件流）
    if (error.response?.data instanceof Blob) {
      const blob = new Blob([error.response.data], {
        type: 'application/json;charset=utf-8',
      });
      const reader = new FileReader();
      reader.readAsText(blob, 'utf-8');
      reader.onload = () => {
        try {
          const json = JSON.parse(reader.result as string);
          if (!hideErrorMsg) message.error(json.message);
        } catch (e) {
          if (!hideErrorMsg) message.error('文件下载失败，请稍后重试');
        }
      };
      return Promise.reject(error);
    }

    // 登录失效：去重后统一提示并跳转登录页（不再弹具体业务错误）
    if (needLogin) {
      redirectToLogin(httpStatus);
      return Promise.reject(error);
    }

    // 普通业务错误：未配置隐藏时统一弹错
    if (!hideErrorMsg) {
      const msgText = codeMessage[httpStatus] || '未知错误，请联系管理员';
      const prefix = httpStatus != null ? `${httpStatus} ` : '';
      const errMsg = bizMsg ? `${prefix}${bizMsg}` : `${prefix}${msgText}`;
      message.error(errMsg);
    }

    return Promise.reject(error);
  },
);

export function requestProcess<R>(request: Promise<AxiosResponse<Fa.Ret<R>>>): Promise<Fa.Ret<R>> {
  return request
    .then((res) => res.data)
    .then((data) => {
      if (data) {
        return data;
      }
      throw new Error('您的网络好像不太给力,请稍后再试');
    });
}

export function requestGet<R>(api: string, config?: AxiosRequestConfig): Promise<Fa.Ret<R>> {
  return requestProcess(instance.get(api, config));
}

export function requestDelete<R>(api: string, config?: AxiosRequestConfig): Promise<Fa.Ret<R>> {
  return requestProcess(instance.delete(api, config));
}

export function requestPut<R>(api: string, body: object, config?: AxiosRequestConfig): Promise<Fa.Ret<R>> {
  return requestProcess(instance.put(api, body, config));
}

export function requestPost<R>(api: string, body: object, config?: AxiosRequestConfig): Promise<Fa.Ret<R>> {
  return requestProcess(instance.post(api, body, config));
}

export function requestDownload(api: string, body: object, config?: AxiosRequestConfig): Promise<undefined> {
  return instance.post(api, body, { responseType: 'blob', timeout: 60 * 60000, ...config }).then((res) => {
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8',
    });
    const a = document.createElement('a');
    const url1 = window.URL.createObjectURL(blob);
    const filename = res.headers['fa-filename'];
    a.href = url1;
    a.download = decodeURIComponent(filename!);
    a.click();
    window.URL.revokeObjectURL(url1);
    return undefined;
  });
}

function isNeedLogin(httpStatus?: number, bizCode?: number) {
  // HTTP 401 或业务码 40101 均视为登录失效；40001（用户名/密码错误、账户冻结）不触发跳转
  return httpStatus === 401 || bizCode === 40101;
}

// 登录失效跳转去重：并发多个 401 时只弹一次提示、跳转一次
let needLoginRedirecting = false;

function redirectToLogin(httpStatus?: number) {
  if (needLoginRedirecting) return;
  needLoginRedirecting = true;

  message.error(`${httpStatus ?? ''} 登录失效，跳转登录`);

  const redirect = encodeURIComponent(window.location.pathname + window.location.search);
  setTimeout(() => {
    // 已在登录页时不再跳转，避免死循环
    const pathname = window.location.pathname;
    if (pathname !== '/login' && !pathname.startsWith('/login/')) {
      window.location.href = `/login?redirect=${redirect}`;
    }
    needLoginRedirecting = false;
  }, 500);
}
