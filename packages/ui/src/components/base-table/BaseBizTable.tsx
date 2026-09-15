import { useEffect, useMemo, useRef, useState } from 'react';
import {find, get, isNumber, sumBy} from 'lodash';
import { ClearOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Modal, Table } from 'antd';
import type FaberTable from './FaberTable';
import { showResponse } from '@ui/utils/utils';
import { dataIndexToString, useScrollY } from './utils';
import ComplexQuery from '@ui/components/condition-query/ComplexQuery';
import type { TableRowSelection } from 'antd/es/table/interface';
import TableColConfigModal from '../modal/TableColConfigModal';
import { FaFlexRestLayout } from "@ui/components/base-layout";


/**
 * 基础业务表格组件
 * 1. 带字段自定义配置展示功能
 * 2. 带高级组合查询功能
 * 3. 带column配置功能，参考 {@link ./utils.tsx}
 */
export default function BaseBizTable<RecordType extends object = any>({
  showTableColConfigBtn = true,
  showComplexQuery = true,
  showCheckbox = true,
  showTopDiv = true,
  showRowNum = false,
  biz = '',
  columns,
  refreshList,
  batchDelete,
  renderQuerySuffix = () => null,
  renderQueryAll = () => null,
  querySuffix = null,
  renderCheckBtns = () => null,
  onSceneChange = () => {},
  onConditionChange = () => {},
  rowSelection,
  rowClickSelected,
  rowClickSingleSelected = true,
  onSelectedRowsChange,
  showBatchDelBtn = true,
  keyName = 'id',
  batchDelBtn,
  showDeleteByQuery = false,
  onDeleteByQuery = () => {},
  scrollY,
  topBtns,
  topSecondBtns,
  ...props
}: FaberTable.BaseTableProps<RecordType>) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const scrollLayoutKey = [
    get(props, 'pagination.total'),
    get(props, 'pagination.current'),
    get(props, 'pagination.pageSize'),
    scrollY,
  ].join('|');
  const [innerScrollY] = useScrollY(tableContainerRef, scrollLayoutKey);

  const [config, setConfig] = useState<FaberTable.ColumnsProp<RecordType>[]>();

  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
  const [batchDeleting, setBatchDeleting] = useState(false);

  const rowKey = props.rowKey as string || keyName || 'id';

  useEffect(() => {
    setSelectedRowKeys([]);
  }, [get(props, 'pagination.total'), get(props, 'pagination.current'), get(props, 'pagination.pageSize')]);

  /**
   * 解析表格自定义配置
   * @return { parseColumns, scrollWidthX }
   * parseColumns 解析用户配置解析后的自定义字段配置
   * scrollWidthX 解析表格宽度
   */
  const { parseColumns, scrollWidthX } = useMemo(() => {
    // 表格字段配置
    // 解析自定义配置
    let parseColumns:FaberTable.ColumnsProp<RecordType>[] = [];
    if (config) {
      const currentColumnKeys = new Set(columns.map((c) => dataIndexToString(c.dataIndex)));
      // 仅合并当前仍存在的列，避免历史配置中的失效列进入 antd Table。
      const validConfig = config.filter((c) => {
        if (!c || c.dataIndex == null) return false;
        return currentColumnKeys.has(dataIndexToString(c.dataIndex));
      });
      const configColumnKeys = new Set(validConfig.map((c) => dataIndexToString(c.dataIndex)));

      // 保留远程配置中的顺序、显示状态和宽度。
      const configuredColumns = validConfig.map((c) => {
        const col = find(columns, (d) => dataIndexToString(d.dataIndex) === dataIndexToString(c.dataIndex));
        let width: number | undefined
        if (c.width && isNumber(c.width) && c.width > 0) {
          width = Number(c.width)
        }
        return { ...col, ...c, tcChecked: c.tcChecked === true, width };
      }).filter((c) => c.tcRequired || c.tcChecked);

      // 新增列追加到远程配置之后，并沿用列定义中的默认显示状态。
      const newColumns = columns.filter((c) =>
        !configColumnKeys.has(dataIndexToString(c.dataIndex)) && (c.tcRequired || c.tcChecked),
      );
      parseColumns = [...configuredColumns, ...newColumns];
    } else {
      // 取默认值
      parseColumns = columns.filter((c) => c.tcRequired || c.tcChecked);
    }

    if (showRowNum) {
      parseColumns = [
        {
          dataIndex: 'id',
          title: '序号',
          render: (_value:any, _record:any, index:any) => {
            // if (props.pagination) {
            //   const current = props.pagination.current || 1
            //   const pageSize = props.pagination.pageSize || 10
            //   return (current - 1) * pageSize + index + 1;
            // }
            return index + 1;
          },
          fixed: 'left',
          width: 80,
        },
        ...parseColumns,
      ]
    }

    // 计算table滚动width
    const scrollWidthX = sumBy(parseColumns, (n) => Number(n.width) || 200);

    return { parseColumns, scrollWidthX };
  }, [config, columns, showRowNum]);

  /** 表格配置变更 */
  function handleTableColConfigChange(tableColumns: FaberTable.ColumnsProp<RecordType>[]) {
    const currentColumnKeys = new Set(columns.map((c) => dataIndexToString(c.dataIndex)));
    setConfig(tableColumns.filter((col) => {
      if (!col || col.dataIndex == null) return false;
      return currentColumnKeys.has(dataIndexToString(col.dataIndex));
    }));
  }

  /** 批量删除Item */
  function handleBatchDelete() {
    Modal.confirm({
      title: '删除',
      content: `确认删除勾选中的 ${selectedRowKeys.length} 条数据？`,
      okText: '删除',
      okType: 'danger',
      onOk: () => {
        if (batchDelete) {
          setBatchDeleting(true);
          return batchDelete(selectedRowKeys)
            .then((res) => {
              setBatchDeleting(false);
              showResponse(res, '批量删除');
              refreshList();
            })
            .catch(() => setBatchDeleting(false));
        }
      },
    });
  }

  const myRowSelection: TableRowSelection<RecordType> = {
    fixed: true,
    selectedRowKeys,
    onChange: (rowKeys) => {
      updateRowKeys(rowKeys);
    },
    ...rowSelection,
    // columnWidth: 30,
  };

  function updateRowKeys(rowKeys: any[]) {
    setSelectedRowKeys(rowKeys);
    if (onSelectedRowsChange) {
      onSelectedRowsChange(rowKeys, (props.dataSource || []).filter((item) => rowKeys.indexOf(get(item, rowKey)) > -1));
    }
  }

  /**
   * delete all by current query condition
   */
  function handleDeleteQueryAll() {
    if (onDeleteByQuery) {
      onDeleteByQuery();
    }
  }

  return (
    <div style={{ flex: 1, minHeight: 0, minWidth: 0, position:'relative', overflow: 'hidden' }}>
      <div className="fa-flex-column fa-full-content" style={{ minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
        {showTopDiv && (
          <div className='fa-flex-row-center'>
            {topBtns}
            {/* 多选删除 */}
            {selectedRowKeys.length > 0 && (
              <div className='fa-flex-row-center' style={{height: 42, padding: '0 8px', gap: 8, lineHeight: '32px'}}>
                <div className="fa-text fa-mr12">
                  已选中&nbsp;<a>{selectedRowKeys.length}</a>&nbsp;条数据
                </div>
                {renderCheckBtns && renderCheckBtns(selectedRowKeys)}
                {showBatchDelBtn && (
                  <Button loading={batchDeleting} onClick={handleBatchDelete} icon={<DeleteOutlined/>} danger>
                    {batchDelBtn || '删除'}
                  </Button>
                )}
                <Button onClick={() => updateRowKeys([])} icon={<ClearOutlined/>}>
                  取消选中
                </Button>
              </div>
            )}
            {/* 高级组合查询 */}
            {selectedRowKeys.length === 0 && (
              <div className='fa-flex-row-center fa-flex-1' style={{height: 42, padding: '0 8px', gap: 8}}>
                {showComplexQuery && (
                  <ComplexQuery
                    columns={columns}
                    biz={biz}
                    onSceneChange={onSceneChange}
                    onConditionChange={onConditionChange}
                  />
                )}
                <div className="fa-text" style={{flex: 1}}>
                  {topSecondBtns}
                  {renderQuerySuffix &&  renderQuerySuffix()}
                  {querySuffix}
                </div>
                <div className='fa-flex-row-center' style={{marginRight: 8, lineHeight: '32px', gap: 8}}>
                  {renderQueryAll && renderQueryAll()}
                  {showDeleteByQuery && (
                    <Button danger onClick={() => handleDeleteQueryAll()} icon={<DeleteOutlined />}>
                      全部删除
                    </Button>
                  )}
                </div>
                <div className="fa-text" style={{lineHeight: '32px', fontSize: '0.85rem'}}>
                  共<a style={{fontWeight: 600, margin: '0 4px'}}>{props.pagination ? get(props, 'pagination.total') : props.dataSource?.length}</a>条数据
                </div>
              </div>
            )}
          </div>
        )}

        <FaFlexRestLayout ref={tableContainerRef} style={{ overflow: 'hidden' }}>
          <Table
            columns={parseColumns}
            rowSelection={showCheckbox ? myRowSelection : undefined}
            scroll={{x: scrollWidthX, y: innerScrollY ?? scrollY}}
            onRow={(record) => ({
              onClick: () => {
                // 点击row选中功能实现
                if (!rowClickSelected) return;
                const clickId = get(record, rowKey);
                let newRowKey = [];
                if (rowClickSingleSelected) {
                  newRowKey = [clickId];
                } else {
                  if (selectedRowKeys.indexOf(clickId) > -1) {
                    newRowKey = selectedRowKeys.filter((i) => i !== clickId);
                  } else {
                    newRowKey = [...selectedRowKeys, get(record, rowKey)];
                  }
                }
                setSelectedRowKeys(newRowKey);
                if (onSelectedRowsChange) {
                  onSelectedRowsChange(newRowKey, (props.dataSource || []).filter((item) => newRowKey.indexOf(get(item, rowKey)) > -1));
                }
              },
            })}
            size="small"
            showSorterTooltip={false}
            {...props}
          />
          {/* 表格自定义配置 */}
          {showTableColConfigBtn ? (
            <div style={{position: 'absolute', right: 4, top: 4, zIndex: 9}}>
              <TableColConfigModal columns={columns} biz={biz} onConfigChange={handleTableColConfigChange}>
                <Button icon={<SettingOutlined/>} type="text"/>
              </TableColConfigModal>
            </div>
          ) : null}
        </FaFlexRestLayout>
      </div>
    </div>
  );
}
