import React, { HTMLAttributes } from 'react';

/**
 * @author xu.pengfei
 * @date 2021/11/29 14:48
 */
const FaFlexRestLayout = React.forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function FaFlexRestLayout(
  { children, style, ...props },
  ref,
) {
  return (
    <div className="fa-flex-1 fa-relative" style={{ minHeight: 0, minWidth: 0 }}>
      <div ref={ref} className="fa-full-content" style={{ overflowY: 'auto', ...style }} {...props}>
        {children}
      </div>
    </div>
  );
});

export default FaFlexRestLayout;
