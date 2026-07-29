"use client"

import { useEffect, useState } from "react"
import { api, type MasterResumeVersion } from "@/lib/api"
import { MasterResumeForm } from "@/components/MasterResumeForm"
import { VersionHistory } from "@/components/VersionHistory"

export default function MasterResumePage() {
  const [versions, setVersions] = useState<MasterResumeVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<MasterResumeVersion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadVersions = () => {
    setLoading(true)
    api.masterResume
      .list()
      .then((data) => {
        setVersions(data)
        if (data.length > 0 && !selectedVersion) {
          setSelectedVersion(data[0])
        }
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
        <h1 className="text-2xl font-bold">主履历管理</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">
                {selectedVersion
                  ? `编辑履历 (v${selectedVersion.version})`
                  : "新建主履历"}
              </h2>
            </div>
            <div className="p-4">
              <MasterResumeForm
                initialContent={selectedVersion?.content ?? {}}
                onSave={handleSave}
              />
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">版本历史</h2>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="text-gray-500 text-center py-4">加载中...</div>
              ) : (
                <VersionHistory
                  versions={versions}
                  selectedId={selectedVersion?.id ?? null}
                  onSelect={(v) => setSelectedVersion(v)}
                  onReload={loadVersions}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
