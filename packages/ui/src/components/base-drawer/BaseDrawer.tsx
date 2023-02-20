import React, {ReactNode, useState} from 'react';
import {Drawer, DrawerProps} from "antd";


export interface BaseDrawerProps extends DrawerProps {
  triggerDom?: ReactNode;
}

/**
 * @author xu.pengfei
 * @date 2022/12/28 10:41
 */
export default function BaseDrawer({children, triggerDom, ...props }: BaseDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <span>
      <span onClick={() => setOpen(true)}>{triggerDom}</span>
      <Drawer title="查看详情" open={open} onClose={() => setOpen(false)} width={700} {...props}>
        {open && children}
      </Drawer>
    </span>
  )
}