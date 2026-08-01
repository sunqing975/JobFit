"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { api, type BaseResumeVersion, type JobResume, type LLMConfig } from "@/lib/api"

export default function Home() {
  const [baseVersions, setBaseVersions] = useState<BaseResumeVersion[]>([])
  const [jobResumes, setJobResumes] = useState<JobResume[]>([])
  const [activeConfig, setActiveConfig] = useState<LLMConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.baseResume.list().catch(() => [] as BaseResumeVersion[]),
      api.jobResume.list().catch(() => [] as JobResume[]),
      api.llmConfig.active().catch(() => null),
    ]).then(([versions, resumes, config]) => {
      setBaseVersions(versions)
      setJobResumes(resumes)
      setActiveConfig(config)
      setLoading(false)
    })
  }, [])

  return (
    <div className="space-y-8">
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-3">JobFit</h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          基于大模型的"基础简历 — 岗位 JD"精准匹配重构工具
        </p>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-8">加载中...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 text-lg">📋</div>
                <h2 className="font-semibold text-slate-800">基础简历版本</h2>
              </div>
              <p className="text-3xl font-bold text-blue-600">{baseVersions.length}</p>
              <p className="text-sm text-slate-400 mt-1">已保存的版本</p>
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600 text-lg">🎯</div>
                <h2 className="font-semibold text-slate-800">岗位简历</h2>
              </div>
              <p className="text-3xl font-bold text-green-600">{jobResumes.length}</p>
              <p className="text-sm text-slate-400 mt-1">已生成</p>
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 text-lg">⚙️</div>
                <h2 className="font-semibold text-slate-800">模型配置</h2>
              </div>
              {activeConfig ? (
                <p className="text-sm text-slate-600">
                  当前使用 <span className="font-medium text-blue-600">{activeConfig.model_name}</span>
                </p>
              ) : (
                <p className="text-sm text-amber-600">未配置，请在设置中添加</p>
              )}
              <p className="text-xs text-slate-400 mt-1">
                {activeConfig?.api_base?.replace(/\/+$/, "").split("/").pop()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Link href="/base-resume" className="card p-6 hover:shadow-md transition-shadow group">
              <h2 className="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">管理基础简历</h2>
              <p className="text-sm text-slate-500 mt-2">录入和管理完整履历信息，支持版本历史追溯和实时预览</p>
            </Link>
            <Link href="/job-resume" className="card p-6 hover:shadow-md transition-shadow group">
              <h2 className="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">生成岗位简历</h2>
              <p className="text-sm text-slate-500 mt-2">粘贴岗位 JD，AI 自动生成匹配的简历，支持在线预览和 PDF 导出</p>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
