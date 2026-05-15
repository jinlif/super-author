import type { FileMentionItem, FileType } from "../../domain/types/fileMention";
export type { FileMentionItem };
import { useBookStore } from "../stores/bookStore";

const FILE_TYPE_LABELS: Record<string, FileType> = {
  chapters: "chapter",
  chapter: "chapter",
  characters: "character",
  character: "character",
  char: "character",
  outline: "outline",
  outlines: "outline",
  setting: "setting",
  settings: "setting",
};

const EXCLUDED_FILES = new Set(["book.json", ".super-author"]);

export class FileMentionService {
  // 从目录名推断文件类型
  private static inferFileTypeFromPath(path: string): FileType {
    const lowerPath = path.toLowerCase();
    for (const [keyword, type] of Object.entries(FILE_TYPE_LABELS)) {
      if (lowerPath.includes(keyword)) {
        return type;
      }
    }
    return "other";
  }

  // 获取书籍目录下所有可搜索的文件
  static async getSearchableFiles(): Promise<FileMentionItem[]> {
    const bookStore = useBookStore.getState();
    const { chapters, currentBook } = bookStore;

    if (!currentBook) return [];

    const items: FileMentionItem[] = [];

    // 添加章节（从 chapters 列表）
    chapters.forEach((ch) => {
      items.push({
        id: ch.id,
        type: "chapter",
        title: ch.title,
        filePath: ch.filePath,
        volume: ch.volume,
      });
    });

    // 扫描其他目录的 .md 文件
    const dirsToScan = ["characters", "outline", "settings", "chapters"];
    const bookDir = currentBook.directory;

    for (const dirName of dirsToScan) {
      const dirPath = `${bookDir}/${dirName}`;
      try {
        const exists = await bookStore._fs.exists(dirPath);
        if (!exists) continue;

        const entries = await bookStore._fs.readDir(dirPath);
        for (const entry of entries) {
          // 跳过目录和排除的文件
          if (entry.isDir || EXCLUDED_FILES.has(entry.name)) continue;

          // 只支持 .md 文件
          if (!entry.name.endsWith(".md")) continue;

          const filePath = entry.path;
          const fileName = entry.name.replace(".md", "");

          // 检查是否已从 chapters 添加（避免重复）
          const existingIndex = items.findIndex((i) => i.filePath === filePath);
          if (existingIndex >= 0) continue;

          items.push({
            id: filePath,
            type: this.inferFileTypeFromPath(filePath),
            title: fileName,
            filePath,
          });
        }
      } catch {
        // 扫描失败，跳过
      }
    }

    return items;
  }

  // 搜索文件（同步版本，用于 UI 渲染）
  static async searchFiles(query: string): Promise<FileMentionItem[]> {
    const files = await this.getSearchableFiles();
    const q = query.toLowerCase().trim();

    if (!q) return files;

    return files.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.volume?.toLowerCase().includes(q) ||
        f.type.toLowerCase().includes(q),
    );
  }

  // 读取文件内容
  static async readFileContent(filePath: string): Promise<string | null> {
    const bookStore = useBookStore.getState();
    try {
      const exists = await bookStore._fs.exists(filePath);
      if (!exists) return null;
      return await bookStore._fs.readFile(filePath);
    } catch {
      return null;
    }
  }
}
