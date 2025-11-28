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
  removing?: boolean
}

// Connection data structure
interface Connection {
  fromY: number
  toY: number
  show: boolean
}

// Old children - 有 4 個節點
const oldChildren = [
  { key: 'p-1', index: 0, y: 0 },
  { key: 'p-2', index: 1, y: 80 },
  { key: 'p-3', index: 2, y: 160 },
  { key: 'p-4', index: 3, y: 240 },
]

// New children - 只有 2 個節點，p-2 和 p-4 被刪除
const newChildren = [
  { key: 'p-3', index: 0, y: 0 },
  { key: 'p-1', index: 1, y: 80 },
]

// Calculate current state based on clicks
const currentState = computed(() => {
  const clicks = props.clicks

  // Initialize all node highlight states
  const newHighlight = [false, false]
  const oldHighlight = [false, false, false, false]
  const domHighlight = [false, false, false, false]

  // Initial DOM order - 4 個節點
  let domNodes: Node[] = [
    { key: 'p-1', oldIndex: 0, y: 0, highlight: false, removing: false },
    { key: 'p-2', oldIndex: 1, y: 80, highlight: false, removing: false },
    { key: 'p-3', oldIndex: 2, y: 160, highlight: false, removing: false },
    { key: 'p-4', oldIndex: 3, y: 240, highlight: false, removing: false },
  ]

  let lastIndex = 0
  let message = '初始狀態：真實 DOM 順序 [p-1, p-2, p-3, p-4]'
  let connection: Connection = { fromY: 0, toY: 0, show: false }

  // Click 0: Initial state (already set)

  if (clicks >= 1) {
    // Click 1: Process p-3 - highlight new node
    newHighlight[0] = true
    message = '步驟 1：處理新 children[0] = p-3'
  }

  if (clicks >= 2) {
    // Click 2: Find p-3 in old children, show connection
    oldHighlight[2] = true // p-3 is at old children index 2
    domHighlight[2] = true // p-3 is at DOM index 2
    connection = {
      fromY: 0 + 40, // new node p-3's y
      toY: 160 + 40, // old node p-3's y
      show: true,
    }
    message = '找到 p-3 在舊 children 的索引 = 2'
  }

  if (clicks >= 3) {
    // Click 3: Determine no move needed
    message = '索引 2 >= lastIndex 0，不需要移動'
  }

  if (clicks >= 4) {
    // Click 4: Update lastIndex
    lastIndex = 2
    message = 'lastIndex 更新為 2，p-3 保持在原位置'
  }

  if (clicks >= 5) {
    // Click 5: Clear highlights, prepare for next node
    newHighlight[0] = false
    oldHighlight[2] = false
    domHighlight[2] = false
    connection.show = false
    newHighlight[1] = true // Highlight new node p-1
    lastIndex = 2
    message = '步驟 2：處理新 children[1] = p-1'
  }

  if (clicks >= 6) {
    // Click 6: Find p-1, show connection and highlight
    oldHighlight[0] = true // p-1 is at old children index 0
    domHighlight[0] = true // p-1 is at current DOM index 0
    connection = {
      fromY: 80 + 40, // new node p-1's y
      toY: 0 + 40, // old node p-1's y
      show: true,
    }
    lastIndex = 2
    message = '找到 p-1 在舊 children 的索引 = 0'
  }

  if (clicks >= 7) {
    // Click 7: Determine move needed
    lastIndex = 2
    message = '索引 0 < lastIndex 2，需要移動！'
  }

  if (clicks >= 8) {
    // Click 8: Explain move target
    lastIndex = 2
    message = 'p-1 需要移動到 p-3 後面（prevVNode 是 p-3）'
  }

  if (clicks >= 9) {
    // Click 9: Execute move animation - p-1 moves after p-3 (before p-4)
    // insert(p-1.el, container, p-3.el.nextSibling) => insert before p-4
    // So DOM order becomes [p-2, p-3, p-1, p-4]
    domNodes = [
      { key: 'p-1', oldIndex: 0, y: 160, highlight: true, removing: false }, // move to position 2 (after p-3, before p-4)
      { key: 'p-2', oldIndex: 1, y: 0, highlight: false, removing: false }, // move to position 0
      { key: 'p-3', oldIndex: 2, y: 80, highlight: false, removing: false }, // move to position 1
      { key: 'p-4', oldIndex: 3, y: 240, highlight: false, removing: false }, // move to position 3
    ]
    oldHighlight[0] = true
    connection = {
      fromY: 80 + 40,
      toY: 0 + 40,
      show: true,
    }
    lastIndex = 2
    message = '移動完成：真實 DOM 順序變為 [p-2, p-3, p-1, p-4]'
  }

  if (clicks >= 10) {
    // Click 10: Clear highlights, update complete
    newHighlight[1] = false
    oldHighlight[0] = false
    domHighlight[0] = false
    connection.show = false
    domNodes = [
      { key: 'p-2', oldIndex: 1, y: 0, highlight: false, removing: false },
      { key: 'p-3', oldIndex: 2, y: 80, highlight: false, removing: false },
      { key: 'p-1', oldIndex: 0, y: 160, highlight: false, removing: false },
      { key: 'p-4', oldIndex: 3, y: 240, highlight: false, removing: false },
    ]
    lastIndex = 2
    message = '✓ 更新階段完成！真實 DOM 順序為 [p-2, p-3, p-1, p-4]'
  }

  if (clicks >= 11) {
    // Click 11: Start unmount phase - check p-2
    oldHighlight[1] = true // Highlight p-2 in old children
    domHighlight[0] = true // Highlight p-2 in DOM
    message = '卸載階段：檢查舊節點 p-2 是否還在新 children 中'
  }

  if (clicks >= 12) {
    // Click 12: p-2 not found, mark for removal
    domNodes = domNodes.map(node =>
      node.key === 'p-2' ? { ...node, removing: true, highlight: true } : node,
    )
    message = 'p-2 不在新 children 中，需要卸載（unmount）'
  }

  if (clicks >= 13) {
    // Click 13: Remove p-2 with animation
    domNodes = domNodes.filter(node => node.key !== 'p-2')
    oldHighlight[1] = false
    domHighlight[0] = false
    message = 'p-2 已被移除！真實 DOM 順序變為 [p-3, p-1, p-4]'
  }

  if (clicks >= 14) {
    // Click 14: Check p-4
    oldHighlight[3] = true // Highlight p-4 in old children
    // Find p-4 in current DOM (index 1 now after p-2 removed)
    const p4DomIndex = domNodes.findIndex(n => n.key === 'p-4')
    if (p4DomIndex >= 0) {
      domHighlight[p4DomIndex] = true
      domNodes = domNodes.map((node, idx) =>
        idx === p4DomIndex ? { ...node, highlight: true } : node,
      )
    }
    message = '檢查舊節點 p-4 是否還在新 children 中'
  }

  if (clicks >= 15) {
    // Click 15: p-4 not found, mark for removal
    const p4DomIndex = domNodes.findIndex(n => n.key === 'p-4')
    domNodes = domNodes.map((node, idx) =>
      idx === p4DomIndex ? { ...node, removing: true } : node,
    )
    message = 'p-4 不在新 children 中，需要卸載（unmount）'
  }

  if (clicks >= 16) {
    // Click 16: Remove p-4 with animation
    domNodes = domNodes.filter(node => node.key !== 'p-4')
    oldHighlight[3] = false
    // Clear all DOM highlights after removal
    domHighlight[0] = false
    domHighlight[1] = false
    domHighlight[2] = false
    domHighlight[3] = false
    message = '✓ p-4 已被移除！最終 DOM 順序為 [p-3, p-1]'
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
  <div class="diff-animation-unmount">
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
              (會移動/刪除)
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
                :class="{ removing: node.removing }"
              >
                <rect
                  x="15"
                  y="15"
                  width="100"
                  height="50"
                  class="dom-node"
                  :class="[
                    { 'highlight-dom': node.highlight },
                    { 'removing-node': node.removing },
                  ]"
                  rx="6"
                />
                <text x="65" y="45" class="node-text-dom">{{ node.key }}</text>
                <text x="65" y="58" class="index-text">
                  舊 {{ node.oldIndex }}
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
            ({{ clicks }}/16)
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diff-animation-unmount {
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

.dom-node-group.removing {
  transition:
    transform 0.8s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.5s ease-out;
  opacity: 0;
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

.dom-node.removing-node {
  @apply fill-red-900/50 stroke-red-500 stroke-3;
  filter: drop-shadow(0 0 12px rgba(239, 68, 68, 0.8));
  animation: shake 0.5s ease-in-out;
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

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-3px);
  }
  75% {
    transform: translateX(3px);
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
