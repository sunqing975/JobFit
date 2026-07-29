"use client"

import { useState } from "react"
import type { TailoredResume } from "@/lib/api"

interface Props {
  resume: TailoredResume
}

interface ExpItem { company: string; location?: string; role: string; period: string; bullets: string[]; techStack?: string[] }
interface ProjItem { name: string; role: string; period: string; description: string; bullets: string[]; techStack?: string[]; url?: string }
interface EduItem { school: string; degree: string; major: string; period: string; gpa?: string }
interface SkillCat { category: string; skills: string[] }

export function PDFExporter({ resume }: Props) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const { pdf } = await import("@react-pdf/renderer")
      const c = resume.generated_content

      const Doc = (
        <div style={{ padding: 40, fontFamily: "Helvetica", fontSize: 11, lineHeight: 1.5, color: "#333" }}>
          {/* Header */}
          <div style={{ display: "flex", gap: 20, paddingBottom: 16, borderBottom: "2 solid #ddd", marginBottom: 20 }}>
            {(c.avatar as string) && <img src={String(c.avatar)} style={{ width: 72, height: 72, borderRadius: 36, objectFit: "cover" }} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#111" }}>{String(c.name || "")}</div>
              {(c.title as string) && <div style={{ fontSize: 14, color: "#2563eb", marginTop: 4 }}>{String(c.title)}</div>}
            </div>
          </div>

          {/* Summary */}
          {(c.summary as string) && <div style={{ marginBottom: 20 }}><div style={{ fontSize: 10, fontWeight: "bold", color: "#2563eb", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>个人总结</div><div style={{ fontSize: 11, color: "#555" }}>{String(c.summary)}</div></div>}

          {/* Skills */}
          {((c.skillCategories as SkillCat[]) || []).filter(s => s.category).map((cat, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: "bold", color: "#333" }}>{cat.category}：</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                {cat.skills.filter(Boolean).map((s, j) => (
                  <span key={j} style={{ backgroundColor: "#eef2ff", color: "#4338ca", padding: "2 8", borderRadius: 4, fontSize: 10 }}>{s}</span>
                ))}
              </div>
            </div>
          ))}

          {/* Experience */}
          {((c.experience as ExpItem[]) || []).map((exp, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: "bold", fontSize: 12, color: "#111" }}>{exp.role} <span style={{ fontWeight: "normal", color: "#666" }}>· {exp.company}{exp.location ? ` (${exp.location})` : ""}</span></div>
                <div style={{ fontSize: 10, color: "#999" }}>{exp.period}</div>
              </div>
              {(exp.techStack || []).length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 4 }}>{exp.techStack!.map((t, j) => <span key={j} style={{ backgroundColor: "#f1f5f9", color: "#475569", padding: "1 6", borderRadius: 3, fontSize: 9 }}>{t}</span>)}</div>}
              {(exp.bullets || []).filter(Boolean).length > 0 && <ul style={{ marginTop: 4, paddingLeft: 16, margin: "4 0 0 0" }}>{exp.bullets.filter(Boolean).map((b, j) => <li key={j} style={{ fontSize: 11, marginBottom: 2, color: "#555" }}>{b}</li>)}</ul>}
            </div>
          ))}

          {/* Education */}
          {((c.education as EduItem[]) || []).map((edu, i) => (
            <div key={i} style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div><span style={{ fontWeight: "bold", fontSize: 11, color: "#111" }}>{edu.school}</span><span style={{ color: "#666", marginLeft: 6, fontSize: 11 }}>{edu.major} · {edu.degree}{edu.gpa ? `  GPA: ${edu.gpa}` : ""}</span></div>
              <div style={{ fontSize: 10, color: "#999" }}>{edu.period}</div>
            </div>
          ))}
        </div>
      )

      const blob = await pdf(Doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `resume_${resume.job_title.replace(/\s+/g, "_")}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("PDF 导出失败:", err)
      alert("PDF 导出失败，请检查控制台")
    } finally {
      setExporting(false)
    }
  }

  return (
    <button onClick={handleExport} disabled={exporting} className="btn-primary">
      {exporting ? "导出中..." : "导出 PDF"}
    </button>
  )
}
