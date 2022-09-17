import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import fs from 'fs';
import { resolve } from 'path';
import { viteExternalsPlugin } from 'vite-plugin-externals';

const prodInfo = JSON.parse(fs.readFileSync('./prod-info.json', 'utf-8'));

if (process.env.NODE_ENV === 'production' && process.env.v) {
  const versionData = prodInfo.version.split('.');
  versionData[2] = (parseInt(versionData[2]) + 1).toString();
  prodInfo.version = versionData.join('.');
  prodInfo.buildTime = new Date().toLocaleString();
  fs.writeFileSync('./prod-info.json', JSON.stringify(prodInfo, null, 2));
} else {
  console.log('prodInfo', prodInfo);
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    viteExternalsPlugin(
      {
        // vue: 'Vue',
        konva: 'Konva',
        'agora-rtm-sdk': 'AgoraRTM',
      },
      { disableInServe: true }
    ),
  ],
  base: './',
  define: {
    __PROD_INFO__: JSON.stringify(prodInfo),
  },
  resolve: {
    alias: {
      '@src': resolve('src'),
    },
  },
});
