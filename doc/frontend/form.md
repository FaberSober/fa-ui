# Form表单

## InputNumber在Form中不是一个有效的undefined
```typescript jsx
// 在rule中追加 type: 'number', transform: (value) => Number(value),
<FormItem 
  name="year" 
  label="气象年份" 
  rules={[{ type: 'number', transform: (value) => Number(value), required: true, label: '气象文件' }]} 
  {...formItemFullLayout}
>
  <InputNumber placeholder="请输入气象年份" min={1900} max={2100} />
</FormItem>
```

