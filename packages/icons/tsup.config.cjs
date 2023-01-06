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
    // '@fortawesome/fontawesome-svg-core',
    // '@fortawesome/free-regular-svg-icons',
    // '@fortawesome/free-solid-svg-icons',
    // '@fortawesome/react-fontawesome',
    'lodash',
    'react',
  ],
});
