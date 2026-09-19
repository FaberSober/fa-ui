import { FaSortList } from "@ui/components/base-drag";
import { FaFlexRestLayout } from "@ui/components/base-layout";
import { FaberTable } from '@ui/components/base-table';
import { dataIndexToString } from '@ui/components/base-table/utils';
import { useApiLoading } from '@ui/hooks';
import { configApi as api } from '@ui/services/base';
import { Admin, Fa, FaEnums } from '@ui/types';
import { showResponse } from '@ui/utils/utils';
import { Alert, Button, Checkbox, Drawer, Input, InputNumber, Select, Space } from 'antd';
import { DrawerProps } from "antd/es/drawer";
import { find, isNil, sortBy } from 'lodash';
import React, { ReactNode, useEffect, useImperativeHandle, useRef, useState } from 'react';
import './TableColConfigModal.css';

const DEFAULT_TABLE_SCROLL_CONFIG: FaberTable.TableScrollConfig = {
  x: {mode: 'auto'},
  y: {mode: 'auto'},
};

function normalizeScrollConfig(
  value?: FaberTable.TableScrollConfig,
  fallback: FaberTable.TableScrollConfig = DEFAULT_TABLE_SCROLL_CONFIG,
): FaberTable.TableScrollConfig {
  const normalizeAxis = (axis: 'x' | 'y'): FaberTable.TableScrollAxisConfig => {
    const current = value?.[axis];
    const defaultValue = fallback[axis] || {mode: 'auto' as const};
    if (!current || !['off', 'auto', 'fixed'].includes(current.mode)) {
      return {...defaultValue};
    }
    return {
      mode: current.mode,
      ...(typeof current.value === 'number' ? {value: current.value} : {}),
    };
  };

  return {x: normalizeAxis('x'), y: normalizeAxis('y')};
}

function parseTableConfigData<T>(
  data: unknown,
  defaultScrollConfig: FaberTable.TableScrollConfig,
): FaberTable.TableConfigData<T> {
  if (Array.isArray(data)) {
    return {
      columns: data as FaberTable.ColumnsProp<T>[],
      scroll: normalizeScrollConfig(undefined, defaultScrollConfig),
    };
  }

  if (data && typeof data === 'object' && Array.isArray((data as FaberTable.TableConfigData<T>).columns)) {
    const tableConfig = data as FaberTable.TableConfigData<T>;
    return {
      columns: tableConfig.columns,
      scroll: normalizeScrollConfig(tableConfig.scroll, defaultScrollConfig),
    };
  }

  return {
    columns: [],
    scroll: normalizeScrollConfig(undefined, defaultScrollConfig),
  };
}


export interface TableColConfigModalProps<T> extends DrawerProps {
  columns: FaberTable.ColumnsProp<T>[]; // 配置字段
  biz: string; // Config#biz业务模块
  defaultScrollConfig?: FaberTable.TableScrollConfig;
  onConfigChange: (v: FaberTable.TableConfigData<T>) => void; // 配置变更
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
  {columns = [], biz, defaultScrollConfig, onConfigChange, children, ...restProps}: TableColConfigModalProps<T>,
  ref: React.ForwardedRef<TableColConfigModalRef>,
) {
  const initialScrollConfig = normalizeScrollConfig(defaultScrollConfig);
  const [config, setConfig] = useState<Admin.Config<FaberTable.TableConfigData<T>>>();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<FaberTable.ColumnsProp<T>[]>(columns);
  const [scrollConfig, setScrollConfig] = useState<FaberTable.TableScrollConfig>(initialScrollConfig);
  const currentBizRef = useRef(biz);
  const loadedBizRef = useRef<string | undefined>(undefined);
  const requestRef = useRef<{ biz: string; promise: Promise<void> } | undefined>(undefined);
  const itemsRef = useRef(items);
  const configRef = useRef(config);
  const scrollConfigRef = useRef(scrollConfig);
  const pendingWidthsRef = useRef(new Map<string, number>());
  const savingRef = useRef(false);
  const pendingSaveRef = useRef<FaberTable.TableConfigData<T> | undefined>();
  const pendingCloseRef = useRef(false);
  const pendingNotifyParentRef = useRef(false);

  currentBizRef.current = biz;
  itemsRef.current = items;
  configRef.current = config;
  scrollConfigRef.current = scrollConfig;

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

  function getConfigData(
    source: FaberTable.ColumnsProp<T>[],
    nextScrollConfig: FaberTable.TableScrollConfig = scrollConfigRef.current,
  ): FaberTable.TableConfigData<T> {
    return {
      columns: getColumnsMerge(source),
      scroll: normalizeScrollConfig(nextScrollConfig, initialScrollConfig),
    };
  }

  function persistItems(
    nextItems: FaberTable.ColumnsProp<T>[],
    nextScrollConfig: FaberTable.TableScrollConfig = scrollConfigRef.current,
    {close = false, notifyParent = false, showMessage = false}: { close?: boolean; notifyParent?: boolean; showMessage?: boolean } = {},
  ) {
    if (savingRef.current) {
      pendingSaveRef.current = getConfigData(nextItems, nextScrollConfig);
      pendingCloseRef.current = pendingCloseRef.current || close;
      pendingNotifyParentRef.current = pendingNotifyParentRef.current || notifyParent;
      return;
    }

    savingRef.current = true;
    const configData = getConfigData(nextItems, nextScrollConfig);
    const currentConfig = configRef.current;
    const params = {
      biz,
      type: FaEnums.ConfigType.TABLE_COLUMNS,
      data: configData,
    };
    const request = currentConfig
      ? api.update(currentConfig.id, {id: currentConfig.id, ...params})
      : api.save(params);

    request
      .then((res: Fa.Ret<Admin.Config<FaberTable.TableConfigData<T>>>) => {
        if (showMessage) {
          showResponse(res, '保存自定义表格配置');
        }
        const savedConfig = res.data || (currentConfig ? {...currentConfig, data: configData} : undefined);
        if (savedConfig) {
          configRef.current = savedConfig;
          setConfig(savedConfig);
        }
        scrollConfigRef.current = configData.scroll || initialScrollConfig;
        setScrollConfig(scrollConfigRef.current);
        loadedBizRef.current = biz;
        if (close) {
          setOpen(false);
        }
        if (notifyParent && pendingSaveRef.current === undefined) {
          onConfigChange(configData);
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
          persistItems(pendingSave.columns, pendingSave.scroll, {
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
    persistItems(nextItems, scrollConfigRef.current, {notifyParent: true});
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
      .then((res: Fa.Ret<Admin.Config<any>>) => {
        if (currentBizRef.current !== requestBiz) return;

        const defaultConfig = normalizeScrollConfig(defaultScrollConfig);
        const parsedConfig = isNil(res.data) || isNil(res.data.data)
          ? undefined
          : parseTableConfigData<T>(res.data.data, defaultConfig);

        if (!parsedConfig || parsedConfig.columns.length === 0) {
          const nextItems = applyPendingWidths(columns);
          const nextScrollConfig = normalizeScrollConfig(undefined, defaultConfig);
          setConfig(undefined);
          configRef.current = undefined;
          itemsRef.current = nextItems;
          setItems(nextItems);
          scrollConfigRef.current = nextScrollConfig;
          setScrollConfig(nextScrollConfig);
          loadedBizRef.current = requestBiz;
          onConfigChange({columns: [], scroll: undefined});
          if (pendingWidthsRef.current.size === 0 && nextItems !== columns) {
            persistItems(nextItems, nextScrollConfig, {notifyParent: true});
          }
          return;
        }

        const nextScrollConfig = normalizeScrollConfig(parsedConfig.scroll, defaultConfig);
        const nextConfig = {
          ...res.data,
          data: {
            columns: filterValidConfigColumns(parsedConfig.columns),
            scroll: nextScrollConfig,
          },
        };
        if (onConfigChange) {
          onConfigChange(nextConfig.data);
        }
        setConfig(nextConfig);
        configRef.current = nextConfig;
        scrollConfigRef.current = nextScrollConfig;
        setScrollConfig(nextScrollConfig);
        const sortedItems = parseItemsSorted(columns, nextConfig.data.columns);
        const hasPendingWidths = pendingWidthsRef.current.size > 0;
        const newItems = applyPendingWidths(sortedItems);
        itemsRef.current = newItems;
        setItems(newItems);
        loadedBizRef.current = requestBiz;
        if (hasPendingWidths) {
          persistItems(newItems, nextScrollConfig, {notifyParent: true});
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
    const nextScrollConfig = normalizeScrollConfig(defaultScrollConfig);
    setConfig(undefined);
    configRef.current = undefined;
    itemsRef.current = columns;
    setItems(columns);
    scrollConfigRef.current = nextScrollConfig;
    setScrollConfig(nextScrollConfig);
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
        const nextScrollConfig = normalizeScrollConfig(defaultScrollConfig);
        setConfig(undefined);
        configRef.current = undefined;
        itemsRef.current = columns;
        setItems(columns);
        pendingWidthsRef.current.clear();
        scrollConfigRef.current = nextScrollConfig;
        setScrollConfig(nextScrollConfig);
        loadedBizRef.current = biz;
        onConfigChange({columns: [], scroll: undefined});
      })
    }
  }

  /** 保存配置 */
  function handleSave() {
    persistItems(items, scrollConfigRef.current, {close: true, notifyParent: true, showMessage: true});
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

  function updateScrollConfig(axis: 'x' | 'y', nextAxis: FaberTable.TableScrollAxisConfig) {
    const nextScrollConfig = {
      ...scrollConfigRef.current,
      [axis]: nextAxis,
    };
    scrollConfigRef.current = nextScrollConfig;
    setScrollConfig(nextScrollConfig);
  }

  function handleScrollModeChange(axis: 'x' | 'y', mode: FaberTable.TableScrollMode) {
    const current = scrollConfigRef.current[axis] || {mode: 'auto' as const};
    updateScrollConfig(axis, mode === 'fixed' ? {mode, value: current.value} : {mode});
  }

  function handleScrollValueChange(axis: 'x' | 'y', value: number | null) {
    updateScrollConfig(axis, {mode: 'fixed', value: value == null ? undefined : value});
  }

  const scrollConfigValid = (['x', 'y'] as const).every((axis) => {
    const axisConfig = scrollConfig[axis];
    return axisConfig?.mode !== 'fixed'
      || (typeof axisConfig.value === 'number' && Number.isFinite(axisConfig.value) && axisConfig.value > 0);
  });
  const hasFixedColumns = columns.some((column) => column.fixed);

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
            <Button size="small" type="primary" onClick={handleSave} loading={loading} disabled={!scrollConfigValid}>
              更新
            </Button>
          </Space>
        }
        {...restProps}
      >
        <div className="fa-full-content-p12 fa-flex-column">
          <div style={{borderBottom: '1px solid #ccc', padding: '8px 0 12px'}}>
            <div className="fa-table-col-thead-item fa-text">表格滚动</div>
            <Space direction="vertical" size={8} style={{width: '100%', marginTop: 8}}>
              {(['x', 'y'] as const).map((axis) => {
                const axisConfig = scrollConfig[axis] || {mode: 'auto' as const};
                return (
                  <Space key={axis} size={8} style={{width: '100%'}}>
                    <span style={{width: 64}}>{axis === 'x' ? '横向' : '纵向'}</span>
                    <Select
                      size="small"
                      style={{width: 120}}
                      value={axisConfig.mode}
                      options={[
                        {label: '关闭', value: 'off'},
                        {label: '自动计算', value: 'auto'},
                        {label: '固定值', value: 'fixed'},
                      ]}
                      onChange={(value) => handleScrollModeChange(axis, value as FaberTable.TableScrollMode)}
                    />
                    {axisConfig.mode === 'fixed' && (
                      <InputNumber
                        size="small"
                        min={1}
                        style={{width: 130}}
                        value={axisConfig.value}
                        addonAfter="px"
                        onChange={(value) => handleScrollValueChange(axis, value)}
                      />
                    )}
                  </Space>
                );
              })}
            </Space>
            {scrollConfig.x?.mode === 'off' && hasFixedColumns ? (
              <Alert
                type="warning"
                showIcon
                message="当前表格存在固定列，关闭横向滚动可能导致固定列布局异常。"
                style={{marginTop: 8}}
              />
            ) : null}
          </div>
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
