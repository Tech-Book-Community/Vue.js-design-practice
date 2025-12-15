// uno.config.ts
import {
  defineConfig,
  presetUno,
  presetAttributify,
  presetIcons,
} from "unocss";

export default defineConfig({
  presets: [
    presetUno(), // 基本功能
    presetAttributify(), // 支援 [text="red"] 這類語法
    presetIcons(), // 使用 icon
  ],
});
