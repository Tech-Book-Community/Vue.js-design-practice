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
    patchFlag: 0  // 靜態節點，不需要追蹤更新
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

為什麼補丁編號是 1, 2, 4, 8...

- ```1 (TEXT)```：表示具有動態文字內容的節點。
- ```2 (CLASS)```：表示具有動態 class 的節點。
- ```4 (STYLE)```：表示具有動態 style 的節點。
- ```8 (PROPS)```：表示具有動態屬性 (不包含 class/style) 的節點。
- ```16 (FULL_PROPS)```：表示具有動態鍵名 (key) 的屬性。
- ```32 (HYDRATE_EVENTS)```：表示帶有事件監聽器，需進行 Hydration 的節點。
- ```64 (STABLE_FRAGMENT)```：表示子節點順序不會改變的 Fragment。
- ```128 (KEYED_FRAGMENT)```：帶有 key 的子節點 Fragment。
- ```256 (UNKEYED_FRAGMENT)```：沒有 key 的子節點 Fragment。

---

### 為什麼位元運算比對更有效率？

假設一個 v node 內可能包含多個動態補丁 ```patchflag 1,2,3```

如果今天有一個節點同時擁有了「狀態 A,「狀態 B」,「狀態 C」，系統會將它們組合： ```1 (0001) | 2 (0010) = 3 (0011)```。  
    
- 狀態 A = 1（二進位 0001）
- 狀態 B = 2（二進位 0010）
- 狀態 C = 3（二進位 0011）

當系統（Diff 演算法）讀取到數字 3 時，它會感到錯亂，因為它完全無法分辨這個 3 到底是指```「它擁有獨立的狀態 C」，還是「它是狀態 A 與狀態 B 的組合體」```。

- 1 = 0001
- 2 = 0010
- 4 = 0100
- 8 = 1000

位元運算（數字）的記憶體特性：極小、連續、離 CPU 運算規則最近


---

## 17.1.2 dynamicChildren 動態陣列

Vue 3 編譯後，該元件最外層根節點的 ```<div>``` 會被建立為一個動態區塊 (Block) 陣列 - dynamicChildren 。

```js
const vnode = {
  type: 'div',
  children: [
    { type: 'span', children: '這是完全靜態的文字 1' }, 
    { type: 'span', children: '這是完全靜態的文字 2' },
    { type: 'span', children: '這是完全靜態的文字 3' },
    { 
      type: 'span', 
      props: { class: ctx.dynamicClass }, 
      children: ctx.dynamicText, 
      patchFlag: 3  // 🌟 補丁標誌：1 (文字) + 2 (Class) = 3
    }
  ],

  dynamicChildren: [
    { 
      type: 'span', 
      props: { class: ctx.dynamicClass }, 
      children: ctx.dynamicText, 
      patchFlag: 3  // 只有帶有 patchFlag 的動態節點，才會被收集到這個陣列！
    }
  ]
}
```

---

## 17.1.3 收集動態節點

「補丁標誌 (Patch Flag)」與「動態陣列 (dynamicChildren)」,交由渲染函式 (render function)，內部```createVnode```去執行細節


---

## 17.1.3  createVnode 內層向外層執行

---