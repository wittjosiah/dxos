//
// Copyright 2022 DXOS.org
//

import { TemplateFunction } from '@dxos/plate';

export type Input = {
  monorepo?: boolean;
};

const yjsPlugin = /* javascript */ `{
  name: 'yjs',
  setup: ({ onResolve }) => {
    onResolve({ filter: /yjs/ }, () => {
      return { path: require.resolve('yjs').replace('.cjs', '.mjs') }
    })
  }
}`;

const monorepoConfig = /* javascript */ `
  optimizeDeps: {
    force: true,
    include: [
      '@dxos/client',
      '@dxos/config',
      '@dxos/react-appkit',
      '@dxos/react-client',
      '@dxos/react-composer',
      '@dxos/react-list',
      '@dxos/react-ui',
      '@dxos/react-uikit',
      '@dxos/text-model',
      '@dxos/util'
    ],
    esbuildOptions: {
      // TODO(wittjosiah): Remove.
      plugins: [${yjsPlugin}]
    }
  },
  build: {
    outDir: 'out/hello',
    commonjsOptions: {
      include: [
        /packages/,
        /node_modules/
      ]
    }
  },
`;

const basicBuildConfig = /* javascript */ `
  optimizeDeps: {
    esbuildOptions: {
      plugins: [${yjsPlugin}]
    }
  },
  build: {
    outDir: 'out/hello'
  },
`;

// TODO(wittjosiah): Nx executor to execute in place.
const template: TemplateFunction<Input> = ({ input }) => /* javascript */ `
import ReactPlugin from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { ThemePlugin } from '@dxos/react-ui/plugin';
import { ConfigPlugin } from '@dxos/config/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  server: {
    host: true
  },
  ${input.monorepo ? monorepoConfig : basicBuildConfig}
  plugins: [
    ConfigPlugin(),
    ThemePlugin({
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@dxos/react-appkit/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-composer/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-list/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-uikit/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-ui/dist/**/*.mjs')
      ]
    }),
    ReactPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000
      },
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Hello DXOS',
        short_name: 'Hello',
        description: 'DXOS Hello World Application',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'icons/icon-32.png',
            sizes: '32x32',
            type: 'image/png'
          },
          {
            src: 'icons/icon-256.png',
            sizes: '256x256',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
`;

export default template;