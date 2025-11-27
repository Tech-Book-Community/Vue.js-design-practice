<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  clicks: number;
}>();

interface Node {
  key: string;
  y: number;
  highlight: boolean;
}

// 舊：[p-1, p-2, p-3, p-4]
// 新：[p-4, p-2, p-1, p-3]

const oldChildren = [
  { key: "p-1", index: 0, y: 0 },
  { key: "p-2", index: 1, y: 80 },
  { key: "p-3", index: 2, y: 160 },
  { key: "p-4", index: 3, y: 240 },
];

const newChildren = [
  { key: "p-4", index: 0, y: 0 },
  { key: "p-2", index: 1, y: 80 },
  { key: "p-1", index: 2, y: 160 },
  { key: "p-3", index: 3, y: 240 },
];

const currentState = computed(() => {
  const clicks = props.clicks;

  let oldStartIdx = 0;
  let oldEndIdx = 3;
  let newStartIdx = 0;
  let newEndIdx = 3;

  // 用於顯示灰色的 index（延後一個 click 更新，讓移動動畫完成後再變灰）
  let displayOldStartIdx = 0;
  let displayOldEndIdx = 3;
  let displayNewStartIdx = 0;
  let displayNewEndIdx = 3;

  // 保持陣列順序一致，只改變 y 值來實現平滑動畫
  // 初始 DOM: [p-1, p-2, p-3, p-4] -> y: [0, 80, 160, 240]
  let domNodes: Node[] = [
    { key: "p-1", y: 0, highlight: false },
    { key: "p-2", y: 80, highlight: false },
    { key: "p-3", y: 160, highlight: false },
    { key: "p-4", y: 240, highlight: false },
  ];

  let message = "初始狀態：DOM [p-1, p-2, p-3, p-4]";
  let step = "初始狀態";
  let comparing: string[] = [];
  let connection = {
    fromY: 0,
    toY: 0,
    type: "start" as "start" | "end" | "match",
    show: false,
  };

  // ===== 第一輪：找到 oldEnd(p-4) = newStart(p-4) =====
  if (clicks >= 1) {
    step = "第一輪";
    comparing = ["newStart", "oldStart"];
    connection = { fromY: 0 + 40, toY: 0 + 40, type: "start", show: true };
    message = "①：newStart(p-4) vs oldStart(p-1) ❌";
  }

  if (clicks >= 2) {
    comparing = ["newEnd", "oldEnd"];
    connection = { fromY: 240 + 40, toY: 240 + 40, type: "end", show: true };
    message = "②：newEnd(p-3) vs oldEnd(p-4) ❌";
  }

  if (clicks >= 3) {
    comparing = ["newEnd", "oldStart"];
    connection = { fromY: 240 + 40, toY: 0 + 40, type: "end", show: true };
    message = "③：newEnd(p-3) vs oldStart(p-1) ❌";
  }

  if (clicks >= 4) {
    comparing = ["newStart", "oldEnd"];
    connection = { fromY: 0 + 40, toY: 240 + 40, type: "match", show: true };
    // 配對成功，先 highlight p-4
    domNodes = [
      { key: "p-1", y: 0, highlight: false },
      { key: "p-2", y: 80, highlight: false },
      { key: "p-3", y: 160, highlight: false },
      { key: "p-4", y: 240, highlight: true },
    ];
    message = "④：newStart(p-4) vs oldEnd(p-4) ✅ 命中！";
  }

  if (clicks >= 5) {
    // DOM: [p-4, p-1, p-2, p-3] -> p-4 移到最前面
    // 保持陣列順序 [p-1, p-2, p-3, p-4]，只改變 y 值
    domNodes = [
      { key: "p-1", y: 80, highlight: false },
      { key: "p-2", y: 160, highlight: false },
      { key: "p-3", y: 240, highlight: false },
      { key: "p-4", y: 0, highlight: true },
    ];
    oldEndIdx = 2;
    newStartIdx = 1;
    comparing = [];
    connection.show = false;
    message = "移動 p-4 到頭部，DOM: [p-4, p-1, p-2, p-3]";
  }

  // ===== 第二輪 =====
  if (clicks >= 6) {
    step = "第二輪";
    // DOM 仍然是 [p-4, p-1, p-2, p-3]
    domNodes = [
      { key: "p-1", y: 80, highlight: false },
      { key: "p-2", y: 160, highlight: false },
      { key: "p-3", y: 240, highlight: false },
      { key: "p-4", y: 0, highlight: false },
    ];
    oldEndIdx = 2;
    newStartIdx = 1;
    // 進入第二輪時，第一輪處理的節點變灰
    displayOldEndIdx = 2;
    displayNewStartIdx = 1;
    comparing = ["newStart", "oldStart"];
    connection = { fromY: 80 + 40, toY: 0 + 40, type: "start", show: true };
    message = "①：newStart(p-2) vs oldStart(p-1) ❌";
  }

  if (clicks >= 7) {
    comparing = ["newEnd", "oldEnd"];
    connection = { fromY: 240 + 40, toY: 160 + 40, type: "match", show: true };
    // 配對成功，先 highlight p-3
    domNodes = [
      { key: "p-1", y: 80, highlight: false },
      { key: "p-2", y: 160, highlight: false },
      { key: "p-3", y: 240, highlight: true },
      { key: "p-4", y: 0, highlight: false },
    ];
    message = "②：newEnd(p-3) vs oldEnd(p-3) ✅ 命中！";
  }

  if (clicks >= 8) {
    // DOM 仍然是 [p-4, p-1, p-2, p-3]，p-3 不移動只 patch
    domNodes = [
      { key: "p-1", y: 80, highlight: false },
      { key: "p-2", y: 160, highlight: false },
      { key: "p-3", y: 240, highlight: true },
      { key: "p-4", y: 0, highlight: false },
    ];
    oldEndIdx = 1;
    newEndIdx = 2;
    comparing = [];
    connection.show = false;
    message = "尾尾相同，不移動，只 patch";
  }

  // ===== 第三輪 =====
  if (clicks >= 9) {
    step = "第三輪";
    // DOM 仍然是 [p-4, p-1, p-2, p-3]
    domNodes = [
      { key: "p-1", y: 80, highlight: false },
      { key: "p-2", y: 160, highlight: false },
      { key: "p-3", y: 240, highlight: false },
      { key: "p-4", y: 0, highlight: false },
    ];
    oldEndIdx = 1;
    newEndIdx = 2;
    // 進入第三輪時，第二輪處理的節點變灰
    displayOldEndIdx = 1;
    displayNewEndIdx = 2;
    comparing = ["newStart", "oldStart"];
    // newStart(p-2) at y=80, oldStart(p-1) at y=0
    connection = { fromY: 80 + 40, toY: 0 + 40, type: "start", show: true };
    message = "①：newStart(p-2) vs oldStart(p-1) ❌";
  }

  if (clicks >= 10) {
    comparing = ["newEnd", "oldEnd"];
    // newEnd(p-1) at y=160, oldEnd(p-2) at y=80
    connection = { fromY: 160 + 40, toY: 80 + 40, type: "end", show: true };
    message = "②：newEnd(p-1) vs oldEnd(p-2) ❌";
  }

  if (clicks >= 11) {
    comparing = ["newEnd", "oldStart"];
    // newEnd(p-1) at y=160, oldStart(p-1) at y=0
    connection = { fromY: 160 + 40, toY: 0 + 40, type: "match", show: true };
    // 配對成功，先 highlight p-1
    domNodes = [
      { key: "p-1", y: 80, highlight: true },
      { key: "p-2", y: 160, highlight: false },
      { key: "p-3", y: 240, highlight: false },
      { key: "p-4", y: 0, highlight: false },
    ];
    message = "③：newEnd(p-1) vs oldStart(p-1) ✅ 命中！";
  }

  if (clicks >= 12) {
    // DOM: [p-4, p-2, p-1, p-3] -> p-1 移到 p-3 前面
    domNodes = [
      { key: "p-1", y: 160, highlight: true },
      { key: "p-2", y: 80, highlight: false },
      { key: "p-3", y: 240, highlight: false },
      { key: "p-4", y: 0, highlight: false },
    ];
    oldStartIdx = 1;
    newEndIdx = 1;
    comparing = [];
    connection.show = false;
    message = "移動 p-1 到尾部，DOM: [p-4, p-2, p-1, p-3]";
  }

  // ===== 第四輪 =====
  if (clicks >= 13) {
    step = "第四輪";
    // DOM 仍然是 [p-4, p-2, p-1, p-3]
    // 配對成功，先 highlight p-2
    domNodes = [
      { key: "p-1", y: 160, highlight: false },
      { key: "p-2", y: 80, highlight: true },
      { key: "p-3", y: 240, highlight: false },
      { key: "p-4", y: 0, highlight: false },
    ];
    oldStartIdx = 1;
    oldEndIdx = 1;
    newStartIdx = 1;
    newEndIdx = 1;
    // 進入第四輪時，第三輪處理的節點變灰
    displayOldStartIdx = 1;
    displayNewEndIdx = 1;
    comparing = ["newStart", "oldStart"];
    connection = { fromY: 80 + 40, toY: 80 + 40, type: "match", show: true };
    message = "①：newStart(p-2) vs oldStart(p-2) ✅ 命中！";
  }

  if (clicks >= 14) {
    // DOM 仍然是 [p-4, p-2, p-1, p-3]，p-2 不移動只 patch
    domNodes = [
      { key: "p-1", y: 160, highlight: false },
      { key: "p-2", y: 80, highlight: true },
      { key: "p-3", y: 240, highlight: false },
      { key: "p-4", y: 0, highlight: false },
    ];
    oldStartIdx = 2;
    oldEndIdx = 1;
    newStartIdx = 2;
    newEndIdx = 1;
    comparing = [];
    connection.show = false;
    message = "頭頭相同，不移動，只 patch";
  }

  // ===== 完成 =====
  if (clicks >= 15) {
    step = "完成";
    // 最終 DOM: [p-4, p-2, p-1, p-3]
    domNodes = [
      { key: "p-1", y: 160, highlight: false },
      { key: "p-2", y: 80, highlight: false },
      { key: "p-3", y: 240, highlight: false },
      { key: "p-4", y: 0, highlight: false },
    ];
    // 完成時，所有節點都變灰
    displayOldStartIdx = 2;
    displayOldEndIdx = 1;
    displayNewStartIdx = 2;
    displayNewEndIdx = 1;
    message = "✓ 完成！共 2 次移動（簡單 Diff 需要 3 次）";
  }

  const getOldHighlight = (idx: number) => {
    if (comparing.includes("oldStart") && idx === oldStartIdx) return "start";
    if (comparing.includes("oldEnd") && idx === oldEndIdx) return "end";
    return "";
  };

  const getNewHighlight = (idx: number) => {
    if (comparing.includes("newStart") && idx === newStartIdx) return "start";
    if (comparing.includes("newEnd") && idx === newEndIdx) return "end";
    return "";
  };

  // 判斷節點是否已處理完成（在索引範圍外）
  // 使用 display* 變數，讓變灰效果延後一個 click
  const isOldProcessed = (idx: number) => {
    return idx < displayOldStartIdx || idx > displayOldEndIdx;
  };

  const isNewProcessed = (idx: number) => {
    return idx < displayNewStartIdx || idx > displayNewEndIdx;
  };

  return {
    oldChildren: oldChildren.map((node, idx) => ({
      ...node,
      highlightType: getOldHighlight(idx),
      processed: isOldProcessed(idx),
    })),
    newChildren: newChildren.map((node, idx) => ({
      ...node,
      highlightType: getNewHighlight(idx),
      processed: isNewProcessed(idx),
    })),
    domNodes,
    oldStartIdx,
    oldEndIdx,
    newStartIdx,
    newEndIdx,
    message,
    step,
    comparing,
    connection,
  };
});
</script>

<template>
  <div class="diff-animation-double-ended">
    <div class="content-wrapper">
      <div class="main-layout">
        <div class="layers-grid">
          <!-- New children -->
          <div class="layer-column">
            <div class="layer-title">
              <div class="i-carbon:document-add text-sm" />
              <span>新子節點</span>
            </div>
            <div class="layer-subtitle">(newChildren)</div>
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
                  :class="{
                    'highlight-start': node.highlightType === 'start',
                    'highlight-end': node.highlightType === 'end',
                    processed: node.processed,
                  }"
                  rx="6"
                />
                <text
                  x="65"
                  :y="node.y + 45"
                  class="node-text"
                  :class="{ 'text-processed': node.processed }"
                >
                  {{ node.key }}
                </text>
              </g>
            </svg>
          </div>

          <!-- Connection area -->
          <div class="connection-column">
            <div class="layer-title opacity-0"><span>連線</span></div>
            <div class="layer-subtitle opacity-0">-</div>
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
                :class="{
                  'line-start': currentState.connection.type === 'start',
                  'line-end': currentState.connection.type === 'end',
                  'line-match': currentState.connection.type === 'match',
                }"
              />
              <circle
                v-if="currentState.connection.show"
                cx="0"
                :cy="currentState.connection.fromY + 15"
                r="4"
                class="connection-dot"
                :class="{
                  'dot-start': currentState.connection.type === 'start',
                  'dot-end': currentState.connection.type === 'end',
                  'dot-match': currentState.connection.type === 'match',
                }"
              />
              <circle
                v-if="currentState.connection.show"
                cx="80"
                :cy="currentState.connection.toY + 15"
                r="4"
                class="connection-dot"
                :class="{
                  'dot-start': currentState.connection.type === 'start',
                  'dot-end': currentState.connection.type === 'end',
                  'dot-match': currentState.connection.type === 'match',
                }"
              />
            </svg>
          </div>

          <!-- Old children -->
          <div class="layer-column">
            <div class="layer-title">
              <div class="i-carbon:document text-sm" />
              <span>舊子節點</span>
            </div>
            <div class="layer-subtitle">(oldChildren)</div>
            <svg
              width="100%"
              height="320"
              viewBox="0 0 130 320"
              class="layer-svg"
            >
              <g
                v-for="node in currentState.oldChildren"
                :key="`old-${node.key}`"
              >
                <rect
                  x="15"
                  :y="node.y + 15"
                  width="100"
                  height="50"
                  class="old-node"
                  :class="{
                    'highlight-start': node.highlightType === 'start',
                    'highlight-end': node.highlightType === 'end',
                    processed: node.processed,
                  }"
                  rx="6"
                />
                <text
                  x="65"
                  :y="node.y + 45"
                  class="node-text"
                  :class="{ 'text-processed': node.processed }"
                >
                  {{ node.key }}
                </text>
              </g>
            </svg>
          </div>

          <!-- Real DOM -->
          <div class="layer-column dom-column">
            <div class="layer-title">
              <div class="i-carbon:html text-sm" />
              <span>真實 DOM</span>
            </div>
            <div class="layer-subtitle">(會移動)</div>
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
              >
                <rect
                  x="15"
                  y="15"
                  width="100"
                  height="50"
                  class="dom-node"
                  :class="{ 'highlight-dom': node.highlight }"
                  rx="6"
                />
                <text x="65" y="45" class="node-text-dom">{{ node.key }}</text>
              </g>
            </svg>
          </div>
        </div>

        <!-- Info panel -->
        <div class="info-panel">
          <div class="step-badge">
            {{ currentState.step }}
          </div>

          <div class="compare-box">
            <div class="compare-title">當前比較</div>
            <div class="compare-items">
              <template v-if="currentState.comparing.length > 0">
                <span
                  v-for="c in currentState.comparing"
                  :key="c"
                  class="compare-item"
                  :class="{
                    'is-start': c.includes('Start'),
                    'is-end': c.includes('End'),
                  }"
                >
                  {{ c }}
                </span>
              </template>
              <span v-else class="compare-item is-none">--</span>
            </div>
          </div>

          <div class="message-box">
            <div class="message-content">
              <div class="text-sm">{{ currentState.message }}</div>
            </div>
          </div>

          <div class="index-display">
            <div class="index-row">
              <span class="index-label">old:</span>
              <span class="index-value start"
                >S={{ currentState.oldStartIdx }}</span
              >
              <span class="index-value end"
                >E={{ currentState.oldEndIdx }}</span
              >
            </div>
            <div class="index-row">
              <span class="index-label">new:</span>
              <span class="index-value start"
                >S={{ currentState.newStartIdx }}</span
              >
              <span class="index-value end"
                >E={{ currentState.newEndIdx }}</span
              >
            </div>
          </div>

          <div class="hint">點擊或按空格鍵查看下一步</div>
          <div class="hint-progress">({{ clicks }}/15)</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diff-animation-double-ended {
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

/* New node styles */
.new-node {
  @apply fill-green-900/30 stroke-green-500 stroke-2;
  transition: all 0.3s ease;
}

.new-node.highlight-start {
  @apply fill-cyan-900/50 stroke-cyan-400 stroke-3;
  filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.6));
}

.new-node.highlight-end {
  @apply fill-orange-900/50 stroke-orange-400 stroke-3;
  filter: drop-shadow(0 0 8px rgba(251, 146, 60, 0.6));
}

/* Old node styles */
.old-node {
  @apply fill-blue-900/30 stroke-blue-500 stroke-2;
  transition: all 0.3s ease;
}

.old-node.highlight-start {
  @apply fill-cyan-900/50 stroke-cyan-400 stroke-3;
  filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.6));
}

.old-node.highlight-end {
  @apply fill-orange-900/50 stroke-orange-400 stroke-3;
  filter: drop-shadow(0 0 8px rgba(251, 146, 60, 0.6));
}

/* Processed node styles - gray with dashed border */
.new-node.processed,
.old-node.processed {
  @apply fill-neutral-800/30 stroke-neutral-500;
  stroke-dasharray: 4 2;
}

.text-processed {
  @apply fill-neutral-500;
}

/* DOM node styles */
.dom-node {
  @apply fill-purple-900/30 stroke-purple-500 stroke-2;
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.dom-node.highlight-dom {
  @apply fill-green-900/50 stroke-green-400 stroke-3;
  filter: drop-shadow(0 0 10px rgba(74, 222, 128, 0.7));
  animation: pulse 1s ease-in-out infinite;
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

.node-text {
  @apply fill-neutral-200 font-bold;
  font-size: 14px;
  text-anchor: middle;
  pointer-events: none;
}

.node-text-dom {
  @apply fill-purple-200 font-bold;
  font-size: 14px;
  text-anchor: middle;
  pointer-events: none;
}

/* Connection line styles */
.connection-line {
  stroke-width: 2;
  stroke-dasharray: 4;
  animation: dash 1s linear infinite;
}

.connection-line.line-start {
  @apply stroke-cyan-400;
}

.connection-line.line-end {
  @apply stroke-orange-400;
}

.connection-line.line-match {
  @apply stroke-green-400;
  stroke-dasharray: none;
  stroke-width: 3;
  filter: drop-shadow(0 0 6px rgba(74, 222, 128, 0.6));
}

.connection-dot.dot-start {
  @apply fill-cyan-400;
}

.connection-dot.dot-end {
  @apply fill-orange-400;
}

.connection-dot.dot-match {
  @apply fill-green-400;
  filter: drop-shadow(0 0 6px rgba(74, 222, 128, 0.8));
}

@keyframes dash {
  to {
    stroke-dashoffset: -8;
  }
}

/* Info panel styles */
.step-badge {
  @apply text-center px-4 py-1.5 rounded-full bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 font-bold;
  font-size: 12px;
  width: fit-content;
  margin: 0 auto;
}

.compare-box {
  @apply p-3 rounded-lg bg-neutral-800/50 border border-neutral-600;
}

.compare-title {
  @apply text-xs text-neutral-400 text-center mb-2;
}

.compare-items {
  @apply flex justify-center gap-2;
}

.compare-item {
  @apply px-3 py-1 rounded text-xs font-mono;
}

.compare-item.is-start {
  @apply bg-cyan-900/50 text-cyan-300 border border-cyan-500/50;
}

.compare-item.is-end {
  @apply bg-orange-900/50 text-orange-300 border border-orange-500/50;
}

.compare-item.is-none {
  @apply bg-neutral-800/50 text-neutral-500 border border-neutral-600;
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

.index-display {
  @apply p-3 rounded-lg bg-neutral-800/30 font-mono text-xs;
}

.index-row {
  @apply flex items-center gap-3 justify-center;
}

.index-label {
  @apply text-neutral-400;
  width: 32px;
}

.index-value {
  @apply px-2 py-1 rounded;
}

.index-value.start {
  @apply bg-cyan-900/30 text-cyan-300;
}

.index-value.end {
  @apply bg-orange-900/30 text-orange-300;
}

.hint {
  @apply text-center text-xs text-neutral-400 italic;
}

.hint-progress {
  @apply text-center text-xs text-neutral-500 font-mono mt-1;
}
</style>
