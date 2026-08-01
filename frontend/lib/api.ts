const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

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

export interface MasterResumeVersion {
  id: number
  version: number
  change_log: string | null
  content: Record<string, unknown>
  created_at: string
}

export interface TailoredResume {
  id: number
  master_resume_version_id: number
  raw_jd_text: string
  model_used: string
  generated_content: Record<string, unknown>
  created_at: string
}

export interface LLMConfig {
  id: number
  provider_name: string
  api_base: string
  api_key: string
  model_name: string
  temperature: number
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
  certifications?: Record<string, unknown>[]
  languages?: Record<string, unknown>[]
  awards?: Record<string, unknown>[]
  publications?: Record<string, unknown>[]
}

export const api = {
  masterResume: {
    list: () => request<MasterResumeVersion[]>("/api/master-resume/versions"),
    get: (id: number) => request<MasterResumeVersion>(`/api/master-resume/versions/${id}`),
    latest: () => request<MasterResumeVersion>("/api/master-resume/latest"),
    create: (data: { content: Record<string, unknown>; change_log?: string }) =>
      request<MasterResumeVersion>("/api/master-resume/versions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: { content: Record<string, unknown>; change_log?: string }) =>
      request<MasterResumeVersion>(`/api/master-resume/versions/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<void>(`/api/master-resume/versions/${id}`, { method: "DELETE" }),
    importPdf: (file: File) => upload<ParsedResume>("/api/master-resume/import-pdf", "file", [file]),
    importText: (text: string) =>
      request<ParsedResume>("/api/master-resume/import-text", {
        method: "POST",
        body: JSON.stringify({ text }),
      }),
    importImage: (files: File[]) => upload<ParsedResume>("/api/master-resume/import-image", "files", files),
  },
  tailoredResume: {
    list: () => request<TailoredResume[]>("/api/tailored-resume/"),
    get: (id: number) => request<TailoredResume>(`/api/tailored-resume/${id}`),
    generate: (data: {
      master_resume_version_id: number
      raw_jd_text: string
    }) =>
      request<TailoredResume>("/api/tailored-resume/generate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  optimize: {
    content: (text: string, type: "summary" | "experience" | "project") =>
      request<{ optimized: string }>("/api/optimize/content", {
        method: "POST",
        body: JSON.stringify({ text, type }),
      }),
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
      temperature: number
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
