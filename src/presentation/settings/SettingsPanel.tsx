import { useCallback, useEffect, useState } from 'react'
import { useAgentStore } from '../../application/stores/agentStore'
import type { EffortLevel, ModelsItem, ProviderConfig } from '../../domain/types/agent'
import { CustomSelect } from './CustomSelect'
import './SettingsPanel.css'

const PROVIDER_DEFAULTS: Record<string, { name: string; model: string; models: ModelsItem[] }> = {
  anthropic: {
    name: 'Anthropic',
    model: 'claude-sonnet-4-20250514',
    models: [
      { modelName: 'claude-sonnet-4-20250514', maxTokens: 8192, thinkingMode: false, effort: 'high' },
      { modelName: 'claude-opus-4-20250514', maxTokens: 8192, thinkingMode: false, effort: 'high' },
    ],
  },
  openai: {
    name: 'OpenAI',
    model: 'gpt-4o',
    models: [
      { modelName: 'gpt-4o', maxTokens: 8192, thinkingMode: false, effort: 'high' },
      { modelName: 'gpt-4o-mini', maxTokens: 8192, thinkingMode: false, effort: 'high' },
    ],
  },
}

const EFFORT_OPTIONS: { value: EffortLevel; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'xhigh', label: 'XHigh' },
  { value: 'max', label: 'Max' },
]

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
  const loadPresets = useAgentStore((s) => s.loadPresets)
  const savePreset = useAgentStore((s) => s.savePreset)
  const deletePreset = useAgentStore((s) => s.deletePreset)
  const loadPreset = useAgentStore((s) => s.loadPreset)

  const [presets, setPresets] = useState<Record<string, ProviderConfig>>({})
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [presetName, setPresetName] = useState('')

  useEffect(() => {
    loadPresets().then(setPresets)
  }, [loadPresets])

  const handleProviderChange = useCallback(
    (value: string) => {
      if (value.startsWith('preset:')) {
        const name = value.slice(7)
        loadPreset(name).then(() => {
          loadPresets().then(setPresets)
        })
        return
      }
      const newId = value as 'anthropic' | 'openai'
      const defaults = PROVIDER_DEFAULTS[newId]
      setProviderConfig({
        id: newId,
        ...defaults,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        temperature: undefined,
        presetName: undefined,
      })
    },
    [setProviderConfig, config.apiKey, config.baseUrl, loadPreset, loadPresets],
  )

  const handleSavePreset = useCallback(async () => {
    const name = presetName.trim()
    if (!name) return
    if (!config.apiKey) {
      alert('请先填写 API Key')
      return
    }
    if (config.models.length === 0) {
      alert('请先添加至少一个模型')
      return
    }
    await savePreset(name)
    const updated = await loadPresets()
    setPresets(updated)
    setShowSaveDialog(false)
    setPresetName('')
  }, [presetName, config.apiKey, config.models.length, savePreset, loadPresets])

  const handleDeletePreset = useCallback(
    async (name: string) => {
      await deletePreset(name)
      const updated = await loadPresets()
      setPresets(updated)
      if (config.presetName === name) {
        setProviderConfig({ presetName: undefined })
      }
    },
    [deletePreset, loadPresets, config.presetName, setProviderConfig],
  )

  const presetNames = Object.keys(presets)

  return (
    <div className="settings-section">
      <div className="settings-section-title">Provider</div>
      <label className="settings-label">AI Provider</label>
      <CustomSelect
        value={config.presetName ? `preset:${config.presetName}` : config.id}
        onValueChange={handleProviderChange}
        groups={[
          {
            label: '内置',
            options: [
              { value: 'anthropic', label: 'Anthropic Compatible' },
              { value: 'openai', label: 'OpenAI Compatible' },
            ],
          },
          ...(presetNames.length > 0
            ? [
                {
                  label: '已保存的配置',
                  options: presetNames.map((name) => ({ value: `preset:${name}`, label: name })),
                },
              ]
            : []),
        ]}
      />
      {!config.presetName && (
        <div className="settings-row" style={{ marginTop: 8 }}>
          {showSaveDialog ? (
            <>
              <input
                type="text"
                className="settings-input"
                placeholder="输入配置名称"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSavePreset()
                  if (e.key === 'Escape') setShowSaveDialog(false)
                }}
              />
              <button type="button" className="settings-btn settings-btn-primary" onClick={handleSavePreset}>
                保存
              </button>
              <button type="button" className="settings-btn" onClick={() => setShowSaveDialog(false)}>
                取消
              </button>
            </>
          ) : (
            <button
              type="button"
              className="settings-btn settings-btn-primary"
              onClick={() => setShowSaveDialog(true)}
            >
              保存为配置
            </button>
          )}
        </div>
      )}
      {config.presetName && (
        <div className="preset-current">
          <span className="preset-current-name">{config.presetName}</span>
          <button
            type="button"
            className="settings-btn settings-btn-preset-delete"
            onClick={() => handleDeletePreset(config.presetName!)}
          >
            删除预设
          </button>
        </div>
      )}
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

  const placeholder = config.id === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com'

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

  const handleAdd = useCallback(() => {
    const name = newModel.trim()
    if (!name || config.models.some((m) => m.modelName === name)) return
    const newItem: ModelsItem = { modelName: name, maxTokens: 8192, thinkingMode: false, effort: 'high' }
    setProviderConfig({ models: [...config.models, newItem] })
    setNewModel('')
  }, [newModel, config.models, setProviderConfig])

  const handleRemove = useCallback(
    (modelName: string) => {
      const next = config.models.filter((m) => m.modelName !== modelName)
      if (next.length === 0) return
      const update: Partial<ProviderConfig> = { models: next }
      if (config.model === modelName) {
        update.model = next[0].modelName
      }
      setProviderConfig(update)
    },
    [config.models, config.model, setProviderConfig],
  )

  const handleActivate = useCallback(
    (modelName: string) => {
      setProviderConfig({ model: modelName })
    },
    [setProviderConfig],
  )

  const handleModelFieldChange = useCallback(
    (modelName: string, field: keyof ModelsItem, value: ModelsItem[keyof ModelsItem]) => {
      const next = config.models.map((m) =>
        m.modelName === modelName ? { ...m, [field]: value } : m,
      )
      setProviderConfig({ models: next })
    },
    [config.models, setProviderConfig],
  )

  const handleMaxTokensStep = useCallback(
    (modelName: string, delta: number) => {
      const model = config.models.find((m) => m.modelName === modelName)
      const current = model?.maxTokens ?? 8192
      handleModelFieldChange(modelName, 'maxTokens', clampToken(current + delta))
    },
    [config.models, handleModelFieldChange],
  )

  return (
    <div className="settings-section">
      <div className="settings-section-title">模型管理</div>
      <label className="settings-label">
        当前模型: <span style={{ color: '#60a5fa' }}>{config.model}</span>
      </label>
      <div className="model-list">
        {config.models.map((m) => {
          const display = getTokenDisplay(m.maxTokens)
          return (
            <div
              key={m.modelName}
              className={`model-item ${m.modelName === config.model ? 'active' : ''}`}
              onClick={() => handleActivate(m.modelName)}
            >
              <div className="model-item-header">
                <span className="model-item-name">{m.modelName}</span>
                <button
                  type="button"
                  className="model-item-delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(m.modelName)
                  }}
                  disabled={config.models.length <= 1}
                  title="删除模型"
                >
                  x
                </button>
              </div>
              <div className="model-item-config" onClick={(e) => e.stopPropagation()}>
                <div className="model-item-row">
                  <span className="model-item-label">Max Tokens</span>
                  <div className="model-item-tokens">
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => handleMaxTokensStep(m.modelName, -1000)}
                      disabled={m.maxTokens <= 256}
                    >
                      -
                    </button>
                    <input
                      type="text"
                      className="stepper-input stepper-input-token"
                      value={display.num}
                      onChange={(e) => {
                        const num = Number(e.target.value)
                        if (!Number.isNaN(num)) {
                          const multiplier = display.unit === 'M' ? 1_000_000 : 1000
                          handleModelFieldChange(m.modelName, 'maxTokens', clampToken(num * multiplier))
                        }
                      }}
                    />
                    <span className="model-item-unit">{display.unit}</span>
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => handleMaxTokensStep(m.modelName, 1000)}
                      disabled={m.maxTokens >= TOKEN_MAX}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="model-item-row">
                  <span className="model-item-label">Thinking</span>
                  <div
                    className={`toggle-switch ${m.thinkingMode ? 'active' : ''}`}
                    onClick={() => handleModelFieldChange(m.modelName, 'thinkingMode', !m.thinkingMode)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleModelFieldChange(m.modelName, 'thinkingMode', !m.thinkingMode)
                      }
                    }}
                  />
                </div>
                {m.thinkingMode && (
                  <div className="model-item-row">
                    <span className="model-item-label">Effort</span>
                    <CustomSelect
                      size="small"
                      value={m.effort}
                      onValueChange={(v) => handleModelFieldChange(m.modelName, 'effort', v as EffortLevel)}
                      options={EFFORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                    />
                  </div>
                )}
              </div>
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
          onInput={(e) => {
            const pct = ((Number(e.currentTarget.value) - 0) / (2 - 0)) * 100
            e.currentTarget.style.setProperty('--sp-range-pct', `${pct}%`)
          }}
        />
        <span className="settings-range-value">{(config.temperature ?? 0.7).toFixed(1)}</span>
      </div>
      <span className="settings-hint">范围 0-2，默认 0.7</span>
    </div>
  )
}
