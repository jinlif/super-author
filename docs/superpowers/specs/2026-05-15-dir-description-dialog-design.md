# 目录/卷描述输入弹框设计

日期: 2026-05-15

## 目标

新建目录、新建卷、重命名目录时，支持同时输入描述内容，同步到 `book.json` 的 `dirDescriptions` 字段。

## 改动范围

### 1. 新建 `TwoFieldDialog` 组件

路径: `src/presentation/fileExplorer/TwoFieldDialog.tsx`

- 两个输入框: field1（名称，必填）+ field2（描述，选填）
- 样式与现有 `InputDialog` 保持一致
- 支持 Enter 提交、Escape 取消
- field2 支持 textarea（多行描述）

### 2. 修改 `FileExplorer` 对话框状态

新增 `twoFieldDialog` 相关状态和 `showTwoFieldDialog` 方法，返回 `Promise<{ field1: string; field2: string } | null>`。

### 3. 修改 `handleAction` 中的三个 action

| Action | 改动 |
|--------|------|
| `new_dir` | 弹 TwoFieldDialog（目录名 + 描述），创建后写入 `dirDescriptions` |
| `new_volume` | 弹 TwoFieldDialog（卷名 + 描述），创建后写入 `dirDescriptions` |
| `rename`（目录） | 弹 TwoFieldDialog（新名 + 描述），预填当前值，修改后更新 `dirDescriptions` |

`rename` 文件、`new_chapter` 等其他 action 不变。

### 4. `dirDescriptions` key 格式

使用相对于书籍根目录的路径，以 `/` 结尾：
- 新建目录: `chapters/新目录名/`
- 新建卷: `chapters/01_卷名/`
- 重命名: 删除旧 key，添加新 key

### 5. 数据流

```
TwoFieldDialog 返回 { name, description }
  → 创建/重命名目录
  → 更新 currentBook.dirDescriptions
  → BookRepository.updateBookMeta() 写入 book.json
  → refreshFileExplorer()
```
