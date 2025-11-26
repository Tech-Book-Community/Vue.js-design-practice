<script setup lang="ts">
import { computed } from 'vue'

interface MappingRow {
  newNode?: string // 可選，為空表示該位置沒有新節點（removed）
  oldNode?: string // 可選，為空表示該位置沒有舊節點（added）
  index: number
  targetIndex?: number // 箭頭要連到哪個舊節點的位置（如果不提供則使用 index）
}

type NodeStatus = 'normal' | 'added' | 'removed'

interface Props {
  rows: MappingRow[]
  title?: string
  description?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  description: '',
})

// 自動推導節點狀態
function getStatus(row: MappingRow): NodeStatus {
  if (!row.oldNode)
    return 'added'
  if (!row.newNode)
    return 'removed'
  return 'normal'
}

// 檢測是否有交叉連接（只檢查 normal 狀態的節點）
const hasCrossing = computed(() => {
  const normalRows = props.rows.filter(row => getStatus(row) === 'normal')

  for (let i = 0; i < normalRows.length; i++) {
    for (let j = i + 1; j < normalRows.length; j++) {
      const row1 = normalRows[i]
      const row2 = normalRows[j]

      // 提取節點編號進行比較
      const newNode1 = Number.parseInt(row1.newNode!.split('-')[1])
      const newNode2 = Number.parseInt(row2.newNode!.split('-')[1])
      const oldNode1 = Number.parseInt(row1.oldNode!.split('-')[1])
      const oldNode2 = Number.parseInt(row2.oldNode!.split('-')[1])

      // 檢測交叉：如果新節點順序和舊節點順序相反
      if (
        (newNode1 < newNode2 && oldNode1 > oldNode2)
        || (newNode1 > newNode2 && oldNode1 < oldNode2)
      ) {
        return true
      }
    }
  }
  return false
})

// 獲取目標索引（優先使用 targetIndex，否則使用 index）
function getTargetIndex(row: MappingRow) {
  return row.targetIndex !== undefined ? row.targetIndex : row.index
}
</script>

<template>
  <div>
    <!-- 簡單布局（無交叉） -->
    <div v-if="!hasCrossing" class="relative max-w-3xl mx-auto">
      <!-- 標題 -->
      <div class="flex items-center mb-4 text-xs font-bold">
        <div class="w-32 text-center whitespace-nowrap">
          新子節點
        </div>
        <div class="flex-1" />
        <div class="w-32 text-center whitespace-nowrap">
          舊子節點
        </div>
        <div class="w-20 text-center whitespace-nowrap ml-4">
          索引
        </div>
      </div>

      <!-- 動態生成每一行 -->
      <div
        v-for="(row, index) in rows"
        :key="index"
        class="flex items-center"
        :class="{ 'mb-8': index < rows.length - 1 }"
      >
        <!-- 菱形：新子節點 -->
        <div class="w-32 flex justify-center">
          <div
            v-if="row.newNode"
            class="w-12 h-12 transform rotate-45 flex items-center justify-center flex-shrink-0"
            :class="getStatus(row) === 'added' ? 'bg-green-600' : 'bg-gray-600'"
          >
            <span class="transform -rotate-45 text-white text-sm">{{
              row.newNode
            }}</span>
          </div>
          <!-- 空白占位（removed 狀態沒有新節點） -->
          <div v-else class="w-12 h-12 flex-shrink-0" />
        </div>

        <!-- 箭頭（只有 normal 狀態才顯示） -->
        <div class="flex-1 flex items-center justify-center px-4">
          <svg
            v-if="getStatus(row) === 'normal'"
            class="w-24 h-2"
            viewBox="0 0 96 8"
          >
            <line
              x1="0"
              y1="4"
              x2="84"
              y2="4"
              stroke="currentColor"
              stroke-width="2"
            />
            <polygon points="84,0 96,4 84,8" fill="currentColor" />
          </svg>
          <!-- 空白占位 -->
          <div v-else class="w-24 h-2" />
        </div>

        <!-- 矩形：舊子節點 -->
        <div class="w-32 flex justify-center">
          <div
            v-if="row.oldNode"
            class="w-24 h-12 flex items-center justify-center flex-shrink-0"
            :class="[
              getStatus(row) === 'removed'
                ? 'border-2 border-dashed border-red-400 bg-red-900/20'
                : 'bg-gray-700',
            ]"
          >
            <span
              class="text-sm"
              :class="
                getStatus(row) === 'removed' ? 'text-red-300' : 'text-white'
              "
            >{{ row.oldNode }}</span>
          </div>
          <!-- 空白占位（added 狀態沒有舊節點） -->
          <div v-else class="w-24 h-12 flex-shrink-0" />
        </div>

        <!-- 索引 -->
        <div class="w-20 text-center text-sm ml-4">
          索引 {{ row.index }}
        </div>
      </div>
    </div>

    <!-- 複雜布局（有交叉） -->
    <div v-else class="relative max-w-3xl mx-auto">
      <!-- 標題 -->
      <div class="flex items-center mb-4 text-xs font-bold">
        <div class="w-32 text-center whitespace-nowrap">
          新子節點
        </div>
        <div class="flex-1" />
        <div class="w-32 text-center whitespace-nowrap">
          舊子節點
        </div>
        <div class="w-20 text-center whitespace-nowrap ml-4">
          索引
        </div>
      </div>

      <!-- SVG 容器用於繪製曲線 -->
      <div class="relative" :style="`height: ${rows.length * 88 - 8}px`">
        <!-- SVG 曲線（只畫 normal 狀態的連接線） -->
        <svg
          class="absolute"
          style="
            left: 72px;
            top: 0;
            width: calc(100% - 224px);
            height: 100%;
            pointer-events: none;
          "
          :viewBox="`0 0 320 ${rows.length * 88}`"
          preserveAspectRatio="none"
        >
          <g v-for="(row, fromIndex) in rows" :key="fromIndex">
            <template v-if="getStatus(row) === 'normal'">
              <line
                :x1="0"
                :y1="fromIndex * 88 + 32"
                :x2="320"
                :y2="getTargetIndex(row) * 88 + 32"
                stroke="currentColor"
                stroke-width="2"
                vector-effect="non-scaling-stroke"
              />
              <polygon
                :points="`315,${getTargetIndex(row) * 88 + 28} 320,${getTargetIndex(row) * 88 + 32} 315,${getTargetIndex(row) * 88 + 36}`"
                fill="currentColor"
              />
            </template>
          </g>
        </svg>

        <!-- 新子節點 (左側) -->
        <div
          v-for="(row, index) in rows"
          :key="`new-${index}`"
          class="absolute left-0 w-32"
          :style="`top: ${index * 88}px`"
        >
          <div class="flex justify-center">
            <div
              v-if="row.newNode"
              class="w-12 h-12 transform rotate-45 flex items-center justify-center"
              :class="
                getStatus(row) === 'added' ? 'bg-green-600' : 'bg-gray-600'
              "
            >
              <span class="transform -rotate-45 text-white text-sm">{{
                row.newNode
              }}</span>
            </div>
            <!-- 空白占位 -->
            <div v-else class="w-12 h-12" />
          </div>
        </div>

        <!-- 舊子節點 (右側) -->
        <div
          v-for="(row, index) in rows"
          :key="`old-${index}`"
          class="absolute right-20 w-32"
          :style="`top: ${index * 88 + 8}px`"
        >
          <div class="flex justify-center">
            <div
              v-if="row.oldNode"
              class="w-24 h-12 flex items-center justify-center"
              :class="[
                getStatus(row) === 'removed'
                  ? 'border-2 border-dashed border-red-400 bg-red-900/20'
                  : 'bg-gray-700',
              ]"
            >
              <span
                class="text-sm"
                :class="
                  getStatus(row) === 'removed' ? 'text-red-300' : 'text-white'
                "
              >{{ row.oldNode }}</span>
            </div>
            <!-- 空白占位 -->
            <div v-else class="w-24 h-12" />
          </div>
        </div>

        <!-- 索引 (最右側) -->
        <div
          v-for="(row, index) in rows"
          :key="`index-${index}`"
          class="absolute right-0 w-20 text-center text-sm"
          :style="`top: ${index * 88 + 16}px`"
        >
          索引 {{ row.index }}
        </div>
      </div>
    </div>

    <!-- 圖片標題和說明 -->
    <div class="text-center mt-6">
      <div v-if="title" class="text-sm text-gray-400 mb-1">
        {{ title }}
      </div>
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
