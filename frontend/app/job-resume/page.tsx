"use client"

import { useEffect, useRef, useState } from "react"
import { api, type BaseResumeVersion, type JobResume } from "@/lib/api"
import { JobResumeForm } from "@/components/JobResumeForm"
import { ResumePreview } from "@/components/ResumePreview"
import { PDFExporter } from "@/components/PDFExporter"

export default function JobResumePage() {
  const [baseVersions, setBaseVersions] = useState<BaseResumeVersion[]>([])
  const [jobResumes, setJobResumes] = useState<JobResume[]>([])
  const [selectedResume, setSelectedResume] = useState<JobResume | null>(null)
  const [versionFilter, setVersionFilter] = useState<number | "all">("all")
  const [generating, setGenerating] = useState(false)
  const [analysisText, setAnalysisText] = useState("")
  const [error, setError] = useState("")
  const [reporting, setReporting] = useState(false)
  const [reportText, setReportText] = useState("")
  const generateCtrlRef = useRef<AbortController | null>(null)
  const reportDraftRef = useRef("")

  useEffect(() => {
    api.baseResume.list().then(setBaseVersions).catch(() => {})
  }, [])

  useEffect(() => {
    api.jobResume
      .list(versionFilter === "all" ? undefined : versionFilter)
      .then(setJobResumes)
      .catch(() => {})
  }, [versionFilter])

  const handleFilterChange = (value: number | "all") => {
    setVersionFilter(value)
    setSelectedResume(null)
  }

  const handleGenerate = (data: { base_resume_version_id: number; raw_jd_text: string }) => {
    setGenerating(true)
    setError("")
    setAnalysisText("")
    setSelectedResume(null)
    generateCtrlRef.current = api.jobResume.generateStream(data, {
      onAnalysis: (s) => setAnalysisText((prev) => prev + s),
      onDone: async (result) => {
        setGenerating(false)
        generateCtrlRef.current = null
        setSelectedResume(result)
        const filterMatches = versionFilter === "all" || versionFilter === data.base_resume_version_id
        if (!filterMatches) setVersionFilter(data.base_resume_version_id)
        const list = await api.jobResume.list(
          filterMatches ? (versionFilter === "all" ? undefined : versionFilter) : data.base_resume_version_id
        )
        setJobResumes(list)
      },
      onError: (msg) => {
        setGenerating(false)
        generateCtrlRef.current = null
        if (msg !== "已停止") setError(msg)
      },
    })
  }

  const handleStop = () => {
    generateCtrlRef.current?.abort()
  }

  const handleGenerateReport = () => {
    if (!selectedResume || reporting) return
    const resumeId = selectedResume.id
    setReporting(true)
    setReportText("")
    reportDraftRef.current = ""
    api.jobResume.generateReport(resumeId, {
      onDelta: (s) => {
        reportDraftRef.current += s
        setReportText(reportDraftRef.current)
      },
      onDone: () => {
        const report = reportDraftRef.current
        setSelectedResume((prev) => (prev && prev.id === resumeId ? { ...prev, match_report: report } : prev))
        setJobResumes((prev) => prev.map((r) => (r.id === resumeId ? { ...r, match_report: report } : r)))
        setReporting(false)
        reportDraftRef.current = ""
      },
      onError: (msg) => {
        setReporting(false)
        reportDraftRef.current = ""
        alert(msg)
      },
    })
  }

  const displayReport = reporting ? reportText : (selectedResume?.match_report || "")

  const getVersionLabel = (r: JobResume) => {
    const bv = baseVersions.find((v) => v.id === r.base_resume_version_id)
    return bv ? `v${bv.version}` : "版本已删除"
  }

  const handleDeleteResume = async (r: JobResume) => {
    const firstLine = r.raw_jd_text.split("\n")[0].trim().slice(0, 20)
    if (!confirm(`确定删除「${firstLine || "未知职位"}」的岗位简历吗？此操作不可恢复。`)) return
    try {
      await api.jobResume.delete(r.id)
      const rest = jobResumes.filter((x) => x.id !== r.id)
      setJobResumes(rest)
      if (selectedResume?.id === r.id) {
        setSelectedResume(rest[0] ?? null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败")
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="no-print text-2xl font-bold text-slate-800">生成岗位简历</h1>

      {error && (
        <div className="no-print bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="no-print lg:col-span-4 space-y-6">
          <div className="card">
            <div className="card-header"><h2 className="font-semibold text-slate-800">岗位 JD</h2></div>
            <div className="card-body">
              <JobResumeForm
                baseVersions={baseVersions}
                onGenerate={handleGenerate}
                onStop={handleStop}
                generating={generating}
              />
            </div>
          </div>

          {baseVersions.length > 0 && (
            <div className="card">
              <div className="card-header flex items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-800 text-sm">历史记录</h2>
                <select
                  value={versionFilter}
                  onChange={(e) => handleFilterChange(e.target.value === "all" ? "all" : Number(e.target.value))}
                  className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">全部版本</option>
                  {baseVersions.map((v) => (
                    <option key={v.id} value={v.id}>
                      基础简历 v{v.version} · {new Date(v.created_at).toLocaleDateString("zh-CN")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="card-body max-h-80 overflow-y-auto space-y-2">
                {jobResumes.length === 0 ? (
                  <div className="text-center text-slate-400 text-sm py-4">暂无记录</div>
                ) : (
                  jobResumes.map((r) => {
                    const firstLine = r.raw_jd_text.split("\n")[0].slice(0, 30)
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedResume(r)}
                        className={`group w-full text-left p-3 rounded-lg border text-sm transition-colors cursor-pointer ${
                          selectedResume?.id === r.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-slate-800 truncate">{firstLine || "未知职位"}</div>
                          <button
                            type="button"
                            title="删除记录"
                            className="text-slate-300 hover:text-red-500 text-base leading-none opacity-0 group-hover:opacity-100 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteResume(r)
                            }}
                          >
                            ×
                          </button>
                        </div>
                        <div className="text-xs mt-1">
                          <span className="text-blue-600">基础简历 {getVersionLabel(r)}</span>
                          <span className="text-slate-400"> · {new Date(r.created_at).toLocaleDateString("zh-CN")}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          {generating ? (
            <div className="no-print card">
              <div className="card-header"><h2 className="font-semibold text-slate-800">正在生成岗位简历</h2></div>
              <div className="card-body py-8">
                <div className="flex items-center gap-3 text-slate-500">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  <span className="text-sm">正在分析 JD 匹配并生成简历，请稍候...</span>
                </div>
                {analysisText && (
                  <div className="mt-6">
                    <p className="text-xs text-slate-400 mb-2 font-medium">JD 匹配分析</p>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">{analysisText}</div>
                  </div>
                )}
              </div>
            </div>
          ) : selectedResume ? (
            <div className="card overflow-hidden">
              <div className="no-print card-header">
                <div>
                  <h2 className="font-semibold text-slate-800">简历预览</h2>
                  <p className="text-xs text-slate-400 mt-0.5">基础简历 {getVersionLabel(selectedResume)} · 模型 {selectedResume.model_used}</p>
                </div>
                <PDFExporter />
              </div>
              <div className="no-print border-b border-slate-200 px-6 py-3 text-xs text-slate-500">
                <details>
                  <summary className="cursor-pointer text-slate-400 hover:text-slate-600">查看完整岗位 JD</summary>
                  <pre className="mt-2 p-3 bg-slate-50 rounded-lg text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">{selectedResume.raw_jd_text}</pre>
                </details>
              </div>
              <div className="no-print border-b border-slate-200 px-6 py-3">
                <details>
                  <summary className="cursor-pointer flex items-center justify-between py-0.5 text-xs font-medium text-slate-500 hover:text-slate-700">
                    <span>JD 匹配度评估报告</span>
                    <span className="text-slate-300 transition-transform">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </span>
                  </summary>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-slate-400">匹配度评分、命中/缺失技能、优化建议</span>
                    <button
                      type="button"
                      onClick={handleGenerateReport}
                      disabled={reporting}
                      className="btn-ghost text-xs"
                    >
                      {reporting ? "生成中..." : selectedResume.match_report ? "重新生成" : "生成评估报告"}
                    </button>
                  </div>
                  {displayReport ? (
                    <pre className="mt-2 text-xs whitespace-pre-wrap bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-60 overflow-y-auto text-slate-700">{displayReport}</pre>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">点击「生成评估报告」开始生成</p>
                  )}
                </details>
              </div>
              <div className="print-area bg-slate-100 p-6 overflow-auto max-h-[calc(100vh-120px)]">
                <ResumePreview content={selectedResume.generated_content} />
              </div>
            </div>
          ) : (
            <div className="no-print card">
              <div className="card-body py-16 text-center text-slate-400">
                <div className="text-5xl mb-4">📄</div>
                <p className="text-lg">粘贴岗位 JD，点击生成简历</p>
                <p className="text-sm mt-2">AI 将根据你的基础简历和岗位 JD 自动生成岗位简历</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
