import React, { createContext, useEffect } from 'react';
import { Fa } from '@ui/types';
import { useLocalStorage } from "react-use";
import { each } from "lodash";
import chroma from 'chroma-js';


const DEFAULT_PRIMARY_COLOR = '#1890FF';

export interface ThemeLayoutContextProps {
  colorPrimary: string;
  setColorPrimary: (color: string) => void;
  themeDark: boolean;
  setThemeDark: (dark: boolean) => void;
}

export const ThemeLayoutContext = createContext<ThemeLayoutContextProps>({
  colorPrimary: DEFAULT_PRIMARY_COLOR,
  setColorPrimary: () => {},
  themeDark: false,
  setThemeDark: () => {},
});


const ThemeConfig = {
  light: {
    'fa-bg-color': '#fff',
    'fa-bg-selected': '#e3e3e3',
    'fa-bg-color-hover': '#ccc',
    'fa-bg-color2': '#eee',
    'fa-bg-color-highlight': '#3c4c68',
    'fa-bg-grey': '#f7f7f7',
    'fa-bg-grey2': '#e7e7e7',
    'fa-bg-menu': '#F2F7FF',
    'fa-hover-bg': '#e1e1e1',
    'fa-text-color': '#353535',
    'fa-text-color2': '#353535',
    'fa-text-color-hover': '#353535',
    'fa-subtitle-color': '#666',
    'fa-border-color': '#ddd',
    'separator-border': '#eee',
  },
  dark: {
    'fa-bg-color': '#151921',
    'fa-bg-selected': '#3c4c68',
    'fa-bg-color-hover': '#495e80',
    'fa-bg-color2': '#5d779a',
    'fa-bg-color-highlight': '#1c5e88',
    'fa-bg-grey': '#53626c',
    'fa-bg-grey2': '#3b4043',
    'fa-bg-menu': '#3c4c68',
    'fa-hover-bg': '#1c5e88',
    'fa-text-color': '#FFF',
    'fa-text-color2': '#eee',
    'fa-text-color-hover': '#FFF',
    'fa-subtitle-color': '#A5C9E6',
    'fa-border-color': '#2f3a4b',
    'separator-border': '#0A3046',
  },
}

export interface ThemeLayoutProps extends Fa.BaseChildProps {
  colorPrimary?: string;
}

/**
 * @author xu.pengfei
 * @date 2022/9/21
 */
export default function ThemeLayout({ children, colorPrimary }: ThemeLayoutProps) {
  const [colorPrimaryInner, setColorPrimaryInner] = useLocalStorage<string>('colorPrimary', colorPrimary || DEFAULT_PRIMARY_COLOR);
  const [themeDark, setThemeDark] = useLocalStorage<boolean>('themeDark', document.body.getAttribute('data-theme') === 'dark');


  useEffect(() => {
    const rootDom = document.getElementsByTagName('body')[0].style;
    rootDom.setProperty('--primary-color', colorPrimaryInner!);

    // calculate primary color variants - use chroma-js
    rootDom.setProperty('--primary-color-dark100', chroma(colorPrimaryInner!).darken(0.5).hex());
    rootDom.setProperty('--primary-color-dark200', chroma(colorPrimaryInner!).darken(1.0).hex());
    rootDom.setProperty('--primary-color-dark300', chroma(colorPrimaryInner!).darken(1.5).hex());
    rootDom.setProperty('--primary-color-dark400', chroma(colorPrimaryInner!).darken(2.0).hex());

    rootDom.setProperty('--primary-color-light100', chroma(colorPrimaryInner!).brighten(0.5).hex());
    rootDom.setProperty('--primary-color-light200', chroma(colorPrimaryInner!).brighten(1.0).hex());
    rootDom.setProperty('--primary-color-light300', chroma(colorPrimaryInner!).brighten(1.5).hex());
    rootDom.setProperty('--primary-color-light400', chroma(colorPrimaryInner!).brighten(2.0).hex());

    changeTheme(themeDark);
  }, [colorPrimaryInner]);

  function changeTheme(dark: boolean|undefined) {
    const themeData:any = dark ? 'dark' : 'light';
    document.body.setAttribute('data-theme', themeData); // 设置tailwindcss主题

    const rootDom = document.getElementsByTagName('body')[0].style;

    console.log('themeData', themeData)
    each(ThemeConfig.light, (_v, k) => {
      // @ts-ignore
      rootDom.setProperty(`--${k}`, ThemeConfig[themeData][k]);
    })
  }

  const contextValue: ThemeLayoutContextProps = {
    colorPrimary: colorPrimaryInner || DEFAULT_PRIMARY_COLOR,
    setColorPrimary: (v) => setColorPrimaryInner(v),
    themeDark: themeDark || false,
    setThemeDark: (dark: boolean) => {
      setThemeDark(dark);
      changeTheme(dark);
    },
  };

  return <ThemeLayoutContext.Provider value={contextValue}>{children}</ThemeLayoutContext.Provider>;
}
