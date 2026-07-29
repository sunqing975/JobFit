"use client"

import { useState } from "react"

interface Props {
  onSave: (data: { provider_name: string; api_base: string; api_key: string; model_name: string; temperature: number }) => Promise<void>
  initial?: { provider_name: string; api_base: string; api_key: string; model_name: string; temperature: number }
}

export function LLMConfigForm({ onSave, initial }: Props) {
  const [providerName, setProviderName] = useState(initial?.provider_name || "Custom OpenAI")
  const [apiBase, setApiBase] = useState(initial?.api_base || "https://api.openai.com/v1")
  const [apiKey, setApiKey] = useState(initial?.api_key || "")
  const [modelName, setModelName] = useState(initial?.model_name || "gpt-4o-mini")
  const [temperature, setTemperature] = useState(initial?.temperature ?? 0.3)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({ provider_name: providerName, api_base: apiBase, api_key: apiKey, model_name: modelName, temperature })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">提供商名称</label>
          <input type="text" className="form-input" value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="Custom OpenAI" />
        </div>
        <div>
          <label className="form-label">模型名称</label>
          <input type="text" className="form-input" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="gpt-4o-mini" required />
        </div>
      </div>
      <div>
        <label className="form-label">API Base URL</label>
        <input type="url" className="form-input" value={apiBase} onChange={(e) => setApiBase(e.target.value)} placeholder="https://api.openai.com/v1" required />
      </div>
      <div>
        <label className="form-label">API Key</label>
        <input type="password" className="form-input" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." required />
      </div>
      <div>
        <label className="form-label">Temperature: {temperature}</label>
        <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full" />
      </div>
      <button type="submit" disabled={saving} className="btn-primary">{saving ? "保存中..." : "保存配置"}</button>
    </form>
  )
}
