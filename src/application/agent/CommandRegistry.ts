import type { Command, CommandCategory, CustomCommand } from '../../domain/types/command'

export class CommandRegistry {
  private commands: Command[] = []

  /** 注册内置命令 */
  registerBuiltin(): void {
    this.commands = this.commands.filter((c) => c.category !== 'builtin')
    this.commands.push({
      name: 'model',
      category: 'builtin',
      description: '切换 AI 模型',
      action: 'modal',
      modalName: 'ModelPicker',
    })
    this.commands.push({
      name: 'new',
      category: 'builtin',
      description: '新建会话',
      action: 'execute',
    })
  }

  /** 注册自定义命令（替换已有） */
  registerCustom(commands: CustomCommand[]): void {
    this.commands = this.commands.filter((c) => c.category !== 'custom')
    for (const cmd of commands) {
      this.commands.push({
        name: cmd.name,
        category: 'custom',
        description: cmd.description,
        prompt: cmd.prompt,
        action: 'fill',
      })
    }
  }

  /** 搜索命令（模糊匹配 name + description） */
  search(query: string): Command[] {
    const q = query.toLowerCase()
    const results = this.commands.filter(
      (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
    )
    const order: Record<CommandCategory, number> = { builtin: 0, custom: 1, skill: 2 }
    return results.sort((a, b) => order[a.category] - order[b.category])
  }

  /** 获取全部命令 */
  getAll(): Command[] {
    return [...this.commands]
  }

  /** 根据 name 获取命令 */
  get(name: string): Command | undefined {
    return this.commands.find((c) => c.name === name)
  }
}
