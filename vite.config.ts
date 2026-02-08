import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isLib = mode === 'library';

  return {
    root: isLib ? '.' : 'demo',
    base: isLib ? '/' : './',
    publicDir: isLib ? false : resolve(__dirname, 'public'),
    plugins: [
      vue(),
      isLib &&
        dts({
          outDir: 'dist',
          tsconfigPath: './tsconfig.lib.json',
          rollupTypes: false,
          insertTypesEntry: true,
          cleanVueFileName: true,
          copyDtsFiles: true,
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: isLib
      ? {
          outDir: 'dist',
          lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'VueSwiftTable',
            fileName: format => (format === 'es' ? 'vue-swift-table.es.js' : 'vue-swift-table.umd.cjs'),
          },
          rollupOptions: {
            // make sure to externalize deps that shouldn't be bundled
            // into your library
            external: ['vue'],
            output: {
              exports: 'named',
              // Provide global variables to use in the UMD build
              // for externalized deps
              globals: {
                vue: 'Vue',
              },
              assetFileNames: assetInfo => {
                if (assetInfo.name === 'index.css') return 'style.css';
                return assetInfo.name || '';
              },
            },
          },
        }
      : {
          outDir: '../dist-demo',
          emptyOutDir: true,
        },
  };
});
