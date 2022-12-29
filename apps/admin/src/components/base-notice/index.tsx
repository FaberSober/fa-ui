import React, { useEffect, useState } from 'react';
import { Alert } from 'antd';
import noticeService from '@/services/admin/notice';
import { Admin } from '@/types';

/**
 * 全局公告-强提醒-顶部固定展示
 * @author xu.pengfei
 * @date 2021/1/7
 */
export default function BaseNotice() {
  const [array, setArray] = useState<Admin.Notice[]>([]);

  useEffect(() => {
    noticeService.list({ status: true, strongNotice: true }).then((res) => {
      setArray(res.data);
    });
  }, []);

  return (
    <div>
      {array.map((item) => (
        <Alert key={item.id} message={`${item.title}: ${item.content}`} banner />
      ))}
    </div>
  );
}
