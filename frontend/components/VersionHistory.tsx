"use client"

import type { MasterResumeVersion } from "@/lib/api"

interface Props {
  versions: MasterResumeVersion[]
  selectedId: number | null
  onSelect: (v: MasterResumeVersion) => void
  onDelete: (v: MasterResumeVersion) => void
}

export function VersionHistory({ versions, selectedId, onSelect, onDelete }: Props) {
  return (
    <div className="space-y-1.5 max-h-96 overflow-y-auto">
      {versions.length === 0 && (
        <div className="text-slate-400 text-sm text-center py-4">暂无版本</div>
      )}
      {versions.map((v) => (
        <div
          key={v.id}
          onClick={() => onSelect(v)}
          className={`group w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
            selectedId === v.id
              ? "bg-blue-50 border border-blue-200"
              : "hover:bg-slate-50 border border-transparent"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium text-slate-800">v{v.version}</div>
            <button
              type="button"
              title="删除版本"
              className="text-slate-300 hover:text-red-500 text-base leading-none opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(v)
              }}
            >
              ×
            </button>
          </div>
          {v.change_log && <div className="text-slate-500 text-xs mt-0.5 truncate">{v.change_log}</div>}
          <div className="text-slate-400 text-xs mt-1">
            {new Date(v.created_at).toLocaleDateString("zh-CN")}
          </div>
        </div>
      ))}
    </div>
  )
}
