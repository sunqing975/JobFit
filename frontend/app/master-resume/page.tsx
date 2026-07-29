"use client"

import { useEffect, useState } from "react"
import { api, type MasterResumeVersion } from "@/lib/api"
import { MasterResumeForm } from "@/components/MasterResumeForm"
import { VersionHistory } from "@/components/VersionHistory"
import { ResumePreview } from "@/components/ResumePreview"

export default function MasterResumePage() {
  const [versions, setVersions] = useState<MasterResumeVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<MasterResumeVersion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [previewVisible, setPreviewVisible] = useState(true)

  const loadVersions = () => {
    setLoading(true)
    api.masterResume
      .list()
      .then((data) => {
        setVersions(data)
        if (data.length > 0 && !selectedVersion) setSelectedVersion(data[0])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(loadVersions, [])

  const handleSave = async (content: Record<string, unknown>, changeLog?: string) => {
    await api.masterResume.create({ content, change_log: changeLog })
    loadVersions()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">主履历管理</h1>
        <button
          className="btn-secondary text-sm lg:hidden"
          onClick={() => setPreviewVisible(!previewVisible)}
        >
          {previewVisible ? "隐藏预览" : "显示预览"}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 版本历史 */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header"><h2 className="font-semibold text-slate-800 text-sm">版本历史</h2></div>
            <div className="card-body">
              {loading ? (
                <div className="text-slate-400 text-sm text-center py-4">加载中...</div>
              ) : (
                <VersionHistory
                  versions={versions}
                  selectedId={selectedVersion?.id ?? null}
                  onSelect={(v) => setSelectedVersion(v)}
                />
              )}
            </div>
          </div>
        </div>

        {/* 表单 */}
        <div className="lg:col-span-5">
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-slate-800">
                {selectedVersion ? `编辑履历 (v${selectedVersion.version})` : "新建主履历"}
              </h2>
            </div>
            <div className="card-body">
              <MasterResumeForm
                initialContent={selectedVersion?.content ?? {}}
                onSave={handleSave}
              />
            </div>
          </div>
        </div>

        {/* 预览 */}
        {previewVisible && (
          <div className="lg:col-span-5">
            <div className="sticky top-4">
              <div className="card overflow-hidden">
                <div className="card-header">
                  <h2 className="font-semibold text-slate-800 text-sm">实时预览</h2>
                  <span className="text-xs text-slate-400">输入即更新</span>
                </div>
                <div className="bg-slate-100 p-4 overflow-auto max-h-[calc(100vh-120px)]">
                  <ResumePreview content={selectedVersion?.content ?? {}} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
