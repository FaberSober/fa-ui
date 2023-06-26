import {useState} from "react";
import {BaseTableUtils} from "@ui/components/base-table";
import {Fa} from "@ui/types";
import {Modal} from "antd";


/**
 * 导出Excel
 * @param exportApi 导出API
 * @param queryParams 表格查询参数
 */
export default function useExport(
  exportApi: (params: any) => Promise<undefined>,
  queryParams: Fa.QueryParams,
): [exporting: boolean, fetchExportExcel: () => void] {
  const [exporting, setExporting] = useState(false);

  /** 导出Excel文件 */
  function fetchExportExcel() {
    Modal.confirm({
      title: '确认导出？',
      onOk: () => {
        setExporting(true);
        const params = {
          sorter: BaseTableUtils.getSorter(queryParams.sorter),
          sceneId: queryParams.sceneId,
          conditionList: queryParams.conditionList,
          query: {
            ...queryParams.formValues,
            // 外部补充查询条件
            ...queryParams.extraParams,
          },
        };
        return exportApi(params)
          .then(() => setExporting(false))
          .catch(() => setExporting(false));
      }
    })
  }

  return [exporting, fetchExportExcel];
}