import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  // splitting: false,
  sourcemap: true,
  // clean: true,
  dts: true,
  watch: false,
  format: ['esm', 'cjs'],
  target: 'es2022',
  platform: 'browser',
  clean: true,
  shims: true,                    // 关键！修复 cjs 下 __dirname 等问题
  splitting: true,                // 开启代码分割（对大组件库很有效）
  banner: {
    js: "'use client';"
  },
  external: [
    '@tinymce/tinymce-react',
    'axios',
    '@ant-design/icons',
    'antd',
    'ahooks',
    'dayjs',
    'fa-cron-react-editor',
    'lodash',
    'qs',
    'react',
    'react-dom',
    'react-router-dom',
    'react-contexify',
    'uuid',
    'use-bus',
  ],
  esbuildOptions(options) {
    options.alias = {
      '@ui': './src',
    };
  },
});
