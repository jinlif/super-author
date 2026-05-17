/**
 * 将真实绝对路径转换为虚拟路径（相对于虚拟根 /）。
 * 例如: C:/Users/.../books/foo/chapters/1.md → /chapters/1.md
 */
export function toVirtualPath(realPath: string, bookDir: string): string {
  const normalizedReal = realPath.replace(/\\/g, '/').replace(/\/+$/, '')
  const normalizedBookDir = bookDir.replace(/\\/g, '/').replace(/\/+$/, '')

  if (normalizedReal === normalizedBookDir) {
    return '/'
  }
  if (normalizedReal.startsWith(`${normalizedBookDir}/`)) {
    return `/${normalizedReal.slice(normalizedBookDir.length + 1)}`
  }
  // 不在 bookDir 内，原样返回（不应发生）
  return normalizedReal
}
