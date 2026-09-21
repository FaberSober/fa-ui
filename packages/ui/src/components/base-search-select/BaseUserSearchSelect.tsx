import React, { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';
import { get, remove, trim } from 'lodash';
import { Alert, Button, Empty, Select, SelectProps, Space, Spin } from 'antd';
import { useDebounce } from 'react-use';
import { Fa } from '@ui/types';
import { SearchOutlined } from "@ant-design/icons";
import { BizUserSelect, SelectedUser } from '../biz-user-select';

export interface BaseUserSearchSelectProps<T, KeyType = number> extends SelectProps<T> {
  labelKey?: string | ((record: T) => string | ReactNode);
  valueKey?: string | ((record: T) => any);
  /** [外部定义]Tree节点标准API接口 */
  serviceApi: {
    /** [外部定义]获取所有Tree节点 */
    search: (searchValue: string) => Promise<Fa.Ret<Fa.Page<T>>>;
    /** [外部定义]获取Tree节点详情 */
    getById: (id: KeyType) => Promise<Fa.Ret<T>>;
    /** [外部定义]获取Tree节点详情 */
    findList?: (ids: KeyType[]) => Promise<Fa.Ret<T[]>>;
  };
  value?: any;
  onChange?: (v: any, option?: any) => void;
  // onItemChange?: (v: T) => void;
  extraParams?: any;
  bodyStyle?: CSSProperties;
}

/**
 * 带有业务接口Api调用的 搜索下拉选择
 * @author xu.pengfei
 * @date 2020/12/28
 */
export default function BaseUserSearchSelect<RecordType extends object = any, KeyType = number>({
  labelKey = 'name',
  valueKey = 'id',
  serviceApi,
  value,
  extraParams,
  onChange,
  bodyStyle,
  ...props
}: BaseUserSearchSelectProps<RecordType, KeyType>) {
  const [search, setSearch] = useState<string>('');
  const [array, setArray] = useState<any>([]);
  const [innerUsers, setInnerUsers] = useState<SelectedUser[]>([])
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const requestIdRef = useRef(0);

  const multiple = props.mode === 'multiple';
  const loading = searchStatus === 'loading';

  useEffect(() => () => {
    requestIdRef.current += 1;
  }, []);

  useEffect(() => {
    if (multiple) {
      const selectedValues = Array.isArray(value) ? value.filter((item) => !isEmptyValue(item)) : [];
      if (selectedValues.length === 0) {
        setInnerUsers([]);
        searchNow();
      } else {
        updateValue(selectedValues);
        setInnerUsers(selectedValues.map((item: any) => ({ id: item, allowRemove: true })));
      }
    } else {
      if (isEmptyValue(value)) {
        setInnerUsers([]);
        searchNow();
      } else {
        updateValue(value);
        setInnerUsers([{ id: value, allowRemove: true }]);
      }
    }
  }, [value, extraParams, multiple]);

  function isEmptyValue(target: any) {
    if (target === undefined || target === null) return true;
    if (Array.isArray(target)) return target.length === 0;
    return typeof target === 'string' && trim(target) === '';
  }

  function updateValue(outValue: any) {
    if (isEmptyValue(outValue)) return;
    const requestId = ++requestIdRef.current;
    setSearchStatus('loading');
    if (multiple) {
      if (serviceApi?.findList) {
        serviceApi?.findList(outValue).then((res) => {
          if (requestId !== requestIdRef.current) return;
          const newList = res.data.map((d) => ({
            label: parseLabel(d),
            value: parseValue(d),
          }));

          // 追加搜索
          serviceApi
            ?.search(search)
            .then((res1) => {
              if (requestId !== requestIdRef.current) return;
              const newListAdd = res1.data.rows.map((c) => ({
                label: parseLabel(c),
                value: parseValue(c),
              }));
              const newListValues = newList.map((v1) => v1.value);
              remove(newListAdd, (v) => newListValues.indexOf(v.value) > -1);
              setArray([...newList, ...newListAdd]);
              setSearchStatus('success');
            })
            .catch(() => {
              if (requestId !== requestIdRef.current) return;
              setArray(newList);
              setSearchStatus('success');
            });
        }).catch(() => {
          if (requestId !== requestIdRef.current) return;
          setArray([]);
          setSearchStatus('error');
        });
      } else {
        setArray([]);
        setSearchStatus('success');
      }
    } else {
      serviceApi?.getById(outValue).then((res) => {
        if (requestId !== requestIdRef.current) return;
        const newList = [{ label: parseLabel(res.data), value: parseValue(res.data) }];
        setArray(newList);
        setSearchStatus('success');
      }).catch(() => {
        if (requestId !== requestIdRef.current) return;
        setArray([]);
        setSearchStatus('error');
      });
    }
  }

  function parseLabel(data: RecordType) {
    if (labelKey instanceof Function) {
      return labelKey(data);
    }
    return get(data, labelKey!);
  }

  function parseValue(data: RecordType) {
    if (valueKey instanceof Function) {
      return valueKey(data);
    }
    return get(data, valueKey!);
  }

  function searchNow() {
    const requestId = ++requestIdRef.current;
    setSearchStatus('loading');
    serviceApi
      ?.search(search)
      .then((res) => {
        if (requestId !== requestIdRef.current) return;
        const newList = res.data.rows.map((c) => ({
          label: parseLabel(c),
          value: parseValue(c),
        }));
        setArray(newList);
        setSearchStatus('success');
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        setArray([]);
        setSearchStatus('error');
      });
  }

  function renderNotFoundContent() {
    let content: ReactNode;
    if (searchStatus === 'loading') {
      content = (
        <Space size="small">
          <Spin size="small" />
          <span>搜索中...</span>
        </Space>
      );
    } else if (searchStatus === 'error') {
      content = (
        <Alert
          type="error"
          showIcon
          message="搜索失败"
          action={
            <Button type="link" size="small" onClick={searchNow}>
              重试
            </Button>
          }
        />
      );
    } else {
      content = <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={search ? '未找到匹配用户' : '暂无用户'} />;
    }
    return <div aria-live="polite">{content}</div>;
  }

  const [,] = useDebounce(
    () => {
      searchNow();
    },
    500,
    [search],
  );

  function handleValueChange(v: any, item: any) {
    // console.log('handleValueChange', v, item)
    requestIdRef.current += 1;
    if (onChange) {
      onChange(v, item);
    }
    if (search !== '') {
      setSearch('');
    }
  }

  function handleAddUsers(users: SelectedUser[], callback: any, error: any) {
    const options = users.map((user) => ({
      value: user.id,
      label: user.label ?? array.find((item: any) => item.value === user.id)?.label ?? user.id,
    }));
    if (multiple) {
      onChange?.(options.map((option) => option.value), options)
    } else {
      if (options[0]) {
        onChange?.(options[0].value, options[0])
      } else {
        onChange?.(undefined, undefined)
      }
    }
    callback()
  }

  return (
    <Space.Compact block style={bodyStyle}>
      <Select
        showSearch
        allowClear
        // value={this.state.value}
        defaultActiveFirstOption={false}
        // showArrow={false}
        filterOption={false}
        searchValue={search}
        onSearch={(v) => {
          requestIdRef.current += 1;
          setSearchStatus('loading');
          setSearch(v);
        }}
        notFoundContent={renderNotFoundContent()}
        placeholder="搜索..."
        options={array}
        value={value}
        loading={loading}
        style={{ minWidth: 138 }}
        onChange={handleValueChange}
        {...props}
        status={searchStatus === 'error' ? 'error' : props.status}
      />
      <BizUserSelect
        onChange={handleAddUsers}
        selectedUsers={innerUsers}
        multiple={multiple}
        disabled={props.disabled}
      >
        <Button
          icon={<SearchOutlined />}
          disabled={props.disabled}
          aria-label="打开用户选择器"
        />
      </BizUserSelect>
    </Space.Compact>
  );
}
