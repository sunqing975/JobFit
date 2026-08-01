"use client"

import { useState } from "react"
import type { JobResume } from "@/lib/api"

interface Props {
  resume: JobResume
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
      const { pdf, Font, Document, Page, View, Text, Image } = await import("@react-pdf/renderer")

      Font.register({
        family: "NotoSansSC",
        fonts: [
          { src: "/fonts/NotoSansCJKsc-Regular.otf", fontWeight: "normal" },
          { src: "/fonts/NotoSansCJKsc-Bold.otf", fontWeight: "bold" },
        ],
      })

      const c = resume.generated_content

      const Doc = (
        <Document>
          <Page size="A4" style={{ padding: 40, fontFamily: "NotoSansSC", fontSize: 11, lineHeight: 1.5, color: "#333" }}>
            {/* Header */}
            <View style={{ display: "flex", flexDirection: "row", gap: 20, paddingBottom: 16, borderBottomWidth: 2, borderBottomStyle: "solid", borderBottomColor: "#ddd", marginBottom: 20, alignItems: "center" }}>
              {(c.avatar as string) && <Image src={String(c.avatar)} style={{ width: 72, height: 72, borderRadius: 36, objectFit: "cover" }} />}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 24, fontWeight: "bold", color: "#111" }}>{String(c.name || "")}</Text>
                {(c.title as string) && <Text style={{ fontSize: 14, color: "#2563eb", marginTop: 4 }}>{String(c.title)}</Text>}
              </View>
            </View>

            {/* Summary */}
            {(c.summary as string) && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: "#2563eb", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>个人总结</Text>
                <Text style={{ fontSize: 11, color: "#555" }}>{String(c.summary)}</Text>
              </View>
            )}

            {/* Skills */}
            {((c.skillCategories as SkillCat[]) || []).filter((s) => s.category).map((cat, i) => (
              <View key={`skill-${i}`} style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: "bold", color: "#333" }}>{cat.category}：</Text>
                <View style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                  {cat.skills.filter(Boolean).map((s, j) => (
                    <Text key={`${i}-${j}`} style={{ backgroundColor: "#eef2ff", color: "#4338ca", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 10 }}>{s}</Text>
                  ))}
                </View>
              </View>
            ))}

            {/* Experience */}
            {((c.experience as ExpItem[]) || []).map((exp, i) => (
              <View key={`exp-${i}`} style={{ marginBottom: 16 }}>
                <View style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                  <Text style={{ fontWeight: "bold", fontSize: 12, color: "#111" }}>
                    {exp.role} <Text style={{ fontWeight: "normal", color: "#666" }}>· {exp.company}{exp.location ? ` (${exp.location})` : ""}</Text>
                  </Text>
                  <Text style={{ fontSize: 10, color: "#999" }}>{exp.period}</Text>
                </View>
                {(exp.techStack || []).length > 0 && (
                  <View style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 2, marginTop: 4 }}>
                    {exp.techStack!.map((t, j) => (
                      <Text key={`${i}-${j}`} style={{ backgroundColor: "#f1f5f9", color: "#475569", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 3, fontSize: 9 }}>{t}</Text>
                    ))}
                  </View>
                )}
                {(exp.bullets || []).filter(Boolean).length > 0 && (
                  <View style={{ marginTop: 4 }}>
                    {exp.bullets.filter(Boolean).map((b, j) => (
                      <Text key={`${i}-${j}`} style={{ fontSize: 11, marginBottom: 2, color: "#555" }}>• {b}</Text>
                    ))}
                  </View>
                )}
              </View>
            ))}

            {/* Education */}
            {((c.education as EduItem[]) || []).map((edu, i) => (
              <View key={`edu-${i}`} style={{ marginBottom: 8, display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                <Text style={{ fontSize: 11 }}>
                  <Text style={{ fontWeight: "bold", color: "#111" }}>{edu.school}</Text>
                  <Text style={{ color: "#666" }}>  {edu.major} · {edu.degree}{edu.gpa ? `  GPA: ${edu.gpa}` : ""}</Text>
                </Text>
                <Text style={{ fontSize: 10, color: "#999" }}>{edu.period}</Text>
              </View>
            ))}
          </Page>
        </Document>
      )

      const blob = await pdf(Doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const firstLine = resume.raw_jd_text.split("\n")[0].trim().slice(0, 20).replace(/\s+/g, "_")
      a.download = `resume_${firstLine || "custom"}.pdf`
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
