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
  job_title: string
  company_name: string | null
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
  },
  tailoredResume: {
    list: () => request<TailoredResume[]>("/api/tailored-resume/"),
    get: (id: number) => request<TailoredResume>(`/api/tailored-resume/${id}`),
    generate: (data: {
      master_resume_version_id: number
      job_title: string
      company_name?: string
      raw_jd_text: string
    }) =>
      request<TailoredResume>("/api/tailored-resume/generate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
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
