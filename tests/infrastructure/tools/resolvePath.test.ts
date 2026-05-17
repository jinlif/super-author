import { describe, expect, it } from 'vitest'
import { resolvePath } from '../../../src/infrastructure/tools/resolvePath'

describe('resolvePath', () => {
  const bookDir = 'C:/Users/test/books/mybook'

  describe('空路径回退到 bookDir', () => {
    it('undefined 应返回 bookDir', () => {
      expect(resolvePath(undefined, bookDir)).toBe(bookDir)
    })

    it('空字符串应返回 bookDir', () => {
      expect(resolvePath('', bookDir)).toBe(bookDir)
    })

    it('纯空格应返回 bookDir', () => {
      expect(resolvePath('   ', bookDir)).toBe(bookDir)
    })
  })

  describe('相对路径锚定到 bookDir', () => {
    it('简单相对路径', () => {
      expect(resolvePath('chapters/ch01.md', bookDir)).toBe(
        'C:/Users/test/books/mybook/chapters/ch01.md',
      )
    })

    it('单层相对路径', () => {
      expect(resolvePath('outline', bookDir)).toBe('C:/Users/test/books/mybook/outline')
    })

    it('带中文的相对路径', () => {
      expect(resolvePath('chapters/第一章.md', bookDir)).toBe(
        'C:/Users/test/books/mybook/chapters/第一章.md',
      )
    })
  })

  describe('绝对路径在 bookDir 内', () => {
    it('bookDir 本身应返回', () => {
      expect(resolvePath(bookDir, bookDir)).toBe(bookDir)
    })

    it('bookDir 内的子路径应返回', () => {
      const absPath = 'C:/Users/test/books/mybook/chapters/ch01.md'
      expect(resolvePath(absPath, bookDir)).toBe(absPath)
    })

    it('bookDir 内的深层路径应返回', () => {
      const absPath = 'C:/Users/test/books/mybook/outline/sub/item.md'
      expect(resolvePath(absPath, bookDir)).toBe(absPath)
    })
  })

  describe('虚拟根路径映射', () => {
    it('虚拟根 / 映射到 bookDir', () => {
      expect(resolvePath('/', bookDir)).toBe(bookDir)
    })

    it('虚拟根下的路径映射到 bookDir 下', () => {
      expect(resolvePath('/chapters/ch01.md', bookDir)).toBe(
        'C:/Users/test/books/mybook/chapters/ch01.md',
      )
    })

    it('虚拟根下的深层路径', () => {
      expect(resolvePath('/outline/sub/item.md', bookDir)).toBe(
        'C:/Users/test/books/mybook/outline/sub/item.md',
      )
    })

    it('虚拟根 + 中文路径', () => {
      expect(resolvePath('/chapters/第一章.md', bookDir)).toBe(
        'C:/Users/test/books/mybook/chapters/第一章.md',
      )
    })

    it('Windows 虚拟根路径不应抛出（原 /etc/passwd 类路径现在映射到 bookDir 内）', () => {
      expect(resolvePath('/etc/passwd', bookDir)).toBe(
        'C:/Users/test/books/mybook/etc/passwd',
      )
    })
  })

  describe('路径遍历防护', () => {
    it('相对路径中的 .. 拒绝', () => {
      expect(() => resolvePath('../outside', bookDir)).toThrow('路径越权')
    })

    it('相对路径中的深层 .. 拒绝', () => {
      expect(() => resolvePath('chapters/../../outside', bookDir)).toThrow('路径越权')
    })

    it('虚拟根路径中的 .. 拒绝', () => {
      expect(() => resolvePath('/../outside', bookDir)).toThrow('路径越权')
    })

    it('虚拟根路径中的深层 .. 拒绝', () => {
      expect(() => resolvePath('/chapters/../../outside', bookDir)).toThrow('路径越权')
    })

    it('真实绝对路径中的 .. 拒绝（Windows）', () => {
      expect(() => resolvePath('C:/Users/test/books/mybook/../outside', bookDir)).toThrow(
        '路径越权',
      )
    })

    it('真实绝对路径中的 .. 拒绝（Unix）', () => {
      const unixBookDir = '/home/user/books/mybook'
      expect(() => resolvePath('/home/user/books/mybook/../outside', unixBookDir)).toThrow(
        '路径越权',
      )
    })
  })

  describe('绝对路径越权拒绝', () => {
    it('同级目录应抛出错误', () => {
      expect(() => resolvePath('C:/Users/test/books/other', bookDir)).toThrow('路径越权')
    })

    it('父目录应抛出错误', () => {
      expect(() => resolvePath('C:/Users/test/books', bookDir)).toThrow('路径越权')
    })

    it('其他驱动器号应抛出错误', () => {
      expect(() => resolvePath('D:/other/path', bookDir)).toThrow('路径越权')
    })
  })

  describe('边界情况', () => {
    it('bookDir 末尾有斜杠应正常工作', () => {
      const bookDirWithSlash = 'C:/Users/test/books/mybook/'
      expect(resolvePath('ch01.md', bookDirWithSlash)).toBe(
        'C:/Users/test/books/mybook/ch01.md',
      )
    })

    it('Windows 反斜杠路径应正确处理', () => {
      const winPath = 'C:\\Users\\test\\books\\mybook\\chapters\\ch01.md'
      expect(resolvePath(winPath, bookDir)).toBe('C:/Users/test/books/mybook/chapters/ch01.md')
    })

    it('bookDir 为 Unix 路径时应正常工作', () => {
      const unixBookDir = '/home/user/books/mybook'
      expect(resolvePath('ch01.md', unixBookDir)).toBe('/home/user/books/mybook/ch01.md')
      expect(resolvePath('/home/user/books/mybook/ch01.md', unixBookDir)).toBe(
        '/home/user/books/mybook/ch01.md',
      )
      // /etc/passwd 是虚拟根路径，映射到 bookDir 内
      expect(resolvePath('/etc/passwd', unixBookDir)).toBe(
        '/home/user/books/mybook/etc/passwd',
      )
    })
  })
})
