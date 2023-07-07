import React from 'react';
import {ColorPicker, ColorPickerProps} from 'antd';

export interface InputColorProps extends Omit<ColorPickerProps, 'onChange'> {
  onChange?: (v:string) => void;
}

/**
 * 配置面板输入组件-颜色选择
 * @author xu.pengfei
 * @date 2021/1/5
 */
export default function InputColor({ value, onChange, ...props }: InputColorProps) {
  return (
    <ColorPicker
      value={value}
      onChange={(color, hex) => {
        if (onChange) {
          onChange(hex)
        }
      }}
      {...props}
    />
  );
}
