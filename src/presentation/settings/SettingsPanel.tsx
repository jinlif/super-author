import { useCallback, useState } from 'react'
import { useAgentStore } from '../../application/stores/agentStore'
import type { ModelConfig, ProviderConfig } from '../../domain/types/agent'
import './SettingsPanel.css'

const PROVIDER_DEFAULTS: Record<string, Partial<ProviderConfig>> = {
  claude: {
    name: 'Claude',
    model: 'claude-sonnet-4-20250514',
    models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'],
    modelsConfig: {},
  },
  openai: {
    name: 'OpenAI',
    model: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini'],
    modelsConfig: {},
  },
}

const TOKEN_MAX = 1_000_000

function getTokenDisplay(value: number): { num: string; unit: string } {
  if (value >= 1_000_000) {
    return { num: String(value / 1_000_000), unit: 'M' }
  }
  return { num: String(Math.round(value / 1000)), unit: 'K' }
}

function clampToken(value: number): number {
  return Math.max(256, Math.min(TOKEN_MAX, Math.round(value / 256) * 256))
}

export function SettingsPanel() {
  const providerConfig = useAgentStore((s) => s.providerConfig)
  const setProviderConfig = useAgentStore((s) => s.setProviderConfig)

  return (
    <div className="settings-panel">
      <ProviderSection config={providerConfig} setProviderConfig={setProviderConfig} />
      <ApiSection config={providerConfig} setProviderConfig={setProviderConfig} />
      <ModelSection config={providerConfig} setProviderConfig={setProviderConfig} />
      <ParameterSection config={providerConfig} setProviderConfig={setProviderConfig} />
      {providerConfig.id === 'claude' && (
        <ThinkingSection config={providerConfig} setProviderConfig={setProviderConfig} />
      )}
    </div>
  )
}

function ProviderSection({
  config,
  setProviderConfig,
}: {
  config: ProviderConfig
  setProviderConfig: (c: Partial<ProviderConfig>) => void
}) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newId = e.target.value as 'claude' | 'openai'
      const defaults = PROVIDER_DEFAULTS[newId]
      setProviderConfig({
        id: newId,
        ...defaults,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        temperature: undefined,
        maxTokens: undefined,
        modelsConfig: config.modelsConfig,
        thinkingMode: newId === 'claude' ? config.thinkingMode : false,
      })
    },
    [setProviderConfig, config.apiKey, config.baseUrl, config.thinkingMode, config.modelsConfig],
  )

  return (
    <div className="settings-section">
      <div className="settings-section-title">Provider</div>
      <label className="settings-label">AI Provider</label>
      <select className="settings-select" value={config.id} onChange={handleChange}>
        <option value="claude">Claude (Anthropic)</option>
        <option value="openai">OpenAI</option>
      </select>
    </div>
  )
}

const EyeIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
  </svg>
)

function ApiSection({
  config,
  setProviderConfig,
}: {
  config: ProviderConfig
  setProviderConfig: (c: Partial<ProviderConfig>) => void
}) {
  const [showKey, setShowKey] = useState(false)

  const placeholder =
    config.id === 'claude' ? 'https://api.anthropic.com' : 'https://api.openai.com'

  return (
    <div className="settings-section">
      <div className="settings-section-title">API</div>

      <label className="settings-label">API Key</label>
      <div className="password-input-wrapper">
        <input
          type={showKey ? 'text' : 'password'}
          className="settings-input"
          placeholder="输入 API Key"
          value={config.apiKey}
          onChange={(e) => setProviderConfig({ apiKey: e.target.value })}
        />
        <button
          type="button"
          className="password-toggle-btn"
          onClick={() => setShowKey(!showKey)}
          tabIndex={-1}
          aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}
        >
          {showKey ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      <label className="settings-label">Base URL</label>
      <input
        type="text"
        className="settings-input"
        placeholder={placeholder}
        value={config.baseUrl ?? ''}
        onChange={(e) => setProviderConfig({ baseUrl: e.target.value || undefined })}
      />
      <span className="settings-hint">留空使用默认地址</span>
    </div>
  )
}

function ModelSection({
  config,
  setProviderConfig,
}: {
  config: ProviderConfig
  setProviderConfig: (c: Partial<ProviderConfig>) => void
}) {
  const [newModel, setNewModel] = useState('')
  const modelsConfig = config.modelsConfig ?? {}

  const handleAdd = useCallback(() => {
    const name = newModel.trim()
    if (!name || config.models.includes(name)) return
    setProviderConfig({ models: [...config.models, name] })
    setNewModel('')
  }, [newModel, config.models, setProviderConfig])

  const handleRemove = useCallback(
    (model: string) => {
      const next = config.models.filter((m) => m !== model)
      if (next.length === 0) return
      const update: Partial<ProviderConfig> = { models: next }
      if (config.model === model) {
        update.model = next[0]
      }
      // 清理被删除模型的配置
      if (modelsConfig[model]) {
        const nextConfig = { ...modelsConfig }
        delete nextConfig[model]
        update.modelsConfig = nextConfig
      }
      setProviderConfig(update)
    },
    [config.models, config.model, modelsConfig, setProviderConfig],
  )

  const handleActivate = useCallback(
    (model: string) => {
      setProviderConfig({ model })
    },
    [setProviderConfig],
  )

  const handleMaxTokensChange = useCallback(
    (model: string, value: number) => {
      const clamped = clampToken(value)
      const nextConfig: Record<string, ModelConfig> = {
        ...modelsConfig,
        [model]: { ...modelsConfig[model], maxTokens: clamped },
      }
      const update: Partial<ProviderConfig> = { modelsConfig: nextConfig }
      if (model === config.model) {
        update.maxTokens = clamped
      }
      setProviderConfig(update)
    },
    [modelsConfig, config.model, setProviderConfig],
  )

  const handleMaxTokensStep = useCallback(
    (model: string, delta: number) => {
      const current = modelsConfig[model]?.maxTokens ?? 8192
      handleMaxTokensChange(model, current + delta)
    },
    [modelsConfig, handleMaxTokensChange],
  )

  return (
    <div className="settings-section">
      <div className="settings-section-title">模型管理</div>
      <label className="settings-label">
        当前模型: <span style={{ color: '#60a5fa' }}>{config.model}</span>
      </label>
      <div className="model-list">
        {config.models.map((m) => {
          const maxTokens = modelsConfig[m]?.maxTokens ?? 8192
          const display = getTokenDisplay(maxTokens)
          return (
            <div
              key={m}
              className={`model-item ${m === config.model ? 'active' : ''}`}
              onClick={() => handleActivate(m)}
            >
              <span className="model-item-name">{m}</span>
              <div className="model-item-tokens" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => handleMaxTokensStep(m, -1000)}
                  disabled={maxTokens <= 256}
                >
                  −
                </button>
                <input
                  type="text"
                  className="stepper-input stepper-input-token"
                  value={display.num}
                  onChange={(e) => {
                    const num = Number(e.target.value)
                    if (!Number.isNaN(num)) {
                      const multiplier = display.unit === 'M' ? 1_000_000 : 1000
                      handleMaxTokensChange(m, num * multiplier)
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="model-item-unit">{display.unit}</span>
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => handleMaxTokensStep(m, 1000)}
                  disabled={maxTokens >= TOKEN_MAX}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className="model-item-delete"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove(m)
                }}
                disabled={config.models.length <= 1}
                title="删除模型"
              >
                x
              </button>
            </div>
          )
        })}
      </div>
      <div className="settings-row">
        <input
          type="text"
          className="settings-input"
          placeholder="输入模型名称"
          value={newModel}
          onChange={(e) => setNewModel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
        />
        <button type="button" className="settings-btn settings-btn-primary" onClick={handleAdd}>
          添加
        </button>
      </div>
    </div>
  )
}

function ParameterSection({
  config,
  setProviderConfig,
}: {
  config: ProviderConfig
  setProviderConfig: (c: Partial<ProviderConfig>) => void
}) {
  return (
    <div className="settings-section">
      <div className="settings-section-title">参数</div>

      <label className="settings-label">Temperature</label>
      <div className="settings-range-row">
        <input
          type="range"
          className="settings-range"
          min={0}
          max={2}
          step={0.1}
          value={config.temperature ?? 0.7}
          onChange={(e) => setProviderConfig({ temperature: Number(e.target.value) })}
        />
        <span className="settings-range-value">{(config.temperature ?? 0.7).toFixed(1)}</span>
      </div>
      <span className="settings-hint">范围 0-2，默认 0.7</span>
    </div>
  )
}

function ThinkingSection({
  config,
  setProviderConfig,
}: {
  config: ProviderConfig
  setProviderConfig: (c: Partial<ProviderConfig>) => void
}) {
  const enabled = config.thinkingMode ?? false

  const toggle = useCallback(() => {
    setProviderConfig({ thinkingMode: !enabled })
  }, [enabled, setProviderConfig])

  return (
    <div className="settings-section">
      <div className="settings-section-title">Thinking Mode</div>
      <div className="settings-row">
        <div
          className={`toggle-switch ${enabled ? 'active' : ''}`}
          onClick={toggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') toggle()
          }}
        />
        <span className="settings-label" style={{ marginBottom: 0 }}>
          {enabled ? '已启用' : '已禁用'}
        </span>
      </div>
      <span className="settings-hint">启用扩展思考模式</span>
    </div>
  )
}
