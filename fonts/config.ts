import { fileURLToPath } from 'node:url'
import { defineConfig } from 'unocss'

const fontPath = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  theme: {
    fontFamily: {
      sans: '"LINE Seed TW"',
    },
  },
  preflights: [
    {
      getCSS: () => `
        @font-face {
          font-family: 'LINE Seed TW';
          font-weight: 400;
          src: url('${fontPath}/LINESeedTW_OTF_Rg.woff2') format('woff2');
          font-display: swap;
        }
        @font-face {
          font-family: 'LINE Seed TW';
          font-weight: 700;
          src: url('${fontPath}/LINESeedTW_OTF_Bd.woff2') format('woff2');
          font-display: swap;
        }
      `,
    },
  ],
})
