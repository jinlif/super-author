import Editor, { DiffEditor, type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import type { editor } from "monaco-editor";
import { useCallback, useEffect, useRef, useState } from "react";
import { useModelService } from "../../application/services/ModelService";
import { useAgentStore } from "../../application/stores/agentStore";
import { useBookStore } from "../../application/stores/bookStore";
import { useEditorStore } from "../../application/stores/editorStore";
import { ConfirmSaveDialog } from "../components/ConfirmSaveDialog";
import { SettingsPanel } from "../settings/SettingsPanel";
import { EditorStatusBar } from "./EditorStatusBar";
import { EditorTabs } from "./tabs/EditorTabs";
import "./EditorPanel.css";

export function EditorPanel() {
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const cancelCloseTab = useEditorStore((s) => s.cancelCloseTab);

  const diffForReview = useAgentStore((s) => s.diffForReview);

  const updateValue = useModelService((s) => s.updateValue);
  const pendingCloseUri = useModelService((s) => s.pendingCloseUri);
  const pendingCloseFileName = useModelService((s) => s.pendingCloseFileName);

  const saveChapter = useBookStore((s) => s.saveChapter);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [liveWordCount, setLiveWordCount] = useState(0);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;
  const activeUri = activeTab?.filePath ?? null;
  const hasTabs = tabs.length > 0 && activeTab !== null;
  const isSettingsTab = activeTab?.type === "settings";

  // 保存：通过 filePath 查找 Chapter，不依赖 currentChapter
  const doSave = useCallback(
    async (filePath: string) => {
      const ms = useModelService.getState();
      if (!ms.isDirty(filePath)) return;
      const model = ms.models[filePath];
      if (!model) return;
      const chapter = useBookStore
        .getState()
        .chapters.find((c) => c.filePath === filePath);
      if (chapter) {
        // 章节在 store 中 — 通过 saveChapter 完整保存（更新 store）
        try {
          await saveChapter(model.value, chapter);
          ms.markClean(filePath);
        } catch {
          console.warn("保存失败");
        }
      } else {
        // 章节不在 store 中（如通过 FileExplorer 直接打开）— 直接写文件系统
        try {
          await useBookStore
            .getState()
            ._chapterRepo.writeChapter(filePath, model.value);
          ms.markClean(filePath);
        } catch {
          console.warn("保存失败");
        }
      }
    },
    [saveChapter],
  );

  const doSaveRef = useRef(doSave);
  doSaveRef.current = doSave;

  // Ctrl+S
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (activeUri) doSaveRef.current(activeUri);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeUri]);

  // 获取或创建 Monaco Model（利用 Monaco 内置 URI 去重）
  function getOrCreateMonacoModel(
    uri: string,
    monaco: typeof Monaco,
  ): editor.IModel | null {
    const monacoUri = monaco.Uri.parse(uri);
    const existing = monaco.editor.getModel(monacoUri);
    if (existing) return existing;

    const ms = useModelService.getState();
    const textModel = ms.models[uri];
    if (!textModel) return null;

    return monaco.editor.createModel(textModel.value, "markdown", monacoUri);
  }

  // Monaco 挂载时切换到 activeTab 的 Model
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const es = useEditorStore.getState();
    const tab = es.tabs.find((t) => t.id === es.activeTabId);
    if (tab) {
      const model = getOrCreateMonacoModel(tab.filePath, monaco);
      if (model) editor.setModel(model);
    }

    // 订阅外部更新（如 Agent 工具写入文件），同步到 Monaco Editor
    useModelService.getState().onExternalUpdate((uri, value) => {
      const monacoModels = monaco.editor.getModels();
      const targetUri = monaco.Uri.parse(uri);
      const targetModel = monacoModels.find(
        (m: editor.IModel) => m.uri.toString() === targetUri.toString(),
      );
      if (targetModel && targetModel.getValue() !== value) {
        targetModel.setValue(value);
      }
    });
  };

  // 切换标签时切换 Monaco Model（不重挂载）
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !activeUri) return;

    const model = getOrCreateMonacoModel(activeUri, monaco);
    if (!model) return;

    if (
      editor.getModel()?.uri.toString() ===
      monaco.Uri.parse(activeUri).toString()
    )
      return;

    editor.setModel(model);
    setLiveWordCount(model.getValue().replace(/[\s\n]/g, "").length);

    // 同步 currentChapter 到 bookStore（供 StatusBar 等使用）
    const chapter = useBookStore
      .getState()
      .chapters.find((c) => c.filePath === activeUri);
    if (chapter) {
      useBookStore.setState({ currentChapter: chapter });
    }
  }, [activeUri, getOrCreateMonacoModel]);

  // 编辑时更新 Model
  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value === undefined || !activeUri) return;
      updateValue(activeUri, value);
      setLiveWordCount(value.replace(/[\s\n]/g, "").length);

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        doSaveRef.current(activeUri);
      }, 5000);
    },
    [activeUri, updateValue],
  );

  // 组件卸载时保存
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (activeUri) doSave(activeUri);
    };
  }, [activeUri, doSave]);

  // 全部关闭时清除 currentChapter
  useEffect(() => {
    if (tabs.length === 0) {
      useBookStore.setState({ currentChapter: null });
    }
  }, [tabs.length]);

  // 关闭确认对话框回调
  const handleSaveAndClose = useCallback(async () => {
    if (!pendingCloseUri) return;
    await doSave(pendingCloseUri);
    const tab = useEditorStore
      .getState()
      .tabs.find((t) => t.filePath === pendingCloseUri);
    if (tab) useEditorStore.getState().forceCloseTab(tab.id);
  }, [pendingCloseUri, doSave]);

  const handleDiscardAndClose = useCallback(() => {
    if (!pendingCloseUri) return;
    const tab = useEditorStore
      .getState()
      .tabs.find((t) => t.filePath === pendingCloseUri);
    if (tab) useEditorStore.getState().forceCloseTab(tab.id);
  }, [pendingCloseUri]);

  // Editor 显隐时触发 Monaco 重新布局
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && hasTabs) {
      // 延迟确保 CSS display 已生效
      requestAnimationFrame(() => editor.layout());
    }
  }, [hasTabs]);

  // Agent 临时章节：创建只读标签
  const tempChapterData = useAgentStore((s) => s.tempChapterData);
  useEffect(() => {
    if (!tempChapterData) return;
    const id = `temp-${Date.now()}`;
    const fileName = `AI 生成 - 待审阅: ${tempChapterData.title}`;
    useModelService
      .getState()
      .getOrCreate(id, fileName, tempChapterData.content);
    useEditorStore.getState().openFile(id, fileName, tempChapterData.content);
  }, [tempChapterData]);

  return (
    <div className="editor-panel">
      <EditorTabs />
      <div className="editor-content">
        <div
          className="editor-welcome"
          style={{ display: hasTabs ? "none" : "flex" }}
        >
          <div className="welcome-content">
            <h1>超级作者</h1>
            <p>选择章节开始编辑</p>
          </div>
        </div>
        <div
          className="editor-area"
          style={{ display: hasTabs && !isSettingsTab ? "flex" : "none" }}
        >
          <div style={{ display: diffForReview ? "none" : "flex", height: "100%", flex: 1 }}>
            <Editor
              height="100%"
              defaultLanguage="markdown"
              theme="vs-dark"
              onChange={handleChange}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: "on",
                wordWrap: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
              }}
            />
          </div>
          <div style={{ display: diffForReview ? "flex" : "none", height: "100%", flex: 1 }}>
            {diffForReview && (
              <DiffEditor
                height="100%"
                language="markdown"
                theme="vs-dark"
                original={diffForReview.original}
                modified={diffForReview.modified}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  renderOverviewRuler: false,
                }}
              />
            )}
          </div>
        </div>
        {hasTabs && isSettingsTab && (
          <div className="editor-settings-area">
            <SettingsPanel />
          </div>
        )}
      </div>
      <EditorStatusBar liveWordCount={liveWordCount} />
      <ConfirmSaveDialog
        open={pendingCloseUri !== null}
        fileName={pendingCloseFileName}
        onSave={handleSaveAndClose}
        onDiscard={handleDiscardAndClose}
        onCancel={cancelCloseTab}
      />
    </div>
  );
}
