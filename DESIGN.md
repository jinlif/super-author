# 设计规范

## 主题

暗色主题，基于 VS Code 暗色色板。

| 用途 | 色值 |
|---|---|
| 主色调（强调/聚焦） | `#3b82f6` |
| 主色调 hover | `#2563eb` |
| 主色调浅色（选中项背景） | `rgba(59, 130, 246, 0.12)` |
| 主色调文字（选中项） | `#60a5fa` |
| 危险色 | `#ef4444` |
| 输入框背景 | `rgba(0, 0, 0, 0.2)` |
| 输入框边框 | `rgba(255, 255, 255, 0.08)` |
| 卡片背景 | `rgba(255, 255, 255, 0.02)` |
| 卡片边框 | `rgba(255, 255, 255, 0.04)` |
| 主文字 | `rgba(255, 255, 255, 0.85)` |
| 次文字 | `rgba(255, 255, 255, 0.65)` |
| 提示文字 | `rgba(255, 255, 255, 0.25)` |
| 标题文字 | `rgba(255, 255, 255, 0.35)` |

## 表单控件尺寸

- 输入框、选择框、按钮等表单控件统一高度：**28px**
- 与输入框同行的按钮必须保持相同高度，确保视觉对齐
- 使用 `box-sizing: border-box`，高度包含 border
- 圆角：输入框/按钮 `6px`，卡片 `8px`

## 字体

- 正文/UI：`-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif`
- 等宽数字/代码：`'SF Mono', 'Cascadia Code', 'Fira Code', monospace`

## 图标库

- 图标库：`lucide-react`（轻量、tree-shakeable、线性风格）
- 默认尺寸：`14px`（工具栏图标）、`16px`（按钮内图标）
- 颜色跟随父元素 `color`
