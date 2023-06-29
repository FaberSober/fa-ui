# URL
## 获取URL中query参数

## [id].tsx类型URL
```typescript jsx
import React from 'react';
import {useParams} from "react-router-dom";

export default function index() {
  const { id } = useParams()

  return (
    <div>{id}</div>
  )
}
```