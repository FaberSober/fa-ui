import React from 'react';
import { Input, Popover } from 'antd';
import { tryHexToRgba } from '@/utils/utils';
import { BgColorsOutlined } from '@ant-design/icons';
import { SketchPicker } from 'react-color';
import { Fa } from '@/types';

/**
 * 配置面板输入组件-颜色选择
 * @author xu.pengfei
 * @date 2021/1/5
 */
export default function ColorInput({ value, onChange }: Fa.DefaultFieldProps<string>) {
  const color = tryHexToRgba(value);
  return (
    <div style={{ display: 'flex' }}>
      <Input
        value={value}
        onChange={(e) => {
          if (onChange) onChange(e.target.value);
        }}
      />
      <Popover
        placement="bottomRight"
        content={
          <div style={{ margin: '-12px -16px' }}>
            <SketchPicker
              color={color}
              onChange={({ hex }: { hex: any; rgb: any }) => {
                if (onChange) onChange(hex);
              }}
              onChangeComplete={({ hex }: { hex: any; rgb: any }) => {
                if (onChange) onChange(hex);
              }}
            />
          </div>
        }
        trigger="click"
      >
        <div
          style={{
            backgroundColor: color,
            minWidth: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #f1f1f1',
            cursor: 'pointer',
            color: '#FFF',
          }}
        >
          <BgColorsOutlined />
        </div>
      </Popover>
    </div>
  );
}
