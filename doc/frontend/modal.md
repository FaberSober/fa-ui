# Modal 弹框

## 组件选择

| 场景 | 组件 |
| --- | --- |
| 普通对话框 | Ant Design `Modal` |
| 可拖动、可切换全屏 | `DragModal` |
| 带触发器的通用新增、编辑弹框 | `BaseModal` |
| 覆盖 `.fa-main`、承载复杂页面或表单 | `FaFullContentModal` |

## 普通 Modal

```tsx
<Modal open={open} onOk={() => setOpen(false)} onCancel={() => setOpen(false)}>
  内容
</Modal>
```

## DragModal

```tsx
import { DragModal } from '@fa/ui';

<DragModal
  title="编辑"
  open={open}
  width={800}
  onOk={() => form.submit()}
  onCancel={() => setOpen(false)}
>
  内容
</DragModal>
```

## BaseModal

适合通用实体新增、编辑场景，使用 `triggerDom` 提供打开弹框的按钮：

```tsx
import { BaseModal } from '@fa/ui';

<BaseModal triggerDom={<Button type="primary">新增</Button>} title="新增">
  <Form>表单内容</Form>
</BaseModal>
```

## FaFullContentModal

组件通过 Portal 挂载到 MenuLayout 的 `.fa-main`，覆盖主体区域；内容区域自带滚动布局，适合复杂表单。复杂表单建议使用受控模式，在 `onOk` 中提交表单，在 `onFinish` 成功后关闭：

```tsx
import { FaFullContentModal } from '@fa/ui';

function Page() {
  return (
    <FaFullContentModal
      title="复杂表单"
      triggerDom={<Button type="primary">新增</Button>}
      open={open}
      onOpenChange={setOpen}
      onOk={() => form.submit()}
      onCancel={() => form.resetFields()}
    >
      <Form form={form} onFinish={() => setOpen(false)}>
        {/* 复杂表单内容 */}
      </Form>
    </FaFullContentModal>
  );
}
```

组件会自动挂载到调用位置所属的 Tab 面板；没有 Tab 面板时回退到 `.fa-main`。打开和关闭时会使用短暂的淡入淡出动画，切换到其他 Tab 后弹框会随面板隐藏，返回时保留表单状态。组件也支持不传 `open` 的非受控模式；未配置 `onOk` 时，点击默认提交按钮会直接关闭弹框。可通过 `showOk`、`showCancel` 隐藏对应操作按钮。
