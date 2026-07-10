# 文件上传规范

前端业务页面优先复用 `@fa/ui` 的上传组件，不要自行拼接上传地址、认证请求头或 `FormData`。这些组件统一上传到平台文件服务 `/api/base/admin/fileSave/upload`，上传成功后通过 `onChange` 返回文件 ID；业务表只保存文件 ID，而不保存浏览器本地路径或 Base64 内容。

## 组件选择

| 场景 | 使用组件 | 表单值 |
| --- | --- | --- |
| 单个普通文件 | `UploadFileLocal` | `string` |
| 多个普通文件 | `UploadFileLocalMultiple` | `string[]` |
| 单张图片、头像、封面 | `UploadImgLocal` | `string` |
| 仅在浏览器解析、不上传服务器 | Ant Design `Upload` | 原始 `File` / 解析结果 |

组件源代码：

```text
components/base-uploader/UploadFileLocal.tsx
components/base-uploader/UploadFileLocalMultiple.tsx
components/base-uploader/UploadImgLocal.tsx
```

## 单个普通文件

适用于附件、文档等一个文件字段。`onChange` 返回上传后的文件 ID。

```tsx
import { UploadFileLocal } from '@fa/ui';

const [fileId, setFileId] = useState<string>();

<UploadFileLocal
  value={fileId}
  onChange={(value) => setFileId(value as string | undefined)}
/>
```

在 Ant Design `Form.Item` 中可直接使用，字段值会自动绑定为文件 ID：

```tsx
<Form.Item name="attachmentFileId" label="附件">
  <UploadFileLocal />
</Form.Item>
```

## 多文件上传

适用于图片资产、多个附件等。`onChange` 返回已完成上传的文件 ID 数组。

```tsx
import { UploadFileLocalMultiple } from '@fa/ui';

const [fileIds, setFileIds] = useState<string[]>([]);

<UploadFileLocalMultiple
  value={fileIds}
  maxCount={20}
  onChange={setFileIds}
/>
```

业务模块收到 `fileIds` 后，应调用自身的专用接口创建业务记录。例如视觉平台先上传文件，再调用 `POST /api/vision/asset/createFromFiles` 读取图片尺寸、计算 SHA-256 并创建图片资产。不要在前端直接写入资产的文件路径、尺寸或哈希。

## 单张图片上传

图片封面、头像、Logo 等必须使用 `UploadImgLocal`，而不是 `UploadFileLocal` 配合 `listType="picture-card"`。`UploadImgLocal` 已内置：

- 图片格式限制；
- 图片卡片样式；
- 上传中状态；
- 缩略图回显；
- 原图预览；
- 单文件替换与删除。

```tsx
import { UploadImgLocal } from '@fa/ui';

<Form.Item name="coverFileId" label="项目封面">
  <UploadImgLocal />
</Form.Item>
```

编辑场景只需为表单设置已有的文件 ID，组件会自动请求文件信息并回显：

```tsx
form.setFieldsValue({
  coverFileId: record.coverFileId,
});
```

视觉项目的实际示例见：

```text
apps/admin/features/fa-vision-pages/pages/admin/vision/project/modal/VisionProjectModal.tsx
```

## 文件展示与预览

文件 ID 需要转换为访问地址时，优先使用 `fileSaveApi`，不要手写服务地址：

```tsx
import { fileSaveApi } from '@fa/ui';

const fileUrl = fileSaveApi.genLocalGetFile(fileId);
const previewUrl = fileSaveApi.genLocalGetFilePreview(fileId);
```

`genLocalGetFilePreview` 用于图片缩略图，`genLocalGetFile` 用于原文件或原图预览。

## 仅前端读取文件内容

导入 JSON、页面配置等不需要保存到文件服务的临时读取场景，可使用 Ant Design `Upload` 并在 `beforeUpload` 返回 `false`：

```tsx
<Upload
  beforeUpload={(file) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => onUpload(reader.result as string);
    return false;
  }}
  showUploadList={false}
>
  <Button>上传配置</Button>
</Upload>
```

## 约束

- 数据库和接口参数统一保存文件 ID，例如 `coverFileId`、`fileId`、`fileIds`。
- 上传成功并不等于完成业务处理。需要图片解析、去重、OCR、导入等操作时，应由后端专用接口异步或事务性处理。
- 业务代码不要自行设置 Authorization 请求头；上传组件已统一处理。
- 单图字段使用 `UploadImgLocal`，多图字段使用 `UploadFileLocalMultiple`。
- 删除上传组件中的文件仅清空业务字段，不会自动物理删除平台文件；物理文件清理由文件存储和业务关联策略统一处理。
