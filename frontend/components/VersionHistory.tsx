"use client"

import type { MasterResumeVersion } from "@/lib/api"

interface Props {
  versions: MasterResumeVersion[]
  selectedId: number | null
  onSelect: (v: MasterResumeVersion) => void
  onReload: () => void
}

export function VersionHistory({ versions, selectedId, onSelect }: Props) {
  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {versions.map((v) => (
        <button
          key={v.id}
          onClick={() => onSelect(v)}
          className={`w-full text-left p-3 rounded border text-sm transition-colors ${
            selectedId === v.id
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:bg-gray-50"
          }`}
        >
          <div className="font-medium">v{v.version}</div>
          {v.change_log && (
            <div className="text-gray-600 text-xs mt-0.5">{v.change_log}</div>
          )}
          <div className="text-gray-400 text-xs mt-1">
            {new Date(v.created_at).toLocaleString("zh-CN")}
          </div>
        </button>
      ))}
    </div>
  )
}
