"use client"

import { useEffect, useState } from "react"
import { api, type MasterResumeVersion, type TailoredResume } from "@/lib/api"
import { TailoredResumeForm } from "@/components/TailoredResumeForm"
import { ResumePreview } from "@/components/ResumePreview"
import { PDFExporter } from "@/components/PDFExporter"

export default function TailoredResumePage() {
  const [masterVersions, setMasterVersions] = useState<MasterResumeVersion[]>([])
  const [tailoredResumes, setTailoredResumes] = useState<TailoredResume[]>([])
  const [selectedResume, setSelectedResume] = useState<TailoredResume | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    api.masterResume.list().then(setMasterVersions).catch(() => {})
    api.tailoredResume.list().then(setTailoredResumes).catch(() => {})
  }, [])

  const handleGenerate = async (data: { master_resume_version_id: number; raw_jd_text: string }) => {
    setGenerating(true)
    setError("")
    try {
      const result = await api.tailoredResume.generate(data)
      setSelectedResume(result)
      setTailoredResumes((prev) => [result, ...prev])
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败")
    } finally {
      setGenerating(false)
    }
  }

  const getVersionLabel = (r: TailoredResume) => {
    const mv = masterVersions.find((v) => v.id === r.master_resume_version_id)
    return mv ? `v${mv.version}` : "版本已删除"
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">生成定制简历</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="card">
            <div className="card-header"><h2 className="font-semibold text-slate-800">岗位 JD</h2></div>
            <div className="card-body">
              <TailoredResumeForm
                masterVersions={masterVersions}
                onGenerate={handleGenerate}
                generating={generating}
              />
            </div>
          </div>

          {tailoredResumes.length > 0 && (
            <div className="card">
              <div className="card-header"><h2 className="font-semibold text-slate-800 text-sm">历史记录</h2></div>
              <div className="card-body max-h-80 overflow-y-auto space-y-2">
                {tailoredResumes.map((r) => {
                  const firstLine = r.raw_jd_text.split("\n")[0].slice(0, 30)
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedResume(r)}
                      className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                        selectedResume?.id === r.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-medium text-slate-800 truncate">{firstLine || "未知职位"}</div>
                      <div className="text-xs mt-1">
                        <span className="text-blue-600">主履历 {getVersionLabel(r)}</span>
                        <span className="text-slate-400"> · {new Date(r.created_at).toLocaleDateString("zh-CN")}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          {selectedResume ? (
            <div className="card overflow-hidden">
              <div className="card-header">
                <div>
                  <h2 className="font-semibold text-slate-800">简历预览</h2>
                  <p className="text-xs text-slate-400 mt-0.5">主履历 {getVersionLabel(selectedResume)} · 模型 {selectedResume.model_used}</p>
                </div>
                <PDFExporter resume={selectedResume} />
              </div>
              <div className="border-b border-slate-200 px-6 py-3 text-xs text-slate-500">
                <details>
                  <summary className="cursor-pointer text-slate-400 hover:text-slate-600">查看完整岗位 JD</summary>
                  <pre className="mt-2 p-3 bg-slate-50 rounded-lg text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">{selectedResume.raw_jd_text}</pre>
                </details>
              </div>
              <div className="bg-slate-100 p-6 overflow-auto max-h-[calc(100vh-120px)]">
                <ResumePreview content={selectedResume.generated_content} />
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body py-16 text-center text-slate-400">
                <div className="text-5xl mb-4">📄</div>
                <p className="text-lg">粘贴岗位 JD，点击生成简历</p>
                <p className="text-sm mt-2">AI 将根据你的主履历和岗位 JD 自动生成定制简历</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
