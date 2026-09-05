# JSON View

## FaJsonView

简单 JSON 展示组件：支持 JSON 字符串 / 对象 / 数组解析展示，节点点击折叠展开，`defaultExpandDepth` 控制默认展开层级；解析失败、空数据、循环引用、超大 JSON 等异常数据均有兜底展示。

```typescript jsx
import React from 'react';
import { FaJsonView } from '@fa/ui';

export default function Demo() {
  return (
    <FaJsonView
      data='{"name":"tom","age":18,"hobby":["coding","reading"]}'
      defaultExpandDepth={1}
    />
  );
}
```

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| data | any | 必填 | 待展示数据：string 按 JSON 字符串解析；object / array 直接展示；null / undefined / 空串展示空状态 |
| defaultExpandDepth | number \| 'all' | 'all' | 默认展开层级：'all' 全部展开；0 全折叠；N 展开到第 N 层（根为第 1 层） |
| showToolbar | boolean | true | 是否展示工具栏（展开全部 / 折叠全部 / 复制 JSON） |
| maxHeight | number | 300 | 内容区最大高度（px），超出后内部滚动 |
| defaultWrap | boolean | true | 默认是否自动换行：开启时超宽内容换行展示；关闭时单行 + 内部横向滚动。工具栏可随时切换 |
| maxRenderNodes | number | 5000 | 渲染节点上限，超过后截断并提示，防止超大 JSON 卡死 |
| errorRender | (error: Error) => ReactNode | - | 自定义异常渲染，默认使用 antd Alert 展示错误信息 |
| className | string | - | 透传样式类 |
| style | CSSProperties | - | 透传样式 |

### 示例

#### 对象 / 数组展示
```typescript jsx
<FaJsonView data={{ id: 1, list: [{ a: 1 }, { a: 2 }], ok: true, extra: null }} />
```

#### 默认展开层级控制
```typescript jsx
{/* 全折叠 */}
<FaJsonView data={json} defaultExpandDepth={0} />
{/* 只展开根节点 */}
<FaJsonView data={json} defaultExpandDepth={1} />
```

#### 异常数据
```typescript jsx
{/* 非法 JSON 字符串：展示解析错误信息 */}
<FaJsonView data='{"name":' />
{/* 空数据：展示"暂无数据" */}
<FaJsonView data={null} />
{/* 循环引用：节点展示 [Circular]，不无限递归 */}
<FaJsonView data={circularObj} />
```
