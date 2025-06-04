import React, { createContext, ReactNode, useEffect, useState } from 'react';
import {Drawer, DrawerProps} from "antd";
import { FaResizeHorizontal } from "@ui/components";

export interface BaseDrawerContextProps {
  closeDrawer: () => void;
}

export const BaseDrawerContext = createContext<BaseDrawerContextProps>({ closeDrawer: () => {} });

export interface BaseDrawerProps extends DrawerProps {
  hideResize?: boolean;
  triggerDom?: ReactNode;
}

/**
 * @author xu.pengfei
 * @date 2022/12/28 10:41
 */
export default function BaseDrawer({children, hideResize = false, triggerDom, bodyStyle, onClose, ...props }: BaseDrawerProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const dom = document.getElementById("fa-drawer")
      if (dom) {
        dom.parentElement?.setAttribute("id", "fa-drawer-content")
      }
    }
  }, [open])

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
          id="fa-drawer"
          {...props}
        >
          {(open || props.forceRender) && (
            <>
              {!hideResize && <FaResizeHorizontal domId="fa-drawer-content" position="left" style={{left: 0}} minWidth={200} />}
              {children}
            </>
          )}
        </Drawer>
      </span>
    </BaseDrawerContext.Provider>
  )
}
