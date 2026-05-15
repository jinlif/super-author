# react-mentions-ts 库文档

> 来源: [https://github.com/hbmartin/react-mentions-ts](https://github.com/hbmartin/react-mentions-ts)
> 版本: 查看 npm 最新版
> 用途: Phase 3.9a @文件引用增强

## 概述

React 组件，实现 Facebook/Twitter 风格的 @mentions 和标记功能，带完整 TypeScript 支持。

**核心能力：**

- 灵活的触发字符（`@`、`#`、`:` 等），支持自定义 RegExp
- 异步数据加载，带 debounce 和 AbortSignal 取消
- 光标感知：`data-mention-selection` 属性支持基于光标的样式
- 内联自动完成（ghost-text hints）
- Tailwind v4 就绪
- SSR 兼容

---

## 安装

```bash
npm install react-mentions-ts
```

peer dependencies: `react`、`react-dom`；Tailwind 样式需要 `class-variance-authority`、`clsx`、`tailwind-merge`

---

## 快速开始

```tsx
import { useState } from "react";
import { MentionsInput, Mention } from "react-mentions-ts";

const users = [{ id: "walter", display: "Walter White" }];

function MyComponent() {
  const [value, setValue] = useState("");
  return (
    <MentionsInput
      value={value}
      onMentionsChange={({ value: nextValue }) => setValue(nextValue)}
    >
      <Mention trigger="@" data={users} />
    </MentionsInput>
  );
}
```

---

## MentionsInput Props

| Prop                     | 类型                         | 默认值    | 说明                                                                                                        |
| ------------------------ | ---------------------------- | --------- | ----------------------------------------------------------------------------------------------------------- |
| value                    | string                       | ''        | 包含 mention markup 的值                                                                                    |
| onMentionsChange         | function                     | -         | markup 变更回调；payload: `{ trigger, value, plainTextValue, idValue, mentionId, mentions, previousValue }` |
| onMentionSelectionChange | function                     | -         | 光标/选择与 mentions 重叠时回调                                                                             |
| onKeyDown                | function                     | empty     | 按键回调                                                                                                    |
| singleLine               | boolean                      | false     | 单行输入                                                                                                    |
| autoResize               | boolean                      | false     | 自动调整高度                                                                                                |
| anchorMode               | 'caret' \| 'left'            | 'caret'   | 建议浮层跟随光标/固定左侧                                                                                   |
| suggestionsPlacement     | 'auto' \| 'above' \| 'below' | 'below'   | 建议浮层位置                                                                                                |
| suggestionsDisplay       | 'overlay' \| 'inline'        | 'overlay' | 浮层/内联自动完成                                                                                           |
| inputRef                 | ref                          | -         | 转发 input ref                                                                                              |
| spellCheck               | boolean                      | false     | 拼写检查                                                                                                    |
| a11ySuggestionsListLabel | string                       | ''        | 无障碍标签                                                                                                  |

### onMentionsChange payload

- `value`: 含 markup 的字符串（如 `"@[文件名](filePath)"`）
- `plainTextValue`: 纯文本版本
- `idValue`: id 替换 display 后的文本
- `mentions`: 提取的 mention 列表 `[{ id, display, ... }]`
- `trigger`: 变更原因 `{ type: 'input' | 'paste' | 'cut' | 'mention-add' | 'mention-remove' | 'insert-text' }`
- `previousValue`: 变更前的值

### Imperative API

```tsx
const ref = useRef<MentionsInputHandle>(null);
ref.current?.insertText("text"); // 在光标处插入文本
```

---

## Mention Props

| Prop             | 类型                        | 默认值                   | 说明                   |
| ---------------- | --------------------------- | ------------------------ | ---------------------- |
| trigger          | RegExp \| string            | '@'                      | 触发字符               |
| data             | array \| function           | -                        | 数据源或异步 provider  |
| renderSuggestion | function                    | -                        | 自定义建议渲染         |
| renderEmpty      | function                    | -                        | 无结果时渲染           |
| renderError      | function                    | -                        | 错误状态渲染           |
| markup           | string \| MentionSerializer | '@[**display**](__id__)' | 存储格式模板           |
| displayTransform | function                    | identity                 | 显示文本转换           |
| onAdd            | function                    | empty                    | 添加 mention 时回调    |
| appendSpaceOnAdd | boolean                     | false                    | 添加后追加空格         |
| debounceMs       | number                      | 0                        | 异步 provider debounce |
| maxSuggestions   | number                      | 不限                     | 建议数量上限           |

### Async data provider

```tsx
const fetchUsers = async (query: string, { signal }: MentionSearchContext) => {
  const res = await fetch(`/api/users?search=${query}`, { signal });
  return res.json();
};
<Mention trigger="@" data={fetchUsers} debounceMs={150} />;
```

支持游标分页（返回 `{ items, nextCursor, hasMore }`）。

### makeTriggerRegex

```ts
import { makeTriggerRegex } from "react-mentions-ts";

makeTriggerRegex("@"); // 默认
makeTriggerRegex("@", { allowSpaceInQuery: true }); // 允许空格
makeTriggerRegex("@", { ignoreAccents: true }); // 忽略重音
```

---

## 内容模型（Markup 格式）

默认：`@[__display__](__id__)` → 示例：`@[第一章](chapters/01.md)`

- `onMentionsChange` 返回的 `value` 包含 markup
- `plainTextValue` 是纯文本（`@第一章`）
- `idValue` 是 id 替换 display（`chapters/01.md`）

自定义 markup 使用 `createMarkupSerializer` 或实现 `MentionSerializer` 接口。

---

## 光标感知（data-mention-selection）

每个渲染的 mention 自动带 `data-mention-selection` 属性：

- `inside`: 光标在 mention 内部
- `boundary`: 光标在边界上
- `partial`: 部分选中
- `full`: 完全选中

```css
[data-mention-selection="inside"] {
  box-shadow: 0 0 0 2px #007acc44;
}
```

---

## 样式配置

内置 Tailwind utility classes。在项目中引入：

```css
@import "react-mentions-ts/styles/tailwind.css";
```

Tailwind v3 需要在 content 中添加：`./node_modules/react-mentions-ts/dist/**/*.{js,jsx,ts,tsx}`

也支持 className / inline styles 覆盖。
