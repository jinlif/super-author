/**
 * 将工具输入路径解析为 bookDir 内的绝对路径。
 * - 空路径 → 返回 bookDir
 * - 相对路径 → 锚定到 bookDir
 * - 绝对路径在 bookDir 内 → 原样返回
 * - 绝对路径在 bookDir 外 → 抛出错误
 */
export function resolvePath(inputPath: string | undefined, bookDir: string): string {
  // normalize bookDir：移除末尾斜杠，统一用正斜杠
  const normalizedBookDir = bookDir.replace(/\/+$/, '') || bookDir

  // 空路径回退到 bookDir
  if (!inputPath || inputPath.trim() === '') {
    return normalizedBookDir
  }

  // 统一为正斜杠
  const normalized = inputPath.replace(/\\/g, '/')

  // 判断是否为绝对路径（以 / 开头，或 Windows 驱动器前缀如 C:/）
  const isAbsolute = normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)

  if (isAbsolute) {
    // 检查是否在 bookDir 内
    if (
      normalized === normalizedBookDir ||
      normalized.startsWith(`${normalizedBookDir}/`)
    ) {
      return normalized
    }
    throw new Error(`路径越权: ${inputPath} 不在书籍目录内`)
  }

  // 相对路径 → 锚定到 bookDir（posix 风格拼接）
  return `${normalizedBookDir}/${normalized}`
}
