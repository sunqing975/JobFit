"use client"

import { useEffect, useState } from "react"
import { api, type LLMConfig } from "@/lib/api"
import { LLMConfigForm } from "@/components/LLMConfigForm"

export default function SettingsPage() {
  const [configs, setConfigs] = useState<LLMConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadConfigs = () => {
    setLoading(true)
    api.llmConfig.list().then(setConfigs).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }

  useEffect(loadConfigs, [])

  const handleCreate = async (data: { provider_name: string; api_base: string; api_key: string; model_name: string }) => {
    await api.llmConfig.create(data)
    loadConfigs()
  }

  const handleActivate = async (id: number) => {
    await api.llmConfig.update(id, { is_active: true })
    loadConfigs()
  }

  const handleDelete = async (id: number) => {
    await api.llmConfig.delete(id)
    loadConfigs()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">LLM 模型配置</h1>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <div className="card">
        <div className="card-header"><h2 className="font-semibold text-slate-800">添加新配置</h2></div>
        <div className="card-body"><LLMConfigForm onSave={handleCreate} /></div>
      </div>

      <div className="card">
        <div className="card-header"><h2 className="font-semibold text-slate-800">已有配置</h2></div>
        <div className="card-body">
          {loading ? (
            <div className="text-slate-400 text-center py-4 text-sm">加载中...</div>
          ) : configs.length === 0 ? (
            <div className="text-slate-400 text-center py-4 text-sm">暂无配置</div>
          ) : (
            <div className="space-y-3">
              {configs.map((config) => (
                <div key={config.id} className={`rounded-lg border p-4 ${config.is_active ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{config.provider_name}</span>
                        {config.is_active && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">当前使用</span>}
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        <span className="font-mono">{config.model_name}</span>
                        <span className="mx-2">·</span>
                        <span className="text-slate-400 text-xs">{config.api_base}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!config.is_active && (
                        <button onClick={() => handleActivate(config.id)} className="btn-primary !py-1.5 !px-3 !text-xs">激活</button>
                      )}
                      <button onClick={() => handleDelete(config.id)} className="btn-danger !py-1.5 !px-3 !text-xs">删除</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
