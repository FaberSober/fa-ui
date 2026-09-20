import React, {useEffect, useRef, useState} from 'react';
import {userApi} from "@ui/services/base";
import {Admin} from "@ui/types";
import {Alert, Button, Empty, Space, Spin, Table, Tooltip} from "antd";
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
  const requestIdRef = useRef(0);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

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
    const requestId = ++requestIdRef.current;
    const selectedIds = Array.from(new Set((selectedUsers || []).map((item) => item.id)));
    selectedIdsRef.current = selectedIds;
    setArray(resolveUsers(selectedIds));

    const missingIds = selectedIds.filter(
      (id) => !userCacheRef.current[id] && !pendingIdsRef.current.has(id),
    );
    if (missingIds.length === 0) {
      setDetailsLoading(false);
      setDetailsError(false);
      return;
    }
    setDetailsLoading(true);
    setDetailsError(false);
    missingIds.forEach((id) => pendingIdsRef.current.add(id));

    const clearPendingIds = () => {
      missingIds.forEach((id) => pendingIdsRef.current.delete(id));
    };

    userApi.list({query: {'id#$in': missingIds}}).then((res) => {
      res.data.forEach((user) => {
        userCacheRef.current[user.id] = user;
      });
      clearPendingIds();
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setArray(resolveUsers(selectedIdsRef.current));
      setDetailsLoading(false);
    }).catch(() => {
      clearPendingIds();
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setArray(resolveUsers(selectedIdsRef.current));
      setDetailsLoading(false);
      setDetailsError(true);
    });
  }, [selectedUsers, retryToken])

  const disallowRemoveUserIds = new Set((selectedUsers || []).filter(i => !i.allowRemove).map(i => i.id))
  return (
    <div className="fa-user-picker__selected-list">
      {detailsError && (
        <Alert
          type="error"
          showIcon
          message="用户详情加载失败"
          action={(
            <Button type="link" size="small" onClick={() => setRetryToken((current) => current + 1)}>
              重试
            </Button>
          )}
        />
      )}
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
                      <Button
                        disabled
                        type="text"
                        size="small"
                        icon={<LockOutlined />}
                        aria-label={`用户${record.name || ''}不可移除`}
                      >
                        锁定
                      </Button>
                    </span>
                  </Tooltip>
                );
              }
              return (
                <Space>
                  <Button
                    onClick={() => onRemove && onRemove(record)}
                    type="dashed"
                    size="small"
                    danger
                    aria-label={`删除用户${record.name || ''}`}
                  >
                    删除
                  </Button>
                </Space>
              );
            },
            width: 90,
          },
        ]}
        dataSource={array}
        loading={detailsLoading}
        pagination={false}
        size="small"
        tableLayout="fixed"
        locale={{
          emptyText: detailsLoading ? (
            <Space size="small" aria-live="polite">
              <Spin size="small" />
              <span>加载用户详情...</span>
            </Space>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无已选用户" />
          ),
        }}
      />
    </div>
  )
}
