// 斜杠命令类型

export type CommandCategory = 'builtin' | 'custom' | 'skill'

export type CommandAction = 'modal' | 'fill' | 'execute'

export interface Command {
  name: string
  category: CommandCategory
  description: string
  prompt?: string
  action?: CommandAction
  modalName?: string
}

export interface CustomCommand {
  name: string
  description: string
  prompt: string
}
