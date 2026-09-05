# Update Log
## 2026-09-05
1. 新增 FaJsonView 组件：简单 JSON 展示，支持 JSON 字符串 / 对象 / 数组解析展示，节点折叠展开，defaultExpandDepth 控制默认展开层级，工具栏支持展开全部 / 折叠全部 / 复制 JSON；异常数据（解析失败 / 空数据 / 循环引用 / 超大 JSON 截断）均有兜底展示。

## 2025-12-04
1. change loading global status
Old ways:
```typescript tsx
const { loadingEffect } = useContext(ApiEffectLayoutContext);
const loading = loadingEffect[api.getUrl('save')] || loadingEffect[api.getUrl('update')];
```

New ways:
```typescript tsx
import { useApiLoading } from '@fa/ui';
import { jobLogApi } from '@/api';

// single url
const loading = useApiLoading(jobLogApi.getUrl('save'));

// multi urls
const loading = useApiLoading([
  jobLogApi.getUrl('save'),
  jobLogApi.getUrl('update'),
  jobLogApi.getUrl('delete'), // 想加几个加几个
]);
```
