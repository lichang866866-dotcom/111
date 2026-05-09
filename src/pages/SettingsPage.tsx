import { useEffect, useState } from 'react'
import { Save, Loader2, Check } from 'lucide-react'
import { AISettings } from '../types'
import { getDefaultBaseUrl, getDefaultModel } from '../services/ai'

export default function SettingsPage() {
  const DEFAULT_SYSTEM_PROMPT = `你是一位专业的英语学习AI助手，专注于帮助用户高效背单词、提升英语能力。

你的核心职责：
1. 分析用户的遗忘模式，提供针对性的记忆策略
2. 识别用户的学习困惑（如相似词混淆、语法盲点），给出清晰的辨析和讲解
3. 根据用户的记忆曲线数据，动态调整学习建议
4. 提供生动有趣的记忆技巧，如联想记忆、词根词缀拆解、场景化记忆等

沟通风格：
- 耐心、鼓励、专业
- 善于用中文解释英语知识点
- 回答简洁有力，避免冗长
- 针对用户的具体错误给出精准反馈`

  const [settings, setSettings] = useState<AISettings>({
    provider: 'claude',
    apiKey: '',
    model: '',
    baseUrl: '',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    const dbSettings = await window.electronAPI.getSettings()
    const provider = (dbSettings.aiProvider as AISettings['provider']) || 'claude'
    const s: AISettings = {
      provider,
      apiKey: dbSettings.aiApiKey || '',
      model: dbSettings.aiModel || getDefaultModel(provider),
      baseUrl: (dbSettings.aiBaseUrl || getDefaultBaseUrl(provider)) ?? '',
      systemPrompt: dbSettings.aiSystemPrompt || DEFAULT_SYSTEM_PROMPT,
    }
    setSettings(s)
    setLoading(false)
  }

  async function handleSave() {
    await window.electronAPI.setSetting('aiProvider', settings.provider)
    await window.electronAPI.setSetting('aiApiKey', settings.apiKey)
    await window.electronAPI.setSetting('aiModel', settings.model)
    await window.electronAPI.setSetting('aiBaseUrl', settings.baseUrl || '')
    await window.electronAPI.setSetting('aiSystemPrompt', settings.systemPrompt || '')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function updateProvider(provider: AISettings['provider']) {
    setSettings({
      ...settings,
      provider,
      model: getDefaultModel(provider),
      baseUrl: getDefaultBaseUrl(provider),
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>设置</h1>

      <div
        style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          padding: 28,
          boxShadow: 'var(--shadow)',
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>AI 模型配置</h2>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
            AI 提供商
          </label>
          <select
            value={settings.provider}
            onChange={(e) => updateProvider(e.target.value as AISettings['provider'])}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              fontSize: 14,
              background: '#fff',
            }}
          >
            <option value="claude">Claude (Anthropic)</option>
            <option value="openai">OpenAI (GPT)</option>
            <option value="gemini">Google Gemini</option>
            <option value="deepseek">DeepSeek (深度求索)</option>
            <option value="qwen">通义千问 (阿里云)</option>
            <option value="zhipu">智谱 GLM (ChatGLM)</option>
            <option value="moonshot">月之暗面 Kimi (Moonshot)</option>
            <option value="custom">自定义 (OpenAI 兼容格式)</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
            API Key
          </label>
          <input
            type="password"
            placeholder="输入你的 API Key"
            value={settings.apiKey}
            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              fontSize: 14,
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
            模型名称
          </label>
          <input
            placeholder="如: claude-3-sonnet-20240229"
            value={settings.model}
            onChange={(e) => setSettings({ ...settings, model: e.target.value })}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              fontSize: 14,
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
            API Base URL (可选，默认已填好)
          </label>
          <input
            placeholder="https://..."
            value={settings.baseUrl}
            onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              fontSize: 14,
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
            AI 系统提示词 (System Prompt)
          </label>
          <textarea
            value={settings.systemPrompt}
            onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
            rows={8}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              fontSize: 14,
              resize: 'vertical',
              lineHeight: 1.6,
            }}
          />
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
            这段提示词会在每次调用 AI 时作为系统上下文注入，帮助 AI 更好地理解你的学习需求。
          </div>
        </div>

        <button
          onClick={handleSave}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 20px',
            borderRadius: 10,
            background: saved ? 'var(--success)' : 'var(--primary)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? '已保存' : '保存设置'}
        </button>

        <div style={{ marginTop: 20, padding: 14, borderRadius: 8, background: '#f9fafb', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text)' }}>说明：</strong>
          <br />
          1. API Key 仅存储在本地，不会上传到任何服务器。
          <br />
          2. 支持 Claude、OpenAI、Gemini、DeepSeek 及任何 OpenAI 兼容格式的 API。
          <br />
          3. <strong>Base URL 需填写完整的 API 端点路径</strong>，例如：
          <br />
          · DeepSeek: <code>https://api.deepseek.com/v1/chat/completions</code>
          <br />
          · OpenAI: <code>https://api.openai.com/v1/chat/completions</code>
          <br />
          · Claude: <code>https://api.anthropic.com/v1/messages</code>
          <br />
          4. 配置后，做题时答错会自动调用 AI 分析错误原因。
        </div>
      </div>
    </div>
  )
}
