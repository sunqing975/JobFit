"use client"

import { useRef, useState } from "react"
import { api } from "@/lib/api"
import type { BaseResumeVersion } from "@/lib/api"

interface Props {
  baseVersions: BaseResumeVersion[]
  onGenerate: (data: { base_resume_version_id: number; raw_jd_text: string }) => Promise<void>
  generating: boolean
}

export function JobResumeForm({ baseVersions, onGenerate, generating }: Props) {
  const [jdText, setJdText] = useState("")
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null)
  const [ocrOpen, setOcrOpen] = useState(false)
  const [ocrImages, setOcrImages] = useState<File[]>([])
  const [ocrParsing, setOcrParsing] = useState(false)
  const [ocrError, setOcrError] = useState("")
  const imageRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVersionId || !jdText.trim()) return
    await onGenerate({ base_resume_version_id: selectedVersionId, raw_jd_text: jdText })
  }

  const closeOcr = () => {
    setOcrOpen(false)
    setOcrImages([])
    setOcrError("")
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (!selected.length) return
    const valid = selected.filter((f) => f.size <= 10 * 1024 * 1024)
    if (valid.length !== selected.length) { setOcrError("单张图片大小不能超过 10MB"); return }
    setOcrImages((prev) => [...prev, ...valid].slice(0, 10))
    setOcrError("")
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    const pasted: File[] = []
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const f = item.getAsFile()
        if (f) pasted.push(f)
      }
    }
    if (!pasted.length) return
    e.preventDefault()
    const valid = pasted.filter((f) => f.size <= 10 * 1024 * 1024)
    if (valid.length !== pasted.length) { setOcrError("单张图片大小不能超过 10MB"); return }
    setOcrImages((prev) => [...prev, ...valid].slice(0, 10))
    setOcrError("")
  }

  const handleExtract = async () => {
    setOcrParsing(true)
    setOcrError("")
    try {
      const res = await api.ocr.extract(ocrImages)
      setJdText((prev) => (prev.trim() ? `${prev.trim()}\n\n${res.text.trim()}` : res.text.trim()))
      closeOcr()
    } catch (e) {
      setOcrError(e instanceof Error ? e.message : "识别失败")
    } finally {
      setOcrParsing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="form-label">基础简历版本</label>
        <select
          value={selectedVersionId ?? ""}
          onChange={(e) => setSelectedVersionId(Number(e.target.value))}
          className="form-input"
          required
        >
          <option value="">请选择基础简历版本</option>
          {baseVersions.map((v) => (
            <option key={v.id} value={v.id}>v{v.version} — {new Date(v.created_at).toLocaleDateString("zh-CN")}</option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="form-label !mb-0">岗位 JD</label>
          <button type="button" className="btn-ghost text-sm" onClick={() => setOcrOpen(true)}>图片识别</button>
        </div>
        <textarea className="form-textarea font-mono" rows={12} value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder={`请粘贴完整的岗位 JD 文本，包含：\n- 职位名称\n- 公司信息\n- 岗位职责\n- 任职要求\n- 加分项等`} required />
        {jdText.trim() && <p className="text-xs text-slate-400 mt-1">{jdText.trim().length} 字符</p>}
      </div>

      <button type="submit" disabled={generating} className="btn-primary w-full">
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            AI 生成中...
          </span>
        ) : "生成岗位简历"}
      </button>

      {ocrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">图片识别 JD</h3>
              <button type="button" onClick={closeOcr} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto px-6 py-5" onPaste={handlePaste}>
              <input ref={imageRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleImageSelect} />
              <button
                type="button"
                onClick={() => imageRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 rounded-lg py-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
              >
                <span className="text-sm text-slate-400">点击选择图片，或直接 Ctrl+V 粘贴截图</span>
              </button>
              <p className="text-xs text-slate-400 mt-2">支持多张（最多 10 张，每张不超过 10MB），识别结果将追加到 JD 输入框</p>
              {ocrImages.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {ocrImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={URL.createObjectURL(img)} alt={`截图${i + 1}`} className="w-full h-24 object-cover rounded-lg border border-slate-200" />
                      <button
                        type="button"
                        onClick={() => setOcrImages(ocrImages.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 bg-slate-900/60 text-white rounded-full w-5 h-5 text-xs leading-none hidden group-hover:flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {ocrError && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{ocrError}</div>}
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" className="btn-ghost" onClick={closeOcr}>取消</button>
                <button type="button" className="btn-primary" onClick={handleExtract} disabled={ocrParsing || ocrImages.length === 0}>
                  {ocrParsing ? "识别中..." : "开始识别"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
