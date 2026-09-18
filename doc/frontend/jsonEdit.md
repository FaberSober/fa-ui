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
| showToolbar        | boolean                   | `true`   | 是否展示模式切换、格式化、压缩和复制工具栏 |
| maxHeight          | number                    | `400`    | 内容区最大高度（px）                       |
| indent             | number                    | `2`      | 格式化 JSON 的缩进空格数                   |
| maxRenderNodes     | number                    | `5000`   | 图形模式节点上限                           |
| className          | string                    | -        | 透传样式类                                 |
| style              | CSSProperties             | -        | 透传样式                                   |

### 图形模式

图形模式支持修改字符串、数字、布尔值和 null 类型，修改对象 key，新增或删除对象字段，以及新增或删除数组项。

### 源文本模式

源文本模式支持直接编辑、格式化、压缩和复制 JSON。文本非法时会展示解析错误，并阻止切换到图形模式。
