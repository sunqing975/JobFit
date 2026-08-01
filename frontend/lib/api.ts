const isDev =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
  window.location.port === "3000"

const API_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  (isDev ? "http://localhost:8000" : "")

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || "请求失败")
  }
  return res.json()
}

async function upload<T>(path: string, field: string, files: File[]): Promise<T> {
  const form = new FormData()
  files.forEach((f) => form.append(field, f))
  const res = await fetch(`${API_URL}${path}`, { method: "POST", body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || "请求失败")
  }
  return res.json()
}

async function readSSE(
  res: Response,
  onEvent: (payload: { type: string; [k: string]: unknown }) => void
): Promise<void> {
  if (!res.body) {
    onEvent({ type: "error", message: "浏览器不支持流式响应" })
    return
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder("utf-8")
  let buffer = ""
  const handleFrame = (frame: string) => {
    const line = frame.split("\n").find((l) => l.startsWith("data: "))
    if (!line) return
    try {
      onEvent(JSON.parse(line.slice(6)))
    } catch {
      // 忽略无法解析的帧
    }
  }
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      handleFrame(buffer.slice(0, idx))
      buffer = buffer.slice(idx + 2)
    }
  }
  buffer += decoder.decode()
  if (buffer.trim()) handleFrame(buffer)
}

export interface BaseResumeVersion {
  id: number
  version: number
  change_log: string | null
  content: Record<string, unknown>
  created_at: string
}

export interface JobResume {
  id: number
  base_resume_version_id: number
  raw_jd_text: string
  model_used: string
  match_report: string | null
  generated_content: Record<string, unknown>
  created_at: string
}

export interface LLMConfig {
  id: number
  provider_name: string
  api_base: string
  api_key: string
  model_name: string
  is_active: boolean
  updated_at: string
}

export interface ParsedResume {
  name?: string | null
  title?: string | null
  email?: string | null
  phone?: string | null
  location?: string | null
  website?: string | null
  linkedin?: string | null
  github?: string | null
  summary?: string | null
  skillCategories?: Record<string, unknown>[]
  experience?: Record<string, unknown>[]
  projects?: Record<string, unknown>[]
  education?: Record<string, unknown>[]
  certifications?: string | null
  languages?: string | null
  awards?: string | null
  publications?: string | null
}

export const api = {
  baseResume: {
    list: () => request<BaseResumeVersion[]>("/api/base-resume/versions"),
    get: (id: number) => request<BaseResumeVersion>(`/api/base-resume/versions/${id}`),
    latest: () => request<BaseResumeVersion>("/api/base-resume/latest"),
    create: (data: { content: Record<string, unknown>; change_log?: string }) =>
      request<BaseResumeVersion>("/api/base-resume/versions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: { content: Record<string, unknown>; change_log?: string }) =>
      request<BaseResumeVersion>(`/api/base-resume/versions/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<void>(`/api/base-resume/versions/${id}`, { method: "DELETE" }),
    importPdf: (file: File) => upload<ParsedResume>("/api/base-resume/import-pdf", "file", [file]),
    importText: (text: string) =>
      request<ParsedResume>("/api/base-resume/import-text", {
        method: "POST",
        body: JSON.stringify({ text }),
      }),
    importImage: (files: File[]) => upload<ParsedResume>("/api/base-resume/import-image", "files", files),
  },
  jobResume: {
    list: (baseVersionId?: number) => {
      const qs = baseVersionId ? `?base_version_id=${baseVersionId}` : ""
      return request<JobResume[]>(`/api/job-resume/${qs}`)
    },
    get: (id: number) => request<JobResume>(`/api/job-resume/${id}`),
    generateReport: (
      resumeId: number,
      handlers: {
        onDelta: (s: string) => void
        onDone: () => void
        onError: (msg: string) => void
      }
    ): AbortController => {
      const controller = new AbortController()
      ;(async () => {
        try {
          const res = await fetch(`${API_URL}/api/job-resume/${resumeId}/report`, {
            method: "POST",
            signal: controller.signal,
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }))
            handlers.onError(err.detail || "请求失败")
            return
          }
          await readSSE(res, (payload) => {
            if (payload.type === "delta" && typeof payload.content === "string") {
              handlers.onDelta(payload.content)
            } else if (payload.type === "done") {
              handlers.onDone()
            } else if (payload.type === "error") {
              handlers.onError(typeof payload.message === "string" ? payload.message : "生成失败")
            }
          })
        } catch (e) {
          if ((e as Error).name === "AbortError") handlers.onError("已停止")
          else handlers.onError(e instanceof Error ? e.message : "生成失败")
        }
      })()
      return controller
    },
    generateStream: (
      data: {
        base_resume_version_id: number
        raw_jd_text: string
      },
      handlers: {
        onAnalysis: (s: string) => void
        onDone: (resume: JobResume) => void
        onError: (msg: string) => void
      }
    ): AbortController => {
      const controller = new AbortController()
      ;(async () => {
        try {
          const res = await fetch(`${API_URL}/api/job-resume/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
            signal: controller.signal,
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }))
            handlers.onError(err.detail || "请求失败")
            return
          }
          await readSSE(res, (payload) => {
            if (payload.type === "analysis" && typeof payload.content === "string") {
              handlers.onAnalysis(payload.content)
            } else if (payload.type === "done" && payload.resume) {
              handlers.onDone(payload.resume as JobResume)
            } else if (payload.type === "error") {
              handlers.onError(typeof payload.message === "string" ? payload.message : "生成失败")
            }
          })
        } catch (e) {
          if ((e as Error).name === "AbortError") handlers.onError("已停止")
          else handlers.onError(e instanceof Error ? e.message : "生成失败")
        }
      })()
      return controller
    },
    delete: (id: number) =>
      request<void>(`/api/job-resume/${id}`, { method: "DELETE" }),
  },
  optimize: {
    streamContent: (
      text: string,
      type: "summary" | "experience" | "project",
      handlers: {
        onDelta: (s: string) => void
        onDone: () => void
        onError: (msg: string) => void
      }
    ): AbortController => {
      const controller = new AbortController()
      ;(async () => {
        try {
          const res = await fetch(`${API_URL}/api/optimize/content`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, type }),
            signal: controller.signal,
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }))
            handlers.onError(err.detail || "请求失败")
            return
          }
          await readSSE(res, (payload) => {
            if (payload.type === "delta" && typeof payload.content === "string") {
              handlers.onDelta(payload.content)
            } else if (payload.type === "done") {
              handlers.onDone()
            } else if (payload.type === "error") {
              handlers.onError(typeof payload.message === "string" ? payload.message : "优化失败")
            }
          })
        } catch (e) {
          if ((e as Error).name === "AbortError") handlers.onError("已停止")
          else handlers.onError(e instanceof Error ? e.message : "优化失败")
        }
      })()
      return controller
    },
  },
  ocr: {
    extract: (files: File[]) => upload<{ text: string }>("/api/ocr/extract", "files", files),
  },
  llmConfig: {
    list: () => request<LLMConfig[]>("/api/llm-config/"),
    active: () => request<LLMConfig>("/api/llm-config/active"),
    create: (data: {
      provider_name: string
      api_base: string
      api_key: string
      model_name: string
    }) =>
      request<LLMConfig>("/api/llm-config/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<LLMConfig>) =>
      request<LLMConfig>(`/api/llm-config/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<void>(`/api/llm-config/${id}`, { method: "DELETE" }),
  },
}
