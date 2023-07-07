import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  splitting: false,
  sourcemap: true,
  // clean: true,
  dts: true,
  watch: false,
  format: ['esm', 'cjs'],
  external: [
    '@tinymce/tinymce-react',
    'axios',
    'antd',
    'ahooks',
    'dayjs',
    'fa-cron-react-editor',
    'lodash',
    'react',
    'react-contexify',
    'react-router-dom',
    'uuid',
    'use-bus',
    '@ant-design/icons',
  ],
});
