# 超级作者 - Phase 1 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 Tauri v2 + React + TypeScript 项目骨架，实现 VS Code 风格的四面板布局（活动栏 + 侧边栏 + 编辑器 + 面板）

**Architecture:** Tauri v2 提供桌面壳（Rust 层仅做文件系统/窗口），React 19 SPA 运行在 WebView 中，前端采用分层架构（Presentation → Application → Domain → Infrastructure），Monaco Editor 作为编辑器核心

**Tech Stack:** Tauri v2, React 19, TypeScript 5, Vite 5, Monaco Editor, Tailwind CSS, Zustand, Vitest, Biome

---

## 文件结构总览

Phase 1 完成后，项目文件结构如下（仅列出本阶段创建的文件）：

```
super-author/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── biome.json
├── index.html
├── src/
│   ├── main.tsx                    # React 入口
│   ├── App.tsx                     # 根组件，布局容器
│   ├── App.css                     # Tailwind 引入 + 全局样式
│   ├── presentation/
│   │   ├── layout/
│   │   │   ├── Layout.tsx          # 四面板布局
│   │   │   └── Layout.css
│   │   ├── activityBar/
│   │   │   ├── ActivityBar.tsx     # 左侧活动栏
│   │   │   └── ActivityBar.css
│   │   ├── sidebar/
│   │   │   ├── Sidebar.tsx         # 侧边栏面板
│   │   │   └── Sidebar.css
│   │   ├── editor/
│   │   │   ├── EditorPanel.tsx     # 编辑区容器
│   │   │   ├── EditorPanel.css
│   │   │   └── tabs/
│   │   │       ├── EditorTabs.tsx  # 标签栏
│   │   │       └── EditorTabs.css
│   │   └── agentPanel/
│   │       ├── AgentPanel.tsx      # Agent 对话面板
│   │       └── AgentPanel.css
│   ├── application/
│   │   └── stores/
│   │       ├── layoutStore.ts      # 布局状态（面板显隐/尺寸）
│   │       └── editorStore.ts      # 编辑器状态（打开的文件标签等）
│   └── domain/
│       └── types/
│           └── layout.ts           # 布局相关类型定义
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   ├── src/
│   │   └── main.rs                 # Rust 入口（Tauri 壳，仅窗口创建）
│   ├── icons/                      # 应用图标
│   └── capabilities/
│       └── default.json            # Tauri v2 权限配置
└── tests/
    └── layout/
        └── Layout.test.tsx         # 布局组件渲染测试
```

---

## 前置准备

### Task 0: 环境检查 & 项目初始化

**Files:**
- Create: 整个项目骨架

- [ ] **Step 1: 检查必需工具版本**

```bash
node --version          # 期望 >= 20.x
npm --version           # 期望 >= 10.x
rustc --version         # 期望 >= 1.77
cargo --version
```

- [ ] **Step 2: 使用 Tauri v2 官方脚手架创建项目**

```bash
npm create tauri-app@latest super-author -- --template react-ts --manager npm
cd super-author
```

选择: React + TypeScript + Vite + npm

- [ ] **Step 3: 安装依赖并验证能运行**

```bash
cd super-author
npm install
npm run tauri dev
```

期望：桌面窗口打开，显示默认 React 页面。

- [ ] **Step 4: 安装额外依赖**

```bash
npm install \
  zustand \
  @tauri-apps/api@^2 \
  @tauri-apps/plugin-fs@^2 \
  @tauri-apps/plugin-dialog@^2
```

```bash
npm install -D \
  @types/react@^19 \
  tailwindcss@^3 \
  postcss \
  autoprefixer \
  vitest \
  @testing-library/react \
  @testing-library/jest-dom \
  jsdom \
  @biomejs/biome
```

- [ ] **Step 5: 提交**

```bash
git init
git add -A
git commit -m "chore: 初始化 Tauri v2 + React + TypeScript 项目"
```

---

## 基础设施配置

### Task 1: Tailwind CSS 配置

**Files:**
- Create: `tailwind.config.js`, `postcss.config.js`
- Modify: `src/App.css`

- [ ] **Step 1: 初始化 Tailwind 配置**

```bash
npx tailwindcss init -p
```

- [ ] **Step 2: 配置 `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // VS Code 暗色主题基础色
        'vscode-bg': '#1e1e1e',
        'vscode-sidebar': '#252526',
        'vscode-activity': '#333333',
        'vscode-panel': '#1e1e1e',
        'vscode-border': '#3c3c3c',
        'vscode-text': '#cccccc',
        'vscode-active': '#37373d',
        'vscode-hover': '#2a2d2e',
      },
      height: {
        'activity-icon': '48px',
      },
      width: {
        'activity-bar': '48px',
        'sidebar': '280px',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: 替换 `src/App.css` 为 Tailwind 基础样式**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  overflow: hidden;
  background-color: #1e1e1e;
  color: #cccccc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

- [ ] **Step 4: 验证 Tailwind 生效**

修改 `src/App.tsx` 添加测试类名：

```tsx
function App() {
  return <div className="bg-vscode-bg text-vscode-text h-full">Tailwind OK</div>
}
```

运行 `npm run tauri dev` 确认样式生效。

- [ ] **Step 5: 提交**

```bash
git add tailwind.config.js postcss.config.js src/App.css src/App.tsx
git commit -m "chore: 配置 Tailwind CSS + VS Code 暗色主题色板"
```

### Task 2: Biome Lint 配置

**Files:**
- Create: `biome.json`

- [ ] **Step 1: 初始化 Biome 配置**

```bash
npx biome init
```

- [ ] **Step 2: 配置 `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "include": ["src/**/*.ts", "src/**/*.tsx", "tests/**/*.ts", "tests/**/*.tsx"],
    "ignore": ["src-tauri/**", "dist/**", "node_modules/**"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "semicolons": "asNeeded",
      "trailingCommas": "all"
    }
  }
}
```

- [ ] **Step 3: 添加 npm 脚本**

修改 `package.json` 添加：

```json
{
  "scripts": {
    "lint": "biome check src/ tests/",
    "lint:fix": "biome check --fix src/ tests/",
    "format": "biome format --write src/ tests/"
  }
}
```

- [ ] **Step 4: 运行 lint 验证**

```bash
npm run lint
```

期望：无错误。

- [ ] **Step 5: 提交**

```bash
git add biome.json package.json
git commit -m "chore: 配置 Biome linter + formatter"
```

### Task 3: Vitest 测试环境配置

**Files:**
- Create: `vitest.config.ts`, `tests/setup.ts`

- [ ] **Step 1: 创建 `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 2: 创建 `tests/setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 3: 添加 test 脚本到 `package.json`**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 4: 提交**

```bash
git add vitest.config.ts tests/setup.ts package.json
git commit -m "chore: 配置 Vitest + React Testing Library"
```

---

## 领域类型定义

### Task 4: 布局类型定义

**Files:**
- Create: `src/domain/types/layout.ts`

- [ ] **Step 1: 创建 `src/domain/types/layout.ts`**

```ts
// 活动栏项目标识
export type ActivityBarItem = 'files' | 'search' | 'characters' | 'settings'

// 侧边栏面板类型
export type SidebarPanel = 'explorer' | 'search' | 'characters' | null

// Agent 面板位置
export type AgentPosition = 'right' | 'bottom' | 'floating'

// 面板尺寸
export interface PanelSizes {
  sidebar: number      // 侧边栏宽度 (px)
  agent: number        // Agent 面板宽度/高度 (px)
}

// 编辑器标签
export interface EditorTab {
  id: string
  filePath: string
  fileName: string
  isDirty: boolean      // 是否有未保存修改
}

// 布局状态
export interface LayoutState {
  activeActivity: ActivityBarItem | null
  sidebarPanel: SidebarPanel
  sidebarVisible: boolean
  agentPosition: AgentPosition
  agentVisible: boolean
  panelSizes: PanelSizes
}
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/domain/types/layout.ts
git commit -m "feat: 定义布局相关类型 LayoutState, EditorTab, PanelSizes"
```

---

## 状态管理

### Task 5: 布局状态 Store

**Files:**
- Create: `src/application/stores/layoutStore.ts`
- Create: `tests/stores/layoutStore.test.ts`

- [ ] **Step 1: 创建 `src/application/stores/layoutStore.ts`**

```ts
import { create } from 'zustand'
import type { ActivityBarItem, SidebarPanel, AgentPosition, PanelSizes } from '../../domain/types/layout'

interface LayoutStore {
  // 状态
  activeActivity: ActivityBarItem | null
  sidebarPanel: SidebarPanel
  sidebarVisible: boolean
  agentPosition: AgentPosition
  agentVisible: boolean
  panelSizes: PanelSizes

  // 操作
  setActiveActivity: (item: ActivityBarItem) => void
  toggleSidebar: () => void
  setSidebarPanel: (panel: SidebarPanel) => void
  setAgentPosition: (pos: AgentPosition) => void
  toggleAgent: () => void
  setSidebarWidth: (width: number) => void
  setAgentSize: (size: number) => void
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  activeActivity: null,
  sidebarPanel: null,
  sidebarVisible: true,
  agentPosition: 'right',
  agentVisible: true,
  panelSizes: {
    sidebar: 280,
    agent: 360,
  },

  setActiveActivity: (item) =>
    set((state) => ({
      activeActivity: state.activeActivity === item ? null : item,
      sidebarVisible: true,
    })),

  toggleSidebar: () =>
    set((state) => ({ sidebarVisible: !state.sidebarVisible })),

  setSidebarPanel: (panel) => set({ sidebarPanel: panel }),

  setAgentPosition: (pos) => set({ agentPosition: pos }),

  toggleAgent: () =>
    set((state) => ({ agentVisible: !state.agentVisible })),

  setSidebarWidth: (width) =>
    set((state) => ({
      panelSizes: { ...state.panelSizes, sidebar: Math.max(180, Math.min(500, width)) },
    })),

  setAgentSize: (size) =>
    set((state) => ({
      panelSizes: { ...state.panelSizes, agent: Math.max(200, Math.min(800, size)) },
    })),
}))
```

- [ ] **Step 2: 创建 `tests/stores/layoutStore.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useLayoutStore } from '../../src/application/stores/layoutStore'

describe('layoutStore', () => {
  beforeEach(() => {
    useLayoutStore.setState({
      activeActivity: null,
      sidebarPanel: null,
      sidebarVisible: true,
      agentPosition: 'right',
      agentVisible: true,
      panelSizes: { sidebar: 280, agent: 360 },
    })
  })

  it('初始状态正确', () => {
    const state = useLayoutStore.getState()
    expect(state.sidebarVisible).toBe(true)
    expect(state.agentVisible).toBe(true)
    expect(state.agentPosition).toBe('right')
    expect(state.panelSizes.sidebar).toBe(280)
  })

  it('toggleSidebar 切换侧边栏可见性', () => {
    useLayoutStore.getState().toggleSidebar()
    expect(useLayoutStore.getState().sidebarVisible).toBe(false)
    useLayoutStore.getState().toggleSidebar()
    expect(useLayoutStore.getState().sidebarVisible).toBe(true)
  })

  it('toggleAgent 切换 Agent 面板可见性', () => {
    useLayoutStore.getState().toggleAgent()
    expect(useLayoutStore.getState().agentVisible).toBe(false)
    useLayoutStore.getState().toggleAgent()
    expect(useLayoutStore.getState().agentVisible).toBe(true)
  })

  it('setSidebarWidth 限制在 [180, 500] 范围', () => {
    useLayoutStore.getState().setSidebarWidth(100)
    expect(useLayoutStore.getState().panelSizes.sidebar).toBe(180)
    useLayoutStore.getState().setSidebarWidth(600)
    expect(useLayoutStore.getState().panelSizes.sidebar).toBe(500)
    useLayoutStore.getState().setSidebarWidth(300)
    expect(useLayoutStore.getState().panelSizes.sidebar).toBe(300)
  })

  it('setActiveActivity 切换活动栏项目', () => {
    useLayoutStore.getState().setActiveActivity('files')
    expect(useLayoutStore.getState().activeActivity).toBe('files')
    // 再次点击取消选中
    useLayoutStore.getState().setActiveActivity('files')
    expect(useLayoutStore.getState().activeActivity).toBe(null)
  })
})
```

- [ ] **Step 3: 运行测试确认失败**

```bash
npx vitest run tests/stores/layoutStore.test.ts
```

期望：所有测试 PASS。

- [ ] **Step 4: 提交**

```bash
git add src/application/stores/layoutStore.ts tests/stores/layoutStore.test.ts
git commit -m "feat: 实现布局状态管理 layoutStore"
```

### Task 6: 编辑器状态 Store

**Files:**
- Create: `src/application/stores/editorStore.ts`
- Create: `tests/stores/editorStore.test.ts`

- [ ] **Step 1: 创建 `src/application/stores/editorStore.ts`**

```ts
import { create } from 'zustand'
import type { EditorTab } from '../../domain/types/layout'

interface EditorStore {
  tabs: EditorTab[]
  activeTabId: string | null

  openFile: (filePath: string, fileName: string) => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  markDirty: (tabId: string, dirty: boolean) => void
}

let nextId = 1

export const useEditorStore = create<EditorStore>((set) => ({
  tabs: [],
  activeTabId: null,

  openFile: (filePath, fileName) =>
    set((state) => {
      // 检查是否已打开
      const existing = state.tabs.find((t) => t.filePath === filePath)
      if (existing) {
        return { activeTabId: existing.id }
      }
      const id = `tab-${nextId++}`
      const newTab: EditorTab = {
        id,
        filePath,
        fileName,
        isDirty: false,
      }
      return {
        tabs: [...state.tabs, newTab],
        activeTabId: id,
      }
    }),

  closeTab: (tabId) =>
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.id === tabId)
      const newTabs = state.tabs.filter((t) => t.id !== tabId)
      let newActiveId = state.activeTabId
      if (state.activeTabId === tabId) {
        if (newTabs.length > 0) {
          // 选相邻的 tab
          const newIdx = Math.min(idx, newTabs.length - 1)
          newActiveId = newTabs[newIdx]!.id
        } else {
          newActiveId = null
        }
      }
      return { tabs: newTabs, activeTabId: newActiveId }
    }),

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  markDirty: (tabId, dirty) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isDirty: dirty } : t)),
    })),
}))
```

- [ ] **Step 2: 创建 `tests/stores/editorStore.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from '../../src/application/stores/editorStore'

describe('editorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({ tabs: [], activeTabId: null })
  })

  it('初始状态无标签', () => {
    const state = useEditorStore.getState()
    expect(state.tabs).toHaveLength(0)
    expect(state.activeTabId).toBeNull()
  })

  it('openFile 打开新标签', () => {
    useEditorStore.getState().openFile('/book/chapters/01.md', '01-开篇.md')
    const state = useEditorStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0]!.fileName).toBe('01-开篇.md')
    expect(state.activeTabId).toBe(state.tabs[0]!.id)
  })

  it('openFile 同名文件不重复打开', () => {
    useEditorStore.getState().openFile('/book/chapters/01.md', '01-开篇.md')
    useEditorStore.getState().openFile('/book/chapters/01.md', '01-开篇.md')
    expect(useEditorStore.getState().tabs).toHaveLength(1)
  })

  it('closeTab 移除标签并切换到相邻', () => {
    const store = useEditorStore.getState()
    store.openFile('/a.md', 'a.md')
    store.openFile('/b.md', 'b.md')
    store.openFile('/c.md', 'c.md')
    expect(useEditorStore.getState().tabs).toHaveLength(3)

    // 关闭中间 tab
    const bTab = useEditorStore.getState().tabs[1]!
    useEditorStore.getState().closeTab(bTab.id)
    expect(useEditorStore.getState().tabs).toHaveLength(2)
  })

  it('markDirty 标记未保存', () => {
    useEditorStore.getState().openFile('/a.md', 'a.md')
    const tab = useEditorStore.getState().tabs[0]!
    useEditorStore.getState().markDirty(tab.id, true)
    expect(useEditorStore.getState().tabs[0]!.isDirty).toBe(true)
  })
})
```

- [ ] **Step 3: 运行测试**

```bash
npx vitest run tests/stores/editorStore.test.ts
```

期望：所有测试 PASS。

- [ ] **Step 4: 提交**

```bash
git add src/application/stores/editorStore.ts tests/stores/editorStore.test.ts
git commit -m "feat: 实现编辑器状态管理 editorStore"
```

---

## UI 组件

### Task 7: ActivityBar 组件

**Files:**
- Create: `src/presentation/activityBar/ActivityBar.tsx`
- Create: `src/presentation/activityBar/ActivityBar.css`

- [ ] **Step 1: 创建 `src/presentation/activityBar/ActivityBar.tsx`**

```tsx
import { useLayoutStore } from '../../application/stores/layoutStore'
import type { ActivityBarItem } from '../../domain/types/layout'
import './ActivityBar.css'

interface ActivityIcon {
  id: ActivityBarItem
  label: string
  icon: string
}

const items: ActivityIcon[] = [
  { id: 'files', label: '文件', icon: '📁' },
  { id: 'search', label: '搜索', icon: '🔍' },
  { id: 'characters', label: '角色', icon: '👤' },
  { id: 'settings', label: '设置', icon: '⚙️' },
]

export function ActivityBar() {
  const activeActivity = useLayoutStore((s) => s.activeActivity)
  const setActiveActivity = useLayoutStore((s) => s.setActiveActivity)

  return (
    <div className="activity-bar">
      {items.map((item) => (
        <button
          key={item.id}
          className={`activity-icon ${activeActivity === item.id ? 'active' : ''}`}
          onClick={() => setActiveActivity(item.id)}
          title={item.label}
        >
          <span className="activity-icon-emoji">{item.icon}</span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: 创建 `src/presentation/activityBar/ActivityBar.css`**

```css
.activity-bar {
  width: 48px;
  height: 100%;
  background-color: #333333;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 4px;
  flex-shrink: 0;
  border-right: 1px solid #3c3c3c;
}

.activity-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #858585;
  cursor: pointer;
  position: relative;
  transition: color 0.15s;
}

.activity-icon:hover {
  color: #cccccc;
}

.activity-icon.active {
  color: #ffffff;
}

.activity-icon.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background-color: #ffffff;
}

.activity-icon-emoji {
  font-size: 20px;
  line-height: 1;
}
```

- [ ] **Step 3: 提交**

```bash
git add src/presentation/activityBar/
git commit -m "feat: 实现活动栏组件 ActivityBar"
```

### Task 8: Sidebar 组件

**Files:**
- Create: `src/presentation/sidebar/Sidebar.tsx`
- Create: `src/presentation/sidebar/Sidebar.css`

- [ ] **Step 1: 创建 `src/presentation/sidebar/Sidebar.tsx`**

```tsx
import { useLayoutStore } from '../../application/stores/layoutStore'
import './Sidebar.css'

export function Sidebar() {
  const visible = useLayoutStore((s) => s.sidebarVisible)
  const width = useLayoutStore((s) => s.panelSizes.sidebar)
  const activeActivity = useLayoutStore((s) => s.activeActivity)

  if (!visible) return null

  return (
    <div className="sidebar" style={{ width }}>
      <div className="sidebar-header">
        <span className="sidebar-title">
          {activeActivity === 'files' && '资源管理器'}
          {activeActivity === 'search' && '搜索'}
          {activeActivity === 'characters' && '角色管理'}
          {!activeActivity && '资源管理器'}
        </span>
      </div>
      <div className="sidebar-content">
        {/* Phase 2 填充具体内容（书籍列表、章节树等） */}
        <p className="sidebar-placeholder">选择书籍开始写作</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 `src/presentation/sidebar/Sidebar.css`**

```css
.sidebar {
  height: 100%;
  background-color: #252526;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-right: 1px solid #3c3c3c;
}

.sidebar-header {
  height: 35px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #858585;
  font-weight: 600;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.sidebar-placeholder {
  padding: 16px 20px;
  color: #858585;
  font-size: 13px;
}
```

- [ ] **Step 3: 提交**

```bash
git add src/presentation/sidebar/
git commit -m "feat: 实现侧边栏组件 Sidebar"
```

### Task 9: EditorPanel + EditorTabs 组件

**Files:**
- Create: `src/presentation/editor/EditorPanel.tsx`
- Create: `src/presentation/editor/EditorPanel.css`
- Create: `src/presentation/editor/tabs/EditorTabs.tsx`
- Create: `src/presentation/editor/tabs/EditorTabs.css`

- [ ] **Step 1: 创建 `src/presentation/editor/tabs/EditorTabs.tsx`**

```tsx
import { useEditorStore } from '../../../application/stores/editorStore'
import './EditorTabs.css'

export function EditorTabs() {
  const tabs = useEditorStore((s) => s.tabs)
  const activeTabId = useEditorStore((s) => s.activeTabId)
  const setActiveTab = useEditorStore((s) => s.setActiveTab)
  const closeTab = useEditorStore((s) => s.closeTab)

  if (tabs.length === 0) return null

  return (
    <div className="editor-tabs">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`editor-tab ${tab.id === activeTabId ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className="tab-label">
            {tab.isDirty && <span className="tab-dirty">●</span>}
            {tab.fileName}
          </span>
          <button
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation()
              closeTab(tab.id)
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: 创建 `src/presentation/editor/tabs/EditorTabs.css`**

```css
.editor-tabs {
  height: 35px;
  background-color: #252526;
  display: flex;
  overflow-x: auto;
  flex-shrink: 0;
}

.editor-tab {
  height: 35px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  background-color: #2d2d2d;
  border-right: 1px solid #1e1e1e;
  cursor: pointer;
  font-size: 13px;
  color: #858585;
  white-space: nowrap;
  user-select: none;
  min-width: 0;
}

.editor-tab.active {
  background-color: #1e1e1e;
  color: #ffffff;
}

.editor-tab:hover {
  background-color: #1e1e1e;
}

.tab-label {
  margin-right: 8px;
}

.tab-dirty {
  margin-right: 4px;
  color: #ffffff;
  font-size: 8px;
}

.tab-close {
  background: none;
  border: none;
  color: #858585;
  cursor: pointer;
  font-size: 16px;
  padding: 0 2px;
  border-radius: 3px;
  line-height: 1;
}

.tab-close:hover {
  background-color: #3c3c3c;
  color: #ffffff;
}
```

- [ ] **Step 3: 创建 `src/presentation/editor/EditorPanel.tsx`**

```tsx
import { useEditorStore } from '../../application/stores/editorStore'
import { EditorTabs } from './tabs/EditorTabs'
import './EditorPanel.css'

export function EditorPanel() {
  const tabs = useEditorStore((s) => s.tabs)
  const activeTabId = useEditorStore((s) => s.activeTabId)

  return (
    <div className="editor-panel">
      <EditorTabs />
      <div className="editor-content">
        {tabs.length === 0 ? (
          <div className="editor-welcome">
            <div className="welcome-content">
              <h1>超级作者</h1>
              <p>打开文件开始写作</p>
            </div>
          </div>
        ) : (
          <div className="editor-area">
            {/* Monaco Editor 将在 Phase 2 集成 */}
            <textarea
              className="editor-placeholder"
              readOnly
              value="编辑器区域 — Phase 2 集成 Monaco Editor"
            />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 创建 `src/presentation/editor/EditorPanel.css`**

```css
.editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background-color: #1e1e1e;
}

.editor-content {
  flex: 1;
  overflow: hidden;
}

.editor-welcome {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-content {
  text-align: center;
  color: #858585;
}

.welcome-content h1 {
  font-size: 24px;
  font-weight: 300;
  margin-bottom: 8px;
  color: #cccccc;
}

.editor-area {
  height: 100%;
}

.editor-placeholder {
  width: 100%;
  height: 100%;
  background: none;
  border: none;
  color: #858585;
  padding: 20px;
  font-size: 14px;
  resize: none;
}
```

- [ ] **Step 5: 提交**

```bash
git add src/presentation/editor/
git commit -m "feat: 实现编辑器面板 EditorPanel + 标签栏 EditorTabs"
```

### Task 10: AgentPanel 组件

**Files:**
- Create: `src/presentation/agentPanel/AgentPanel.tsx`
- Create: `src/presentation/agentPanel/AgentPanel.css`

- [ ] **Step 1: 创建 `src/presentation/agentPanel/AgentPanel.tsx`**

```tsx
import { useLayoutStore } from '../../application/stores/layoutStore'
import './AgentPanel.css'

export function AgentPanel() {
  const visible = useLayoutStore((s) => s.agentVisible)
  const position = useLayoutStore((s) => s.agentPosition)
  const size = useLayoutStore((s) => s.panelSizes.agent)
  const toggleAgent = useLayoutStore((s) => s.toggleAgent)

  if (!visible) return null

  const isRight = position === 'right'

  return (
    <div
      className={`agent-panel ${isRight ? 'agent-right' : 'agent-bottom'}`}
      style={isRight ? { width: size } : { height: size }}
    >
      <div className="agent-header">
        <span className="agent-title">AI 助手</span>
        <div className="agent-actions">
          <button className="agent-action-btn" onClick={toggleAgent} title="关闭">
            ×
          </button>
        </div>
      </div>
      <div className="agent-body">
        <div className="agent-messages">
          {/* Phase 3 填充对话内容 */}
          <p className="agent-placeholder">AI 写作助手已就绪</p>
        </div>
        <div className="agent-input-area">
          <textarea
            className="agent-input"
            placeholder="输入写作指令..."
            rows={2}
          />
          <button className="agent-send-btn">发送</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 `src/presentation/agentPanel/AgentPanel.css`**

```css
.agent-panel {
  background-color: #1e1e1e;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.agent-right {
  width: 360px;
  height: 100%;
  border-left: 1px solid #3c3c3c;
}

.agent-bottom {
  height: 300px;
  width: 100%;
  border-top: 1px solid #3c3c3c;
}

.agent-header {
  height: 35px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #3c3c3c;
}

.agent-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #858585;
  font-weight: 600;
}

.agent-action-btn {
  background: none;
  border: none;
  color: #858585;
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
  border-radius: 3px;
}

.agent-action-btn:hover {
  background-color: #3c3c3c;
  color: #ffffff;
}

.agent-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.agent-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.agent-placeholder {
  color: #858585;
  font-size: 13px;
}

.agent-input-area {
  padding: 8px 12px;
  border-top: 1px solid #3c3c3c;
  display: flex;
  gap: 8px;
}

.agent-input {
  flex: 1;
  background-color: #3c3c3c;
  border: 1px solid #555;
  border-radius: 4px;
  color: #cccccc;
  padding: 8px;
  font-size: 13px;
  resize: none;
  outline: none;
  font-family: inherit;
}

.agent-input:focus {
  border-color: #007acc;
}

.agent-send-btn {
  align-self: flex-end;
  padding: 6px 14px;
  background-color: #007acc;
  border: none;
  border-radius: 3px;
  color: #ffffff;
  font-size: 13px;
  cursor: pointer;
}

.agent-send-btn:hover {
  background-color: #005a9e;
}
```

- [ ] **Step 3: 提交**

```bash
git add src/presentation/agentPanel/
git commit -m "feat: 实现 Agent 对话面板 AgentPanel"
```

### Task 11: Layout 根组件 — 组装四面板

**Files:**
- Create: `src/presentation/layout/Layout.tsx`
- Create: `src/presentation/layout/Layout.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建 `src/presentation/layout/Layout.tsx`**

```tsx
import { ActivityBar } from '../activityBar/ActivityBar'
import { Sidebar } from '../sidebar/Sidebar'
import { EditorPanel } from '../editor/EditorPanel'
import { AgentPanel } from '../agentPanel/AgentPanel'
import './Layout.css'

export function Layout() {
  return (
    <div className="layout">
      <ActivityBar />
      <Sidebar />
      <EditorPanel />
      <AgentPanel />
    </div>
  )
}
```

- [ ] **Step 2: 创建 `src/presentation/layout/Layout.css`**

```css
.layout {
  width: 100%;
  height: 100%;
  display: flex;
}
```

- [ ] **Step 3: 修改 `src/App.tsx`**

```tsx
import { Layout } from './presentation/layout/Layout'
import './App.css'

function App() {
  return <Layout />
}

export default App
```

- [ ] **Step 4: 提交**

```bash
git add src/presentation/layout/ src/App.tsx src/App.css
git commit -m "feat: 组装四面板布局 Layout 根组件"
```

### Task 12: 布局集成测试

**Files:**
- Create: `tests/layout/Layout.test.tsx`

- [ ] **Step 1: 创建 `tests/layout/Layout.test.tsx`**

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Layout } from '../../src/presentation/layout/Layout'
import { useLayoutStore } from '../../src/application/stores/layoutStore'
import { useEditorStore } from '../../src/application/stores/editorStore'

describe('Layout', () => {
  beforeEach(() => {
    useLayoutStore.setState({
      activeActivity: null,
      sidebarPanel: null,
      sidebarVisible: true,
      agentPosition: 'right',
      agentVisible: true,
      panelSizes: { sidebar: 280, agent: 360 },
    })
    useEditorStore.setState({ tabs: [], activeTabId: null })
  })

  it('渲染四个面板区域', () => {
    render(<Layout />)
    // ActivityBar 有四个按钮
    expect(screen.getByTitle('文件')).toBeInTheDocument()
    expect(screen.getByTitle('搜索')).toBeInTheDocument()
    expect(screen.getByTitle('角色')).toBeInTheDocument()
    expect(screen.getByTitle('设置')).toBeInTheDocument()
    // 编辑区欢迎页
    expect(screen.getByText('超级作者')).toBeInTheDocument()
    // Agent 面板
    expect(screen.getByText('AI 助手')).toBeInTheDocument()
  })

  it('可以通过 toggleAgent 隐藏 Agent 面板', () => {
    useLayoutStore.getState().toggleAgent()
    render(<Layout />)
    expect(screen.queryByText('AI 助手')).not.toBeInTheDocument()
  })

  it('可以通过 toggleSidebar 隐藏侧边栏', () => {
    useLayoutStore.getState().toggleSidebar()
    render(<Layout />)
    expect(screen.queryByText('资源管理器')).not.toBeInTheDocument()
  })

  it('打开文件后显示标签', () => {
    useEditorStore.getState().openFile('/book/chapters/01.md', '01-开篇.md')
    render(<Layout />)
    expect(screen.getByText('01-开篇.md')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行测试**

```bash
npx vitest run tests/layout/Layout.test.tsx
```

期望：所有测试 PASS。

- [ ] **Step 3: 运行全部测试**

```bash
npm test
```

期望：所有测试 PASS。

- [ ] **Step 4: 运行 lint**

```bash
npm run lint
```

期望：无错误。

- [ ] **Step 5: 完整的 Tauri 运行验证**

```bash
npm run tauri dev
```

期望：桌面窗口打开，显示完整四面板布局。

- [ ] **Step 6: 提交**

```bash
git add tests/layout/Layout.test.tsx
git commit -m "test: 四面板布局集成测试"
```

---

## Phase 1 完成标志

- [x] Tauri v2 桌面应用可运行
- [x] 四面板布局正确渲染（活动栏 + 侧边栏 + 编辑器 + Agent 面板）
- [x] 面板可折叠/展开（侧边栏、Agent 面板）
- [x] 活动栏按钮可切换选中状态
- [x] 编辑器标签可打开/关闭
- [x] Tailwind CSS + VS Code 暗色主题生效
- [x] 全部测试通过 (`npm test`)
- [x] Lint 无错误 (`npm run lint`)
- [x] TypeScript 编译通过 (`npx tsc --noEmit`)

---

## Phase 2-6 任务概要

### Phase 2: 数据模型 & 本地存储

**目标**: 能创建书、写章节，数据存本地 markdown

| Task | 内容 |
|------|------|
| 2.1 | TypeScript 类型定义完善 (Book, Chapter, Character, Annotation...) |
| 2.2 | Tauri Rust 文件系统 command (read_file, write_file, read_dir, watch_dir) |
| 2.3 | 前端文件服务层 (FileService 封装 Tauri invoke) |
| 2.4 | BookService — 书籍创建/打开/列表管理 |
| 2.5 | 书籍选择页面/对话框 |
| 2.6 | Monaco Editor 集成 — markdown 编辑、高亮 |
| 2.7 | 章节内容读写 + 自动保存 |
| 2.8 | 侧边栏章节树 + 大纲树 |
| 2.9 | 状态栏 — 字数统计、写作目标进度 |
| 2.10 | Phase 2 集成测试 |

### Phase 3: Agent 核心 + 多 Provider

**目标**: 能在对话面板发指令，agent 返回内容写入编辑器

| Task | 内容 |
|------|------|
| 3.1 | Provider 接口 + Claude API client |
| 3.2 | OpenAI API client |
| 3.3 | Provider 注册/切换机制 |
| 3.4 | Agent 核心循环 (query → stream → tool calls → loop) |
| 3.5 | 内置基础工具 (read_chapter, write_chapter, search_chapters, get_characters) |
| 3.6 | 系统提示词 + 写作上下文构建 |
| 3.7 | Agent 对话 UI (消息列表、流式渲染、工具调用展示) |
| 3.8 | 生成内容写入编辑器 |
| 3.9 | 对话历史本地存储 |
| 3.10 | Phase 3 集成测试 |

### Phase 4: Skill 系统

**目标**: 用户可通过 skill 触发写作辅助功能

| Task | 内容 |
|------|------|
| 4.1 | Skill 类型定义 + frontmatter 解析 |
| 4.2 | Skill 加载引擎 (内置/用户级/书籍级) |
| 4.3 | Skill 注册 + 去重 + 优先级合并 |
| 4.4 | Skill 匹配逻辑 (whenToUse 语义匹配) |
| 4.5 | 内置 skill: 续写、润色、大纲生成、角色提取 |
| 4.6 | Skill 管理器 UI (查看/编辑/添加 skill) |
| 4.7 | 用户自定义 skill 热加载 |
| 4.8 | Phase 4 集成测试 |

### Phase 5: MCP 集成

**目标**: 可连接 web search 等 MCP server

| Task | 内容 |
|------|------|
| 5.1 | MCP client 实现 (基于 @modelcontextprotocol/sdk) |
| 5.2 | stdio / SSE / WebSocket 传输支持 |
| 5.3 | MCP 工具发现 + 注册到 Agent |
| 5.4 | MCP server 配置界面 |
| 5.5 | OAuth 认证支持 |
| 5.6 | Phase 5 集成测试 |

### Phase 6: 高级功能 & 打磨

**目标**: 划词备注、角色管理、写作目标、修订历史

| Task | 内容 |
|------|------|
| 6.1 | 划词备注系统 (Annotation + 浮窗 UI) |
| 6.2 | 角色关系可视化 |
| 6.3 | 写作目标追踪 |
| 6.4 | 章节修订历史 (diff 对比) |
| 6.5 | 应用设置页面 (API Key、主题、快捷键等) |
| 6.6 | 性能优化 (大章节虚拟滚动、懒加载) |
| 6.7 | 最终集成测试 + E2E |

---

## 文档维护

在实施过程中，以下文档需同步维护：

- `docs/superpowers/specs/2026-05-08-super-author-design.md` — 设计文档，如有变更同步更新
- 每个 Phase 完成后更新本计划文档的任务完成状态
- CLAUDE.md — 项目开发指引（Phase 1 完成后创建）
