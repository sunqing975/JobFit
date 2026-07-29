"use client"

import { useState } from "react"
import type { MasterResumeVersion } from "@/lib/api"

interface Props {
  masterVersions: MasterResumeVersion[]
  onGenerate: (data: { master_resume_version_id: number; raw_jd_text: string }) => Promise<void>
  generating: boolean
}

export function TailoredResumeForm({ masterVersions, onGenerate, generating }: Props) {
  const [jdText, setJdText] = useState("")
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVersionId || !jdText.trim()) return
    await onGenerate({ master_resume_version_id: selectedVersionId, raw_jd_text: jdText })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="form-label">主履历版本</label>
        <select
          value={selectedVersionId ?? ""}
          onChange={(e) => setSelectedVersionId(Number(e.target.value))}
          className="form-input"
          required
        >
          <option value="">请选择主履历版本</option>
          {masterVersions.map((v) => (
            <option key={v.id} value={v.id}>v{v.version} — {new Date(v.created_at).toLocaleDateString("zh-CN")}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="form-label">岗位 JD</label>
        <textarea className="form-textarea font-mono" rows={12} value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder={`请粘贴完整的岗位 JD 文本，包含：\n- 职位名称\n- 公司信息\n- 岗位职责\n- 任职要求\n- 加分项等`} required />
      </div>

      <button type="submit" disabled={generating} className="btn-primary w-full">
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            AI 生成中...
          </span>
        ) : "生成定制简历"}
      </button>
    </form>
  )
}
