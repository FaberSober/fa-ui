import React, { CSSProperties } from 'react';
import { Input, Popover } from 'antd';
import { tryHexToRgba } from '@ui/utils/utils';
import { BgColorsOutlined } from '@ant-design/icons';
import { SketchPicker } from 'react-color';
import { Fa } from '@ui/types';

export interface InputColorProps extends Fa.DefaultFieldProps<string> {
  inputStyle?: CSSProperties;
  cubeStyle?: CSSProperties;
}

/**
 * 配置面板输入组件-颜色选择
 * @author xu.pengfei
 * @date 2021/1/5
 */
export default function InputColor({ value, onChange, inputStyle, cubeStyle }: InputColorProps) {
  const color = tryHexToRgba(value);
  return (
    <div style={{ display: 'flex' }}>
      <Input
        value={value}
        onChange={(e) => {
          if (onChange) onChange(e.target.value);
        }}
        style={inputStyle}
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
            height: '100%',
            ...cubeStyle,
          }}
        >
          <BgColorsOutlined />
        </div>
      </Popover>
    </div>
  );
}
