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

## 操作标签页

```typescript jsx
const {addTab, removeTab} = useContext(MenuLayoutContext)

function handleAddTabIframe() {
  addTab({
    key: 'baidu',
    path: 'https://cn.bing.com/',
    name: 'bing',
    type: 'iframe', // iframe, inner-内部网页
    closeable: true,
  })
}

function handleAddTabInner() {
  addTab({
    key: '/admin/system/account/base',
    path: '/admin/system/account/base',
    name: '个人中心tab',
    type: 'inner', // iframe, inner-内部网页
    closeable: true,
  })
}

function handleCloseTabIframe() {
  removeTab('baidu')
}

function handleCloseTabInner() {
  removeTab('/admin/system/account/base')
}
```

## helmet

```typescript jsx
import { Helmet } from 'react-helmet-async';

<Helmet title={`title${systemConfig.title}`} />
```


