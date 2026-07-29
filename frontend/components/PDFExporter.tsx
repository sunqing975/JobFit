"use client"

import { useState } from "react"
import type { TailoredResume } from "@/lib/api"

interface Props {
  resume: TailoredResume
}

export function PDFExporter({ resume }: Props) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const { pdf } = await import("@react-pdf/renderer")
      const content = resume.generated_content

      const Doc = (
        <div
          style={{
            padding: 40,
            fontFamily: "Helvetica",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <div
            style={{
              borderBottom: "2 solid #333",
              paddingBottom: 10,
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 24, fontWeight: "bold" }}>
              {String(content.name || "")}
            </div>
            <div style={{ color: "#666", marginTop: 4 }}>
              {String(content.title || "")}
            </div>
            <div style={{ fontSize: 10, color: "#999", marginTop: 8 }}>
              {String(content.email || "")}
              {content.email && content.phone ? " | " : ""}
              {String(content.phone || "")}
            </div>
          </div>

          {content.summary ? (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: "bold",
                  borderBottom: "1 solid #ccc",
                  paddingBottom: 4,
                  marginBottom: 8,
                }}
              >
                个人总结
              </div>
              <div style={{ color: "#444", fontSize: 11 }}>
                {String(content.summary)}
              </div>
            </div>
          ) : null}

          {(content.skills as string[] || []).length > 0 ? (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: "bold",
                  borderBottom: "1 solid #ccc",
                  paddingBottom: 4,
                  marginBottom: 8,
                }}
              >
                技能
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {((content.skills as string[]) || []).map((skill, i) => (
                  <span
                    key={i}
                    style={{
                      backgroundColor: "#f3f4f6",
                      padding: "2 8",
                      borderRadius: 4,
                      fontSize: 10,
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {((content.experience as any[]) || []).map((exp, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <div style={{ fontWeight: "bold", fontSize: 12 }}>
                  {exp.role}
                </div>
                <div style={{ fontSize: 10, color: "#666" }}>{exp.period}</div>
              </div>
              <div style={{ fontSize: 11, color: "#666" }}>{exp.company}</div>
              {(exp.bullets || []).length > 0 ? (
                <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                  {(exp.bullets as string[]).map((bullet: string, j: number) => (
                    <li key={j} style={{ fontSize: 11, marginBottom: 2 }}>
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}

          {((content.education as any[]) || []).map((edu, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <div>
                  <span style={{ fontWeight: "bold", fontSize: 12 }}>
                    {edu.school}
                  </span>
                  <span style={{ color: "#666", fontSize: 11, marginLeft: 8 }}>
                    {edu.major} · {edu.degree}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: "#666" }}>{edu.period}</div>
              </div>
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
    <button
      onClick={handleExport}
      disabled={exporting}
      className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
    >
      {exporting ? "导出中..." : "导出 PDF"}
    </button>
  )
}
