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

  const handleGenerate = async (data: {
    master_resume_version_id: number
    job_title: string
    company_name?: string
    raw_jd_text: string
  }) => {
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">生成定制简历</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">岗位信息</h2>
            <TailoredResumeForm
              masterVersions={masterVersions}
              onGenerate={handleGenerate}
              generating={generating}
            />
          </div>

          {tailoredResumes.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">历史生成记录</h2>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {tailoredResumes.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedResume(r)}
                    className={`w-full text-left p-3 rounded border text-sm transition-colors ${
                      selectedResume?.id === r.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-medium">{r.job_title}</div>
                    {r.company_name && (
                      <div className="text-gray-500 text-xs">{r.company_name}</div>
                    )}
                    <div className="text-gray-400 text-xs mt-1">
                      {new Date(r.created_at).toLocaleDateString("zh-CN")}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          {selectedResume ? (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {selectedResume.job_title}
                  {selectedResume.company_name && ` @ ${selectedResume.company_name}`}
                </h2>
                <PDFExporter resume={selectedResume} />
              </div>
              <ResumePreview content={selectedResume.generated_content} />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              填写左侧信息后点击"生成简历"，结果将在此处预览
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
