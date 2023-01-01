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
    '@fa/types',
    '@fortawesome/fontawesome-svg-core',
    '@fortawesome/free-regular-svg-icons',
    '@fortawesome/free-solid-svg-icons',
    '@fortawesome/react-fontawesome',
    '@tinymce/tinymce-react',
    'axios',
    'antd',
    'ahooks',
    'dayjs',
    'lodash',
    'react',
    'react-contexify',
    'uuid',
    'use-bus',
    '@ant-design/icons',
  ],
});
