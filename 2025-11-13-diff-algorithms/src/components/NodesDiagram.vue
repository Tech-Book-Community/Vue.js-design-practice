<script setup lang="ts">
interface Props {
  type?: "9-1" | "9-2" | "9-3";
  description?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: "9-1",
  description: "",
});

const config = {
  "9-1": {
    title: "圖 9-1",
    rows: [
      {
        hasNew: true,
        hasOld: true,
        action: "patch: 更新文本子節點",
        hasDom: true,
        domDashed: false,
      },
      {
        hasNew: true,
        hasOld: true,
        action: "patch: 更新文本子節點",
        hasDom: true,
        domDashed: false,
      },
      {
        hasNew: true,
        hasOld: true,
        action: "patch: 更新文本子節點",
        hasDom: true,
        domDashed: false,
      },
    ],
  },
  "9-2": {
    title: "圖 9-2",
    rows: [
      {
        hasNew: true,
        hasOld: true,
        action: "patch: 更新文本子節點",
        hasDom: true,
        domDashed: false,
      },
      {
        hasNew: true,
        hasOld: true,
        action: "patch: 更新文本子節點",
        hasDom: true,
        domDashed: false,
      },
      {
        hasNew: true,
        hasOld: true,
        action: "patch: 更新文本子節點",
        hasDom: true,
        domDashed: false,
      },
      {
        hasNew: false,
        hasOld: true,
        action: "unmount: 卸載",
        hasDom: true,
        domDashed: true,
      },
    ],
  },
  "9-3": {
    title: "圖 9-3",
    rows: [
      {
        hasNew: true,
        hasOld: true,
        action: "patch: 更新文本子節點",
        hasDom: true,
        domDashed: false,
      },
      {
        hasNew: true,
        hasOld: true,
        action: "patch: 更新文本子節點",
        hasDom: true,
        domDashed: false,
      },
      {
        hasNew: true,
        hasOld: true,
        action: "patch: 更新文本子節點",
        hasDom: true,
        domDashed: false,
      },
      {
        hasNew: true,
        hasOld: false,
        action: "mount: 掛載",
        hasDom: true,
        domDashed: false,
      },
    ],
  },
};

const currentConfig = config[props.type];
</script>

<template>
  <div>
    <div class="relative max-w-3xl mx-auto">
      <!-- 標題 -->
      <div class="flex items-center mb-2 text-xs font-bold">
        <!-- 虛線框區域的標題 -->
        <div class="flex gap-6 items-center px-2">
          <div class="w-10 text-center whitespace-nowrap">新子節點</div>
          <div class="w-16 text-center whitespace-nowrap">舊子節點</div>
        </div>

        <!-- 箭頭區域 - 空白 -->
        <div class="mx-4" style="width: 160px"></div>

        <!-- 真實 DOM 區域標題 -->
        <div class="w-12 text-center whitespace-nowrap">真實 DOM 節點</div>
      </div>

      <!-- 動態生成每一行 -->
      <div
        v-for="(row, index) in currentConfig.rows"
        :key="index"
        class="flex items-center"
        :class="{ 'mb-2': index < currentConfig.rows.length - 1 }"
      >
        <!-- 新舊節點容器 -->
        <div
          class="border-2 border-dashed border-gray-400 p-2 flex gap-6 items-center min-h-16"
        >
          <!-- 菱形：新子節點 -->
          <div
            v-if="row.hasNew"
            class="w-10 h-10 bg-gray-600 transform rotate-45 flex items-center justify-center flex-shrink-0"
          >
            <span class="transform -rotate-45 text-white text-xs">p</span>
          </div>
          <div v-else class="w-10"></div>

          <!-- 矩形：舊子節點 -->
          <div
            v-if="row.hasOld"
            class="w-16 h-10 bg-gray-700 flex items-center justify-center flex-shrink-0"
          >
            <span class="text-white text-xs">p</span>
          </div>
          <div v-else class="w-16"></div>
        </div>

        <!-- 箭頭和文字 -->
        <div class="flex items-center mx-4">
          <div class="text-xs mr-2 w-32 text-right whitespace-nowrap">
            {{ row.action }}
          </div>
          <svg class="w-6 h-1.5 flex-shrink-0" viewBox="0 0 24 6">
            <line
              x1="0"
              y1="3"
              x2="18"
              y2="3"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <polygon points="18,0 24,3 18,6" fill="currentColor" />
          </svg>
        </div>

        <!-- 圓形：真實 DOM -->
        <div
          v-if="row.hasDom"
          class="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0"
          :class="{ 'border-2 border-dashed border-gray-400': row.domDashed }"
        >
          <span class="text-white text-xs">p</span>
        </div>
      </div>
    </div>

    <!-- 圖片標題和說明 -->
    <div class="text-center mt-4">
      <div class="text-sm text-gray-400 mb-1">{{ currentConfig.title }}</div>
      <div v-if="description" class="text-xs text-gray-400">
        {{ description }}
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 確保旋轉的菱形不會溢出 */
.transform.rotate-45 {
  overflow: visible;
}
</style>
