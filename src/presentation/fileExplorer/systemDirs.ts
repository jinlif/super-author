/** 系统目录名称列表 */
export const SYSTEM_DIR_NAMES = ['chapters', 'outline', 'characters', '.super-author'] as const

export type SystemDirName = (typeof SYSTEM_DIR_NAMES)[number]

/** 系统目录颜色映射 */
export const SYSTEM_DIR_COLORS: Record<SystemDirName, string> = {
  chapters: '#4fc3f7',
  outline: '#81c784',
  characters: '#ce93d8',
  '.super-author': '#9e9e9e',
}

/** 系统目录图标映射 */
export const SYSTEM_DIR_ICONS: Record<SystemDirName, string> = {
  chapters: '\u{1F4C1}',
  outline: '\u{1F4CB}',
  characters: '\u{1F464}',
  '.super-author': '\u{2699}\u{FE0F}',
}

/** 判断是否为系统目录 */
export function isSystemDir(name: string): name is SystemDirName {
  return SYSTEM_DIR_NAMES.includes(name as SystemDirName)
}

/** 获取系统目录颜色，非系统目录返回 undefined */
export function getSystemDirColor(name: string): string | undefined {
  if (isSystemDir(name)) return SYSTEM_DIR_COLORS[name]
  return undefined
}

/** 获取系统目录图标，非系统目录返回默认图标 */
export function getSystemDirIcon(name: string, isDir: boolean): string {
  if (isDir && isSystemDir(name)) return SYSTEM_DIR_ICONS[name]
  if (isDir) return '\u{1F4C2}' // 📂
  return '\u{1F4C4}' // 📄
}
