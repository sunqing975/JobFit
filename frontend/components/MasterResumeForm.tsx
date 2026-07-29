"use client"

import { useState } from "react"

interface Props {
  initialContent: Record<string, unknown>
  onSave: (content: Record<string, unknown>, changeLog?: string) => Promise<void>
}

const defaultContent = {
  name: "",
  title: "",
  email: "",
  phone: "",
  summary: "",
  skills: [] as string[],
  experience: [] as { company: string; role: string; period: string; bullets: string[] }[],
  education: [] as { school: string; degree: string; major: string; period: string }[],
  projects: [] as { name: string; role: string; period: string; description: string; bullets: string[] }[],
}

export function MasterResumeForm({ initialContent, onSave }: Props) {
  const [content, setContent] = useState<Record<string, unknown>>({
    ...defaultContent,
    ...initialContent,
  })
  const [changeLog, setChangeLog] = useState("")
  const [saving, setSaving] = useState(false)

  const updateField = (key: string, value: unknown) => {
    setContent((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(content, changeLog || undefined)
      setChangeLog("")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
          <input
            type="text"
            value={(content.name as string) || ""}
            onChange={(e) => updateField("name", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">职位</label>
          <input
            type="text"
            value={(content.title as string) || ""}
            onChange={(e) => updateField("title", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
          <input
            type="email"
            value={(content.email as string) || ""}
            onChange={(e) => updateField("email", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
          <input
            type="text"
            value={(content.phone as string) || ""}
            onChange={(e) => updateField("phone", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">个人总结</label>
        <textarea
          value={(content.summary as string) || ""}
          onChange={(e) => updateField("summary", e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">技能（每行一个）</label>
        <textarea
          value={((content.skills as string[]) || []).join("\n")}
          onChange={(e) =>
            updateField(
              "skills",
              e.target.value.split("\n").filter((s) => s.trim())
            )
          }
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">变更说明（可选）</label>
        <input
          type="text"
          value={changeLog}
          onChange={(e) => setChangeLog(e.target.value)}
          placeholder="例如：新增项目经历"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "保存中..." : "保存新版本"}
      </button>
    </div>
  )
}
