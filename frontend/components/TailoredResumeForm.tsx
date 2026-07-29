"use client"

import { useState } from "react"
import type { MasterResumeVersion } from "@/lib/api"

interface Props {
  masterVersions: MasterResumeVersion[]
  onGenerate: (data: {
    master_resume_version_id: number
    job_title: string
    company_name?: string
    raw_jd_text: string
  }) => Promise<void>
  generating: boolean
}

export function TailoredResumeForm({ masterVersions, onGenerate, generating }: Props) {
  const [jobTitle, setJobTitle] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [jdText, setJdText] = useState("")
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVersionId || !jobTitle || !jdText.trim()) return
    await onGenerate({
      master_resume_version_id: selectedVersionId,
      job_title: jobTitle,
      company_name: companyName || undefined,
      raw_jd_text: jdText,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">主履历版本</label>
        <select
          value={selectedVersionId ?? ""}
          onChange={(e) => setSelectedVersionId(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          required
        >
          <option value="">请选择主履历版本</option>
          {masterVersions.map((v) => (
            <option key={v.id} value={v.id}>
              v{v.version} — {new Date(v.created_at).toLocaleDateString("zh-CN")}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">目标职位</label>
        <input
          type="text"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="例如：高级前端工程师"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">公司名称（可选）</label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="目标公司"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">岗位 JD</label>
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          rows={10}
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          placeholder="粘贴岗位 JD 文本..."
          required
        />
      </div>

      <button
        type="submit"
        disabled={generating}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {generating ? "AI 生成中..." : "生成定制简历"}
      </button>
    </form>
  )
}
