"use client"

import { useState, useRef } from "react"
import { api } from "@/lib/api"

interface Props {
  initialContent: Record<string, unknown>
  currentVersionId?: number | null
  onSave: (
    content: Record<string, unknown>,
    changeLog: string | undefined,
    mode: "update" | "create"
  ) => Promise<void>
}

interface ExperienceItem {
  company: string; location?: string; role: string; period: string; bullets: string[]; techStack?: string[]
}

interface ProjectItem {
  name: string; role: string; period: string; description: string; bullets: string[]; techStack?: string[]; url?: string
}

interface EducationItem {
  school: string; degree: string; major: string; period: string; gpa?: string
}

interface SkillCategory {
  category: string; skills: string[]
}

interface CertificationItem {
  name: string; issuer: string; date: string; url?: string
}

interface LanguageItem {
  name: string; proficiency: string
}

interface AwardItem {
  name: string; issuer: string; date: string
}

interface PublicationItem {
  title: string; publisher: string; date: string; url?: string
}

const emptyExperience = (): ExperienceItem => ({ company: "", role: "", period: "", bullets: [""], techStack: [] })
const emptyProject = (): ProjectItem => ({ name: "", role: "", period: "", description: "", bullets: [""], techStack: [] })
const emptyEducation = (): EducationItem => ({ school: "", degree: "", major: "", period: "" })
const emptyCert = (): CertificationItem => ({ name: "", issuer: "", date: "" })
const emptyLang = (): LanguageItem => ({ name: "", proficiency: "流利" })
const emptyAward = (): AwardItem => ({ name: "", issuer: "", date: "" })
const emptyPub = (): PublicationItem => ({ title: "", publisher: "", date: "" })

export function BaseResumeForm({ initialContent, currentVersionId, onSave }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [changeLog, setChangeLog] = useState("")
  const [showMore, setShowMore] = useState(false)
  const [optimizing, setOptimizing] = useState<string | false>(false)

  const [avatar, setAvatar] = useState<string>((initialContent.avatar as string) || "")
  const [name, setName] = useState((initialContent.name as string) || "")
  const [title, setTitle] = useState((initialContent.title as string) || "")
  const [email, setEmail] = useState((initialContent.email as string) || "")
  const [phone, setPhone] = useState((initialContent.phone as string) || "")
  const [location, setLocation] = useState((initialContent.location as string) || "")
  const [website, setWebsite] = useState((initialContent.website as string) || "")
  const [linkedin, setLinkedin] = useState((initialContent.linkedin as string) || "")
  const [github, setGithub] = useState((initialContent.github as string) || "")
  const [summary, setSummary] = useState((initialContent.summary as string) || "")
  const [skillCategories, setSkillCategories] = useState<SkillCategory[]>((initialContent.skillCategories as SkillCategory[]) || [{ category: "", skills: [""] }])
  const [experience, setExperience] = useState<ExperienceItem[]>((initialContent.experience as ExperienceItem[]) || [])
  const [projects, setProjects] = useState<ProjectItem[]>((initialContent.projects as ProjectItem[]) || [])
  const [education, setEducation] = useState<EducationItem[]>((initialContent.education as EducationItem[]) || [])
  const [certifications, setCertifications] = useState<CertificationItem[]>((initialContent.certifications as CertificationItem[]) || [])
  const [languages, setLanguages] = useState<LanguageItem[]>((initialContent.languages as LanguageItem[]) || [])
  const [awards, setAwards] = useState<AwardItem[]>((initialContent.awards as AwardItem[]) || [])
  const [publications, setPublications] = useState<PublicationItem[]>((initialContent.publications as PublicationItem[]) || [])

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert("图片大小不能超过 2MB"); return }
    const reader = new FileReader()
    reader.onload = () => setAvatar(reader.result as string)
    reader.readAsDataURL(file)
  }

  const buildContent = (): Record<string, unknown> => ({
    avatar: avatar || undefined,
    name, title, email, phone,
    location: location || undefined,
    website: website || undefined,
    linkedin: linkedin || undefined,
    github: github || undefined,
    summary: summary || undefined,
    skillCategories: skillCategories.filter(c => c.category.trim()),
    experience,
    projects,
    education,
    certifications: certifications.filter(c => c.name.trim()) || undefined,
    languages: languages.filter(l => l.name.trim()) || undefined,
    awards: awards.filter(a => a.name.trim()) || undefined,
    publications: publications.filter(p => p.title.trim()) || undefined,
  })

  const handleSave = async (mode: "update" | "create") => {
    setSaving(true)
    try {
      await onSave(buildContent(), changeLog || undefined, mode)
      setChangeLog("")
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-5">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

      {/* 基本信息 */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-slate-800">基本信息</h3></div>
        <div className="card-body space-y-4">
          <div className="flex items-center gap-6">
            <button type="button" onClick={() => fileRef.current?.click()} className="relative group flex-shrink-0">
              {avatar ? (
                <img src={avatar} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-slate-200" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs">点击上传头像</div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">更换</span>
              </div>
            </button>
            <div className="text-xs text-slate-400">支持 JPG/PNG，建议 1:1 比例，不超过 2MB</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">姓名</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="张三" /></div>
            <div><label className="form-label">职位</label><input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="高级前端工程师" /></div>
            <div><label className="form-label">邮箱</label><input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="zhangsan@email.com" /></div>
            <div><label className="form-label">电话</label><input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="138-0000-0000" /></div>
            <div><label className="form-label">所在地</label><input className="form-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="北京 / 上海" /></div>
            <div><label className="form-label">个人网站</label><input className="form-input" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourblog.com" /></div>
            <div><label className="form-label">LinkedIn</label><input className="form-input" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." /></div>
            <div><label className="form-label">GitHub</label><input className="form-input" value={github} onChange={e => setGithub(e.target.value)} placeholder="https://github.com/..." /></div>
          </div>
        </div>
      </div>

      {/* 个人总结 */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-slate-800">个人总结</h3>
          <button
            type="button"
            className="btn-ghost text-sm"
            disabled={optimizing === "summary" || !summary.trim()}
            onClick={async () => {
              setOptimizing("summary")
              try {
                const res = await api.optimize.content(summary, "summary")
                setSummary(res.optimized)
              } catch (e) {
                alert(e instanceof Error ? e.message : "优化失败")
              } finally {
                setOptimizing(false)
              }
            }}
          >
            {optimizing === "summary" ? (
              <span className="flex items-center gap-1">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                AI 优化中...
              </span>
            ) : "AI 优化"}
          </button>
        </div>
        <div className="card-body">
          <textarea className="form-textarea" rows={4} value={summary} onChange={e => setSummary(e.target.value)} placeholder="简要介绍自己的核心竞争力和职业目标..." />
        </div>
      </div>

      {/* 技能分类 */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-slate-800">技能</h3>
          <button type="button" className="btn-ghost text-sm" onClick={() => setSkillCategories([...skillCategories, { category: "", skills: [""] }])}>+ 添加分类</button>
        </div>
        <div className="card-body space-y-4">
          {skillCategories.map((cat, ci) => (
            <div key={ci} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <input className="form-input flex-1" value={cat.category} onChange={e => { const c = [...skillCategories]; c[ci].category = e.target.value; setSkillCategories(c) }} placeholder="分类名称，如：前端技术" />
                <button type="button" className="btn-ghost text-xs text-red-500" onClick={() => setSkillCategories(skillCategories.filter((_, i) => i !== ci))}>删除</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {cat.skills.map((skill, si) => (
                  <div key={si} className="flex items-center gap-1">
                    <input className="form-input !w-28 !py-1.5 !text-xs" value={skill} onChange={e => { const c = [...skillCategories]; c[ci].skills[si] = e.target.value; setSkillCategories(c) }} placeholder="技能" />
                    <button type="button" className="text-slate-400 hover:text-red-500 text-xs" onClick={() => { const c = [...skillCategories]; c[ci].skills = cat.skills.filter((_, j) => j !== si); setSkillCategories(c) }}>✕</button>
                  </div>
                ))}
                <button type="button" className="text-xs text-blue-600 hover:text-blue-700" onClick={() => { const c = [...skillCategories]; c[ci].skills = [...cat.skills, ""]; setSkillCategories(c) }}>+ 添加</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 工作经历 */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-slate-800">工作经历</h3>
          <button type="button" className="btn-ghost text-sm" onClick={() => setExperience([...experience, emptyExperience()])}>+ 添加经历</button>
        </div>
        <div className="card-body space-y-4">
          {experience.map((exp, i) => (
            <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-500">#{i + 1}</span>
                <button type="button" className="btn-ghost text-xs text-red-500" onClick={() => setExperience(experience.filter((_, j) => j !== i))}>删除</button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><label className="form-label">公司</label><input className="form-input" value={exp.company} onChange={e => { const c = [...experience]; c[i].company = e.target.value; setExperience(c) }} placeholder="公司名称" /></div>
                <div><label className="form-label">地点</label><input className="form-input" value={exp.location || ""} onChange={e => { const c = [...experience]; c[i].location = e.target.value; setExperience(c) }} placeholder="城市" /></div>
                <div><label className="form-label">职位</label><input className="form-input" value={exp.role} onChange={e => { const c = [...experience]; c[i].role = e.target.value; setExperience(c) }} placeholder="高级前端工程师" /></div>
                <div><label className="form-label">时间</label><input className="form-input" value={exp.period} onChange={e => { const c = [...experience]; c[i].period = e.target.value; setExperience(c) }} placeholder="2020.03 - 2023.06" /></div>
              </div>
              <div className="mb-3">
                <label className="form-label">技术栈标签（逗号分隔）</label>
                <input className="form-input" value={(exp.techStack || []).join(", ")} onChange={e => { const c = [...experience]; c[i].techStack = e.target.value.split(/[,，]\s*/).filter(Boolean); setExperience(c) }} placeholder="React, TypeScript, Node.js" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="form-label !mb-0">工作描述（每条一行）</label>
                  <button type="button" className="btn-ghost text-xs" disabled={optimizing === "exp" + i || !exp.bullets.join("").trim()} onClick={async () => { setOptimizing("exp" + i); try { const res = await api.optimize.content(exp.bullets.filter(Boolean).join("\n"), "experience"); const c = [...experience]; c[i].bullets = res.optimized.split("\n").filter(Boolean); setExperience(c) } catch (e) { alert(e instanceof Error ? e.message : "优化失败") } finally { setOptimizing(false) } }}>{optimizing === "exp" + i ? "优化中..." : "AI 优化"}</button>
                </div>
                <textarea className="form-textarea" rows={3} value={exp.bullets.join("\n")} onChange={e => { const c = [...experience]; c[i].bullets = e.target.value.split("\n").filter(Boolean); if (c[i].bullets.length === 0) c[i].bullets = [""]; setExperience(c) }} placeholder="使用 STAR 原则描述工作成果..." />
              </div>
            </div>
          ))}
          {experience.length === 0 && <div className="text-center py-6 text-slate-400 text-sm">暂无工作经历，点击上方按钮添加</div>}
        </div>
      </div>

      {/* 项目经历 */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-slate-800">项目经历</h3>
          <button type="button" className="btn-ghost text-sm" onClick={() => setProjects([...projects, emptyProject()])}>+ 添加项目</button>
        </div>
        <div className="card-body space-y-4">
          {projects.map((proj, i) => (
            <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-500">#{i + 1}</span>
                <button type="button" className="btn-ghost text-xs text-red-500" onClick={() => setProjects(projects.filter((_, j) => j !== i))}>删除</button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><label className="form-label">项目名称</label><input className="form-input" value={proj.name} onChange={e => { const c = [...projects]; c[i].name = e.target.value; setProjects(c) }} placeholder="项目名称" /></div>
                <div><label className="form-label">角色</label><input className="form-input" value={proj.role} onChange={e => { const c = [...projects]; c[i].role = e.target.value; setProjects(c) }} placeholder="核心开发者 / 技术负责人" /></div>
                <div><label className="form-label">时间</label><input className="form-input" value={proj.period} onChange={e => { const c = [...projects]; c[i].period = e.target.value; setProjects(c) }} placeholder="2022.01 - 2022.12" /></div>
                <div><label className="form-label">项目链接</label><input className="form-input" value={proj.url || ""} onChange={e => { const c = [...projects]; c[i].url = e.target.value; setProjects(c) }} placeholder="https://github.com/..." /></div>
              </div>
              <div className="mb-3">
                <label className="form-label">项目简介</label>
                <input className="form-input" value={proj.description} onChange={e => { const c = [...projects]; c[i].description = e.target.value; setProjects(c) }} placeholder="简短描述项目背景和定位" />
              </div>
              <div className="mb-3">
                <label className="form-label">技术栈标签（逗号分隔）</label>
                <input className="form-input" value={(proj.techStack || []).join(", ")} onChange={e => { const c = [...projects]; c[i].techStack = e.target.value.split(/[,，]\s*/).filter(Boolean); setProjects(c) }} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="form-label !mb-0">项目亮点（每条一行）</label>
                  <button type="button" className="btn-ghost text-xs" disabled={optimizing === "proj" + i || !proj.bullets.join("").trim()} onClick={async () => { setOptimizing("proj" + i); try { const res = await api.optimize.content(proj.bullets.filter(Boolean).join("\n"), "project"); const c = [...projects]; c[i].bullets = res.optimized.split("\n").filter(Boolean); setProjects(c) } catch (e) { alert(e instanceof Error ? e.message : "优化失败") } finally { setOptimizing(false) } }}>{optimizing === "proj" + i ? "优化中..." : "AI 优化"}</button>
                </div>
                <textarea className="form-textarea" rows={3} value={proj.bullets.join("\n")} onChange={e => { const c = [...projects]; c[i].bullets = e.target.value.split("\n").filter(Boolean); if (c[i].bullets.length === 0) c[i].bullets = [""]; setProjects(c) }} />
              </div>
            </div>
          ))}
          {projects.length === 0 && <div className="text-center py-6 text-slate-400 text-sm">暂无项目经历，点击上方按钮添加</div>}
        </div>
      </div>

      {/* 教育背景 */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-slate-800">教育背景</h3>
          <button type="button" className="btn-ghost text-sm" onClick={() => setEducation([...education, emptyEducation()])}>+ 添加教育</button>
        </div>
        <div className="card-body space-y-4">
          {education.map((edu, i) => (
            <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-500">#{i + 1}</span>
                <button type="button" className="btn-ghost text-xs text-red-500" onClick={() => setEducation(education.filter((_, j) => j !== i))}>删除</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">学校</label><input className="form-input" value={edu.school} onChange={e => { const c = [...education]; c[i].school = e.target.value; setEducation(c) }} placeholder="北京大学" /></div>
                <div><label className="form-label">学位</label><select className="form-input" value={edu.degree} onChange={e => { const c = [...education]; c[i].degree = e.target.value; setEducation(c) }}><option value="">选择学位</option><option>博士</option><option>硕士</option><option>学士</option><option>大专</option></select></div>
                <div><label className="form-label">专业</label><input className="form-input" value={edu.major} onChange={e => { const c = [...education]; c[i].major = e.target.value; setEducation(c) }} placeholder="计算机科学与技术" /></div>
                <div><label className="form-label">时间</label><input className="form-input" value={edu.period} onChange={e => { const c = [...education]; c[i].period = e.target.value; setEducation(c) }} placeholder="2016.09 - 2020.06" /></div>
                <div><label className="form-label">GPA（可选）</label><input className="form-input" value={edu.gpa || ""} onChange={e => { const c = [...education]; c[i].gpa = e.target.value; setEducation(c) }} placeholder="3.8/4.0" /></div>
              </div>
            </div>
          ))}
          {education.length === 0 && <div className="text-center py-6 text-slate-400 text-sm">暂无教育背景，点击上方按钮添加</div>}
        </div>
      </div>

      {/* 更多信息（折叠） */}
      <div className="card">
        <button type="button" className="card-header w-full text-left" onClick={() => setShowMore(!showMore)}>
          <h3 className="font-semibold text-slate-800">更多信息</h3>
          <span className={`text-slate-400 transition-transform ${showMore ? "rotate-180" : ""}`}>▾</span>
        </button>
        {showMore && (
          <div className="card-body space-y-6">
            {/* 证书 */}
            <div>
              <div className="flex items-center justify-between mb-3"><h4 className="text-sm font-medium text-slate-700">证书认证</h4><button type="button" className="btn-ghost text-xs" onClick={() => setCertifications([...certifications, emptyCert()])}>+ 添加</button></div>
              {certifications.map((item, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <input className="form-input flex-1" placeholder="证书名称" value={item.name} onChange={e => { const c = [...certifications]; c[i].name = e.target.value; setCertifications(c) }} />
                  <input className="form-input flex-1" placeholder="颁发机构" value={item.issuer} onChange={e => { const c = [...certifications]; c[i].issuer = e.target.value; setCertifications(c) }} />
                  <input className="form-input w-28" placeholder="日期" value={item.date} onChange={e => { const c = [...certifications]; c[i].date = e.target.value; setCertifications(c) }} />
                  <button type="button" className="btn-ghost text-xs text-red-500" onClick={() => setCertifications(certifications.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
            {/* 语言 */}
            <div>
              <div className="flex items-center justify-between mb-3"><h4 className="text-sm font-medium text-slate-700">语言能力</h4><button type="button" className="btn-ghost text-xs" onClick={() => setLanguages([...languages, emptyLang()])}>+ 添加</button></div>
              {languages.map((item, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <input className="form-input flex-1" placeholder="语言" value={item.name} onChange={e => { const c = [...languages]; c[i].name = e.target.value; setLanguages(c) }} />
                  <select className="form-input w-28" value={item.proficiency} onChange={e => { const c = [...languages]; c[i].proficiency = e.target.value; setLanguages(c) }}><option>母语</option><option>流利</option><option>商务</option><option>基础</option></select>
                  <button type="button" className="btn-ghost text-xs text-red-500" onClick={() => setLanguages(languages.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
            {/* 获奖 */}
            <div>
              <div className="flex items-center justify-between mb-3"><h4 className="text-sm font-medium text-slate-700">获奖荣誉</h4><button type="button" className="btn-ghost text-xs" onClick={() => setAwards([...awards, emptyAward()])}>+ 添加</button></div>
              {awards.map((item, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <input className="form-input flex-1" placeholder="奖项名称" value={item.name} onChange={e => { const c = [...awards]; c[i].name = e.target.value; setAwards(c) }} />
                  <input className="form-input flex-1" placeholder="颁发机构" value={item.issuer} onChange={e => { const c = [...awards]; c[i].issuer = e.target.value; setAwards(c) }} />
                  <input className="form-input w-28" placeholder="日期" value={item.date} onChange={e => { const c = [...awards]; c[i].date = e.target.value; setAwards(c) }} />
                  <button type="button" className="btn-ghost text-xs text-red-500" onClick={() => setAwards(awards.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
            {/* 出版物 */}
            <div>
              <div className="flex items-center justify-between mb-3"><h4 className="text-sm font-medium text-slate-700">出版物</h4><button type="button" className="btn-ghost text-xs" onClick={() => setPublications([...publications, emptyPub()])}>+ 添加</button></div>
              {publications.map((item, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <input className="form-input flex-1" placeholder="标题" value={item.title} onChange={e => { const c = [...publications]; c[i].title = e.target.value; setPublications(c) }} />
                  <input className="form-input flex-1" placeholder="出版方" value={item.publisher} onChange={e => { const c = [...publications]; c[i].publisher = e.target.value; setPublications(c) }} />
                  <input className="form-input w-28" placeholder="日期" value={item.date} onChange={e => { const c = [...publications]; c[i].date = e.target.value; setPublications(c) }} />
                  <button type="button" className="btn-ghost text-xs text-red-500" onClick={() => setPublications(publications.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 保存 */}
      <div className="flex items-center gap-4">
        <input className="form-input flex-1" placeholder="变更说明（可选，如：新增项目经历）" value={changeLog} onChange={e => setChangeLog(e.target.value)} />
        {currentVersionId ? (
          <>
            <button type="button" className="btn-ghost" onClick={() => handleSave("create")} disabled={saving}>{saving ? "保存中..." : "另存为新版本"}</button>
            <button type="button" className="btn-primary" onClick={() => handleSave("update")} disabled={saving}>{saving ? "保存中..." : "保存当前版本"}</button>
          </>
        ) : (
          <button type="button" className="btn-primary" onClick={() => handleSave("create")} disabled={saving}>{saving ? "保存中..." : "保存"}</button>
        )}
      </div>
    </div>
  )
}
