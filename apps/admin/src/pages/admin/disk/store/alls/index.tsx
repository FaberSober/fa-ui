import React, {useContext, useEffect, useState} from 'react';
import StoreDirPath from '@/pages/admin/disk/store/alls/cube/StoreDirPath';
import {Button, Checkbox, Dropdown, Input, Modal, Select, Space, Table, Tag, TreeSelect} from 'antd';
import {DiskContext} from '@/layout/disk/context';
import {Disk} from '@/types';
import {storeFileApi, storeFileTagApi} from '@/services/disk';
import {Fa, FaHref, FaUtils} from '@fa/ui';
import {DownloadOutlined, EllipsisOutlined} from '@ant-design/icons';
import {showResponse, sizeToHuman} from '@/utils/utils';
import StoreDirModal from '@/pages/admin/disk/store/alls/modal/StoreDirModal';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {ColumnsType} from "antd/es/table";
import StoreUploadFile from "@/pages/admin/disk/store/alls/cube/StoreUploadFile";
import {isNil, trim} from "lodash";
import StoreFileMoveToModal from "@/pages/admin/disk/store/alls/modal/StoreFileMoveToModal";
import {ApiEffectLayoutContext} from "@/layout/ApiEffectLayout";
import StoreFileCopyToModal from "@/pages/admin/disk/store/alls/modal/StoreFileCopyToModal";
import {fileSaveApi} from "@/services/admin";
import StoreFileTagsModal from "@/pages/admin/disk/store/alls/modal/StoreFileTagsModal";
import StoreTagTreeSelect from "@/pages/admin/disk/store/tags/helper/StoreTagTreeSelect";


/**
 * 网盘-全部文件
 * @author xu.pengfei
 * @date 2022/12/22 10:39
 */
export default function index() {
  const {bucket} = useContext(DiskContext);
  const {loadingEffect} = useContext(ApiEffectLayoutContext);
  const [loaded, setLoaded] = useState<boolean>(false);

  const [dirId, setDirId] = useState(Fa.Constant.TREE_SUPER_ROOT_ID); // 当前选中的文件夹ID
  const [dirs, setDirs] = useState<Fa.TreeNode<Disk.StoreFile, number>[]>([]);
  const [array, setArray] = useState<Disk.StoreFile[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
  const [search, setSearch] = useState<string>('');
  const [recursive, setRecursive] = useState<boolean>(true);
  const [tagQueryType, setTagQueryType] = useState<number>(1);
  const [tagIds, setTagIds] = useState<number[]>([]);

  useEffect(() => {
    if (dirId !== Fa.Constant.TREE_SUPER_ROOT_ID) {
      setDirId(Fa.Constant.TREE_SUPER_ROOT_ID);
    } else {
      if (!loaded) {
        setLoaded(true)
        return;
      }
      refreshDir();
    }
  }, [bucket]);

  useEffect(() => {
    refreshDir();
  }, [dirId, tagQueryType, tagIds]);

  function refreshDir() {
    setSelectedRowKeys([])
    // setSearch('')

    const params = {
      query: {
        bucketId: bucket.id,
        parentId: dirId,
        tagQueryType,
        tagIds,
        fullPath: '',
        name: '',
      },
      sorter: "dir DESC, name ASC"
    }
    if (trim(search) !== '' || tagIds.length > 0) {
      params.query.fullPath = recursive ? ['#全部文件#', ...dirs.map(i => `#${i.name}#`)].join(',') : '';
      params.query.name = trim(search);
      params.query.parentId = undefined!;
    }
    storeFileApi.queryFile(params).then(res => {
      setArray(res.data)
    })
  }

  function fetchSearch() {
    refreshDir()
  }

  function handleIntoDir(r: Disk.StoreFile) {
    setDirId(r.id);
  }

  function handleBatchDownload() {
    if (isNil(selectedRowKeys) || selectedRowKeys.length === 0) return;

    storeFileApi.downloadZip(selectedRowKeys)
  }

  function handleBatchDelete() {
    if (isNil(selectedRowKeys) || selectedRowKeys.length === 0) return;

    Modal.confirm({
      title: '删除',
      content: `确认删除勾选中的 ${selectedRowKeys.length} 条数据？`,
      okText: '删除',
      okType: 'danger',
      onOk: async (close) => {
        storeFileApi.removeBatchByIds(selectedRowKeys).then((res) => {
          showResponse(res, '批量删除');
          refreshDir();
          close();
        })
      },
    });
  }

  function handleRemoveTagLink(linkId: number) {
    storeFileTagApi.remove(linkId).then(res => {
      showResponse(res, '删除标签')
      refreshDir()
    })
  }

  const columns = [
    {
      dataIndex: 'name',
      title: '文件名',
      render: (_, r: Disk.StoreFile) => {
        if (r.dir)
          return (
            <div className="fa-flex-row-center">
              <a className="fa-flex-row-center" onClick={() => handleIntoDir(r)} style={{color: '#333'}}>
                <FontAwesomeIcon icon={'fa-solid fa-folder' as any} className="fa-mr8"/>
                <div>{r.name}</div>
              </a>
            </div>
          );
        const isImg = FaUtils.isImg(r.type)
        return (
          <div className="fa-flex-row-center">
            <a className="fa-flex-row-center" style={{color: '#333'}}>
              {isImg && <img src={fileSaveApi.genLocalGetFilePreview(r.fileId)} style={{width: 20, height: 20, marginRight: 2}}
                             alt={r.name}/>}
              <div>{r.name}</div>
            </a>
          </div>
        );
      },
    },
    {
      dataIndex: 'tags',
      title: '标签',
      width: 300,
      render: (_, record) => {
        if (isNil(record.tags)) return null;
        return (
          <div className="fa-flex-row-center">
            {record.tags.map(i => <Tag key={i.id} color={i.color} closable onClose={() => handleRemoveTagLink(i.id)}>{i.name}</Tag>)}
          </div>
        );
      },
    },
    {
      dataIndex: 'size',
      title: '大小',
      width: 100,
      render: (_, record) => {
        if (record.dir) {
          return `${record.size}项`
        }
        return sizeToHuman(record.size * 1024);
      },
    },
    {dataIndex: 'crtName', title: '创建者', width: 100},
    {dataIndex: 'crtTime', title: '更新时间', width: 160},
    {
      title: '操作',
      dataIndex: 'menu',
      render: (_, r: Disk.StoreFile) => {
        const items = [
          {
            key: '1',
            label: (
              <StoreDirModal record={r} dirId={dirId} title="重命名" fetchFinish={refreshDir}>
                <a>
                  <div>重命名</div>
                </a>
              </StoreDirModal>
            ),
          },
          // {
          //   key: '4',
          //   danger: true,
          //   label: '删除',
          // },
        ];
        return (
          <Space>
            <Dropdown menu={{items}} trigger={['click']}>
              <FaHref icon={<EllipsisOutlined/>} text="更多"/>
            </Dropdown>
            {/*<AuthDelBtn handleDelete={() => handleDeleteItem(r)} />*/}
          </Space>
        )
      },
      width: 80,
      fixed: 'right',
    },
  ] as ColumnsType<Disk.StoreFile>

  const loadingDir = loadingEffect[storeFileApi.getUrl('queryFile')];
  const loadingDownloadZip = loadingEffect[storeFileApi.getUrl('downloadZip')];
  const loadingRemoveBatchByIds = loadingEffect[storeFileApi.getUrl('removeBatchByIds')];
  return (
    <div className="fa-full-content fa-bg-white">
      <div className="fa-flex-row-center fa-p8 fa-border-b">
        <Space className="fa-flex-1">
          <StoreDirPath dirId={dirId} onClick={setDirId} onGetDirs={setDirs}/>
          <Input.Group compact style={{display:'flex'}}>
            <Select
              value={recursive}
              onChange={(v) => setRecursive(v)}
              options={[
                {label: '及联查询', value: true},
                {label: '当前目录', value: false},
              ]}
            />
            <Input.Search
              style={{flex:1}}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onSearch={fetchSearch}
              placeholder="请输入名称"
            />
          </Input.Group>

          <Input.Group compact>
            <Select
              value={tagQueryType}
              onChange={(v) => setTagQueryType(v)}
              options={[
                {label: '同时满足', value: 1},
                {label: '满足其一', value: 2},
              ]}
            />
            <StoreTagTreeSelect
              value={tagIds}
              onChange={v => setTagIds(v)}
              multiple
              showCheckedStrategy={TreeSelect.SHOW_ALL}
              style={{flex:1, minWidth: 200}}
            />
          </Input.Group>
        </Space>

        <Space>
          <StoreDirModal title="新建目录" dirId={dirId} addBtn fetchFinish={refreshDir}/>
          <StoreUploadFile dirId={dirId} onSuccess={refreshDir}/>
        </Space>
      </div>

      {/* selected rows */}
      {selectedRowKeys.length > 0 && (
        <Space style={{height: 39, padding: '0 8px'}}>
          <Checkbox
            indeterminate={selectedRowKeys.length < array.length}
            checked={selectedRowKeys.length === array.length}
            onChange={() => {
              if (selectedRowKeys.length < array.length) {
                setSelectedRowKeys(array.map(i => i.id))
              } else {
                setSelectedRowKeys([])
              }
            }}
          >
            <span style={{marginLeft: 6}}>已选<a style={{margin: '0 4px'}}>{selectedRowKeys.length}</a>项</span>
          </Checkbox>
          <Button onClick={handleBatchDownload} loading={loadingDownloadZip} icon={<DownloadOutlined/>}>打包下载</Button>
          <StoreFileTagsModal fileIds={selectedRowKeys} fetchFinish={refreshDir} />
          <StoreFileMoveToModal fileIds={selectedRowKeys} fetchFinish={refreshDir} />
          <StoreFileCopyToModal fileIds={selectedRowKeys} fetchFinish={refreshDir} />
          <Button onClick={handleBatchDelete} loading={loadingRemoveBatchByIds} danger>删除</Button>
          <Button onClick={() => setSelectedRowKeys([])}>取消</Button>
        </Space>
      )}

      {/* Dir & File List */}
      <div>
        <Table
          loading={loadingDir}
          rowKey={(r: Disk.StoreFile) => r.id}
          dataSource={array}
          columns={columns}
          pagination={false}
          size="small"
          showHeader={selectedRowKeys.length === 0}
          rowSelection={{
            selectedRowKeys: selectedRowKeys,
            onChange: (ks) => {
              setSelectedRowKeys(ks)
            },
          }}
        />
      </div>
    </div>
  );
}
