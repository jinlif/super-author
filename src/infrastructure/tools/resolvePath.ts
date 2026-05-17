/**
 * 将工具输入路径解析为 bookDir 内的绝对路径。
 * - 空路径 → 返回 bookDir
 * - 相对路径 → 锚定到 bookDir
 * - 真实绝对路径在 bookDir 内 → 原样返回
 * - 以 / 开头（无驱动器号）→ 视为虚拟根路径，映射到 bookDir
 * - 路径中的 .. 段会被解析，超出 bookDir 则拒绝
 */
export function resolvePath(inputPath: string | undefined, bookDir: string): string {
  const normalizedBookDir = bookDir.replace(/\\/g, '/').replace(/\/+$/, '')

  if (!inputPath || inputPath.trim() === '') {
    return normalizedBookDir
  }

  const normalized = inputPath.replace(/\\/g, '/')
  const isAbsolute = normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)

  let resolved: string

  if (isAbsolute) {
    if (normalized === normalizedBookDir || normalized.startsWith(`${normalizedBookDir}/`)) {
      // 真实绝对路径在 bookDir 内
      resolved = normalized
    } else if (!/^[A-Za-z]:\//.test(normalized)) {
      // 以 / 开头（无驱动器号）→ 虚拟根路径，映射到 bookDir
      // 如 /chapters/1.md → {bookDir}/chapters/1.md
      resolved = `${normalizedBookDir}${normalized}`
    } else {
      throw new Error(`路径越权: ${inputPath} 不在书籍目录内`)
    }
  } else {
    // 相对路径 → 锚定到 bookDir
    resolved = `${normalizedBookDir}/${normalized}`
  }

  // 规范化 .. 段，防止路径遍历攻击
  const cleanPath = normalizePathSegments(resolved)

  // 验证仍在 bookDir 内
  if (cleanPath !== normalizedBookDir && !cleanPath.startsWith(`${normalizedBookDir}/`)) {
    throw new Error(`路径越权: ${inputPath} 超出书籍目录范围`)
  }

  return cleanPath
}

/** 解析路径中的 . 和 .. 段，保留 Unix 绝对路径的前导 / */
function normalizePathSegments(p: string): string {
  const isUnixAbs = p.startsWith('/')
  const parts = p.split('/')
  const result: string[] = []

  for (const part of parts) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (result.length > 0) {
        const last = result[result.length - 1]
        // 不弹出驱动器号（Windows 根）
        if (!/^[A-Za-z]:$/.test(last)) {
          result.pop()
        }
      }
      continue
    }
    result.push(part)
  }

  let normalized = result.join('/')
  if (isUnixAbs) {
    normalized = `/${normalized}`
  }
  return normalized
}
