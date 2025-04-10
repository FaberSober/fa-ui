import React, { useCallback } from "react";
import { FaUtils } from "@ui/utils";


let drag = false;
let deltaX = 0;
let startX = 0;
let initWidth = 0;
let dom:HTMLElement|null = null;

export interface FaResizeHorizontalProps {
  domId: string;
  /** handle在拉升组件的左侧还是右侧 */
  position: 'left' | 'right';
  minWidth?: number;
  maxWidth?: number;
  children?: React.ReactNode;
}

/**
 * resize element horizontal
 * @param domId
 * @param position
 * @param minWidth
 * @param maxWidth
 * @param children
 * @constructor
 */
export default function FaResizeHorizontal({ domId, position, minWidth, maxWidth, children }: FaResizeHorizontalProps) {

  const mouseMoveListener:any = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!drag) return;
    e.preventDefault();
    e.stopPropagation();
    // console.log('onMouseMove', e)
    deltaX = (e.clientX - startX);
    if (position === 'left') { // 在组件左侧，取负值
      deltaX = -deltaX;
    }
    let width = initWidth + deltaX;
    if (minWidth && width < minWidth) {
      width = minWidth
    }
    if (maxWidth && width > maxWidth) {
      width = maxWidth;
    }
    if (dom) {
      dom.style.width = width + 'px'
    }
  }, [minWidth, maxWidth])

  const mouseUpListener = useCallback(() => {
    drag = false
    window.removeEventListener('mousemove', mouseMoveListener)
    window.removeEventListener('mouseup', mouseUpListener)
  }, [])

  return (
    <div
      style={{position: 'absolute', top: '50%', left: -10, resize: 'horizontal', cursor: 'col-resize'}}
      onMouseDown={(e) => {
        drag = true
        startX = e.clientX;
        deltaX = 0
        dom = document.getElementById(domId)
        initWidth = FaUtils.getDomRectById(domId)!.width
        window.addEventListener('mousemove', mouseMoveListener)
        window.addEventListener('mouseup', mouseUpListener)
      }}
    >
      {children}
    </div>
  )
}
