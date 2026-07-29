"use client"

import type { MasterResumeVersion } from "@/lib/api"

interface Props {
  versions: MasterResumeVersion[]
  selectedId: number | null
  onSelect: (v: MasterResumeVersion) => void
}

export function VersionHistory({ versions, selectedId, onSelect }: Props) {
  return (
    <div className="space-y-1.5 max-h-96 overflow-y-auto">
      {versions.length === 0 && (
        <div className="text-slate-400 text-sm text-center py-4">暂无版本</div>
      )}
      {versions.map((v) => (
        <button
          key={v.id}
          onClick={() => onSelect(v)}
          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
            selectedId === v.id
              ? "bg-blue-50 border border-blue-200"
              : "hover:bg-slate-50 border border-transparent"
          }`}
        >
          <div className="font-medium text-slate-800">v{v.version}</div>
          {v.change_log && <div className="text-slate-500 text-xs mt-0.5 truncate">{v.change_log}</div>}
          <div className="text-slate-400 text-xs mt-1">
            {new Date(v.created_at).toLocaleDateString("zh-CN")}
          </div>
        </button>
      ))}
    </div>
  )
}
