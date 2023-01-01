/**
 * 重置表格字段
 * @param form
 */
export default function clearForm(form: any) {
  if (form === undefined || form == null) return;
  form.resetFields();
  form.submit();
}