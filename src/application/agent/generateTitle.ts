import type { ProviderConfig } from '../../domain/types/agent'
import { createProvider } from '../../infrastructure/providers/createProvider'

const TITLE_SYSTEM_PROMPT =
  '你是一个标题生成器。根据用户输入的一段话，生成一个简短的中文标题（不超过20个字）。只输出标题，不要任何解释或标点。'

export async function generateTitle(firstMessage: string, config: ProviderConfig): Promise<string> {
  try {
    const provider = createProvider(config)
    const messages = [
      {
        role: 'user' as const,
        content: [{ type: 'text' as const, text: firstMessage }],
      },
    ]
    const stream = provider.createMessage(TITLE_SYSTEM_PROMPT, messages, [])
    let title = ''
    for await (const event of stream) {
      if (event.type === 'text_delta') {
        title += event.text
      }
    }
    // 清理：去换行、截取前 50 字
    title = title.replace(/[\n\r]/g, '').trim()
    return title.slice(0, 50) || firstMessage.slice(0, 50)
  } catch {
    return firstMessage.slice(0, 50)
  }
}
