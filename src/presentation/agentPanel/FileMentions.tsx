import { useCallback, useEffect, useRef, useState } from "react";
import { FileMentionService } from "../../application/services/FileMentionService";
import type { FileMentionItem } from "../../application/services/FileMentionService";
import type { FileType } from "../../domain/types/fileMention";
import "./FileMentions.css";

const TYPE_LABELS: Record<FileType, string> = {
  chapter: "章节",
  character: "角色",
  outline: "大纲",
  setting: "设定",
  other: "其他",
};

const TYPE_ORDER: FileType[] = [
  "chapter",
  "character",
  "outline",
  "setting",
  "other",
];

interface FileMentionsProps {
  query: string;
  visible: boolean;
  onSelect: (item: FileMentionItem) => void;
  onClose: () => void;
}

export function FileMentions({
  query,
  visible,
  onSelect,
  onClose,
}: FileMentionsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [files, setFiles] = useState<FileMentionItem[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  // 搜索文件
  useEffect(() => {
    if (!visible) return;

    FileMentionService.searchFiles(query).then((results) => {
      setFiles(results);
      setSelectedIndex(0);
    });
  }, [visible, query]);

  // 滚动到选中项
  useEffect(() => {
    const el = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`,
    ) as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // 键盘处理
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!visible) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % files.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + files.length) % files.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (files[selectedIndex]) {
          onSelect(files[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [visible, files, selectedIndex, onSelect, onClose],
  );

  useEffect(() => {
    if (visible) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [visible, handleKeyDown]);

  if (!visible) return null;

  if (files.length === 0) {
    return (
      <div className="file-mentions">
        <div className="file-mentions-header">引用文件</div>
        <div className="file-mentions-empty">暂无文件</div>
      </div>
    );
  }

  // 按类型分组
  const grouped = files.reduce(
    (acc, f) => {
      (acc[f.type] ??= []).push(f);
      return acc;
    },
    {} as Record<FileType, FileMentionItem[]>,
  );

  let flatIndex = 0;

  return (
    <div className="file-mentions" ref={listRef}>
      <div className="file-mentions-header">引用文件</div>
      {TYPE_ORDER.map((type) => {
        const items = grouped[type];
        if (!items?.length) return null;
        return (
          <div key={type} className="file-mentions-group">
            <div className="file-mentions-group-label">{TYPE_LABELS[type]}</div>
            {items.map((item: FileMentionItem) => {
              const idx = flatIndex++;
              return (
                <div
                  key={item.id}
                  className={`file-mentions-item ${idx === selectedIndex ? "selected" : ""}`}
                  data-index={idx}
                  onClick={() => onSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <span className="file-mentions-item-name">@{item.title}</span>
                  {item.volume && (
                    <span className="file-mentions-item-volume">
                      {item.volume}
                    </span>
                  )}
                  <span className={`file-mentions-type-badge ${type}`}>
                    {TYPE_LABELS[type]}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
