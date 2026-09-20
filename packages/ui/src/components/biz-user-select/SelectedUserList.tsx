import React, {useEffect, useRef, useState} from 'react';
import {userApi} from "@ui/services/base";
import {Admin} from "@ui/types";
import {Button, Empty, Space, Table, Tooltip} from "antd";
import {LockOutlined} from "@ant-design/icons";
import {SelectedUser} from "./BizUserSelect";


export interface SelectedUserListProps {
  selectedUsers?: SelectedUser[]; // 已经选中的用户ID
  onRemove?: (item: Admin.User) => void;
}

/**
 * @author xu.pengfei
 * @date 2022/12/28 16:21
 */
export default function SelectedUserList({selectedUsers, onRemove}: SelectedUserListProps) {
  const [array, setArray] = useState<Admin.User[]>([]);
  const userCacheRef = useRef<Record<string, Admin.User>>({});
  const pendingIdsRef = useRef(new Set<string>());
  const selectedIdsRef = useRef<string[]>([]);
  const mountedRef = useRef(false);

  function resolveUsers(ids: string[]) {
    return ids
      .map((id) => userCacheRef.current[id])
      .filter((user): user is Admin.User => Boolean(user));
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const selectedIds = Array.from(new Set((selectedUsers || []).map((item) => item.id)));
    selectedIdsRef.current = selectedIds;
    setArray(resolveUsers(selectedIds));

    const missingIds = selectedIds.filter(
      (id) => !userCacheRef.current[id] && !pendingIdsRef.current.has(id),
    );
    if (missingIds.length === 0) return;
    missingIds.forEach((id) => pendingIdsRef.current.add(id));

    const clearPendingIds = () => {
      missingIds.forEach((id) => pendingIdsRef.current.delete(id));
    };

    userApi.list({query: {'id#$in': missingIds}}).then((res) => {
      res.data.forEach((user) => {
        userCacheRef.current[user.id] = user;
      });
      clearPendingIds();
      if (mountedRef.current) setArray(resolveUsers(selectedIdsRef.current));
    }).catch(() => {
      clearPendingIds();
      if (mountedRef.current) setArray(resolveUsers(selectedIdsRef.current));
    });
  }, [selectedUsers])

  const disallowRemoveUserIds = new Set((selectedUsers || []).filter(i => !i.allowRemove).map(i => i.id))
  return (
    <Table
      rowKey="id"
      columns={[
        {dataIndex: 'name', title: '姓名', ellipsis: true},
        {dataIndex: 'username', title: '账号', ellipsis: true},
        {
          dataIndex: 'departmentName',
          title: '部门',
          ellipsis: true,
          render: (value) => value || '-',
        },
        {
          title: '操作',
          dataIndex: 'opr',
          render: (_, record) => {
            if (disallowRemoveUserIds.has(record.id)) {
              return (
                <Tooltip title="该用户不可移除">
                  <span>
                    <Button disabled type="text" size="small" icon={<LockOutlined />}>锁定</Button>
                  </span>
                </Tooltip>
              );
            }
            return (
              <Space>
                <Button onClick={() => onRemove && onRemove(record)} type="dashed" size="small" danger>删除</Button>
              </Space>
            );
          },
          width: 90,
        },
      ]}
      dataSource={array}
      pagination={false}
      size="small"
      tableLayout="fixed"
      locale={{emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无已选用户" />}}
    />
  )
}
