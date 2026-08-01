"use client"

import { useState } from "react"

export function PDFExporter() {
  const [printing, setPrinting] = useState(false)

  const handleExport = () => {
    setPrinting(true)
    try {
      window.print()
    } finally {
      setTimeout(() => setPrinting(false), 1000)
    }
  }

  return (
    <button onClick={handleExport} disabled={printing} className="btn-primary">
      {printing ? "打印中..." : "导出 PDF"}
    </button>
  )
}
