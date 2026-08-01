"use client"

import { useRef, useState } from "react"
import { api, type ParsedResume } from "@/lib/api"
import { BaseResumeForm } from "@/components/BaseResumeForm"

interface Props {
  open: boolean
  onClose: () => void
  onSave: (
    content: Record<string, unknown>,
    changeLog: string | undefined,
    mode: "update" | "create"
  ) => Promise<void>
}

export function ResumeImportModal({ open, onClose, onSave }: Props) {
  const [tab, setTab] = useState<"pdf" | "image" | "text">("pdf")
  const [file, setFile] = useState<File | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [text, setText] = useState("")
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState("")
  const [parsed, setParsed] = useState<ParsedResume | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const reset = () => {
    setTab("pdf")
    setFile(null)
    setImages([])
    setText("")
    setParsed(null)
    setError("")
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.toLowerCase().endsWith(".pdf")) { setError("仅支持 PDF 文件"); return }
    if (f.size > 10 * 1024 * 1024) { setError("PDF 文件大小不能超过 10MB"); return }
    setError("")
    setFile(f)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (!selected.length) return
    const valid = selected.filter((f) => f.size <= 10 * 1024 * 1024)
    if (valid.length !== selected.length) { setError("单张图片大小不能超过 10MB"); return }
    setImages((prev) => [...prev, ...valid].slice(0, 10))
    setError("")
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    if (tab !== "image") return
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
    if (valid.length !== pasted.length) { setError("单张图片大小不能超过 10MB"); return }
    setImages((prev) => [...prev, ...valid].slice(0, 10))
    setError("")
  }

  const handleParse = async () => {
    setParsing(true)
    setError("")
    try {
      const result =
        tab === "pdf"
          ? await api.baseResume.importPdf(file!)
          : tab === "image"
            ? await api.baseResume.importImage(images)
            : await api.baseResume.importText(text)
      setParsed(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "解析失败")
    } finally {
      setParsing(false)
    }
  }

  const handleSaveVersion = async (content: Record<string, unknown>, changeLog?: string) => {
    const sourceLabel = tab === "pdf" ? "PDF" : tab === "image" ? "截图" : "文本"
    try {
      await onSave(content, changeLog || `从${sourceLabel}导入`, "create")
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败")
      return
    }
    reset()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">导入简历</h3>
          <button type="button" onClick={handleClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        {!parsed ? (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="flex gap-2 mb-5">
              <button
                type="button"
                onClick={() => setTab("pdf")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "pdf" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                上传 PDF
              </button>
              <button
                type="button"
                onClick={() => setTab("image")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "image" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                图片截图
              </button>
              <button
                type="button"
                onClick={() => setTab("text")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "text" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                粘贴文本
              </button>
            </div>

            {tab === "pdf" ? (
              <div>
                <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileSelect} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-300 rounded-lg py-10 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                >
                  {file ? (
                    <span className="text-sm text-slate-700 font-medium">{file.name}</span>
                  ) : (
                    <span className="text-sm text-slate-400">点击选择 PDF 文件（不超过 10MB）</span>
                  )}
                </button>
                <p className="text-xs text-slate-400 mt-2">支持电子版 PDF；扫描版 PDF 将自动识别（最多 20 页）</p>
              </div>
            ) : tab === "image" ? (
              <div onPaste={handlePaste}>
                <input ref={imageRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleImageSelect} />
                <button
                  type="button"
                  onClick={() => imageRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-300 rounded-lg py-10 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                >
                  <span className="text-sm text-slate-400">点击选择图片，或直接 Ctrl+V 粘贴截图</span>
                </button>
                <p className="text-xs text-slate-400 mt-2">支持多张（最多 10 张，每张不超过 10MB），按顺序识别后合并解析</p>
                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {images.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={URL.createObjectURL(img)} alt={`截图${i + 1}`} className="w-full h-24 object-cover rounded-lg border border-slate-200" />
                        <button
                          type="button"
                          onClick={() => setImages(images.filter((_, j) => j !== i))}
                          className="absolute top-1 right-1 bg-slate-900/60 text-white rounded-full w-5 h-5 text-xs leading-none hidden group-hover:flex items-center justify-center"
                        >
                          ×
                        </button>
                        <span className="absolute bottom-1 left-1 bg-slate-900/60 text-white rounded px-1.5 py-0.5 text-xs">#{i + 1}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <textarea
                  className="form-textarea"
                  rows={10}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="粘贴 Markdown / 纯文本简历内容..."
                />
                <p className="text-xs text-slate-400 mt-2">文本不超过 100KB</p>
              </div>
            )}

            {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

            <div className="flex justify-end gap-3 mt-6">
              <button type="button" className="btn-ghost" onClick={handleClose}>取消</button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleParse}
                disabled={parsing || (tab === "pdf" ? !file : tab === "image" ? images.length === 0 : !text.trim())}
              >
                {parsing ? "解析中..." : "开始解析"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <p className="text-sm text-slate-500 mb-4">已解析完成，请核对并修改以下内容，确认后保存为新版本。</p>
            <BaseResumeForm
              initialContent={parsed as unknown as Record<string, unknown>}
              onSave={handleSaveVersion}
            />
          </div>
        )}
      </div>
    </div>
  )
}
