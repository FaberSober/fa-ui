# JSON 编辑器

## FaJsonEdit

`FaJsonEdit` 提供图形化编辑和 JSON 源文本编辑两种模式。组件以 JSON 文本作为外部值，文本编辑过程中允许暂时存在非法 JSON；只有 JSON 解析成功后才能切换到图形编辑模式。

```typescript jsx
import React, { useState } from 'react';
import { FaJsonEdit } from '@fa/ui';

export default function Demo() {
  const [value, setValue] = useState('{"name":"tom","age":18}');

  return <FaJsonEdit value={value} onChange={setValue} />;
}
```

### Props

| Prop               | 类型                      | 默认值   | 说明                                       |
| ------------------ | ------------------------- | -------- | ------------------------------------------ |
| value              | string                    | -        | 受控 JSON 源文本                           |
| defaultValue       | string                    | `''`     | 非受控初始 JSON 源文本                     |
| onChange           | `(value: string) => void` | -        | 文本变化回调，包含暂时非法的 JSON          |
| defaultMode        | `'tree' \| 'text'`        | `'tree'` | 默认编辑模式                               |
| defaultExpandDepth | number \| `'all'`         | `'all'`  | 图形模式默认展开层级                       |
| readOnly           | boolean                   | `false`  | 是否只读                                   |
| showToolbar        | boolean                   | `true`   | 是否展示模式切换、格式化、压缩、复制和搜索工具栏 |
| maxHeight          | number                    | `400`    | 内容区最大高度（px）                       |
| indent             | number                    | `2`      | 格式化 JSON 的缩进空格数                   |
| maxRenderNodes     | number                    | `5000`   | 图形模式节点上限                           |
| className          | string                    | -        | 透传样式类                                 |
| style              | CSSProperties             | -        | 透传样式                                   |

### 图形模式

图形模式支持修改字符串、数字、布尔值和 null 类型，修改对象 key，新增或删除对象字段，以及新增或删除数组项。

点击属性名进入重命名；值编辑默认无边框，获得焦点时显示编辑提示。悬浮或聚焦行后显示类型切换、新增和删除操作，类型切换收在菜单中；触屏设备保留操作入口，只读模式不提供修改入口。

### 搜索

工具栏输入关键词后按回车或点击搜索，支持不区分大小写的字面查找，显示匹配数量，并通过上下箭头循环定位。

工具栏根据编辑器宽度自适应，窄面板隐藏模式按钮文字，保留图标、提示和无障碍名称；未搜索时隐藏结果计数和翻页按钮，优先保持单行。

- 图形模式匹配属性名和标量值，每行计为一个结果，搜索范围遵守 `maxRenderNodes`。定位时自动展开匹配项的祖先节点并高亮，清空搜索后恢复原有折叠状态。
- 源文本模式直接匹配文本并选中结果，非法 JSON 也可搜索。搜索不会修改 JSON 或触发 `onChange`。

### 源文本模式

源文本模式支持直接编辑、格式化、压缩和复制 JSON。文本非法时会展示解析错误，并阻止切换到图形模式。
