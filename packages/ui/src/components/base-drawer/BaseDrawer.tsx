import React, { createContext, ReactNode, useEffect, useImperativeHandle, useState } from 'react';
import { Drawer, DrawerProps } from "antd";
import { FaResizeHorizontal } from "@ui/components";
import { FaUtils } from "@ui/utils";
import { BaseDrawerContext } from './BaseDrawerContext';
import useBus from "use-bus";

export interface BaseDrawerProps extends Omit<DrawerProps, 'bodyStyle'> {
  hideResize?: boolean;
  triggerDom?: ReactNode;
  bodyStyle?: React.CSSProperties;
}

// Ant Design Table's fixed-column shadows derive their z-index from the
// column count, so keep the resize handle above that dynamic layer.
const DRAWER_DRAGGER_Z_INDEX = 10_000;

/**
 * @author xu.pengfei
 * @date 2022/12/28 10:41
 */
const BaseDrawer = React.forwardRef<HTMLElement, BaseDrawerProps>(function BaseDrawer(
  { children, hideResize = false, triggerDom, bodyStyle, onClose, size: outSize, styles: drawerStyles, ...props }: BaseDrawerProps,
  ref: any,
) {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState(outSize || 700);

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
  }));

  useBus(
    ['@@action/CLOSE_DRAWER'],
    ({ type, payload }) => {
      setOpen(false)
    },
    [],
  )

  return (
    <BaseDrawerContext.Provider value={{ closeDrawer: () => setOpen(false) }}>
      <span>
        <span onClick={() => setOpen(true)}>{triggerDom}</span>
        <Drawer
          title="查看详情"
          open={open}
          onClose={(e) => {
            setOpen(false)
            if (onClose) onClose(e)
          }}
          size={size}
          resizable={{
            onResize: (newSize) => setSize(newSize),
          }}
          className="fa-ant-drawer-body0"
          mask={{ enabled: true, blur: false }}
          {...props}
          styles={(info) => {
            const resolvedStyles = typeof drawerStyles === 'function' ? drawerStyles(info) : drawerStyles;

            return {
              ...resolvedStyles,
              dragger: {
                ...resolvedStyles?.dragger,
                zIndex: DRAWER_DRAGGER_Z_INDEX,
              },
            };
          }}
        >
          {(open || props.open || props.forceRender) && (
            <>
              <div className="fa-full">
                <div className="fa-full-content fa-scroll fa-p12" style={{ ...bodyStyle }}>
                  {children}
                </div>
              </div>
            </>
          )}
        </Drawer>
      </span>
    </BaseDrawerContext.Provider>
  )
})

export default BaseDrawer
