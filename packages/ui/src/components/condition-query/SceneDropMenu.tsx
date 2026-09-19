import React, {useEffect, useImperativeHandle, useMemo, useRef, useState} from 'react';
import {find} from 'lodash';
import {Button, Dropdown} from 'antd';
import {DownOutlined, SettingOutlined} from '@ant-design/icons';
import SceneManageModal from '@ui/components/condition-query/SceneManageModal';
import {Admin} from '@ui/types';
import {FaberTable} from '@ui/components/base-table';
import {configSceneApi} from '@ui/services/base';

const allSceneLabel = '全部数据';

export interface SceneDropMenuProps<T> {
  biz: string;
  columns: FaberTable.ColumnsProp<T>[];
  onChange: (key: string, label: string) => void;
}

/**
 * 场景下拉菜单组件
 */
const SceneDropMenu = React.forwardRef<HTMLElement, SceneDropMenuProps<any>>(function SceneDropMenu<T>({ biz, columns, onChange }: SceneDropMenuProps<T>, ref: any) {
  const manageModalRef = useRef<any | null>(null);

  const [configList, setConfigList] = useState<Admin.ConfigScene[]>([]);
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [value, setValue] = useState<string>('0');
  const [label, setLabel] = useState<string>(allSceneLabel);
  const [sceneLoading, setSceneLoading] = useState(false);
  const currentBizRef = useRef(biz);
  const loadedBizRef = useRef<string | undefined>(undefined);
  const configListRef = useRef<Admin.ConfigScene[]>([]);
  const requestRef = useRef<{ biz: string; promise: Promise<Admin.ConfigScene[]> } | undefined>(undefined);

  currentBizRef.current = biz;

  useImperativeHandle(ref, () => ({
    refreshConfigList: () => refreshConfigList(true),
  }));

  function refreshConfigList(force = false): Promise<Admin.ConfigScene[]> {
    const requestBiz = biz;
    if (!requestBiz) {
      loadedBizRef.current = requestBiz;
      configListRef.current = [];
      setConfigList([]);
      return Promise.resolve([]);
    }

    if (!force && loadedBizRef.current === requestBiz) {
      return Promise.resolve(configListRef.current);
    }

    if (requestRef.current?.biz === requestBiz) {
      return requestRef.current.promise;
    }

    setSceneLoading(true);
    const request = configSceneApi.findAllScene({ biz: requestBiz })
      .then((res) => {
        const list = res.data || [];
        if (currentBizRef.current === requestBiz) {
          configListRef.current = list;
          loadedBizRef.current = requestBiz;
          setConfigList(list);
        }
        return list;
      })
      .catch(() => {
        // 请求失败不标记为已加载，下一次展开时可以重试。
        return [];
      })
      .finally(() => {
        if (requestRef.current?.promise === request) {
          requestRef.current = undefined;
          setSceneLoading(false);
        }
      });
    requestRef.current = { biz: requestBiz, promise: request };
    return request;
  }

  useEffect(() => {
    loadedBizRef.current = undefined;
    configListRef.current = [];
    setConfigList([]);
    setValue('0');
    setLabel(allSceneLabel);
  }, [biz]);

  function handleMenuClick(e: any) {
    const { key } = e;

    if (key === 'setting') {
      setManageModalVisible(true);
      if (manageModalRef) manageModalRef.current.fetchRemoteConfig();
      return;
    }

    let newLabel;
    if (key === '0') {
      newLabel = allSceneLabel;
    } else {
      const config = find(configList, (c) => `${c.id}` === key);
      newLabel = config?.name;
    }
    setLabel(newLabel!);
    setValue(`${key}`);
    if (onChange) onChange(`${key}`, newLabel!);
  }

  const items = useMemo(() => {
    const items: any[] = [{ key: '0', label: allSceneLabel }];
    items.push(...configList.filter((n) => !n.hide).map((i) => ({ label: i.name, key: i.id })));
    items.push({ type: 'divider' });
    items.push({ key: 'setting', label: '管理', icon: <SettingOutlined /> });
    return items;
  }, [configList]);

  return (
    <div>
      <Dropdown
        menu={{ items, onClick: handleMenuClick, selectedKeys: [value] }}
        trigger={['click']}
        onOpenChange={(open) => {
          if (open) void refreshConfigList();
        }}
      >
        <Button loading={sceneLoading} icon={<DownOutlined />} type="text" style={{ paddingLeft: 1, paddingRight: 1 }}>{label}</Button>
      </Dropdown>
      <SceneManageModal
        ref={manageModalRef}
        biz={biz}
        columns={columns as any[]}
        fetchConfigList={refreshConfigList}
        open={manageModalVisible}
        onOk={() => {
          void refreshConfigList(true);
          setManageModalVisible(false);
        }}
        onCancel={() => setManageModalVisible(false)}
      />
    </div>
  );
})

export default SceneDropMenu;
