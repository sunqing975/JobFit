"use client"

import ReactMarkdown from "react-markdown"

interface Props {
  content: Record<string, unknown>
}

const md = (v: unknown): string => (typeof v === "string" ? v : "")

interface ExpItem { company: string; location?: string; role: string; period: string; bullets: string[]; techStack?: string[] }
interface ProjItem { name: string; role: string; period: string; description: string; bullets: string[]; techStack?: string[]; url?: string }
interface EduItem { school: string; degree: string; major: string; period: string; gpa?: string }
interface SkillCat { category: string; skills: string[] }

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="section-title">{title}</div>
      {children}
    </div>
  )
}

function MdSection({ title, text }: { title: string; text: string }) {
  if (!text.trim()) return null
  return (
    <Section title={title} className="mt-6">
      <div className="markdown-body">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    </Section>
  )
}

export function ResumePreview({ content }: Props) {
  const avatar = content.avatar as string | undefined
  const name = (content.name as string) || ""
  const title = (content.title as string) || ""
  const email = (content.email as string) || ""
  const phone = (content.phone as string) || ""
  const location = (content.location as string) || ""
  const website = (content.website as string) || ""
  const linkedin = (content.linkedin as string) || ""
  const github = (content.github as string) || ""
  const summary = (content.summary as string) || ""
  const skillCategories = (content.skillCategories as SkillCat[]) || []
  const experience = (content.experience as ExpItem[]) || []
  const projects = (content.projects as ProjItem[]) || []
  const education = (content.education as EduItem[]) || []

  const contactItems = [
    email && `📧 ${email}`,
    phone && `📞 ${phone}`,
    location && `📍 ${location}`,
    website && `🔗 ${website}`,
    linkedin && `💼 ${linkedin}`,
    github && `🐙 ${github}`,
  ].filter(Boolean)

  return (
    <div className="a4-paper">
      {/* Header */}
      <div className="flex items-start gap-6 pb-6 border-b-2 border-slate-200">
        {avatar && (
          <img src={avatar} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-slate-200 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-slate-900">{name || "你的姓名"}</h1>
          {title && <p className="text-lg text-blue-600 font-medium mt-1">{title}</p>}
          {contactItems.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-slate-500">
              {contactItems.map((item, i) => <span key={i}>{item}</span>)}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <Section title="个人总结" className="mt-6">
          <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
        </Section>
      )}

      {/* Skills */}
      {skillCategories.filter(c => c.category).length > 0 && (
        <Section title="专业技能" className="mt-6">
          <div className="space-y-3">
            {skillCategories.filter(c => c.category).map((cat, i) => (
              <div key={i}>
                <span className="text-sm font-medium text-slate-700">{cat.category}：</span>
                <div className="inline-flex flex-wrap gap-1.5 mt-1">
                  {cat.skills.filter(Boolean).map((s, j) => (
                    <span key={j} className="tag">{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Work Experience */}
      {experience.length > 0 && (
        <Section title="工作经历" className="mt-6">
          <div className="space-y-5">
            {experience.map((exp, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">{exp.role}</span>
                    <span className="text-slate-500 mx-2">·</span>
                    <span className="text-slate-600">{exp.company}</span>
                    {exp.location && <span className="text-slate-400 ml-1 text-sm">({exp.location})</span>}
                  </div>
                  <span className="text-sm text-slate-400 whitespace-nowrap ml-4">{exp.period}</span>
                </div>
                {(exp.techStack || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {exp.techStack!.map((t, j) => <span key={j} className="tag !bg-slate-100 !text-slate-600">{t}</span>)}
                  </div>
                )}
                {exp.bullets.filter(Boolean).length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {exp.bullets.filter(Boolean).map((b, j) => (
                      <li key={j} className="text-sm text-slate-700 leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-slate-400">{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <Section title="项目经历" className="mt-6">
          <div className="space-y-5">
            {projects.map((proj, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">{proj.name}</span>
                    <span className="text-slate-500 mx-2">·</span>
                    <span className="text-slate-600">{proj.role}</span>
                  </div>
                  <span className="text-sm text-slate-400 whitespace-nowrap ml-4">{proj.period}</span>
                </div>
                {proj.description && <p className="text-sm text-slate-500 mt-1">{proj.description}</p>}
                {(proj.techStack || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {proj.techStack!.map((t, j) => <span key={j} className="tag !bg-slate-100 !text-slate-600">{t}</span>)}
                  </div>
                )}
                {proj.bullets.filter(Boolean).length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {proj.bullets.filter(Boolean).map((b, j) => (
                      <li key={j} className="text-sm text-slate-700 leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-slate-400">{b}</li>
                    ))}
                  </ul>
                )}
                {proj.url && <a href={proj.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">{proj.url}</a>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Education */}
      {education.length > 0 && (
        <Section title="教育背景" className="mt-6">
          <div className="space-y-3">
            {education.map((edu, i) => (
              <div key={i} className="flex items-baseline justify-between">
                <div>
                  <span className="font-semibold text-slate-800">{edu.school}</span>
                  <span className="text-slate-500 mx-2">·</span>
                  <span className="text-slate-600">{edu.major}</span>
                  <span className="text-slate-400 ml-1 text-sm">({edu.degree})</span>
                  {edu.gpa && <span className="text-slate-400 ml-2 text-sm">GPA: {edu.gpa}</span>}
                </div>
                <span className="text-sm text-slate-400 whitespace-nowrap ml-4">{edu.period}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Certifications */}
      <MdSection title="证书认证" text={md(content.certifications)} />

      {/* Languages */}
      <MdSection title="语言能力" text={md(content.languages)} />

      {/* Awards */}
      <MdSection title="获奖荣誉" text={md(content.awards)} />

      {/* Publications */}
      <MdSection title="出版物" text={md(content.publications)} />
    </div>
  )
}
