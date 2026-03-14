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

- 提前宣告收集袋：編譯器會強制先呼叫 ```openBlock()```，這會在全域變數中開啟一個名為 currentBlock 的空陣列（收集袋）。

- 子節點對號入座：接著系統開始由內而外建立節點。當最深層的動態 span 建立時，，只要看到自己有 ```Patch Flag```，就直接把自己丟進全域的 ```currentBlock``` 陣列中。

- 父節點最後收網：當所有子節點都執行完畢，最後終於執行到最外層的父節點，賦值給這個父節點的 ```dynamicChildren```。


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

## 小結

Vue 3 編譯器優化的核心思想：**讓框架在編譯期就知道「哪些節點會變、怎麼變」，讓執行期的 Diff 只做必要的事。**

<div class="text-lg space-y-2">

**三個關鍵機制環環相扣：**

1. **Patch Flag（補丁標誌）** — 編譯期為動態節點打上標記，使用 2 的冪次方 (1, 2, 4, 8...) 以支援位元運算，讓 Diff 演算法一眼識別節點「哪裡動態、只更新那裡」

2. **dynamicChildren（動態陣列）** — 只收集帶有 Patch Flag 的節點，讓 Diff 不再需要遍歷整棵 VNode 樹，直接精準比對動態節點

3. **openBlock / closeBlock / createBlock** — 解決「由內而外」建立 VNode 的順序問題，透過全域 `currentBlock` 收集袋讓子節點自行登記，父節點最後統一收網，完成 `dynamicChildren` 的組裝

</div>

> 傳統 Diff 是「全樹比對」；Vue 3 編譯優化後是「定點更新」——這就是 Vue 3 效能顯著提升的根本原因。

---