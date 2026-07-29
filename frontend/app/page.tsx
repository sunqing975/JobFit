"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { api, type MasterResumeVersion, type TailoredResume, type LLMConfig } from "@/lib/api"

export default function Home() {
  const [masterVersions, setMasterVersions] = useState<MasterResumeVersion[]>([])
  const [tailoredResumes, setTailoredResumes] = useState<TailoredResume[]>([])
  const [activeConfig, setActiveConfig] = useState<LLMConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.masterResume.list().catch(() => []),
      api.tailoredResume.list().catch(() => []),
      api.llmConfig.active().catch(() => null),
    ]).then(([versions, resumes, config]) => {
      setMasterVersions(versions)
      setTailoredResumes(resumes)
      setActiveConfig(config)
      setLoading(false)
    })
  }, [])

  return (
    <div className="space-y-8">
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">JobFit</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          基于大模型的"主简历 — 岗位 JD"精准匹配重构工具。
          一次性维护主履历库，自动为每个岗位生成专属简历。
        </p>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-8">加载中...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-2">主履历版本</h2>
              <p className="text-3xl font-bold text-blue-600">{masterVersions.length}</p>
              <p className="text-sm text-gray-500 mt-1">已保存的版本数量</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-2">定制简历</h2>
              <p className="text-3xl font-bold text-green-600">{tailoredResumes.length}</p>
              <p className="text-sm text-gray-500 mt-1">已生成的岗位简历</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-2">模型配置</h2>
              {activeConfig ? (
                <p className="text-sm text-gray-700 mt-1">
                  当前使用: <span className="font-medium">{activeConfig.model_name}</span>
                </p>
              ) : (
                <p className="text-sm text-amber-600 mt-1">未配置，请在设置中添加</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/master-resume"
              className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">管理主履历</h2>
              <p className="text-gray-600">录入和管理你的完整履历信息，支持版本历史追溯。</p>
            </Link>
            <Link
              href="/tailored-resume"
              className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">生成定制简历</h2>
              <p className="text-gray-600">粘贴岗位 JD，AI 自动生成匹配的简历，支持预览和 PDF 导出。</p>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
