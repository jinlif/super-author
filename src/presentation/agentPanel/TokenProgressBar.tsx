import { useAgentStore } from '../../application/stores/agentStore'

export function TokenProgressBar() {
  const currentTokenUsage = useAgentStore((s) => s.currentTokenUsage)
  const providerConfig = useAgentStore((s) => s.providerConfig)

  const totalTokens = currentTokenUsage.inputTokens + currentTokenUsage.outputTokens
  if (totalTokens === 0) return null

  // 获取当前模型的 maxTokens（上下文窗口上限）
  const currentModel = providerConfig.models.find((m) => m.modelName === providerConfig.model)
  const maxTokens = currentModel?.maxTokens ?? 8192

  const progress = Math.min((totalTokens / maxTokens) * 100, 100)

  const formatNum = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
    return n.toString()
  }

  return (
    <div className="token-progress-bar" title={`输入 ${formatNum(currentTokenUsage.inputTokens)} + 输出 ${formatNum(currentTokenUsage.outputTokens)} = ${formatNum(totalTokens)} / ${formatNum(maxTokens)}`}>
      <span className="token-label">Usage</span>
      <div className="token-bar-track">
        <div className="token-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <span className="token-stats">
        {formatNum(totalTokens)} / {formatNum(maxTokens)}
      </span>
    </div>
  )
}
