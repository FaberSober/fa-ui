# fa-telemetry 使用说明

fa-telemetry 用于客户端事件统计、异常上报和异常 Issue 聚合。本文描述当前前端 SDK 的实际能力。

SDK 位于共享 Git 子模块 `frontend/apps/admin/features/fa-admin-pages/telemetry`，由宿主项目初始化，业务页面复用同一个单例。它不是独立的 npm 包，也不从 `@fa/ui` 导出。

```ts
import {
  telemetry,
  TelemetryErrorBoundary,
  type TelemetryEnvironment,
} from '@features/fa-admin-pages/telemetry';
```

## 1. 接入准备

- 宿主项目引入 `fa-admin-pages` 子模块，并配置 `@features/*` 指向 `features/*`；构建工具和 TypeScript 均需支持该别名。
- 后端已启用 Telemetry，完成对应数据库的版本升级，并在 `base_telemetry_app` 中配置允许上报的应用。
- 前端 `appKey` 必须对应后端已启用的应用。
- 在“系统设置 → Telemetry → 应用管理”（`/admin/system/telemetry/app`）新增应用，填写唯一的应用编码、AppKey、名称，选择与客户端一致的类型并启用。例如当前 admin 使用 `fa-admin` / `WEB`。
- SDK 向当前站点的 `/api/base/telemetry/open/error`、`/api/base/telemetry/open/event` 发送 JSON POST；开发代理或部署网关需将这些路径转发到后端。当前 SDK 不支持配置采集地址。

当前 admin 项目在 `src/app.tsx` 中读取以下环境变量：

```dotenv
VITE_APP_TELEMETRY_APP_KEY=your-app-key
VITE_APP_TELEMETRY_ENV=development
```

未配置 appKey 时，该项目不会初始化 SDK。环境支持 `development`、`test`、`staging`、`production`；项目入口对无效环境值按开发/生产模式回退。版本来自 `window.FaVersionName`，未提供时使用 `unknown`。

## 2. 初始化

在宿主应用入口执行一次，业务页面不要重复初始化：

```ts
import { telemetry } from '@features/fa-admin-pages/telemetry';

telemetry.init({
  appKey: 'your-app-key',
  clientType: 'WEB',
  environment: 'development',
  release: '1.0.0',
  context: { application: 'admin' },
});
```

| 参数 | 说明 |
| --- | --- |
| `appKey` | 后端登记的客户端上报标识 |
| `clientType` | `WEB`、`DESKTOP`、`MOBILE`、`OTHER` |
| `environment` | `development`、`test`、`staging`、`production` |
| `release` | 客户端版本 |
| `context` | 可选公共上下文，与浏览器上下文合并，同名字段由自定义值覆盖 |

每次 `init()` 都会生成新 sessionId 并清空用户身份，因此不能将其作为刷新状态的方法。SDK 自动补充发生时间、会话及浏览器、系统、视口、当前路径等上下文；默认 URL 不包含查询字符串。

`DESKTOP` 等枚举不代表已经提供原生采集桥接；当前实现仍依赖浏览器/WebView 的 `window`、`fetch` 等能力。

## 3. 用户身份

登录完成或切换租户后设置身份，退出时清理：

```ts
telemetry.identify({ userId: 'user-123', tenantId: 'tenant-456' });
telemetry.track('auth.logout', { eventType: 'LOGIN', result: 'SUCCESS' });
telemetry.clearUser();
```

`identify()` 替换当前身份对象，不做字段合并；切换租户时一并传入 userId。身份仅影响后续上报，不修改应用登录状态或已发送的数据。当前 admin 的用户布局及登录页面已有相关接入。

## 4. 事件上报

### 业务事件

```ts
telemetry.track('order.submit', {
  eventType: 'BUSINESS',
  module: 'order',
  bizType: 'ORDER',
  bizId: 'order-123',
  result: 'SUCCESS',
  duration: 250,
  properties: { source: 'order-form', itemCount: 2 },
});
```

| 字段 | 说明 |
| --- | --- |
| `eventCode` | 第一个参数，使用稳定的业务编码，避免把订单号等动态值拼入编码 |
| `eventType` | `LOGIN`、`PAGE_VIEW`、`ACTION`、`BUSINESS`，默认 `ACTION` |
| `module` | 业务模块 |
| `bizType` / `bizId` | 业务类型和业务记录标识 |
| `result` | 业务结果，建议使用 `SUCCESS` / `FAIL` |
| `duration` | 耗时，单位毫秒 |
| `properties` | 可 JSON 序列化的扩展属性对象 |

不要向 properties/context 传入循环引用、BigInt、DOM 节点或敏感凭据。SDK 不提供通用字段脱敏功能。

### 页面浏览

```ts
telemetry.page({ source: 'navigation' });
```

`page()` 使用固定编码 `page.view`、类型 `PAGE_VIEW`，附带 route 和 pageTitle。module 默认取路径的第二个非空片段，例如 `/admin/system/telemetry` 对应 `system`。传入参数属于 properties，不会修改顶层 module；需要指定 module 时直接调用 `track()`。

新宿主项目可在 Router 内挂载一次路由观察组件：

```tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { telemetry } from '@features/fa-admin-pages/telemetry';

function TelemetryPageObserver() {
  const { pathname } = useLocation();
  useEffect(() => { telemetry.page(); }, [pathname]);
  return null;
}
```

当前 admin 的 `src/app.tsx` 已接入路由浏览上报，不要在每个页面重复安装。开发环境 React StrictMode 可能重复执行 effect，SDK 当前没有去重功能。

## 5. 异常上报

### 捕获已处理异常

```ts
try {
  JSON.parse('invalid-json');
} catch (error) {
  telemetry.captureException(error, { module: 'order', bizId: 'order-123' });
}
```

第二个参数合并到异常的 context 中，不改变全局 context。优先传 Error 对象，以保留类型、消息和堆栈；其他值按 `UnhandledRejection` 类型处理并转换为字符串。

### 全局自动捕获

初始化后 SDK 安装 `window.error` 与 `unhandledrejection` 监听器，捕获携带 Error 的运行时异常和未处理 Promise rejection。已被业务代码 catch 的异常需要手动上报；没有 Error 对象的资源加载失败暂不采集。

### React 异常边界

```tsx
import { telemetry, TelemetryErrorBoundary } from '@features/fa-admin-pages/telemetry';

function BusinessArea() {
  return (
    <TelemetryErrorBoundary fallback={<div>页面发生异常，请刷新后重试</div>}>
      <div>业务组件</div>
    </TelemetryErrorBoundary>
  );
}
```

边界捕获子组件渲染等 React 组件树异常，并附加 `context.react.componentStack`。它不捕获按钮事件回调或异步任务异常，这些由全局监听或手动上报处理。需要恢复边界时重新挂载，例如修改其 key。当前 admin 已有应用及标签页异常处理，新增边界应按业务区域需要设置。

### 行为轨迹与聚合

异常上报携带最近最多 30 条 breadcrumbs。当前来源为初始化页面、track/page 事件、异常以及 popstate 导航；尚无公开的 addBreadcrumb 接口，也不会自动记录所有点击和 HTTP 请求。

Issue 聚合由后端根据应用、客户端类型、异常类型、归一化消息和顶部堆栈帧生成指纹。验证同类聚合时可重复上报同一个 Error 对象；测试不同分组时使用不同字母消息，单纯修改数字可能被归一化为同一内容。

## 6. 公共请求头与状态

```ts
if (telemetry.isInitialized()) {
  const payload = telemetry.getBasePayload();
  const headers = telemetry.getRequestHeaders();
  // 将 headers 合并到业务请求客户端的公共请求头中。
}
```

`getRequestHeaders()` 返回以下字段，用于服务端业务统计复用客户端上下文：

- `X-Telemetry-App-Key`
- `X-Telemetry-Client-Type`
- `X-Telemetry-Environment`
- `X-Telemetry-Release`
- `X-Telemetry-Session-Id`

SDK 不会自动拦截业务请求。当前 admin 入口已将这些值合并到 `window.faHeader`；其他宿主需接入自己的请求封装。

未初始化时，track、page、captureException、identify 不会上报或设置身份；getRequestHeaders 返回空对象，getBasePayload 会抛出异常。初始化状态仅说明本地状态已建立，不代表 appKey 在后端有效或网络可用。

## 7. 演示与验证

Demo 位于 `fa-admin-demo-pages/pages/admin/demo/telemetry/index.tsx`，路由为 `/admin/demo/telemetry`。需要引入 Demo 子模块并执行 fa-demo 对应数据库的 `1.0.16_demo_telemetry.sql` 菜单升级。

1. 查看初始化状态，确认应用、环境、版本和身份。
2. 触发 `demo.telemetry.*` 业务事件，再触发手动异常。
3. 在异常详情核对 context、demoRunId 和 breadcrumbs。
4. 测试主动异常、异步异常、Promise rejection 和局部 React 渲染异常。
5. 重复同类异常，比较 Issue 的事件计数增量；再测试不同异常分组。

| 管理页面 | 路由 |
| --- | --- |
| 应用管理 | `/admin/system/telemetry/app` |
| 统计看板 | `/admin/system/telemetry/dashboard` |
| 异常 Issue | `/admin/system/telemetry/issue` |
| 异常事件 | `/admin/system/telemetry/event` |
| 业务事件 | `/admin/system/telemetry/stat-event` |

上述管理入口需要对应菜单权限。Demo 会产生真实数据，可通过事件编码、触发时间、用户及详情中的 demoRunId 识别。清空 Demo 本地操作记录不会删除后端数据。

## 8. 当前限制与排查

- `track()`、`page()`、`captureException()` 返回 void；不能通过 await 或调用返回值判断上报成功。
- 发送使用 fetch + keepalive，当前忽略网络异常，且不检查 HTTP 响应状态或业务响应内容。出现“已触发调用”时仍需检查网络响应和后台数据。
- 当前没有发送队列、失败重试、离线缓存、批量发送、flush 或客户端采样能力。
- 后端异步落库可能延迟；每日聚合依赖定时任务，触发事件不等于聚合立即完成。
- 收不到数据时依次检查初始化/appKey、应用是否启用、采集路径代理、请求响应及后台处理日志。
- 开发环境主动抛错可能显示 Vite 错误覆盖层；React 开发模式及多层捕获可能产生重复报告，不能仅凭前端触发次数判断后端计数。

共享 SDK 的后续通用能力应继续维护在 `fa-admin-pages/telemetry`，宿主项目负责环境参数和入口集成。
