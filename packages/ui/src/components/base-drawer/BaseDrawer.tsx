import React, {createContext, ReactNode, useState} from 'react';
import {Drawer, DrawerProps} from "antd";

export interface BaseDrawerContextProps {
  closeDrawer: () => void;
}

export const BaseDrawerContext = createContext<BaseDrawerContextProps>({ closeDrawer: () => {} });

export interface BaseDrawerProps extends DrawerProps {
  triggerDom?: ReactNode;
}

/**
 * @author xu.pengfei
 * @date 2022/12/28 10:41
 */
export default function BaseDrawer({children, triggerDom, bodyStyle, onClose, ...props }: BaseDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <BaseDrawerContext.Provider value={{closeDrawer: () => setOpen(false)}}>
      <span>
        <span onClick={() => setOpen(true)}>{triggerDom}</span>
        <Drawer
          title="查看详情"
          open={open}
          onClose={(e) => {
            setOpen(false)
            if (onClose) onClose(e)
          }}
          width={700}
          styles={{ body: { position: 'relative', ...bodyStyle } }}
          {...props}
        >
          {(open || props.forceRender) && children}
        </Drawer>
      </span>
    </BaseDrawerContext.Provider>
  )
}
