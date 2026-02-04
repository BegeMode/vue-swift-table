import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isLib = mode === 'library';

  return {
    root: isLib ? '.' : 'demo',
    base: isLib ? '/' : './',
    publicDir: isLib ? false : resolve(__dirname, 'public'),
    plugins: [vue()],
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
            fileName: format => `vue-swift-table.${format}.js`,
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
            },
          },
        }
      : {
          outDir: '../dist-demo',
          emptyOutDir: true,
        },
  };
});
