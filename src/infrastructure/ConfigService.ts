import type { AgentDefinition, ProviderConfig } from '../domain/types/agent'
import type { CustomCommand } from '../domain/types/command'
import type { IFileService } from './IFileService'

/** 解析命令 .md 文件：frontmatter + body */
function parseCommandFile(content: string): CustomCommand | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return null
  const frontmatter = match[1]
  const body = match[2].trim()
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m)
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m)
  if (!nameMatch) return null
  const name = nameMatch[1].trim()
  const description = descMatch ? descMatch[1].trim() : name
  const prompt = body || description
  return { name, description, prompt }
}

/** 解析 agent .md 文件：frontmatter + body 作为 systemPrompt */
export function parseAgentFile(content: string): AgentDefinition | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return null
  const frontmatter = match[1]
  const body = match[2].trim()
  if (!body) return null

  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m)
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m)
  const modelMatch = frontmatter.match(/^model:\s*(.+)$/m)
  const maxTurnsMatch = frontmatter.match(/^maxTurns:\s*(\d+)$/m)

  // 解析 tools：支持 YAML 数组格式（- item）和逗号分隔格式
  const toolsBlockMatch = frontmatter.match(/^tools:\s*\n((?:\s+-\s+.+\n?)+)/m)
  let tools: string[] | undefined
  if (toolsBlockMatch) {
    tools = toolsBlockMatch[1]
      .split('\n')
      .map((line) => line.replace(/^\s*-\s*/, '').trim())
      .filter(Boolean)
  } else {
    const toolsInlineMatch = frontmatter.match(/^tools:\s*(.+)$/m)
    if (toolsInlineMatch) {
      tools = toolsInlineMatch[1].split(',').map((t) => t.trim()).filter(Boolean)
    }
  }

  if (!nameMatch) return null
  const name = nameMatch[1].trim()
  const description = descMatch ? descMatch[1].trim() : name

  return {
    name,
    description,
    model: modelMatch ? modelMatch[1].trim() : undefined,
    maxTurns: maxTurnsMatch ? Number.parseInt(maxTurnsMatch[1], 10) : undefined,
    tools,
    systemPrompt: body,
  }
}

export interface AppConfig {
  provider: ProviderConfig
}

const defaultProviderConfig: ProviderConfig = {
  id: 'claude',
  name: 'Claude',
  apiKey: '',
  model: 'claude-sonnet-4-20250514',
  models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'],
}

const defaultConfig: AppConfig = {
  provider: defaultProviderConfig,
}

export class ConfigService {
  /** ~/.superauthor */
  readonly homeDir: string
  /** ~/.superauthor/books */
  readonly booksDir: string
  /** ~/.superauthor/skills */
  readonly globalSkillsDir: string
  /** ~/.superauthor/history */
  readonly historyDir: string
  /** ~/.superauthor/config.json */
  readonly configPath: string

  private fs: IFileService

  constructor(fs: IFileService, homeDir: string) {
    this.fs = fs
    this.homeDir = `${homeDir}/.superauthor`
    this.booksDir = `${this.homeDir}/books`
    this.globalSkillsDir = `${this.homeDir}/skills`
    this.historyDir = `${this.homeDir}/history`
    this.configPath = `${this.homeDir}/config.json`
  }

  async load(): Promise<AppConfig> {
    try {
      if (await this.fs.exists(this.configPath)) {
        const raw = await this.fs.readFile(this.configPath)
        const parsed = JSON.parse(raw) as AppConfig
        if (!parsed.provider.models) parsed.provider.models = [parsed.provider.model]
        return parsed
      }
    } catch {
      // 忽略加载错误
    }
    return { ...defaultConfig, provider: { ...defaultConfig.provider } }
  }

  async save(config: AppConfig): Promise<void> {
    try {
      await this.fs.writeFile(this.configPath, JSON.stringify(config, null, 2))
    } catch {
      console.warn('保存配置失败')
    }
  }

  async saveProviderConfig(provider: ProviderConfig): Promise<void> {
    const config = await this.load()
    config.provider = provider
    await this.save(config)
  }

  async loadProviderConfig(): Promise<ProviderConfig> {
    const config = await this.load()
    return config.provider
  }

  /** 从指定目录自动加载 .md 命令文件 */
  async loadCommandsFromDir(commandsDir: string): Promise<CustomCommand[]> {
    try {
      if (!(await this.fs.exists(commandsDir))) return []
      const entries = await this.fs.readDir(commandsDir)
      const commands: CustomCommand[] = []
      for (const entry of entries) {
        if (entry.isDir || !entry.name.endsWith('.md')) continue
        try {
          const content = await this.fs.readFile(entry.path)
          const cmd = parseCommandFile(content)
          if (cmd) commands.push(cmd)
        } catch {
          console.warn(`跳过无效命令文件: ${entry.name}`)
        }
      }
      return commands
    } catch {
      return []
    }
  }

  /** 从多个目录加载 agent .md 文件，按优先级合并（同名覆盖） */
  async loadAgentsFromDirs(
    dirs: string[],
    validModels?: string[],
  ): Promise<AgentDefinition[]> {
    const agentMap = new Map<string, AgentDefinition>()

    // 反向遍历，让高优先级目录（靠前）覆盖低优先级
    for (let i = dirs.length - 1; i >= 0; i--) {
      const dir = dirs[i]
      try {
        if (!(await this.fs.exists(dir))) continue
        const entries = await this.fs.readDir(dir)
        for (const entry of entries) {
          if (entry.isDir || !entry.name.endsWith('.md')) continue
          try {
            const content = await this.fs.readFile(entry.path)
            const agent = parseAgentFile(content)
            if (agent) {
              // 校验 model 是否在有效列表中
              if (agent.model && validModels && !validModels.includes(agent.model)) {
                agent.model = undefined
              }
              agentMap.set(agent.name, agent)
            }
          } catch {
            console.warn(`跳过无效 agent 文件: ${entry.name}`)
          }
        }
      } catch {
        // 目录不存在或读取失败，跳过
      }
    }

    return Array.from(agentMap.values())
  }
}

/** 脱敏显示 API Key：显示前3后3字符，中间用 *** */
export function maskApiKey(key: string): string {
  if (key.length <= 6) return '***'
  return `${key.slice(0, 3)}...${key.slice(-3)}`
}
