# ADR-002：后台首页工作台布局持久化与治理

- 状态：Accepted（待逐项实施）
- 日期：2026-09-15
- 范围：`frontend/apps/admin` 工作台页面、布局 Hook、网格封装及相关首页 Cube
- 关联页面：`/admin/home/desktop`

本文基于对后台首页从路由、公共布局、Tab 缓存到 `Desktop`、`FaGridLayout` 和布局 API 的静态调用链分析整理。实施时保持现有配置接口和布局数据格式兼容。

## 1. 背景

当前工作台支持默认布局、全局布局、用户布局、拖拽缩放、添加删除、导入导出和首页 Cube。核心逻辑集中在 `useGridLayoutConfig`，但存在以下风险：

- ReactGridLayout 的布局同步回调可能把初始化布局当成用户操作保存。
- 保存请求进行中，新的布局变化会被直接丢弃。
- 清空用户配置后仍保留旧配置 ID。
- 布局加载和保存失败缺少页面级恢复状态。
- 导入配置没有 JSON 和布局结构校验。
- Tab 缓存会让隐藏页面中的轮询 Cube 继续运行。

## 2. 决策

- 保留现有“页面 + `useGridLayoutConfig` + `FaGridLayout` + ReactGridLayout”分层。
- 将初始化加载和用户操作分开：初始化只负责恢复布局，不触发保存。
- 将所有布局变化收敛到一个提交入口，保存中的变化采用最新布局覆盖策略，不静默丢弃。
- 继续使用现有 `configApi` 和 `useApiLoading`，不新增全局布局状态管理。
- 在导入边界校验布局，非法配置不进入页面状态或 API 请求。
- 监控 Cube 轮询、后端告警语义、富文本可信边界和完整类型治理先验证，再决定是否扩大改动。

## 3. 影响与替代方案

### 正向影响

- 初始化、用户操作和保存请求边界清晰，减少意外写入和布局丢失。
- 清空配置、导入配置和请求失败都有明确恢复路径。
- 保持现有页面路由、配置接口和布局 JSON 兼容。

### 代价与取舍

- 布局 Hook 需要维护初始化状态、待提交布局和失败重试状态。
- 连续操作采用最新布局策略，历史中间布局不保证逐次保存。
- 隐藏 Tab 轮询和 Cube 类型治理暂不与本次核心修复绑定。

### 不采用的方案

- 不在每个页面按钮中分别实现保存逻辑，避免拖拽、添加和导入产生多套状态机。
- 不替换 ReactGridLayout 或引入新的全局布局 Store，避免扩大改动范围。
- 不把未经后端确认的预警过滤语义直接写死在本次核心修复中。

## 4. 功能清单

表格按建议的开发实施顺序排列。状态只反映当前 ADR 的规划进度，实际完成后需要同步更新。

| 模块 | 功能 | 功能详情 | 当前规划 | 进度 |
| --- | --- | --- | --- | --- |
| 布局初始化 | 防止初始化触发保存 | 加载用户、全局或默认布局期间忽略 ReactGridLayout 的同步回调 | 执行开发 | 🔍验证中 |
| 布局持久化 | 串行提交最新布局 | 拖拽、缩放、添加、删除统一提交；请求进行中保留最新变更 | 执行开发 | 🔍验证中 |
| 配置清理 | 清空后重置配置状态 | 删除用户配置成功后清除旧 ID，并回退到全局或默认布局 | 执行开发 | 🕒待处理 |
| 错误恢复 | 增加加载和保存状态 | 显示布局加载/保存失败状态，保留重试或恢复路径 | 执行开发 | 🕒待处理 |
| 配置导入 | 校验 JSON 和布局结构 | 校验数组、组件 ID、尺寸、网格边界和重复项 | 执行开发 | 🕒待处理 |
| 预警 Cube | 核对查询和滚动语义 | 确认未处理告警查询条件，修正 1.5 秒与实际 5 秒的差异 | 未来版本规划（先验证） | 👀待确认 |
| Tab 性能 | 暂停隐藏页面轮询 | 评估隐藏 Tab 是否暂停监控 Cube 和滚动定时器 | 未来版本规划（先验证） | 👀待确认 |
| Cube 类型 | 建立注册表类型 | 用正式的 Cube 元数据类型替代关键路径 `any`，并参数化列数 | 未来版本规划 | 🕒待处理 |
| 默认配置 | 统一默认布局来源 | 处理 `SITE_INFO.ADMIN_DEFAULT_LAYOUT` 与页面内默认布局的重复来源 | 未来版本规划 | 🕒待处理 |
| 内容边界 | 核对富文本可信来源 | 确认公告/新闻 HTML 的清洗责任和可信边界 | 未来版本规划（先验证） | 👀待确认 |

## 5. 开发说明

### HLD-01 防止初始化触发保存

- 位置：`frontend/apps/admin/features/fa-admin-pages/components/utils/FaGridLayoutUtils.ts`、`pages/admin/home/desktop/index.tsx`。
- 在 Hook 内增加初始化完成标记；`getOne`、`getOneGlobal` 或默认布局完成前不持久化。
- 识别 ReactGridLayout 因 props 同步触发的首次 `onLayoutChange`，不要把它当作用户操作。
- 用户配置优先级保持不变：用户配置 > 全局配置 > 页面默认配置。
- 已在 Hook 中增加初始化标记；加载期间不保存，首个非空布局同步回调仅更新本地布局。
- 本次仅修改 Hook；`Desktop` 页面继续复用既有 Hook 返回值，不增加页面级状态。

### HLD-02 串行提交最新布局

- 位置：`FaGridLayoutUtils.ts` 的 `onLayoutChange`、`handleAdd`、`handleDel`。
- 抽取统一的 `commitLayout(nextLayout)`，所有布局变更都经过该入口。
- 本地布局可以立即更新；当前请求未完成时只保留最新待提交布局，完成后继续提交。
- 首次保存成功后更新 `config`，后续变化使用 `update`。
- 保存失败时保留 dirty 状态并允许重试，不回退到一个用户无法理解的空布局。
- 不引入新的全局 Store，不改变后端布局 JSON 格式。
- 已增加 `commitLayout`、串行请求标记和最新布局队列；失败布局保留在 Hook 内，并提供 `retryLayout`。
- `handleAdd`、`handleDel` 继续先更新受控布局，由网格回调提交最终布局，避免添加/删除产生重复请求。

### HLD-03 清空用户配置后重置状态

- 位置：`FaGridLayoutUtils.ts` 的 `handleClearAllUserConfig`。
- `removeByQuery` 成功后清除本地 `config`。
- 重新读取全局配置；全局配置不存在时使用默认布局。
- 清理后的下一次用户操作必须走 `save`，不能继续更新已删除的 ID。
- 后端是否删除所有用户配置需要以接口实际语义为准，前端不额外扩大删除范围。

### HLD-04 增加布局加载和保存状态

- 位置：`FaGridLayoutUtils.ts`、`pages/admin/home/desktop/index.tsx`。
- 为初始加载、保存中、保存失败和重试保留最小状态。
- 初始化失败时显示可理解的错误状态，不把失败误显示为空布局。
- 保存失败时保留当前编辑结果，并提供再次提交的路径。
- 沿用现有 Axios 错误提示，不重复实现一套全局错误处理。

### HLD-05 校验导入布局

- 位置：`desktop/index.tsx`、`ExportAndImportBtn.tsx` 及其调用链。
- 解析 JSON 时捕获语法错误。
- 校验顶层数组、`i/x/y/w/h` 字段、组件是否存在、`i` 是否重复以及宽度是否超过 24 列。
- 校验失败只提示错误，不调用 `onLayoutChange`，也不写入 API。
- 导入成功后仍通过统一布局提交入口保存，避免绕过初始化和请求状态控制。

### HLD-06 预警和轮询项先验证

- 核对后端 `alert/list` 在 `query: {}` 时是否默认只返回未处理告警。
- 如果没有默认过滤，明确传递 `deal: false`，并确认分页/数量限制。
- 将滚动间隔设置为显式配置，统一组件描述和实际行为。
- 监控 Cube 的共享请求、隐藏 Tab 暂停和定时器释放单独评估，不与布局修复耦合。

### HLD-07 类型与默认配置治理

- 将 Cube 定义抽象为带静态元数据的注册表类型，逐步减少 `cubes as any`。
- 将网格列数作为布局计算参数，避免工具函数内写死 `24`。
- 核对 `SITE_INFO.ADMIN_DEFAULT_LAYOUT` 是否仍有外部使用；确认无用后再删除或改名。
- 这些改动不改变已经保存的布局数据格式。

## 6. 实施验收

- 首次打开只有全局或默认布局时，不产生 `config/save` 或 `config/update` 写请求。
- 用户连续拖拽、缩放、添加和删除后，最终界面布局与后端保存结果一致。
- 保存请求失败时，页面不会静默丢失用户最近一次布局变化。
- 清空用户配置后，下一次布局变更能够重新创建用户配置。
- 导入非法 JSON 或非法布局时页面不崩溃，也不会发出布局保存请求。
- 布局加载失败时有明确提示或重试入口。
- 预警查询、隐藏 Tab 轮询、Cube 类型和默认配置来源等待确认项，在验证完成前不作为已完成开发项。

## 7. 非目标与风险边界

- 不改造 ReactGridLayout，不替换现有网格库。
- 不引入全局状态管理库或新的后端配置接口。
- 不在本 ADR 中统一改造所有首页 Cube 的数据请求。
- 不默认把隐藏 Tab 改为卸载页面，避免破坏现有 Tab 状态缓存语义。
- 不在未确认后端语义前修改预警过滤条件或删除富文本渲染链路。
- 保存串行化可能改变连续操作时的请求时序，需采用最新布局策略并验证失败恢复。

## 8. 参考

- `frontend/apps/admin/features/fa-admin-pages/pages/admin/home/desktop/index.tsx`
- `frontend/apps/admin/features/fa-admin-pages/components/utils/FaGridLayoutUtils.ts`
- `frontend/apps/admin/features/fa-admin-pages/components/grid/FaGridLayout.tsx`
- `frontend/apps/admin/features/fa-admin-pages/components/cube/FaCubeGrid.tsx`
- `frontend/apps/admin/features/fa-admin-pages/layout/menu/TabContentCache.tsx`
- `frontend/apps/admin/features/fa-admin-pages/services/base/admin/config.ts`
- `frontend/fa-ui/packages/ui/src/services/core/BaseApi.ts`
- `frontend/fa-ui/packages/ui/src/hooks/useApiLoading.ts`
- `frontend/fa-ui/doc/frontend/`
