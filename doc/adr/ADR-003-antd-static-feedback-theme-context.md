# ADR-003：Antd 静态反馈组件主题上下文统一

- 状态：Accepted（待逐项实施）
- 日期：2026-09-19
- 范围：`frontend/apps/admin` 的主题/语言布局、`frontend/fa-ui/packages/ui` 公共提示工具，以及后台批量修改用户弹窗
- 关联问题：暗色主题下 `Modal.confirm` 和 `Message` 仍显示为亮色

本文用于指导 Codex 按功能清单实施，完成验证后同步更新进度。

## 1. 背景

`ThemeLayout` 已经维护亮色/暗色状态，`LangLayout` 也通过 `ConfigProvider` 为页面组件提供了动态主题。但以下调用使用 Antd 静态 API：

- 批量修改部门使用 `Modal.confirm`；
- `utils.ts` 和 `request.ts` 使用静态 `message`；
- `@fa/ui` 及业务模块中还有其他静态确认框和提示。

静态 API 会创建独立的渲染根，不能自动继承页面内的 `ConfigProvider` Context，因此出现页面暗色、弹窗和提示亮色不一致的问题。项目已在 Vite 中配置单一 Antd 实例，本 ADR 不处理重复依赖问题。

## 2. 决策

- 在 `LangLayout` 中抽取唯一的 Antd 主题配置，同时供页面 `ConfigProvider` 和静态 API 使用。
- 在主题、主色或语言变化时调用 `ConfigProvider.config`，通过 `theme` 和 `holderRender` 为静态 `message`、`Modal.confirm` 等 API 注入当前上下文。
- 保留 `utils.ts`、`request.ts` 的普通函数调用方式，避免在非 React 模块中直接使用 Hook；公共提示通过全局静态上下文跟随主题。
- 新增或大幅修改的 React 组件优先使用 `App.useApp` 或 `Modal.useModal`；全量迁移现有静态 API 作为后续治理项。
- 不通过覆盖 `.ant-modal`、`.ant-message` CSS 或 `message.config` 强行模拟主题。

## 3. 影响与替代方案

### 正向影响

- 批量修改部门、角色、密码等确认框统一跟随亮色/暗色主题。
- `utils.ts` 的成功提示和 `request.ts` 的接口错误提示统一使用当前主题。
- 不需要把请求拦截器改造成 React 组件，也不需要为每个提示增加参数。
- 保留现有 `ThemeLayout`、`LangLayout` 和业务调用方式，改动范围可控。

### 代价与边界

- `ConfigProvider.config` 属于全局配置，需要保证主题变化时及时同步。
- 现有静态 API 仍保留兼容层，后续新增代码需要避免继续扩大静态调用范围。
- 登录页、授权错误页等不经过 `LangLayout` 的页面，如需调用静态提示，应单独确认主题初始化入口。

### 不采用的方案

- 只修改 CSS 变量或覆盖 Antd 类名：不能完整覆盖 Antd 主题算法、按钮、边框和阴影 token。
- 只给单个批量修改弹窗增加 `Modal.useModal`：只能修复一个确认框，不能解决 `request.ts` 和 `utils.ts` 的公共提示。
- 只在 `message.config` 中调整位置或层级：该配置不能传递动态主题。

## 4. 功能清单

表格按建议的开发实施顺序排列，进度只反映本 ADR 的实施状态。

| 模块 | 功能 | 功能详情 | 当前规划 | 进度 |
| --- | --- | --- | --- | --- |
| 主题配置 | 统一 Antd 主题对象 | 抽取 `algorithm`、主色、容器背景和组件 token，页面与静态 API 复用 | 执行开发 | 🕒待处理 |
| 静态 API | 注册全局主题上下文 | 使用 `ConfigProvider.config({ theme, holderRender })` 同步静态 API | 执行开发 | 🕒待处理 |
| 公共提示 | 修复 `utils.ts` 提示主题 | `showResponse`、复制成功提示跟随当前亮色/暗色主题 | 执行开发 | 🕒待处理 |
| 公共提示 | 修复 `request.ts` 错误提示主题 | 文件下载、业务异常、登录失效提示跟随当前主题 | 执行开发 | 🕒待处理 |
| 用户管理 | 修复批量修改确认弹窗 | 部门、角色、密码确认框统一验证亮色/暗色表现 | 执行开发 | 🕒待处理 |
| 主题切换 | 验证运行时切换 | 切换主题或主色后，新产生的提示和弹窗使用最新配置 | 执行开发 | 🕒待处理 |
| 组件治理 | 逐步迁移 React 组件上下文 API | 新代码使用 `App.useApp` 或 `Modal.useModal`，减少静态 API | 未来版本规划（渐进迁移） | 👀待确认 |

## 5. 开发说明

### ATF-01 统一 Antd 主题对象

- 位置：`frontend/apps/admin/features/fa-admin-pages/layout/lang/LangLayout.tsx`。
- 使用 `useMemo` 生成 `antdTheme`，依赖 `colorPrimary` 和 `themeDark`。
- 保留现有暗色算法、亮色算法、`colorBgContainer` 和 `Segmented.trackBg` 配置。
- 页面 `ConfigProvider` 与静态 API 必须复用同一个主题对象，避免两套 token 漂移。

### ATF-02 注册静态 API 上下文

- 在 `LangLayout` 中监听主题、主色和语言变化，调用 `ConfigProvider.config`。
- `theme` 传入当前 `antdTheme`。
- `holderRender` 使用当前 `locale`、表单校验文案、空状态渲染器和主题包裹静态内容。
- 不在 `utils.ts` 或 `request.ts` 中调用 React Hook。

### ATF-03 修复公共 Message

- 位置：`frontend/fa-ui/packages/ui/src/utils/utils.ts`、`frontend/fa-ui/packages/ui/src/utils/request.ts`。
- 保持现有成功、失败、登录失效和文件下载失败的业务文案及调用时机。
- 通过全局静态上下文验证这些提示的背景、文字、图标和主色在亮色/暗色下正确显示。
- 如发现独立页面在 `LangLayout` 初始化前触发提示，再补充该页面的主题初始化，不扩大本 ADR 范围。

### ATF-04 修复批量修改确认框

- 位置：`UsersChangeDeptModal.tsx`，并核对同目录的角色和密码批量修改弹窗。
- 首选依赖 ATF-02 统一修复现有 `Modal.confirm`。
- 若单个组件需要局部动态上下文，使用 `Modal.useModal` 并渲染 `contextHolder`。
- 保持确认文案、提交 loading、成功刷新和失败提示行为不变。

### ATF-05 主题切换验证

- 验证亮色、暗色、切换主题后再次触发三类批量修改确认框。
- 验证 `FaUtils.showResponse`、复制成功提示、普通请求异常和登录失效提示。
- 开发环境控制台不应再出现静态 API 无法消费动态主题 Context 的警告。
- 仅在定向验证通过后将对应功能状态更新为 `✅已完成`。

## 6. 实施验收

- 暗色主题下批量修改部门确认框为暗色背景，文字、按钮、图标和遮罩对比度正常。
- 批量修改角色和密码确认框与部门确认框表现一致。
- 亮色主题下上述组件恢复亮色 token，不残留暗色样式。
- `utils.ts` 的成功提示和 `request.ts` 的错误提示均跟随当前主题。
- 切换主色后，确认按钮和成功提示使用新的主色。
- 不改变现有业务请求、错误文案、登录跳转和弹窗确认逻辑。

## 7. 风险与参考

### 风险边界

- 不改造 Antd 版本，不替换现有主题变量体系。
- 不在本 ADR 中一次性迁移所有历史静态 `Modal.confirm` 和 `message` 调用。
- `ConfigProvider.config` 是全局状态，后续若引入多个独立前端根，需要重新确认配置隔离策略。

### 参考

- `frontend/apps/admin/features/fa-admin-pages/layout/lang/LangLayout.tsx`
- `frontend/fa-ui/packages/ui/src/layout/theme/ThemeLayout.tsx`
- `frontend/fa-ui/packages/ui/src/utils/utils.ts`
- `frontend/fa-ui/packages/ui/src/utils/request.ts`
- `frontend/apps/admin/features/fa-admin-pages/pages/admin/system/hr/user/cube/modal/UsersChangeDeptModal.tsx`
- `frontend/apps/admin/features/fa-admin-pages/pages/admin/system/hr/user/cube/modal/UsersChangeRoleModal.tsx`
- `frontend/apps/admin/features/fa-admin-pages/pages/admin/system/hr/user/cube/modal/UsersChangePwdModal.tsx`
- `frontend/apps/admin/vite.config.ts`
