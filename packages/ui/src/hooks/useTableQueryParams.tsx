
import {TablePaginationConfig} from "antd";
import {useEffect, useRef, useState} from "react";
import {get, hasIn, isEqual} from "lodash";
import {BaseTableUtils} from "@ui/components/base-table";
import {ConditionQuery, Fa} from "@ui/types";


export interface UseTableQueryParamsProps<T> {
  // // ------------------------------------------ 表格查询参数更新 ------------------------------------------
  queryParams: Fa.QueryParams;
  updateQueryParams: (updateParams: Fa.InitQueryParams) => void;
  setPagination: (pagination: Fa.Pagination) => void;
  setSorter: (sorter: Fa.Sorter) => void;
  setFormValues: (formValues: any) => void;
  setSceneId: (sceneId: string | undefined) => void;
  setFlowFormId: (flowFormId: string | number | undefined) => void;
  setConditionList: (conditionList: ConditionQuery.CondGroup[]) => void;
  setExtraParams: (extraParams: any) => void;
  handleTableChange: (paginationArg: TablePaginationConfig, filtersArg: any, sorterArg: any) => void;

  // ------------------------------------------ 表格查询结果输出 ------------------------------------------
  loading: boolean;
  list: T[];
  dicts: Fa.PageDict;
  fetchPageList: () => void;
  // ------------------------------------------ 表格查询结果更新 ------------------------------------------
  setList: (list: T[]) => void;
  // ------------------------------------------ 表格展示分页数据（与 queryParams.pagination 同源） ------------------------------------------
  showPagination: Fa.Pagination;
  // setShowPagination: any;
  // ------------------------------------------ 表格展示 ------------------------------------------
  paginationProps: TablePaginationConfig;
}

export interface tableHooks<T> {
  // ------------------------------------------ 表格方法钩子 ------------------------------------------
  onAfterGetPage: (list: T[]) => void;
}

const defaultPagination: Fa.Pagination = {
  current: 1,
  pageSize: 20,
  total: 0,
  pages: 0,
  startRow: 0,
  endRow: 0,
  hasPreviousPage: false,
  hasNextPage: false,
}

export default function useTableQueryParams<T>(
  api: (params: any) => Promise<Fa.Ret<Fa.Page<T>>>,
  initParams: Fa.InitQueryParams = {},
  serviceName: string,
  hooks?: tableHooks<T>
): UseTableQueryParamsProps<T> {
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  const [queryParams, setQueryParams] = useState<Fa.QueryParams>({
    sorter: {field: 'id', order: 'descend'}, // 排序
    formValues: {}, // 查询Form字段
    sceneId: undefined, // 场景ID
    conditionList: [], // 组合查询
    flowFormId: undefined, // 自定义表单ID
    ...initParams, // 自定义字段覆盖
    pagination: {
      ...defaultPagination,
      ...initParams?.pagination,
    }, // 表格分页
  });

  // 查询结果；分页状态统一保存在 queryParams.pagination 中。
  const [ret, setRet] = useState<{ list: T[]; dicts: Fa.PageDict }>({
    list: [], // 表格List
    dicts: {}, // 字典
  });

  useEffect(() => {
    fetchPageList();
  }, [
    // 分页返回的 total 等元数据只用于展示，不应触发重复查询。
    queryParams.pagination.current,
    queryParams.pagination.pageSize,
    queryParams.sorter,
    queryParams.formValues,
    queryParams.sceneId,
    queryParams.flowFormId,
    queryParams.conditionList,
    queryParams.extraParams,
  ]);

  // ------------------------------------------ 表格查询参数更新 ------------------------------------------
  function updateQueryParams(updateParams: Fa.InitQueryParams) {
    if (isEqual(queryParams, {...queryParams, ...updateParams})) return;
    setQueryParams({...queryParams, ...updateParams});
  }

  function setPagination(pagination: Fa.Pagination) {
    if (isEqual(queryParams.pagination, pagination)) return;
    setQueryParams({...queryParams, pagination: {...pagination}});
  }

  function setSorter(sorter: Fa.Sorter) {
    if (isEqual(queryParams.sorter, sorter)) return;
    setQueryParams({...queryParams, sorter});
  }

  /**
   * 更新表单字段，并设置分页为1
   * @param formValues
   */
  function setFormValues(formValues: any) {
    // if (isEqual(queryParams.formValues, formValues)) return;
    setQueryParams({...queryParams, pagination: {...queryParams.pagination, current: 1}, formValues});
  }

  function setSceneId(sceneId: string | undefined) {
    if (isEqual(queryParams.sceneId, sceneId)) return;
    setQueryParams({...queryParams, pagination: {...queryParams.pagination, current: 1}, sceneId});
  }

  function setFlowFormId(flowFormId: string | number | undefined) {
    if (isEqual(queryParams.flowFormId, flowFormId)) return;
    setQueryParams({...queryParams, pagination: {...queryParams.pagination, current: 1}, flowFormId});
  }

  function setConditionList(conditionList: ConditionQuery.CondGroup[]) {
    // console.log('setConditionList', conditionList)
    if (isEqual(queryParams.conditionList, conditionList)) return;
    setQueryParams({...queryParams, pagination: {...queryParams.pagination, current: 1}, conditionList});
  }

  function setExtraParams(extraParams: any) {
    if (isEqual(queryParams.extraParams, extraParams)) return;
    setQueryParams({...queryParams, pagination: {...queryParams.pagination, current: 1}, extraParams});
  }

  /** 表格事件处理：分页、过滤、排序 */
  function handleTableChange(paginationArg: TablePaginationConfig, _: any, sorterArg: any) {
    const newPagination: Fa.Pagination = {
      ...queryParams.pagination,
      current: paginationArg.current || 1,
      pageSize: paginationArg.pageSize || queryParams.pagination.pageSize || 10,
    };

    if (hasIn(sorterArg, 'field')) {
      const newSorter: Fa.Sorter = {field: get(sorterArg, 'field', ''), order: get(sorterArg, 'order')!};
      updateQueryParams({pagination: newPagination, sorter: newSorter});
    } else {
      setPagination(newPagination);
    }
  }

  // ------------------------------------------ 表格查询结果更新 ------------------------------------------
  /** 获取分页数据 */
  function fetchPageList() {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    // 表单中拆出_search关键字，用作搜索
    const { _search, ...restFormValues } = queryParams.formValues;
    const params = {
      current: queryParams.pagination.current,
      pageSize: queryParams.pagination.pageSize,
      sorter: BaseTableUtils.getSorter(queryParams.sorter),
      sceneId: queryParams.sceneId,
      flowFormId: queryParams.flowFormId,
      conditionList: queryParams.conditionList,
      search: _search,
      query: {
        ...restFormValues,
        // 外部补充查询条件
        ...queryParams.extraParams,
      },
    };
    api(params)
      .then((res) => {
        if (requestId !== requestIdRef.current) return;
        setLoading(false);
        const {pagination: page} = res.data;
        const pagination: Fa.Pagination = {
          current: Number(page.current),
          pageSize: Number(page.pageSize),
          total: Number(page.total),
          pages: Number(page.pages),
          startRow: Number(page.startRow),
          endRow: Number(page.endRow),
          hasPreviousPage: page.hasPreviousPage,
          hasNextPage: page.hasNextPage,
        };
        setQueryParams((currentQueryParams) => {
          if (isEqual(currentQueryParams.pagination, pagination)) return currentQueryParams;
          return {...currentQueryParams, pagination};
        });
        setRet({list: res.data.rows, dicts: res.data.dicts});
        if (hooks && hooks.onAfterGetPage) {
          hooks.onAfterGetPage(res.data.rows)
        }
      })
      .catch(() => {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      });
  }

  // ------------------------------------------ 表格展示 ------------------------------------------
  const paginationProps: TablePaginationConfig = {
    showSizeChanger: true,
    showQuickJumper: true,
    size: 'middle',
    showTotal: (total) => (
      <span>
        共<a style={{fontWeight: 600}}>{total}</a>个{serviceName}信息
      </span>
    ),
    onChange: (page, pageSize) => {
      setPagination({
        ...queryParams.pagination,
        current: page,
        pageSize: pageSize || queryParams.pagination.pageSize,
      });
    },
    pageSizeOptions: ['10', '20', '30', '50', '100', '500', '1000'],
    ...queryParams.pagination,
  };

  /**
   * 外部手动更新list，适用于减少网络请求
   * @param list
   */
  function setList(list: T[]) {
    setRet({list, dicts: ret.dicts});
  }

  return {
    queryParams,
    updateQueryParams,
    setPagination,
    setSorter,
    setFormValues,
    setSceneId,
    setFlowFormId,
    setConditionList,
    setExtraParams,
    handleTableChange,
    fetchPageList,
    loading,
    list: ret.list,
    dicts: ret.dicts,
    setList,
    showPagination: queryParams.pagination,
    paginationProps,
  };
}
