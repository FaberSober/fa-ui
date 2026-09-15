# ADR-001：BaseBizTable 表格链路优化与治理

- 状态：Accepted（待逐项实施）
- 日期：2026-09-15
- 范围：`frontend/fa-ui` 表格基础组件、查询 Hook，以及 Demo 学生表页面的相关调用链
- 关联页面：`frontend/apps/admin/features/fa-admin-demo-pages/pages/admin/demo/table/table/`

本文基于对学生表页面到 `BaseBizTable` 的静态调用链分析整理，后续按功能清单逐项实施，并在完成后更新进度。

## 1. 背景

当前页面的分页查询由 `useTableQueryParams` 管理，`BaseBizTable` 负责列配置、高级查询、选择和 antd Table 封装。整体职责清晰，但存在排序清除、请求竞态、共享选择逻辑、远程列配置兼容和滚动测量等问题；页面在大 pageSize 下还可能产生较多行级弹窗实例。

## 2. 决策

- 保留“业务页面 + 查询 Hook + BaseBizTable”分层，不引入新的全局表格状态管理。
- 按“查询正确性 → 共享组件正确性 → 配置和异常恢复 → 布局与大数据量 → 可选性能清理”的顺序实施。
- 对需要实际 DOM、网络延迟或后端语义才能确认的项目，先验证再决定是否开发。
- 优化应保持当前页面 API、列配置持久化和新增/编辑/删除流程兼容，避免为低收益问题引入复杂抽象。

## 3. 功能清单

| 模块 | 功能 | 功能详情 | 当前规划 | 进度 |
| --- | --- | --- | --- | --- |
| 查询参数 | 修正清除排序 | `order=null` 时不转换为升序 | 执行开发 | ✅已完成 |
| 查询参数 | 防止查询请求竞态 | 最后一次查询结果生效，loading 与当前请求一致 | 执行开发 | ✅已完成 |
| BaseBizTable | 修正行点击多选取消 | 取消当前行时只移除当前 key，不丢失其他已选行 | 执行开发 | ✅已完成 |
| 查询参数 | 统一分页状态来源 | 处理 `queryParams.pagination` 与 `ret.showPagination` 的重复状态 | 执行开发 | ✅已完成 |
| 高级查询 | 保存失败恢复 loading | 场景保存失败后弹窗仍可重试或关闭 | 执行开发 | ✅已完成 |
| 列配置 | 兼容历史远程配置 | 过滤失效列，明确新增列的合并策略 | 执行开发 | ✅已完成 |
| 表格布局 | 验证滚动高度作用域 | 核对重复 `id`、多表格和全局 DOM 查询影响 | 执行开发 | ✅已完成 |
| 页面性能 | 评估行级 StudentModal | 大 pageSize 下按需使用页面级单例弹窗 | 先验证后决定 | 🔍验证中 |
| 高级查询 | 核对场景与条件展示语义 | 确认 `sceneId` 与 `conditionList` 是否需要同步 | 先验证后决定 | 👀待确认 |
| 学生弹窗 | 核对关闭后的表单残留 | 验证取消后再次打开是否保留旧值 | 先验证后决定 | 👀待确认 |
| 表格初始化 | 延迟非必要配置请求 | 评估场景列表、列配置请求的懒加载或缓存 | 留作未来版本规划 | 🕒待处理 |
| 表格渲染 | 列定义与模块依赖清理 | 按需 memo 化列生成，清理循环/无用导入和重复 UUID 计算 | 留作未来版本规划 | 🕒待处理 |

## 4. 开发说明

### FBT-01 修正清除排序

- 位置：`frontend/fa-ui/packages/ui/src/components/base-table/utils.tsx`、`useTableQueryParams.tsx`。
- `order` 为空时传递后端认可的“无排序”值，不生成 `field ASC`。
- 核对排序列的 `sortOrder` 与请求参数保持一致。

### FBT-02 防止查询请求竞态

- 位置：`frontend/fa-ui/packages/ui/src/hooks/useTableQueryParams.tsx`。
- 增加轻量请求序列判断，旧响应不覆盖新响应。
- 必要时将连续状态更新改为函数式更新；不先扩散到所有 API。

### FBT-03 修正行点击多选取消

- 位置：`frontend/fa-ui/packages/ui/src/components/base-table/BaseBizTable.tsx`。
- 多选模式下再次点击已选行时移除该 key，保留其他 key。
- 继续通过统一回调通知 `onSelectedRowsChange`；当前学生表页面未启用该选项。

### FBT-04 统一分页状态来源

- 位置：`frontend/fa-ui/packages/ui/src/hooks/useTableQueryParams.tsx`。
- 以 `queryParams.pagination` 作为查询与展示分页的唯一来源，服务端分页元数据请求成功后回写该状态。
- 查询 effect 只依赖当前页、分页大小及其他请求条件，避免同步展示元数据时重复请求。
- 保持当前分页展示和导出“按条件导出全部数据”的语义不变。

### FBT-05 高级查询保存失败恢复

- 位置：`ConditionQueryModal.tsx`、`SceneManageModal.tsx`。
- 场景保存和批量更新使用 `try/finally` 恢复局部 loading。
- 失败时保留弹窗内容，交由现有请求层提示错误并允许重试。

### FBT-06 兼容历史列配置

- 位置：`BaseBizTable.tsx`、`TableColConfigModal.tsx`。
- 远程 `dataIndex` 只合并当前仍存在的列。
- 已配置列仅在远程明确为 `tcChecked: true` 时展示，省略该字段按未勾选处理。
- 新增列按当前列定义顺序追加到远程配置之后，并沿用 `tcRequired`、`tcChecked` 的默认显示策略。
- 保留用户已有的顺序、显示状态和宽度配置。

### FBT-07 验证滚动高度作用域

- 位置：`BaseBizTable.tsx`、`base-table/utils.tsx`、`FaFlexRestLayout.tsx`。
- 使用唯一的布局容器 ref，并在容器内查询表头和分页节点，避免多表格之间相互干扰。
- 移除表格与布局容器重复使用的 `id`，并在分页节点出现后重新计算表格内容区高度。
- 保持父级 flex 可收缩且隐藏外层溢出，使内容滚动限定在表格内部。

### FBT-08 评估行级 StudentModal

- 位置：学生表 `index.tsx`、`StudentModal.tsx`。
- 以真实 pageSize 和渲染耗时为依据决定是否改为页面级单例弹窗。
- 若实施，保持新增、编辑、取消、提交后刷新和当前记录传递行为一致。

### FBT-09 核对场景与条件展示语义

- 位置：`ComplexQuery.tsx`、`SceneDropMenu.tsx`、`ConditionQueryModal.tsx`。
- 确认后端是仅使用 `sceneId`，还是会同时使用 `conditionList`。
- 只有在 UI 展示确实与实际查询不一致时，才增加场景条件回显或状态清理。

### FBT-10 核对学生弹窗表单残留

- 位置：`StudentModal.tsx`。
- 验证编辑取消、新增取消、再次打开三个场景。
- 仅在确认残留后补充必要的 `resetFields`，避免改变现有表单保留行为。

### FBT-11 延迟非必要配置请求

- 位置：`SceneDropMenu.tsx`、`TableColConfigModal.tsx`、`ComplexQuery.tsx`。
- 评估场景列表是否可以首次展开时再加载，列配置是否需要保留预加载或改用缓存。
- 以首屏请求数和列配置首次展示正确为验收条件。

### FBT-12 列定义与模块依赖清理

- 位置：学生表 `index.tsx`、`BaseBizTable.tsx`、`base-table/utils.tsx`。
- 仅在列数量或数据量证明有收益时使用 `useMemo`，依赖必须包含排序、字典和操作回调。
- 清理 `utils.tsx` 对自身 barrel 的无用导入，并将 UUID 初始化改为惰性初始化。

## 5. 实施验收

- 清除任意排序后，界面无排序标识，请求也不再携带该字段的升序排序。
- 快速连续查询时，最终显示结果和 loading 状态对应最后一次查询。
- 启用行点击多选的页面可以正确增选和取消单行，不影响其他已选行。
- 高级查询场景保存失败后，弹窗不会永久处于 loading 状态。
- 历史列配置不会渲染已删除字段；新增列策略有明确且可回归的结果。
- 只有在滚动、场景语义、表单残留等验证项确认后，才实施对应改动。
- 每个已实施条目完成相关定向验证后，将清单中的进度更新为 `✅已完成`。

## 6. 风险与边界

- 不修改已保存列配置的数据格式，除非先确定兼容策略。
- 不把后端场景语义假设直接固化到前端；`sceneId` 和 `conditionList` 的关系需要先确认。
- 不为当前 demo 页的小规模数据引入复杂缓存或新的状态管理。
- 表格布局改动需要单独进行实际 DOM 和视觉验证；静态检查不能替代该验证。

## 7. 参考

- `frontend/apps/admin/features/fa-admin-demo-pages/pages/admin/demo/table/table/index.tsx`
- `frontend/apps/admin/features/fa-admin-demo-pages/pages/admin/demo/table/table/modal/StudentModal.tsx`
- `frontend/fa-ui/packages/ui/src/components/base-table/BaseBizTable.tsx`
- `frontend/fa-ui/packages/ui/src/components/base-table/FaberTable.ts`
- `frontend/fa-ui/packages/ui/src/components/base-table/utils.tsx`
- `frontend/fa-ui/packages/ui/src/hooks/useTableQueryParams.tsx`
- `frontend/fa-ui/doc/frontend/table.md`
