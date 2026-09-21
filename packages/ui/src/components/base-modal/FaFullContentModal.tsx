import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import { type AnimationEvent, cloneElement, isValidElement, type MouseEvent, type ReactNode, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './FaFullContentModal.css';

const MOTION_DURATION = 180;

export interface FaFullContentModalProps {
  title?: ReactNode;
  children?: ReactNode;
  triggerDom?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOk?: () => void;
  onCancel?: () => void;
  okText?: ReactNode;
  confirmLoading?: boolean;
  cancelText?: ReactNode;
  showOk?: boolean;
  showCancel?: boolean;
  headerCenter?: ReactNode;
  headerExtra?: ReactNode;
  zIndex?: number;
}

type TriggerElementProps = {
  onClick?: (event: MouseEvent<HTMLElement>) => void;
};

/**
 * 覆盖 MenuLayout .fa-main 主体区域的大面积弹框，并自动跟随调用方所在的 Tab 面板。
 */
export default function FaFullContentModal({
  title,
  children,
  triggerDom,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onOk,
  onCancel,
  okText = '提交',
  confirmLoading = false,
  cancelText = '取消',
  showOk = true,
  showCancel = true,
  headerCenter,
  headerExtra,
  zIndex = 999,
}: FaFullContentModalProps) {
  const [openInternal, setOpenInternal] = useState(defaultOpen);
  const open = openProp ?? openInternal;
  const portalAnchorRef = useRef<HTMLSpanElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [rendered, setRendered] = useState(false);
  const [closing, setClosing] = useState(false);

  useLayoutEffect(() => {
    const anchor = portalAnchorRef.current;
    if (!anchor) return;

    const nextMountNode =
      anchor.closest<HTMLElement>('[data-fa-tab-panel]') ?? anchor.closest<HTMLElement>('.fa-main') ?? document.querySelector<HTMLElement>('.fa-main');
    setMountNode(nextMountNode);
  }, []);

  useLayoutEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
      return;
    }

    if (!rendered) return;

    setClosing(true);
    const timer = window.setTimeout(() => setRendered(false), MOTION_DURATION);
    return () => window.clearTimeout(timer);
  }, [open, rendered]);

  const updateOpen = useCallback(
    (nextOpen: boolean) => {
      if (openProp === undefined) {
        setOpenInternal(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [onOpenChange, openProp],
  );

  const handleOpen = useCallback(() => {
    updateOpen(true);
  }, [updateOpen]);

  const handleCancel = useCallback(() => {
    updateOpen(false);
    onCancel?.();
  }, [onCancel, updateOpen]);

  const handleOk = useCallback(() => {
    if (onOk) {
      onOk();
      return;
    }
    updateOpen(false);
  }, [onOk, updateOpen]);

  const handleAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget && closing && !open) {
        setRendered(false);
      }
    },
    [closing, open],
  );

  const trigger = isValidElement<TriggerElementProps>(triggerDom)
    ? cloneElement(triggerDom, {
        onClick: (event) => {
          triggerDom.props.onClick?.(event);
          handleOpen();
        },
      })
    : triggerDom && (
        <Button type="link" onClick={handleOpen}>
          {triggerDom}
        </Button>
      );

  return (
    <>
      <span ref={portalAnchorRef} aria-hidden="true" style={{ display: 'none' }} />
      {trigger}
      {rendered &&
        mountNode &&
        createPortal(
          <div
            className={`fa-full-content fa-bg-white fa-flex-column fa-full-content-modal ${closing ? 'fa-full-content-modal--exit' : 'fa-full-content-modal--enter'}`}
            style={{ zIndex, overflow: 'hidden' }}
            onAnimationEnd={handleAnimationEnd}
          >
            <div className={`fa-full-content-modal-header fa-flex-row-center fa-border-b fa-p12 ${headerCenter ? 'fa-full-content-modal-header--centered' : ''}`} style={{ flex: '0 0 auto', minWidth: 0 }}>
              <Space className="fa-full-content-modal-heading" style={{ flex: '0 0 auto' }}>
                <Button color="default" variant="text" onClick={handleCancel} icon={<ArrowLeftOutlined />} aria-label="返回" />
                <div className="fa-h3">{title}</div>
              </Space>
              <div className="fa-full-content-modal-center fa-flex-1 fa-flex-center" style={{ minWidth: 0 }}>
                {headerCenter}
              </div>
              <Space className="fa-full-content-modal-actions" style={{ flex: '0 0 auto' }}>
                {headerExtra}
                {showOk && (
                  <Button type="primary" loading={confirmLoading} onClick={handleOk}>
                    {okText}
                  </Button>
                )}
                {showCancel && <Button onClick={handleCancel}>{cancelText}</Button>}
              </Space>
            </div>

            <div className="fa-flex-1 fa-relative fa-p12 fa-bg-grey fa-scroll-auto-y" style={{ minHeight: 0, minWidth: 0 }}>
              {children}
            </div>
          </div>,
          mountNode,
        )}
    </>
  );
}
