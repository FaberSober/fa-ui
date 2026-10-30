import { Typography, theme } from 'antd';
import type { CSSProperties } from 'react';
import './PageLoading.css';

// 固定位置，错开闪烁周期与相位，避免重渲染时星点跳动。
const stars = [
  { x: 26, y: 22, size: 1.5, duration: 7.8, delay: -1.2 },
  { x: 64, y: 16, size: 1, duration: 10.4, delay: -5.6 },
  { x: 84, y: 40, size: 1.5, duration: 9.2, delay: -3.4 },
  { x: 74, y: 74, size: 1, duration: 12.2, delay: -7 },
  { x: 43, y: 86, size: 1.5, duration: 8.6, delay: -4.6 },
  { x: 16, y: 60, size: 1, duration: 11.4, delay: -9.8 },
  { x: 20, y: 40, size: 1.5, duration: 9.8, delay: -2.2 },
  { x: 58, y: 33, size: 1, duration: 13.4, delay: -10.8 },
];

export interface PageLoadingProps {
  style?: CSSProperties;
  tip?: string;
}

export default function PageLoading({ style, tip = '加载中...' }: PageLoadingProps) {
  const { token } = theme.useToken();

  return (
    <div
      className="fa-page-loading"
      aria-live="polite"
      aria-busy="true"
      style={{
        '--fa-page-loading-color': token.colorPrimary,
        ...style,
      } as CSSProperties}
    >
      <span className="fa-page-loading-indicator" aria-hidden="true">
        <span className="fa-page-loading-stars">
          {stars.map((star) => (
            <span key={`${star.x}-${star.y}`} className="fa-page-loading-star" style={{
              left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size,
              animationDuration: `${star.duration}s`, animationDelay: `${star.delay}s`,
            }} />
          ))}
        </span>
        <span className="fa-page-loading-orbit" />
        <span className="fa-page-loading-orbit fa-page-loading-orbit-inner" />
        <span className="fa-page-loading-core" />
      </span>
      {tip ? <Typography.Text className="fa-page-loading-tip" type="secondary">{tip}</Typography.Text> : null}
    </div>
  );
}
