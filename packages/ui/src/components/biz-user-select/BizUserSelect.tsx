import React, {useEffect, useRef, useState} from 'react';
import {departmentApi, userApi} from "@ui/services/base";
import {Admin} from "@ui/types";
import {Button, Col, Form, Input, Row, Space} from "antd";
import {SearchOutlined} from "@ant-design/icons";
import {clearForm, useTableQueryParams} from "@ui/hooks";
import {BaseBizTable, BaseTableUtils, FaberTable} from "@ui/components/base-table";
import SelectedUserList from "@ui/components/biz-user-select/SelectedUserList";
import {BaseTree} from "@ui/components/base-tree";
import {FaLabel} from "@ui/components/decorator";
import {CommonModalProps, DragModal} from '../base-modal';
import {FaFlexRestLayout} from "@ui/components";
import type {TableRowSelection} from 'antd/es/table/interface';


export interface SelectedUser {
  id: string;
  label?: string;
  allowRemove?: boolean;
}

export interface BizUserSelectProps extends CommonModalProps<any> {
  selectedUsers?: SelectedUser[]; // 已经选中的用户ID
  multiple?: boolean;
  onChange?: (v: SelectedUser[], callback: () => void, error?: any) => void;
}

/**
 * Department User Select Modal
 * @author xu.pengfei
 * @date 2022/12/28 14:38
 */
export default function BizUserSelect({children, record, fetchFinish, selectedUsers, multiple = true, onChange, ...props}: BizUserSelectProps) {
  const [form] = Form.useForm();

  const [open, setOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const [dept, setDept] = useState<Admin.Department>();
  const [innerUsers, setInnerUsers] = useState<SelectedUser[]>(selectedUsers || [])
  const originalUsersRef = useRef<SelectedUser[]>([]);

  useEffect(() => {
    // console.log('selectedUsers', selectedUsers)
    if (!open) {
      const users = normalizeUsers(selectedUsers || []);
      setInnerUsers(users);
      originalUsersRef.current = users;
    }
  }, [selectedUsers, multiple, open])

  const {
    queryParams,
    setFormValues,
    handleTableChange,
    setExtraParams,
    fetchPageList,
    loading,
    list,
    paginationProps,
  } = useTableQueryParams<Admin.UserWeb>(
    userApi.page,
    { extraParams: { departmentId: dept?.id }, sorter: { field: 'crtTime', order: 'descend' } },
    '用户',
  );

  useEffect(() => {
    setExtraParams({ departmentId: dept?.id })
  }, [dept])

  function onTreeDeptSelect(keys: any[], event: any) {
    setDept(keys.length > 0 ? event.node.sourceData : undefined);
  }

  function dedupeUsers(users: SelectedUser[]) {
    const seen = new Set<string>();
    return users.filter((user) => {
      if (seen.has(user.id)) return false;
      seen.add(user.id);
      return true;
    });
  }

  function normalizeUsers(users: SelectedUser[]) {
    const uniqueUsers = dedupeUsers(users);
    return multiple ? uniqueUsers : uniqueUsers.slice(0, 1);
  }

  function toSelectedUser(item: Admin.UserWeb): SelectedUser {
    return { id: item.id, label: item.name, allowRemove: true };
  }

  function handleRowSelect(record: Admin.UserWeb, selected: boolean) {
    setInnerUsers((current) => {
      if (!multiple) return selected ? [toSelectedUser(record)] : [];
      if (!selected) return current.filter((user) => user.id !== record.id);
      return dedupeUsers([...current, toSelectedUser(record)]);
    });
  }

  function handleSelectAll(selected: boolean, selectedRows: Admin.UserWeb[]) {
    if (!multiple) return;
    const pageIds = new Set(list.map((item) => item.id));
    setInnerUsers((current) => {
      const retainedUsers = current.filter((user) => !pageIds.has(user.id));
      return dedupeUsers(selected ? [...retainedUsers, ...selectedRows.map(toSelectedUser)] : retainedUsers);
    });
  }

  function handleRemove(item: Admin.User) {
    setInnerUsers(innerUsers.filter(i => i.id !== item.id))
  }

  /** 生成表格字段List */
  function genColumns() {
    const { sorter } = queryParams;
    return [
      BaseTableUtils.genSimpleSorterColumn('账户', 'username', undefined, sorter),
      BaseTableUtils.genSimpleSorterColumn('姓名', 'name', 130, sorter),
      {
        ...BaseTableUtils.genSimpleSorterColumn('部门', 'departmentId', 130, sorter),
        render: (_, r) => r.departmentName,
      },
    ] as FaberTable.ColumnsProp<Admin.UserWeb>[];
  }

  const rowSelection: TableRowSelection<Admin.UserWeb> = {
    type: multiple ? 'checkbox' : 'radio',
    selectedRowKeys: innerUsers.map((user) => user.id),
    preserveSelectedRowKeys: true,
    onSelect: handleRowSelect,
    onSelectAll: handleSelectAll,
    getCheckboxProps: (record) => ({
      disabled: innerUsers.some((user) => user.id === record.id && user.allowRemove === false),
    }),
  };

  function handleConfirm() {
    const submittedUsers = [...innerUsers];
    const closeModal = () => {
      originalUsersRef.current = submittedUsers;
      setConfirmLoading(false)
      setOpen(false)
    };
    if (!onChange) {
      closeModal();
      return;
    }
    setConfirmLoading(true)
    onChange(submittedUsers, closeModal, () => setConfirmLoading(false))
  }

  function showModal() {
    const users = normalizeUsers(selectedUsers || []);
    originalUsersRef.current = users;
    setInnerUsers(users);
    setOpen(true);
  }

  function handleCancel() {
    setInnerUsers(originalUsersRef.current);
    setConfirmLoading(false);
    setOpen(false);
  }

  return (
    <span>
      <span onClick={showModal}>
        {children}
      </span>
      <DragModal
        title="选择用户"
        open={open}
        onOk={handleConfirm}
        confirmLoading={confirmLoading}
        onCancel={handleCancel}
        width={1200}
        {...props}
      >
        <Row className="fa-flex-row" style={{height: 600}} gutter={12}>
          <Col md={5}>
            <BaseTree
              rootName="全部"
              onSelect={onTreeDeptSelect}
              // 自定义配置
              serviceName="部门"
              serviceApi={departmentApi}
              showTopBtn={false}
              treeStyle={{padding: 0}}
              className="fa-border"
            />
          </Col>

          <Col md={14}>
            <div className="fa-full fa-flex-column">
              <div style={{ display: 'flex', justifyContent: 'flex-end' }} className="fa-mb12">
                <Form form={form} layout="inline" onFinish={setFormValues}>
                  <Form.Item name="name" label="姓名">
                    <Input placeholder="请输入姓名" />
                  </Form.Item>
                </Form>

                <Space>
                  <Button onClick={() => form.submit()} loading={loading} icon={<SearchOutlined />}>查询</Button>
                  <Button onClick={() => clearForm(form)} loading={loading}>重置</Button>
                </Space>
              </div>

              <BaseBizTable
                biz="UserList-Search"
                columns={genColumns()}
                pagination={{ ...paginationProps, size: 'small' }}
                loading={loading}
                dataSource={list}
                rowKey={(item) => item.id}
                onChange={handleTableChange}
                rowSelection={rowSelection}
                refreshList={() => fetchPageList()}
                batchDelete={(ids) => userApi.removeBatchByIds(ids)}
                showComplexQuery={false}
                showBatchDelBtn={false}
                showTableColConfigBtn={false}
                showCheckbox
                showTopDiv={false}
              />
            </div>
          </Col>

          <Col md={5} className="fa-flex-column" style={{ height: '100%' }}>
            <FaLabel title="已选择" className="fa-mb12" />
            <FaFlexRestLayout>
              <SelectedUserList selectedUsers={innerUsers} onRemove={handleRemove} />
            </FaFlexRestLayout>
          </Col>
        </Row>
      </DragModal>
    </span>
  )
}
