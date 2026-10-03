import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import { type AnimationEvent, cloneElement, isValidElement, type MouseEvent, type ReactNode, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './FaFullContentModal.css';

const MOTION_DURATION = 180;
const scrollLocks = new WeakMap<HTMLElement, { count: number; restore: () => void }>();

function lockScroll(element: HTMLElement, resetPosition = false) {
  let lock = scrollLocks.get(element);
  if (!lock) {
    const properties = ['overflow-x', 'overflow-y'];
    const originalStyles = properties.map((property) => ({
      property,
      value: element.style.getPropertyValue(property),
      priority: element.style.getPropertyPriority(property),
    }));
    const { scrollTop, scrollLeft } = element;
    for (const property of properties) element.style.setProperty(property, 'hidden');
    // 绝对定位的弹窗从容器原点铺满；打开时将背景滚动位置暂时归零。
    if (resetPosition) {
      element.scrollTop = 0;
      element.scrollLeft = 0;
    }
    lock = {
      count: 0,
      restore: () => {
        for (const { property, value, priority } of originalStyles) {
          if (value) element.style.setProperty(property, value, priority);
          else element.style.removeProperty(property);
        }
        if (resetPosition) {
          element.scrollTop = scrollTop;
          element.scrollLeft = scrollLeft;
        }
      },
    };
    scrollLocks.set(element, lock);
  }
  lock.count += 1;
  return () => {
    lock.count -= 1;
    if (lock.count === 0) {
      lock.restore();
      scrollLocks.delete(element);
    }
  };
}

export interface FaFullContentModalProps {
  /** content 覆盖当前 Tab 主体；fullscreen 覆盖整个浏览器视口。 */
  displayMode?: 'content' | 'fullscreen';
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
 * 默认覆盖当前 Tab 主体，也可覆盖整个视口；自动跟随调用方所在的 Tab 面板显隐。
 */
export default function FaFullContentModal({
  displayMode = 'content',
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
  const [tabVisible, setTabVisible] = useState(true);
  const [rendered, setRendered] = useState(false);
  const [closing, setClosing] = useState(false);

  useLayoutEffect(() => {
    const anchor = portalAnchorRef.current;
    if (!anchor) return;

    const tabPanel = anchor.closest<HTMLElement>('[data-fa-tab-panel]');
    setMountNode(
      displayMode === 'fullscreen'
        ? document.body
        : tabPanel ?? anchor.closest<HTMLElement>('.fa-main') ?? document.querySelector<HTMLElement>('.fa-main'),
    );
    if (displayMode !== 'fullscreen' || !tabPanel) {
      setTabVisible(true);
      return;
    }

    const updateTabVisible = () => setTabVisible(tabPanel.getAttribute('aria-hidden') !== 'true' && tabPanel.style.display !== 'none');
    updateTabVisible();
    const observer = new MutationObserver(updateTabVisible);
    observer.observe(tabPanel, { attributes: true, attributeFilter: ['aria-hidden', 'style'] });
    return () => observer.disconnect();
  }, [displayMode]);

  useLayoutEffect(() => {
    if (!rendered || !tabVisible || !mountNode) return;

    // 同一容器上的多层弹窗共享锁，保留退出动画期间的锁定状态。
    const unlock = displayMode === 'fullscreen'
      ? [lockScroll(document.documentElement), lockScroll(document.body)]
      : [lockScroll(mountNode, true)];
    return () => {
      for (const release of unlock) release();
    };
  }, [displayMode, rendered, tabVisible, mountNode]);

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
            style={{
              zIndex,
              overflow: 'hidden',
              ...(displayMode === 'fullscreen' ? { position: 'fixed', inset: 0, display: tabVisible ? undefined : 'none' } : {}),
            }}
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

            <div className="fa-full-content-modal-body fa-flex-1 fa-relative fa-p12 fa-bg-grey fa-scroll-auto-y" style={{ minHeight: 0, minWidth: 0 }}>
              {children}
            </div>
          </div>,
          mountNode,
        )}
    </>
  );
}
