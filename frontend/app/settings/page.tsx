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
    api.llmConfig
      .list()
      .then(setConfigs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(loadConfigs, [])

  const handleCreate = async (data: {
    provider_name: string
    api_base: string
    api_key: string
    model_name: string
    temperature: number
  }) => {
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
      <h1 className="text-2xl font-bold">LLM 模型配置</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">添加新配置</h2>
        <LLMConfigForm onSave={handleCreate} />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">已有配置</h2>
        {loading ? (
          <div className="text-gray-500 text-center py-4">加载中...</div>
        ) : configs.length === 0 ? (
          <div className="text-gray-500 text-center py-4">暂无配置</div>
        ) : (
          <div className="space-y-4">
            {configs.map((config) => (
              <div
                key={config.id}
                className={`border rounded-lg p-4 ${
                  config.is_active ? "border-green-500 bg-green-50" : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{config.provider_name}</span>
                      {config.is_active && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          当前使用
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {config.model_name} — {config.api_base}
                    </div>
                    <div className="text-sm text-gray-500">
                      Temperature: {config.temperature}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!config.is_active && (
                      <button
                        onClick={() => handleActivate(config.id)}
                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        激活
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
