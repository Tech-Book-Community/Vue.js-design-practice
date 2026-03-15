---
layout: center
highlighter: shiki
css: unocss
colorSchema: dark
transition: fade-out
mdc: true
glowSeed: 4
fonts:
  provider: none
---

# 第十七章：編譯器優化

---

## 17.1.1 傳統的 Diff 演算法比較問題

<div class="text-xl">

- 模板中需要變化的響應式資料: `text`
- 模板中不需要變化的響應式資料 `<div>` 標籤及其屬性: `id`, `class`

</div>

```html
<template>
  <div id="foo">
    <p class="bar">{{text}}</p>
  </div>
</template>
```

<div w="80%" h="30%" grid="~ place-items-center">
  <img src="/vue-compiler.png">
</div>

---

## 17.1.2 動態節點收集與補丁標誌（Patch Flag）

- Vue 3 渲染系統，這段 `template` 編譯成渲染函數時，它會生成一組 VNode（Virtual DOM 節點）。

```html
<template>
  <div>foo</div>
  <p class="bar">{{text}}</p>
</template>
```

```js
const vnodes =[
  // 第一個節點：<div>foo</div>
  {
    type: 'div',
    children: 'foo,
    patchFlag: -1  // 靜態節點，不需要追蹤更新
  },

  // 第二個節點：<p class="bar">{{text}}</p>
  {
    type: 'p',
    props: { class: 'bar' },
    children: text, // 這裡是動態綁定的變量
    patchFlag: 1    // 標記為 TEXT，告訴 Vue 更新時只需對比文字內容
  }
]
```

---

### 補丁標誌（Patch Flag）

[源碼](https://github.com/vuejs/core/blob/d61d8031f0d547fdb75ab3525e54ace790a4db82/packages/shared/src/patchFlags.ts#L4)

靜態節點是 -1, 為什麼補丁編號是 1, 2, 4, 8...

- `1 (TEXT)`：表示具有動態文字內容的節點。
- `2 (CLASS)`：表示具有動態 class 的節點。
- `4 (STYLE)`：表示具有動態 style 的節點。
- `8 (PROPS)`：表示具有動態屬性 (不包含 class/style) 的節點。
- `16 (FULL_PROPS)`：表示具有動態鍵名 (key) 的屬性。
- `32 (HYDRATE_EVENTS)`：表示帶有事件監聽器，需進行 Hydration 的節點。
- `64 (STABLE_FRAGMENT)`：表示子節點順序不會改變的 Fragment。
- `128 (KEYED_FRAGMENT)`：帶有 key 的子節點 Fragment。
- `256 (UNKEYED_FRAGMENT)`：沒有 key 的子節點 Fragment。

---

### 為什麼位元運算比對更有效率？

假設一個 v node 內可能包含多個動態補丁 `patchflag 1,2,3`

如果今天有一個節點同時擁有了「狀態 A,「狀態 B」,「狀態 C」，系統會將它們組合： `1 (0001) | 2 (0010) = 3 (0011)`。

- 狀態 A = 1（二進位 0001）
- 狀態 B = 2（二進位 0010）
- 狀態 C = 3（二進位 0011）

當系統（Diff 演算法）讀取到數字 3 時，它會感到錯亂，因為它完全無法分辨這個 3 到底是指`「它擁有獨立的狀態 C」，還是「它是狀態 A 與狀態 B 的組合體」`。

- 1 = 0001
- 2 = 0010
- 4 = 0100
- 8 = 1000

位元運算（數字）的記憶體特性：極小、連續、離 CPU 運算規則最近

---

## 17.1.2 dynamicChildren 動態陣列

Vue 3 編譯後，該元件最外層根節點的 `<div>` 會被建立為一個動態區塊 (Block) 陣列 - dynamicChildren 。

```js
const vnode = {
  type: "div",
  children: [
    { type: "span", children: "這是完全靜態的文字 1" },
    { type: "span", children: "這是完全靜態的文字 2" },
    { type: "span", children: "這是完全靜態的文字 3" },
    {
      type: "span",
      props: { class: ctx.dynamicClass },
      children: ctx.dynamicText,
      patchFlag: 3, // 🌟 補丁標誌：1 (文字) + 2 (Class) = 3
    },
  ],

  dynamicChildren: [
    {
      type: "span",
      props: { class: ctx.dynamicClass },
      children: ctx.dynamicText,
      patchFlag: 3, // 只有帶有 patchFlag 的動態節點，才會被收集到這個陣列！
    },
  ],
};
```

---

## 17.1.3 收集動態節點

「補丁標誌 (Patch Flag)」與「動態陣列 (dynamicChildren)」,交由`渲染函式 (render function)`，內部 `createVNode` 去執行細節

```js
function render(vnode, container) {
  createVNode("div", { id: "foo" }, [
    createVNode("p", { class: "bar" }, text, PtachFlag.TEXT),
  ]);
}
```

初始化建立 VNode 節點由內而外建立每一層的虛擬節點, `內層先執行 --> 外層後執行`

```js

function render() {
  return createVNode(
    'div',
    {},
    [createVNode('div',{}, [
      createVNode('div',{}, [
        createVNode('div',{}, [
          createVNode('div', {} [
            createVNode('span', {}, '1'),
            // ....
          ])
        ]),
      ])
    ])]
  )
}
```

---

## VNode 動態節點區塊(Block)的處理

[VNode 源碼](https://github.com/vuejs/core/blob/d61d8031f0d547fdb75ab3525e54ace790a4db82/packages/runtime-core/src/vnode.ts#L455)

動態節點需要透過 openBlock/closeBlock 的機制，這裡需要設計一個暫時性的 `dynmicChildrenStack` 陣列，用來收集動態節點，因為由內而外執行的限制，內部創建Vnode時，外層 Root Vnode 尚未完全建立

```js
// 1. 建立 VNode 時，如果發現有動態屬性或子節點，就呼叫 openBlock()
function render(ctx) {
  openBlock(); // 告訴 Vue：我要開始記錄動態節點了，請準備好收集動態節點的陣列！

  return createVNode("div", { id: "foo" }, [
    createVNode("span", {}, [createVNode("span", {}, "1")]),
    // ... 其他靜態節點
    createVNode(
      "span",
      { class: ctx.dynamicClass },
      ctx.dynamicText,
      3, // Patch Flag = 3 (文字 + Class)
    ),
  ]);
}
```

---

## createBlock- VNode Block 建立 (收集動態節點的箱子)

```js
export const blockStack: VNode['dynamicChildren'][] = []
export let currentBlock: VNode['dynamicChildren'] = null

export function openBlock(disableTracking = false): void {
  blockStack.push((currentBlock = disableTracking ? null : []))
}

export function closeBlock(): void {
  blockStack.pop()
  currentBlock = blockStack[blockStack.length - 1] || null
}
```

`createBlock` 建立一個「區塊根節點 (Block Root VNode)」，並負責為動態陣列進行「最終收網」與「封裝」的動作

```js
render ( {
  return (openBlock(), createBlock('div', { id: 'foo' }, [
    createVNode('p', { class: 'bar' }, text, PtachFlag.TEXT)
  ]))
})
```

---

## 源碼動態收集細節

[VNode 源碼](https://github.com/vuejs/core/blob/d61d8031f0d547fdb75ab3525e54ace790a4db82/packages/runtime-core/src/vnode.ts#L455)

- 提前宣告收集袋：編譯器會強制先呼叫 `openBlock()`，這會在全域變數中開啟一個名為 currentBlock 的空陣列（收集袋）。

- 子節點對號入座：接著系統開始由內而外建立節點。當最深層的動態 span 建立時，，只要看到自己有 `Patch Flag`，就直接把自己丟進全域的 `currentBlock` 陣列中。

- 父節點最後收網：當所有子節點都執行完畢，最後終於執行到最外層的父節點，賦值給這個父節點的 `dynamicChildren`。

```js
export function createElementBlock(
  type: string | typeof Fragment,
  props?: Record<string, any> | null,
  children?: any,
  patchFlag?: number,
  dynamicProps?: string[],
  shapeFlag?: number,
): VNode {
  return setupBlock(
    createBaseVNode(
      type,
      props,
      children,
      patchFlag,
      dynamicProps,
      shapeFlag,
      true /* isBlock */,
    ),
  )
}

```

---

## 17.1.4 渲染器的執行支援

[render.ts (815)](https://github.com/vuejs/core/blob/d61d8031f0d547fdb75ab3525e54ace790a4db82/packages/runtime-core/src/renderer.ts#L815)

- `dynamicChildren` 是陣列攤平 (Tree Flattening) 的陣列，如果該節點是一個 `「區塊 (Block)」`，帶有補丁標誌的子代節點會被收集到此。

<div class="grid grid-cols-2 gap-4">

```js
const patchElement = (oldVNode, newVNode, container, anchor, parentComponent, parentSuspense, optimized) => {
  // 取出當初 Block 的動態陣列
  let { patchFlag, dynamicChildren, dirs } = n2
  if (dynamicChildren) {
    patchBlockChildren(
      n1.dynamicChildren!,
      dynamicChildren,
      el,
      parentComponent,
      parentSuspense,
      resolveChildrenNamespace(n2, namespace),
      slotScopeIds,
    )
  } else if (!optimized) {
    // full diff
    patchChildren(
      n1,
      n2,
      el,
      null,
      parentComponent,
      parentSuspense,
      resolveChildrenNamespace(n2, namespace),
      slotScopeIds,
      false,
    )
  }
}
```

```js
if (patchFlag > 0) {
  // the presence of a patchFlag means this element's render code was
  // generated by the compiler and can take the fast path.
  // in this path old node and new node are guaranteed to have the same shape
  // (i.e. at the exact same position in the source template)
  if (patchFlag & PatchFlags.FULL_PROPS) {
    // element props contain dynamic keys, full diff needed
    patchProps(el, oldProps, newProps, parentComponent, namespace);
  } else {
    // class
    // this flag is matched when the element has dynamic class bindings.
    if (patchFlag & PatchFlags.CLASS) {
      if (oldProps.class !== newProps.class) {
        hostPatchProp(el, "class", null, newProps.class, namespace);
      }
    }
    // style
    // this flag is matched when the element has dynamic style bindings
    if (patchFlag & PatchFlags.STYLE) {
      hostPatchProp(el, "style", oldProps.style, newProps.style, namespace);
    }
  }
}
```

</div>

---

## 源碼多了一道 patchBlockChildren 處理的原因?

- `patchBlockChildren` 內部很重要的一項工作。因為 dynamicChildren 是一個「無視深度、被攤平」的陣列，這些動態節點在真實 DOM 中的父元素可能各不相同（例如有些在第 2 層的 div 裡，有些在第 5 層的 span 裡）。

- `Teleport`,`Suspense` 等特殊節點

```js

  for (let i = 0; i < newChildren.length; i++) {
      const oldVNode = oldChildren[i]
      const newVNode = newChildren[i]
      // Determine the container (parent element) for the patch.
      const container =
        // oldVNode may be an errored async setup() component inside Suspense
        // which will not have a mounted element
        oldVNode.el &&
        (oldVNode.type === Fragment ||
          !isSameVNodeType(oldVNode, newVNode) ||
          // - In the case of a component, it could contain anything.
          oldVNode.shapeFlag &
            (ShapeFlags.COMPONENT | ShapeFlags.TELEPORT | ShapeFlags.SUSPENSE))
          ? hostParentNode(oldVNode.el)!
          : fallbackContainer
      patch(
        oldVNode,
        newVNode,
        container,
        null,
        parentComponent,
        parentSuspense,
        namespace,
        slotScopeIds,
        true,
      )
    }

```

---

## 小結

Vue 3 編譯器優化的核心思想：**讓框架在編譯期就知道「哪些節點會變、怎麼變」，讓執行期的 Diff 只做必要的事。**

<div class="text-lg space-y-2">

**三個關鍵機制環環相扣：**

1. **Patch Flag（補丁標誌）** — 編譯期為動態節點打上標記，使用 2 的冪次方 (1, 2, 4, 8...) 以支援位元運算，讓 Diff 演算法一眼識別節點「哪裡動態、只更新那裡」

2. **dynamicChildren（動態陣列）** — 只收集帶有 Patch Flag 的節點，讓 Diff 不再需要遍歷整棵 VNode 樹，直接精準比對動態節點

3. **openBlock / closeBlock / createBlock** — 解決「由內而外」建立 VNode 的順序問題，透過全域 `currentBlock` 收集袋讓子節點自行登記，父節點(root)最後統一收網，完成 `dynamicChildren` 的組裝

</div>

> 傳統 Diff 是「全樹比對」；Vue 3 編譯優化後是「定點更新」——這就是 Vue 3 效能顯著提升的根本原因。

---
layout: center
---
# 17.2 Block 樹


---

## 17.2.1 帶有 v-if 指令的節點

前面提到元件內只有根結點會形成 `dynamicChildren`， 但我們尚未考量到內部有 `v-if`或`v-for`的節點，這些節點並不是一開始就固定的動態結構。

<div class="grid grid-cols-2 gap-4">

<div>
```html
<div>
  <section v-if="show">
    <p id="text-1">hello</p>
  </section>
   <section v-else>
    <p id="text-2">hello2</p>
  </section>
</div> 
```
</div>

<div>
只有當 foo 為 true 時，text-1 才會存在，因為動態節點尚未考量到虛擬DOM變化後，動態性結構的變化

```js
const block = {
  tag: 'div',
  dynamicChildren: [
    {
      tag: 'section',
      dynamicChildren: [
        {
          tag: 'p',
          props: {
            id: 'text-1'
          },
          children: 'hello'
        }
      ]
    }
  ]
}
```
</div>

</div>

---

## 17.2.1 帶有 v-if 指令的節點納入 Block 樹

```
Block(Div)
- Block(Section v-if)
- Block(Section v-else)
```

```js
const block = {
  tag: 'div',
  dynamicChildren: [
    {
      tag: 'section',
      /* Block(Section v-if) 或 Block(Section v-else) */
      dynamicChildren: [
        {
          tag: 'p',
          props: {
            id: 'text-1'
            key: 0,
          },
          children: 'hello'
        },
        {
          tag: 'p',
          props: {
            id: 'text-2',
            key: 1,
          },
          children: 'hello2'
        }
      ]
    },
  ]
}
```

---

## 17.2.2 帶有 v-for 指令的節點

相較於 ```v-if```，```v-for```節點數量會是根據響應性資料動態變化的，因此需要額外處理

```html
<div>
  <p v-for="(item, index) in items" :key="index">
    {{ item }}
  </p>
</div>

```

假設一開始我們有2筆資料，固定產生2個`<p>`標籤在 ```dynamicChildren```中，

- ```dynamicChildren```是一維的，後來v-for資料變動容易造成後面動態節點錯位
- ```v-for``` 操作也不一定是根節點元素

```js
const block = {
  tag: 'div',
  dynamicChildren: [
    {
      tag: 'p',
    },
    {
      tag: 'p',
    }
  ]
}
```

---

## 17.2.2 帶有 v-for 指令 以 Fragment 包裝成獨立區塊

```js
const block = {
  tag: 'div',
  // 一般 text/class/style 使用的動態節點
  dynamicChildren: [
    {
      tag: 'Fragment',
      // v-for產生的動態節點
      dynamicChildren: [
        {
          tag: 'p',
          props: {
            id: 'text-1'
            key: 0,
          },
          children: 'hello'
        },
      ]
    },
  ]
}


```
---

## 17.2.3 Fragment 的穩定性

`Fragment` 有自己的動態陣列 `dynamicChildren`，可以確保 v-for 產生的動態節點不會影響到其他節點

- `64 (STABLE_FRAGMENT)`：表示子節點順序不會改變的 Fragment。
- `128 (KEYED_FRAGMENT)`：帶有 key 的子節點 Fragment。
- `256 (UNKEYED_FRAGMENT)`：沒有 key 的子節點 Fragment。

```html
<div>
  <p v-for="(item, index) in items" :key="index">
    {{ item }}
  </p>
</div>
```

`Fragment` 會採用自身的 Array Diff 處理陣列

Fragment 區塊不依賴根節點第一層的動態子節點，依靠 Patch Flag（例如 128 KEYED_FRAGMENT 或 256 UNKEYED_FRAGMENT）。更新時，它會老老實實地啟動 `傳統的陣列 Diff 演算法`（包含最長遞增子序列 LIS 機制），來進行這些第一層子節點的順序比對與真實 DOM 搬移。

---

## 源碼對於Fragment的處理

[renderer.ts#processFragment](https://github.com/vuejs/core/blob/d61d8031f0d547fdb75ab3525e54ace790a4db82/packages/runtime-core/src/renderer.ts#L1038)

```js
const patchChildren: PatchChildrenFn = (
  // 略
  ) => {
    const c1 = n1 && n1.children
    const prevShapeFlag = n1 ? n1.shapeFlag : 0
    const c2 = n2.children

    const { patchFlag, shapeFlag } = n2
    // fast path
    if (patchFlag > 0) {
      if (patchFlag & PatchFlags.KEYED_FRAGMENT) {
        // this could be either fully-keyed or mixed (some keyed some not)
        // presence of patchFlag means children are guaranteed to be arrays
        patchKeyedChildren(
          // 略
        )
        return
      } else if (patchFlag & PatchFlags.UNKEYED_FRAGMENT) {
        // unkeyed
        patchUnkeyedChildren(
          // 略
        )
        return
      }
    }

```


---

### Vue 3 內部雙端 LIS 演算法 ( patchKeyedChildren)

在 Vue 3 的核心 Diff 演算法（也就是 patchKeyedChildren 函式）中，最長遞增子序列（LIS）是插在「去除了頭尾相同節點後，專門用來處理中間 ```(未知混亂序列（Unknown Sequence)```的移動與掛載階段


    舊陣列：[A, B, C, D, E, F, G]
    新陣列：[A, B, E, D, C, H, F, G] (字母代表節點的 Key)


- 取出剩下的中間序列 進行LIS比對：

     - 舊未處理：[C, D, E] (index: 2, 3, 4)
     - 新未處理：[E, D, C, H] (index: 2, 3, 4, 5)


---

### 圖解：Step 1 — 頭尾雙端比對（消除穩定邊界）

<div class="flex flex-col gap-4 mt-4">

<div>
  <div class="text-sm text-gray-400 mb-1">舊陣列</div>
  <div class="flex gap-2">
    <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-green-700 text-white">A</div>
    <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-green-700 text-white">B</div>
    <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-gray-600 text-white">C</div>
    <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-gray-600 text-white">D</div>
    <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-gray-600 text-white">E</div>
    <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-green-700 text-white">F</div>
    <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-green-700 text-white">G</div>
  </div>
</div>

<div>
  <div class="text-sm text-gray-400 mb-1">新陣列</div>
  <div class="flex gap-2">
    <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-green-700 text-white">A</div>
    <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-green-700 text-white">B</div>
    <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-gray-600 text-white">E</div>
    <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-gray-600 text-white">D</div>
    <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-gray-600 text-white">C</div>
    <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-blue-600 text-white">H</div>
    <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-green-700 text-white">F</div>
    <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-green-700 text-white">G</div>
  </div>
</div>

<div class="flex gap-6 text-sm mt-2">
  <span class="flex items-center gap-2"><span class="w-4 h-4 rounded bg-green-700 inline-block"></span> 頭尾雙端已匹配，無需處理</span>
  <span class="flex items-center gap-2"><span class="w-4 h-4 rounded bg-gray-600 inline-block"></span> 中間未知序列（需要 LIS 處理）</span>
  <span class="flex items-center gap-2"><span class="w-4 h-4 rounded bg-blue-600 inline-block"></span> 新節點（需要 mount）</span>
</div>

</div>

---

### 圖解：Step 2 — 建立 newIndexToOldIndexMap

將**舊的中間節點**對應到它們在**新序列中的位置**，建立映射陣列：

<div class="mt-4 flex flex-col gap-4">

<div class="flex gap-8 items-start">
<div>
  <div class="text-sm text-gray-400 mb-2">舊中間序列</div>
  <div class="flex gap-2">
    <div class="flex flex-col items-center gap-1">
      <div class="text-xs text-gray-400">old[2]</div>
      <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-orange-600 text-white">C</div>
    </div>
    <div class="flex flex-col items-center gap-1">
      <div class="text-xs text-gray-400">old[3]</div>
      <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-orange-600 text-white">D</div>
    </div>
    <div class="flex flex-col items-center gap-1">
      <div class="text-xs text-gray-400">old[4]</div>
      <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-orange-600 text-white">E</div>
    </div>
  </div>
</div>

<div class="text-2xl self-center text-gray-400">→</div>

<div>
  <div class="text-sm text-gray-400 mb-2">新中間序列（對應位置）</div>
  <div class="flex gap-2">
    <div class="flex flex-col items-center gap-1">
      <div class="text-xs text-gray-400">new[2]</div>
      <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-purple-600 text-white">E</div>
    </div>
    <div class="flex flex-col items-center gap-1">
      <div class="text-xs text-gray-400">new[3]</div>
      <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-purple-600 text-white">D</div>
    </div>
    <div class="flex flex-col items-center gap-1">
      <div class="text-xs text-gray-400">new[4]</div>
      <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-purple-600 text-white">C</div>
    </div>
    <div class="flex flex-col items-center gap-1">
      <div class="text-xs text-gray-400">new[5]</div>
      <div class="w-10 h-10 flex items-center justify-center rounded font-bold bg-blue-600 text-white">H</div>
    </div>
  </div>
</div>
</div>

<div class="mt-2 p-3 bg-gray-800 rounded text-sm font-mono">
  <div class="text-gray-400 mb-1">// newIndexToOldIndexMap（值 = 舊 index + 1，0 代表全新節點）</div>
  <div>
    <span class="text-yellow-300">newIndexToOldIndexMap</span> = [
    <span class="text-green-300">5</span>,&nbsp;
    <span class="text-green-300">4</span>,&nbsp;
    <span class="text-green-300">3</span>,&nbsp;
    <span class="text-blue-300">0</span>
    ]
  </div>
  <div class="text-gray-400 mt-1 text-xs">
    // E(old[4]+1=5), D(old[3]+1=4), C(old[2]+1=3), H(新節點=0)
  </div>
</div>

</div>

---

### 圖解：Step 3 — 求 LIS，決定誰不需要移動

對 `[5, 4, 3, 0]` 求最長遞增子序列（LIS）：

<div class="mt-4 flex flex-col gap-4">

<div class="p-3 bg-gray-800 rounded font-mono text-sm">
  <div class="text-gray-400">// 忽略 0（全新節點），對 [5, 4, 3] 求 LIS</div>
  <div class="mt-1">序列 <span class="text-yellow-300">[5, 4, 3]</span> 完全遞減 → LIS 長度 = 1</div>
  <div class="mt-1 text-green-300">LIS = [3]（值 3 在 index 2，對應 C）</div>
</div>

<div class="flex gap-2 mt-2">
  <div class="flex flex-col items-center gap-1">
    <div class="text-xs text-gray-400">map[0] = 5（E）</div>
    <div class="w-16 h-10 flex items-center justify-center rounded font-bold bg-red-600 text-white text-sm">移動 E</div>
  </div>
  <div class="flex flex-col items-center gap-1">
    <div class="text-xs text-gray-400">map[1] = 4（D）</div>
    <div class="w-16 h-10 flex items-center justify-center rounded font-bold bg-red-600 text-white text-sm">移動 D</div>
  </div>
  <div class="flex flex-col items-center gap-1">
    <div class="text-xs text-gray-400">map[2] = 3（C）✓ LIS</div>
    <div class="w-16 h-10 flex items-center justify-center rounded font-bold bg-green-600 text-white text-sm">不動 C</div>
  </div>
  <div class="flex flex-col items-center gap-1">
    <div class="text-xs text-gray-400">map[3] = 0（H）</div>
    <div class="w-16 h-10 flex items-center justify-center rounded font-bold bg-blue-600 text-white text-sm">掛載 H</div>
  </div>
</div>

<div class="flex gap-4 text-sm mt-2">
  <span class="flex items-center gap-2"><span class="w-4 h-4 rounded bg-green-600 inline-block"></span> LIS 節點：位置正確，不移動</span>
  <span class="flex items-center gap-2"><span class="w-4 h-4 rounded bg-red-600 inline-block"></span> 非 LIS：需要 insertBefore 移動</span>
  <span class="flex items-center gap-2"><span class="w-4 h-4 rounded bg-blue-600 inline-block"></span> 新節點：patch 掛載</span>
</div>

</div>

---

### 圖解：Step 4 — 從後往前掃，執行移動與掛載

倒序遍歷新中間序列 `[E, D, C, H]`，以下一個穩定節點作為錨點（anchor）：

<div class="mt-3 flex flex-col gap-3 text-sm">

<div v-click class="flex items-center gap-3 p-2 rounded bg-gray-800">
  <div class="w-6 h-6 flex items-center justify-center rounded-full bg-green-700 text-white text-xs font-bold">F</div>
  <div class="text-gray-400">anchor = F（尾端穩定節點）</div>
</div>

<div v-click class="flex items-center gap-3 p-2 rounded bg-gray-800">
  <div class="w-8 h-8 flex items-center justify-center rounded font-bold bg-blue-600 text-white">H</div>
  <div>map[3] = <span class="text-blue-300">0</span> → <span class="text-blue-300">patch 掛載 H</span>，insertBefore(H, F)</div>
</div>

<div v-click class="flex items-center gap-3 p-2 rounded bg-gray-800">
  <div class="w-8 h-8 flex items-center justify-center rounded font-bold bg-green-600 text-white">C</div>
  <div>map[2] = <span class="text-green-300">3</span> → <span class="text-green-300">在 LIS 中，跳過不移動</span>，anchor 更新為 C</div>
</div>

<div v-click class="flex items-center gap-3 p-2 rounded bg-gray-800">
  <div class="w-8 h-8 flex items-center justify-center rounded font-bold bg-red-500 text-white">D</div>
  <div>map[1] = <span class="text-yellow-300">4</span> → <span class="text-red-400">insertBefore(D, C)</span>，anchor 更新為 D</div>
</div>

<div v-click class="flex items-center gap-3 p-2 rounded bg-gray-800">
  <div class="w-8 h-8 flex items-center justify-center rounded font-bold bg-red-500 text-white">E</div>
  <div>map[0] = <span class="text-yellow-300">5</span> → <span class="text-red-400">insertBefore(E, D)</span></div>
</div>

<div v-click class="mt-1 p-2 rounded bg-green-900 text-green-300 font-mono text-xs">
  最終順序：A B [E D C H] F G ✓
</div>

</div>

---