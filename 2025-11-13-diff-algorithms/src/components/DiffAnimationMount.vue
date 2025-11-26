<script setup lang="ts">
import { computed } from 'vue'

// Track current click step using Slidev's $clicks
const props = defineProps<{
  clicks: number
}>()

// Node data structure
interface Node {
  key: string
  oldIndex: number
  y: number
  highlight: boolean
  mounting?: boolean
  anchor?: boolean // Mark as anchor node (the node after which a new node will be inserted)
}

// Connection data structure
interface Connection {
  fromY: number
  toY: number
  show: boolean
}

// Old children - 只有 2 個節點
const oldChildren = [
  { key: 'p-1', index: 0, y: 0 },
  { key: 'p-3', index: 1, y: 80 },
]

// New children - 有 4 個節點，p-4 和 p-2 是新增的
// p-4 是第一個且是新增的，可以展示 container.firstChild 的場景
const newChildren = [
  { key: 'p-4', index: 0, y: 0 },
  { key: 'p-3', index: 1, y: 80 },
  { key: 'p-2', index: 2, y: 160 },
  { key: 'p-1', index: 3, y: 240 },
]

// Calculate current state based on clicks
// 新流程：newChildren = [p-4, p-3, p-2, p-1]
// p-4 是第一個且是新增的，展示 container.firstChild 場景
const currentState = computed(() => {
  const clicks = props.clicks

  // Initialize all node highlight states
  const newHighlight = [false, false, false, false]
  const oldHighlight = [false, false]
  const domHighlight = [false, false, false, false]

  // Initial DOM order - 只有 2 個節點
  let domNodes: Node[] = [
    { key: 'p-1', oldIndex: 0, y: 0, highlight: false, mounting: false },
    { key: 'p-3', oldIndex: 1, y: 80, highlight: false, mounting: false },
  ]

  let lastIndex = 0
  let message = '初始狀態：真實 DOM 順序 [p-1, p-3]'
  let connection: Connection = { fromY: 0, toY: 0, show: false }

  // ===== 步驟 1：處理 p-4（新節點，第一個位置）=====
  if (clicks >= 1) {
    newHighlight[0] = true // p-4 is at newChildren index 0
    message = '步驟 1：處理新 children[0] = p-4'
  }

  if (clicks >= 2) {
    message = 'p-4 在舊 children 中不存在，這是新節點！'
  }

  if (clicks >= 3) {
    message = 'j === 0，這是第一個節點，沒有 prevVNode'
  }

  if (clicks >= 4) {
    // Mark p-1 as anchor (it's container.firstChild)
    domNodes = [
      {
        key: 'p-1',
        oldIndex: 0,
        y: 0,
        highlight: false,
        mounting: false,
        anchor: true,
      },
      { key: 'p-3', oldIndex: 1, y: 80, highlight: false, mounting: false },
    ]
    message = '使用 container.firstChild 作為錨點（anchor）'
  }

  if (clicks >= 5) {
    // Mount p-4 at the beginning
    domNodes = [
      {
        key: 'p-4',
        oldIndex: -1,
        y: 0,
        highlight: true,
        mounting: true,
        anchor: false,
      },
      {
        key: 'p-1',
        oldIndex: 0,
        y: 80,
        highlight: false,
        mounting: false,
        anchor: false,
      },
      {
        key: 'p-3',
        oldIndex: 1,
        y: 160,
        highlight: false,
        mounting: false,
        anchor: false,
      },
    ]
    message = '✓ p-4 插入到最前面！DOM 順序變為 [p-4, p-1, p-3]'
  }

  // ===== 步驟 2：處理 p-3 =====
  if (clicks >= 6) {
    newHighlight[0] = false
    newHighlight[1] = true // p-3 is at newChildren index 1
    domNodes = [
      { key: 'p-4', oldIndex: -1, y: 0, highlight: false, mounting: false },
      { key: 'p-1', oldIndex: 0, y: 80, highlight: false, mounting: false },
      { key: 'p-3', oldIndex: 1, y: 160, highlight: false, mounting: false },
    ]
    message = '步驟 2：處理新 children[1] = p-3'
  }

  if (clicks >= 7) {
    oldHighlight[1] = true // p-3 is at old children index 1
    connection = {
      fromY: 80 + 40, // new node p-3's y (index 1)
      toY: 80 + 40, // old node p-3's y (index 1)
      show: true,
    }
    message = '找到 p-3 在舊 children 的索引 = 1'
  }

  if (clicks >= 8) {
    message = '索引 1 >= lastIndex 0，不需要移動'
  }

  if (clicks >= 9) {
    lastIndex = 1
    message = 'lastIndex 更新為 1'
  }

  // ===== 步驟 3：處理 p-2（新節點）=====
  if (clicks >= 10) {
    newHighlight[1] = false
    oldHighlight[1] = false
    connection.show = false
    newHighlight[2] = true // p-2 is at newChildren index 2
    lastIndex = 1
    message = '步驟 3：處理新 children[2] = p-2'
  }

  if (clicks >= 11) {
    lastIndex = 1
    message = 'p-2 在舊 children 中不存在，這是新節點！'
  }

  if (clicks >= 12) {
    // Mark p-3 as anchor
    domNodes = [
      { key: 'p-4', oldIndex: -1, y: 0, highlight: false, mounting: false },
      { key: 'p-1', oldIndex: 0, y: 80, highlight: false, mounting: false },
      {
        key: 'p-3',
        oldIndex: 1,
        y: 160,
        highlight: false,
        mounting: false,
        anchor: true,
      },
    ]
    lastIndex = 1
    message = 'prevVNode 是 p-3，掛載到 p-3 後面'
  }

  if (clicks >= 13) {
    // Mount p-2 after p-3
    domNodes = [
      { key: 'p-4', oldIndex: -1, y: 0, highlight: false, mounting: false },
      { key: 'p-1', oldIndex: 0, y: 80, highlight: false, mounting: false },
      { key: 'p-3', oldIndex: 1, y: 160, highlight: false, mounting: false },
      { key: 'p-2', oldIndex: -1, y: 240, highlight: true, mounting: true },
    ]
    lastIndex = 1
    message = '✓ p-2 已掛載！DOM 順序變為 [p-4, p-1, p-3, p-2]'
  }

  // ===== 步驟 4：處理 p-1 =====
  if (clicks >= 14) {
    newHighlight[2] = false
    newHighlight[3] = true // p-1 is at newChildren index 3
    // 保持 DOM 順序，p-1 仍在 y: 80
    domNodes = [
      { key: 'p-4', oldIndex: -1, y: 0, highlight: false, mounting: false },
      { key: 'p-1', oldIndex: 0, y: 80, highlight: false, mounting: false },
      { key: 'p-3', oldIndex: 1, y: 160, highlight: false, mounting: false },
      { key: 'p-2', oldIndex: -1, y: 240, highlight: false, mounting: false },
    ]
    lastIndex = 1
    message = '步驟 4：處理新 children[3] = p-1'
  }

  if (clicks >= 15) {
    oldHighlight[0] = true // p-1 is at old children index 0
    // p-1 仍在 y: 80，高亮顯示
    domNodes = [
      { key: 'p-4', oldIndex: -1, y: 0, highlight: false, mounting: false },
      { key: 'p-1', oldIndex: 0, y: 80, highlight: true, mounting: false },
      { key: 'p-3', oldIndex: 1, y: 160, highlight: false, mounting: false },
      { key: 'p-2', oldIndex: -1, y: 240, highlight: false, mounting: false },
    ]
    connection = {
      fromY: 240 + 40, // new node p-1's y (index 3)
      toY: 0 + 40, // old node p-1's y (index 0)
      show: true,
    }
    lastIndex = 1
    message = '找到 p-1 在舊 children 的索引 = 0'
  }

  if (clicks >= 16) {
    // p-1 仍在 y: 80，準備移動
    domNodes = [
      { key: 'p-4', oldIndex: -1, y: 0, highlight: false, mounting: false },
      { key: 'p-1', oldIndex: 0, y: 80, highlight: true, mounting: false },
      { key: 'p-3', oldIndex: 1, y: 160, highlight: false, mounting: false },
      { key: 'p-2', oldIndex: -1, y: 240, highlight: false, mounting: false },
    ]
    oldHighlight[0] = true
    connection = {
      fromY: 240 + 40,
      toY: 0 + 40,
      show: true,
    }
    lastIndex = 1
    message = '索引 0 < lastIndex 1，需要移動！'
  }

  if (clicks >= 17) {
    // Move p-1 after p-2 - 保持相同的 key，只改變 y 值讓動畫生效
    domNodes = [
      { key: 'p-4', oldIndex: -1, y: 0, highlight: false, mounting: false },
      { key: 'p-1', oldIndex: 0, y: 240, highlight: true, mounting: false }, // y 從 80 變為 240
      { key: 'p-3', oldIndex: 1, y: 80, highlight: false, mounting: false }, // y 從 160 變為 80
      { key: 'p-2', oldIndex: -1, y: 160, highlight: false, mounting: false }, // y 從 240 變為 160
    ]
    oldHighlight[0] = true
    connection = {
      fromY: 240 + 40,
      toY: 0 + 40,
      show: true,
    }
    lastIndex = 1
    message = '移動完成：DOM 順序變為 [p-4, p-3, p-2, p-1]'
  }

  if (clicks >= 18) {
    // Final state
    newHighlight[3] = false
    oldHighlight[0] = false
    connection.show = false
    domNodes = [
      { key: 'p-4', oldIndex: -1, y: 0, highlight: false, mounting: false },
      { key: 'p-3', oldIndex: 1, y: 80, highlight: false, mounting: false },
      { key: 'p-2', oldIndex: -1, y: 160, highlight: false, mounting: false },
      { key: 'p-1', oldIndex: 0, y: 240, highlight: false, mounting: false },
    ]
    lastIndex = 1
    message = '✓ 更新完成！最終順序 [p-4, p-3, p-2, p-1]'
  }

  // Apply highlight states to DOM nodes
  domNodes = domNodes.map((node, idx) => ({
    ...node,
    highlight: node.highlight || domHighlight[idx] || false,
  }))

  return {
    newChildren: newChildren.map((node, idx) => ({
      ...node,
      highlight: newHighlight[idx],
    })),
    oldChildren: oldChildren.map((node, idx) => ({
      ...node,
      highlight: oldHighlight[idx],
    })),
    domNodes,
    lastIndex,
    message,
    connection,
  }
})
</script>

<template>
  <div class="diff-animation-mount">
    <div class="content-wrapper">
      <div class="main-layout">
        <!-- Left side: Three-layer view (vertical layout) -->
        <div class="layers-grid">
          <!-- New children (left) -->
          <div class="layer-column">
            <div class="layer-title">
              <div i-carbon:document-add text-sm />
              <span>新子節點</span>
            </div>
            <div class="layer-subtitle">
              (newChildren)
            </div>
            <svg
              width="100%"
              height="320"
              viewBox="0 0 130 320"
              class="layer-svg"
            >
              <g
                v-for="node in currentState.newChildren"
                :key="`new-${node.key}`"
              >
                <rect
                  x="15"
                  :y="node.y + 15"
                  width="100"
                  height="50"
                  class="new-node"
                  :class="[{ 'highlight-new': node.highlight }]"
                  rx="6"
                />
                <text x="65" :y="node.y + 45" class="node-text">
                  {{ node.key }}
                </text>
                <text x="65" :y="node.y + 58" class="index-text">
                  新 {{ node.index }}
                </text>
              </g>
            </svg>
          </div>

          <!-- Connection area (middle) -->
          <div class="connection-column">
            <div class="layer-title opacity-0">
              <span>連線</span>
            </div>
            <div class="layer-subtitle opacity-0">
              -
            </div>
            <svg
              width="100%"
              height="320"
              viewBox="-5 0 90 320"
              class="layer-svg"
              style="overflow: visible"
            >
              <line
                v-if="currentState.connection.show"
                x1="0"
                :y1="currentState.connection.fromY + 15"
                x2="80"
                :y2="currentState.connection.toY + 15"
                class="connection-line"
              />
              <circle
                v-if="currentState.connection.show"
                cx="0"
                :cy="currentState.connection.fromY + 15"
                r="4"
                class="connection-dot"
              />
              <circle
                v-if="currentState.connection.show"
                cx="80"
                :cy="currentState.connection.toY + 15"
                r="4"
                class="connection-dot"
              />
            </svg>
          </div>

          <!-- Old children (middle-right) -->
          <div class="layer-column">
            <div class="layer-title">
              <div i-carbon:document text-sm />
              <span>舊子節點</span>
            </div>
            <div class="layer-subtitle">
              (oldChildren)
            </div>
            <svg
              width="100%"
              height="320"
              viewBox="0 0 130 320"
              class="layer-svg"
            >
              <g v-for="node in currentState.oldChildren" :key="node.key">
                <rect
                  x="15"
                  :y="node.y + 15"
                  width="100"
                  height="50"
                  class="old-node"
                  :class="[{ 'highlight-old': node.highlight }]"
                  rx="6"
                />
                <text x="65" :y="node.y + 45" class="node-text">
                  {{ node.key }}
                </text>
                <text x="65" :y="node.y + 58" class="index-text">
                  索引 {{ node.index }}
                </text>
              </g>
            </svg>
          </div>

          <!-- Real DOM nodes -->
          <div class="layer-column dom-column">
            <div class="layer-title">
              <div i-carbon:html text-sm />
              <span>真實 DOM</span>
            </div>
            <div class="layer-subtitle">
              (會移動/新增)
            </div>
            <svg
              width="100%"
              height="320"
              viewBox="0 0 130 320"
              class="layer-svg"
            >
              <g
                v-for="node in currentState.domNodes"
                :key="`dom-${node.key}`"
                :style="{ transform: `translateY(${node.y}px)` }"
                class="dom-node-group"
                :class="{ mounting: node.mounting }"
              >
                <rect
                  x="15"
                  y="15"
                  width="100"
                  height="50"
                  class="dom-node"
                  :class="[
                    { 'highlight-dom': node.highlight },
                    { 'mounting-node': node.mounting },
                    { 'anchor-node': node.anchor },
                  ]"
                  rx="6"
                />
                <text x="65" y="45" class="node-text-dom">{{ node.key }}</text>
                <text
                  v-if="node.oldIndex >= 0"
                  x="65"
                  y="58"
                  class="index-text"
                >
                  舊 {{ node.oldIndex }}
                </text>
                <text v-else x="65" y="58" class="index-text new-label">
                  新
                </text>
              </g>
            </svg>
          </div>
        </div>

        <!-- Right side: Message and info area -->
        <div class="info-panel">
          <!-- Message area -->
          <div class="message-box">
            <div class="message-content">
              <div class="text-sm">
                {{ currentState.message }}
              </div>
            </div>
          </div>

          <!-- Badge -->
          <div class="badge-container">
            <div class="badge">
              lastIndex: {{ currentState.lastIndex }}
            </div>
          </div>

          <!-- Hint -->
          <div class="hint">
            點擊或按空格鍵查看下一步
          </div>
          <div class="hint-progress">
            ({{ clicks }}/18)
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diff-animation-mount {
  @apply w-full p-3 rounded-lg bg-neutral-900/50 border border-neutral-700;
}

.content-wrapper {
  @apply w-full;
}

.main-layout {
  @apply flex gap-4;
}

.layers-grid {
  @apply grid gap-3;
  grid-template-columns: 130px 80px 130px 130px;
  flex-shrink: 0;
}

.info-panel {
  @apply flex-1 flex flex-col gap-3 justify-center;
  min-width: 280px;
}

.layer-column {
  @apply bg-neutral-800/30 rounded-lg p-2 border border-neutral-700/50;
}

.connection-column {
  @apply flex flex-col;
}

.dom-column {
  @apply bg-purple-900/10 border-purple-700/50;
}

.layer-title {
  @apply flex items-center justify-center gap-1.5 font-bold text-neutral-200 mb-1;
  font-size: 11px;
}

.layer-subtitle {
  @apply text-center text-neutral-400 mb-2;
  font-size: 9px;
}

.layer-svg {
  @apply mx-auto block;
}

.dom-node-group {
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.dom-node-group.mounting {
  animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Old node styles */
.old-node {
  @apply fill-blue-900/30 stroke-blue-500 stroke-2;
  transition: all 0.3s ease;
}

.old-node.highlight-old {
  @apply fill-blue-900/50 stroke-blue-400 stroke-3;
  filter: drop-shadow(0 0 8px rgba(96, 165, 250, 0.6));
}

/* New node styles */
.new-node {
  @apply fill-green-900/30 stroke-green-500 stroke-2;
  transition: all 0.3s ease;
}

.new-node.highlight-new {
  @apply fill-green-900/50 stroke-green-400 stroke-3;
  filter: drop-shadow(0 0 8px rgba(74, 222, 128, 0.6));
}

/* DOM node styles */
.dom-node {
  @apply fill-purple-900/30 stroke-purple-500 stroke-2;
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.dom-node.highlight-dom {
  @apply fill-orange-900/50 stroke-orange-500 stroke-3;
  filter: drop-shadow(0 0 10px rgba(251, 146, 60, 0.7));
  animation: pulse 1s ease-in-out infinite;
}

.dom-node.mounting-node {
  @apply fill-green-900/50 stroke-green-400 stroke-3;
  filter: drop-shadow(0 0 12px rgba(74, 222, 128, 0.8));
  animation: glow 1.5s ease-in-out infinite;
}

.dom-node.anchor-node {
  @apply fill-cyan-900/50 stroke-cyan-400 stroke-3;
  filter: drop-shadow(0 0 10px rgba(34, 211, 238, 0.7));
  animation: anchor-pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

@keyframes glow {
  0%,
  100% {
    filter: drop-shadow(0 0 8px rgba(74, 222, 128, 0.6));
  }
  50% {
    filter: drop-shadow(0 0 16px rgba(74, 222, 128, 1));
  }
}

@keyframes anchor-pulse {
  0%,
  100% {
    filter: drop-shadow(0 0 6px rgba(34, 211, 238, 0.5));
  }
  50% {
    filter: drop-shadow(0 0 14px rgba(34, 211, 238, 0.9));
  }
}

.node-text {
  @apply fill-neutral-200 font-bold;
  font-size: 14px;
  text-anchor: middle;
  pointer-events: none;
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.node-text-dom {
  @apply fill-purple-200 font-bold;
  font-size: 14px;
  text-anchor: middle;
  pointer-events: none;
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.index-text {
  @apply fill-neutral-400;
  font-size: 10px;
  text-anchor: middle;
  pointer-events: none;
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.index-text.new-label {
  @apply fill-green-400 font-bold;
}

/* Connection styles */
.connection-line {
  @apply stroke-yellow-400;
  stroke-width: 2;
  stroke-dasharray: 4;
  animation: dash 1s linear infinite;
}

.connection-dot {
  @apply fill-yellow-400;
}

@keyframes dash {
  to {
    stroke-dashoffset: -8;
  }
}

.message-box {
  @apply p-4 rounded-lg bg-neutral-800/50 border border-neutral-600;
}

.message-content {
  @apply flex flex-col gap-2;
}

.message-content .text-sm {
  @apply text-neutral-200 leading-relaxed;
  font-size: 13px;
}

.badge-container {
  @apply flex justify-center;
}

.badge {
  @apply px-3 py-1.5 rounded-full bg-blue-600/30 border border-blue-500/50 text-blue-300 font-mono font-bold;
  font-size: 11px;
}

.hint {
  @apply text-center text-xs text-neutral-400 italic;
}

.hint-progress {
  @apply text-center text-xs text-neutral-500 font-mono mt-1;
}
</style>
