import React, {useState} from 'react';
import {FaFlexRestLayout, FaLazyContainer} from "@fa/ui";
import {Menu, MenuProps} from "antd";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import All from './alls'
import Recent from './recent'
import Recycle from './recycle'
import Tags from "./tags";
import BucketSelBtn from "@/layout/disk/cube/BucketSelBtn";


/**
 * @author xu.pengfei
 * @date 2022/12/27 11:11
 */
export default function index() {
  const [activeKey, setActiveKey] = useState<string>("all");

  const items: MenuProps['items'] = [
    {
      label: '全部文件',
      key: 'all',
      icon: <FontAwesomeIcon icon={"fa-solid fa-box-archive" as any} />,
    },
    {
      label: '最近文件',
      key: 'recent',
      icon: <FontAwesomeIcon icon={"fa-solid fa-clock" as any} />,
    },
    {
      label: '文件标签',
      key: 'tags',
      icon: <FontAwesomeIcon icon={"fa-solid fa-tags" as any} />,
    },
    {
      label: '回收站',
      key: 'recycle',
      icon: <FontAwesomeIcon icon={"fa-solid fa-trash-can" as any} />,
    },
  ]

  return (
    <div className="fa-full-content fa-bg-white fa-flex-row">
      <div style={{width: 140}}>
        <BucketSelBtn/>
        <Menu items={items} selectedKeys={[activeKey]} onSelect={({key}) => setActiveKey(key)} style={{height: '100%'}} />
      </div>

      <FaFlexRestLayout>
        <FaLazyContainer showCond={activeKey === 'all'} ><All /></FaLazyContainer>
        <FaLazyContainer showCond={activeKey === 'recent'} ><Recent /></FaLazyContainer>
        <FaLazyContainer showCond={activeKey === 'tags'} ><Tags /></FaLazyContainer>
        <FaLazyContainer showCond={activeKey === 'recycle'} ><Recycle /></FaLazyContainer>
      </FaFlexRestLayout>
    </div>
  )
}
