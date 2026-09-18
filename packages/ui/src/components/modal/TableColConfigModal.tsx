import { FaSortList } from "@ui/components/base-drag";
import { FaFlexRestLayout } from "@ui/components/base-layout";
import { FaberTable } from '@ui/components/base-table';
import { dataIndexToString } from '@ui/components/base-table/utils';
import { useApiLoading } from '@ui/hooks';
import { configApi as api } from '@ui/services/base';
import { Admin, Fa, FaEnums } from '@ui/types';
import { showResponse } from '@ui/utils/utils';
import { Button, Checkbox, Drawer, Input, Space } from 'antd';
import { DrawerProps } from "antd/es/drawer";
import { find, isNil, sortBy } from 'lodash';
import React, { ReactNode, useEffect, useImperativeHandle, useRef, useState } from 'react';
import './TableColConfigModal.css';


export interface TableColConfigModalProps<T> extends DrawerProps {
  columns: FaberTable.ColumnsProp<T>[]; // 配置字段
  biz: string; // Config#biz业务模块
  onConfigChange: (v: FaberTable.ColumnsProp<T>[]) => void; // 排序结束
  children: ReactNode;
}

export interface TableColConfigModalRef {
  updateColumnWidth: (dataIndex: string | string[], width: number) => void;
}

/**
 * 表格自定义列Modal
 * 1. 操作一栏不进行排序，默认放在最后一排
 */
function TableColConfigModalInner<T>(
  {columns = [], biz, onConfigChange, children, ...restProps}: TableColConfigModalProps<T>,
  ref: React.ForwardedRef<TableColConfigModalRef>,
) {
  const [config, setConfig] = useState<Admin.Config<FaberTable.ColumnsProp<T>[]>>();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<FaberTable.ColumnsProp<T>[]>(columns);
  const currentBizRef = useRef(biz);
  const loadedBizRef = useRef<string | undefined>(undefined);
  const requestRef = useRef<{ biz: string; promise: Promise<void> } | undefined>(undefined);
  const itemsRef = useRef(items);
  const configRef = useRef(config);
  const pendingWidthsRef = useRef(new Map<string, number>());
  const savingRef = useRef(false);
  const pendingSaveRef = useRef<FaberTable.ColumnsProp<T>[] | undefined>();
  const pendingCloseRef = useRef(false);
  const pendingNotifyParentRef = useRef(false);

  currentBizRef.current = biz;
  itemsRef.current = items;
  configRef.current = config;

  /** 过滤已删除、重复或格式异常的历史列配置。 */
  function filterValidConfigColumns(configColumns: FaberTable.ColumnsProp<T>[]): FaberTable.ColumnsProp<T>[] {
    const currentColumnKeys = new Set(columns.map((column) => dataIndexToString(column.dataIndex)));
    const seenKeys = new Set<string>();
    return configColumns.filter((column) => {
      if (!column || column.dataIndex == null) return false;
      const key = dataIndexToString(column.dataIndex);
      if (!currentColumnKeys.has(key) || seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });
  }

  /**
   * 解析columns与远端配置，并排序
   */
  function parseItemsSorted(
    columnsArgs: FaberTable.ColumnsProp<T>[],
    configColumns: FaberTable.ColumnsProp<T>[],
  ): FaberTable.ColumnsProp<T>[] {
    const configuredItems = configColumns
      .map((remoteItem): FaberTable.ColumnsProp<T> | undefined => {
        const item = find(columnsArgs, (column) => dataIndexToString(column.dataIndex) === dataIndexToString(remoteItem.dataIndex));
        return item ? {...item, ...remoteItem, tcChecked: remoteItem.tcChecked === true} : undefined;
      })
      .filter((item): item is FaberTable.ColumnsProp<T> => item !== undefined);
    const configuredKeys = new Set(configuredItems.map((item) => dataIndexToString(item.dataIndex)));
    const newItems = columnsArgs.filter((item) => !configuredKeys.has(dataIndexToString(item.dataIndex)));

    // 保留历史配置顺序，新列按当前列定义顺序追加，并沿用新列默认显示状态。
    return [...sortBy(configuredItems, (item) => item.sort), ...newItems];
  }

  function applyPendingWidths(nextItems: FaberTable.ColumnsProp<T>[]) {
    if (pendingWidthsRef.current.size === 0) return nextItems;
    const next = nextItems.map((item) => {
      const width = pendingWidthsRef.current.get(dataIndexToString(item.dataIndex));
      return width ? {...item, width} : item;
    });
    pendingWidthsRef.current.clear();
    return next;
  }

  function getColumnsMerge(source: FaberTable.ColumnsProp<T>[]) {
    return source.map((item, index) => {
      const {dataIndex, tcRequired, tcChecked, width} = item;
      return {dataIndex, tcRequired, tcChecked, width, sort: index};
    }) as FaberTable.ColumnsProp<T>[];
  }

  function persistItems(
    nextItems: FaberTable.ColumnsProp<T>[],
    {close = false, notifyParent = false, showMessage = false}: { close?: boolean; notifyParent?: boolean; showMessage?: boolean } = {},
  ) {
    if (savingRef.current) {
      pendingSaveRef.current = nextItems;
      pendingCloseRef.current = pendingCloseRef.current || close;
      pendingNotifyParentRef.current = pendingNotifyParentRef.current || notifyParent;
      return;
    }

    savingRef.current = true;
    const columnsMerge = getColumnsMerge(nextItems);
    const currentConfig = configRef.current;
    const params = {
      biz,
      type: FaEnums.ConfigType.TABLE_COLUMNS,
      data: columnsMerge,
    };
    const request = currentConfig
      ? api.update(currentConfig.id, {id: currentConfig.id, ...params})
      : api.save(params);

    request
      .then((res: Fa.Ret<Admin.Config<FaberTable.ColumnsProp<T>[]>>) => {
        if (showMessage) {
          showResponse(res, '保存自定义表格配置');
        }
        const savedConfig = res.data || (currentConfig ? {...currentConfig, data: columnsMerge} : undefined);
        if (savedConfig) {
          configRef.current = savedConfig;
          setConfig(savedConfig);
        }
        loadedBizRef.current = biz;
        if (close) {
          setOpen(false);
        }
        if (notifyParent && pendingSaveRef.current === undefined) {
          onConfigChange(columnsMerge);
        }
      })
      .catch(() => {})
      .finally(() => {
        savingRef.current = false;
        const pendingSave = pendingSaveRef.current;
        const pendingClose = pendingCloseRef.current;
        const pendingNotifyParent = pendingNotifyParentRef.current;
        pendingSaveRef.current = undefined;
        pendingCloseRef.current = false;
        pendingNotifyParentRef.current = false;
        if (pendingSave) {
          persistItems(pendingSave, {
            close: pendingClose,
            notifyParent: pendingNotifyParent,
            showMessage: pendingClose,
          });
        }
      });
  }

  function updateColumnWidth(dataIndex: string | string[], width: number) {
    const key = dataIndexToString(dataIndex);
    if (loadedBizRef.current !== biz) {
      pendingWidthsRef.current.set(key, width);
      return;
    }

    const nextItems = itemsRef.current.map((item) => (
      dataIndexToString(item.dataIndex) === key ? {...item, width} : item
    ));
    itemsRef.current = nextItems;
    setItems(nextItems);
    persistItems(nextItems, {notifyParent: true});
  }

  useImperativeHandle(ref, () => ({updateColumnWidth}));

  /** 获取服务端配置 */
  function fetchRemoteConfig(force = false): Promise<void> {
    const requestBiz = biz;
    if (!requestBiz) {
      loadedBizRef.current = requestBiz;
      return Promise.resolve();
    }

    if (!force && loadedBizRef.current === requestBiz) {
      return Promise.resolve();
    }

    if (requestRef.current?.biz === requestBiz) {
      return requestRef.current.promise;
    }

    const request = api.getOne(requestBiz, FaEnums.ConfigType.TABLE_COLUMNS)
      .then((res: Fa.Ret<Admin.Config<FaberTable.ColumnsProp<T>[]>>) => {
        if (currentBizRef.current !== requestBiz) return;

        if (isNil(res.data) || isNil(res.data.data) || res.data.data.length === 0) {
          const nextItems = applyPendingWidths(columns);
          setConfig(undefined);
          configRef.current = undefined;
          itemsRef.current = nextItems;
          setItems(nextItems);
          loadedBizRef.current = requestBiz;
          if (pendingWidthsRef.current.size === 0 && nextItems !== columns) {
            persistItems(nextItems, {notifyParent: true});
          }
          return;
        }

        const nextConfig = {...res.data, data: filterValidConfigColumns(res.data.data)};
        if (onConfigChange) {
          onConfigChange(nextConfig.data);
        }
        setConfig(nextConfig);
        configRef.current = nextConfig;
        const sortedItems = parseItemsSorted(columns, nextConfig.data);
        const hasPendingWidths = pendingWidthsRef.current.size > 0;
        const newItems = applyPendingWidths(sortedItems);
        itemsRef.current = newItems;
        setItems(newItems);
        loadedBizRef.current = requestBiz;
        if (hasPendingWidths) {
          persistItems(newItems, {notifyParent: true});
        }
      })
      .catch(() => {
        // 请求失败不标记为已加载，下一次打开抽屉时可以重试。
      })
      .finally(() => {
        if (requestRef.current?.promise === request) {
          requestRef.current = undefined;
        }
      });
    requestRef.current = { biz: requestBiz, promise: request };
    return request;
  }

  // 初始化加载表格配置
  useEffect(() => {
    loadedBizRef.current = undefined;
    pendingWidthsRef.current.clear();
    setConfig(undefined);
    configRef.current = undefined;
    itemsRef.current = columns;
    setItems(columns);
    void fetchRemoteConfig();
  }, [biz]);

  /** 展示Modal */
  function showModelHandler(e: React.MouseEvent<HTMLElement>) {
    if (e) {
      e.stopPropagation();
    }
    setOpen(true);
    void fetchRemoteConfig();
  }

  function handleReset() {
    if (config && config.id) {
      api.remove(config.id).then(() => {
        setConfig(undefined);
        configRef.current = undefined;
        itemsRef.current = columns;
        setItems(columns);
        pendingWidthsRef.current.clear();
        loadedBizRef.current = biz;
        if (onConfigChange) onConfigChange(columns);
      })
    }
  }

  /** 保存配置 */
  function handleSave() {
    persistItems(items, {close: true, notifyParent: true, showMessage: true});
  }

  /** 处理Item勾选 */
  function handleItemCheck(item: FaberTable.ColumnsProp<T>, checked: boolean) {
    const newItems = items.map((i) => {
      if (i.dataIndex === item.dataIndex) {
        return {...i, tcChecked: checked};
      }
      return i;
    });
    setItems(newItems);
  }

  const loading = useApiLoading([ api.getUrl('save'), api.getUrl('update')]);
  return (
    <span>
      <span onClick={showModelHandler}>{children}</span>
      <Drawer
        title="自定义表格字段"
        open={open}
        onClose={() => setOpen(false)}
        size={500}
        destroyOnHidden
        extra={
          <Space>
            <Button size="small" onClick={handleReset} loading={loading}>
              重置
            </Button>
            <Button size="small" type="primary" onClick={handleSave} loading={loading}>
              更新
            </Button>
          </Space>
        }
        {...restProps}
      >
        <div className="fa-full-content-p12 fa-flex-column">
          <div className="fa-flex-row-center fa-text" style={{borderBottom: '1px solid #ccc', padding: '8px 0'}}>
            <div className="fa-table-col-thead-item" style={{flex: 1, borderRight: '1px solid #ccc'}}>
              字段
            </div>
            <div className="fa-table-col-thead-item" style={{width: 100}}>
              宽度(px)
            </div>
            <div className="fa-table-col-thead-item" style={{width: 10}}/>
          </div>
          <FaFlexRestLayout>
            <FaSortList
              list={items.filter((i) => i.tcType !== 'menu')}
              rowKey="dataIndex"
              renderItem={(item) => (
                <div className="fa-table-col-item">
                  <Checkbox
                    disabled={item.tcRequired}
                    checked={item.tcRequired || item.tcChecked}
                    onChange={(e) => handleItemCheck(item, e.target.checked)}
                  />
                  <div
                    style={{flex: 1, paddingLeft: 8, fontSize: '14px'}}
                    onClick={() => handleItemCheck(item, !item.tcChecked)}
                  >
                    <span>{item.title}</span>
                  </div>
                  {item.tcRequired ? <span style={{color: '#666', marginRight: 16}}>（必选）</span> : null}
                  <div style={{width: 100, marginRight: 8}}>
                    <Input
                      // addonBefore="宽度"
                      // addonAfter="px"
                      size="small"
                      value={item.width}
                      placeholder="auto"
                      onChange={(e) => {
                        setItems(items.map(i => i.dataIndex === item.dataIndex ? { ...i, width: Number(e.target.value) } : i))
                      }}
                    />
                  </div>
                </div>
              )}
              itemStyle={{borderBottom: '1px solid #ccc'}}
              onSortEnd={(l) => {
                setItems([...l, ...items.filter((i) => i.tcType === 'menu')]);
              }}
              vertical
              handle
            />
          </FaFlexRestLayout>
        </div>
      </Drawer>
    </span>
  );
}

const TableColConfigModal = React.forwardRef(TableColConfigModalInner) as <T>(
  props: TableColConfigModalProps<T> & React.RefAttributes<TableColConfigModalRef>,
) => React.ReactElement | null;

export default TableColConfigModal;
