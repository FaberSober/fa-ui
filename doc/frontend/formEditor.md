# FormEditor
## JsonConfig
```yaml
database: # 数据库配置
  tableName: 'mt_xxx'
  columns:
    - name:
      type: # int,varchar
      comment:
formConfig: # 表单配置
formItems: # 表单项列表
  - id: '123'
    type: 'input' # 'input' | 'row'
    children: # 容器的子元素
```

## DataConfig
```yaml
main: # 主表
  tableName:
  comment:
  columns:
    - field: # field name
    - sort: # sort
```

## 低代码平台
1. 表格拖拽编辑器✅
2. 表格json解析展示✅
3. 数据库表网页编辑✅
4. 流程引擎引用自定义表格✅
5. 自定义表单配置列表展示查询
