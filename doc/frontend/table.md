# table

## 组合查询配置说明
### 下拉选择框Select
```typescript jsx
{
    ...BaseTableUtils.genSimpleSorterColumn('场站', 'factoryId', 200, sorter),
    render: (_v, r) => r.factoryName,
    tcCondComponent: ({index, value, callback, mode, ...props}: FaberTable.TcCondProp) => (
        <SubjectFactorySelect value={value} onChange={(v, o) => callback(v, index, FaUtils.optionsToLabel(o))} {...props} />
    ),
},
```
