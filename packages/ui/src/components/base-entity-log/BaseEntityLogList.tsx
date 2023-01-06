import React, {useEffect, useState} from 'react';
import {Timeline} from 'antd';
import useBus from 'use-bus';
import {Admin, FaEnums} from '@ui/types';
import {entityLogApi} from '@ui/services';
import UpdateLogTable from './UpdateLogTable';


export interface BaseEntityLogListProps {
  bizId: any;
  bizType: string;
}

const ITEM_COLOR = {
  [FaEnums.EntityLogActionEnum.ADD]: 'green',
  [FaEnums.EntityLogActionEnum.UPDATE]: 'blue',
  [FaEnums.EntityLogActionEnum.DEL]: 'red',
};

/**
 * @author xu.pengfei
 * @date 2022/10/13
 */
export default function BaseEntityLogList({ bizId, bizType }: BaseEntityLogListProps) {
  const [list, setList] = useState<Admin.EntityLog[]>([]);

  useBus(
    [`@@api/UPDATE_ENTITY_LOG/${bizType}/${bizId}`],
    () => {
      fetchData();
    },
    [bizId, bizType],
  );

  useEffect(() => {
    fetchData();
  }, [bizId, bizType]);

  function fetchData() {
    entityLogApi.list({ query: { bizId, bizType }, sorter: 'id DESC' }).then((res) => setList(res.data));
  }

  return (
    <Timeline>
      {list.map((i) => {
        return (
          <Timeline.Item key={i.id} color={ITEM_COLOR[i.action]}>
            <div>
              {i.crtTime} / {i.crtName} / {FaEnums.EntityLogActionEnumMap[i.action]}
            </div>
            {i.action === FaEnums.EntityLogActionEnum.UPDATE && <UpdateLogTable content={i.content} />}
          </Timeline.Item>
        );
      })}
    </Timeline>
  );
}
