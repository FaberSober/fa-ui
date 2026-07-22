import React, { ReactNode } from 'react';
import { Tooltip } from 'antd';


export interface FaLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  icon?: ReactNode;
  text?: string;
  disabled?: boolean;
  tooltip?: string;
}

/**
 * @author xu.pengfei
 * @date 2022/1/10 11:29
 */
const FaHref = React.forwardRef<HTMLAnchorElement, FaLinkProps>(({
  icon,
  text,
  onClick,
  color,
  style,
  disabled,
  tooltip,
  className,
  ...anchorProps
}, ref) => {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  }

  const link = (
    <a
      {...anchorProps}
      ref={ref}
      onClick={handleClick}
      aria-disabled={disabled || undefined}
      style={{ color, ...style }}
      className={[disabled ? 'fa-link-btn-disabled' : 'fa-link-btn', className].filter(Boolean).join(' ')}
    >
      {icon}
      {text}
    </a>
  );

  return tooltip ? (
    <Tooltip title={tooltip}>
      {link}
    </Tooltip>
  ) : link;
});

FaHref.displayName = 'FaHref';

export default FaHref;
