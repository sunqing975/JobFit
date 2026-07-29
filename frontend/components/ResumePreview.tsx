"use client"

interface Props {
  content: Record<string, unknown>
}

export function ResumePreview({ content }: Props) {
  const skills = (content.skills as string[]) || []
  const experience = (content.experience as any[]) || []
  const education = (content.education as any[]) || []
  const projects = (content.projects as any[]) || []

  return (
    <div className="prose max-w-none">
      <div className="border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold m-0">
          {(content.name as string) || "未填写姓名"}
        </h1>
        <p className="text-gray-600 m-0 mt-1">
          {(content.title as string) || ""}
        </p>
        <div className="text-sm text-gray-500 mt-2">
          {content.email as string}{(content.email as string) && (content.phone as string) ? " | " : ""}
          {content.phone as string}
        </div>
      </div>

      {(content.summary as string) && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold border-b pb-1 mb-2">个人总结</h2>
          <p className="text-gray-700 text-sm leading-relaxed">
            {content.summary as string}
          </p>
        </div>
      )}

      {skills.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold border-b pb-1 mb-2">技能</h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, i) => (
              <span
                key={i}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {experience.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold border-b pb-1 mb-3">工作经历</h2>
          {experience.map((exp, i) => (
            <div key={i} className="mb-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-medium m-0">{exp.role as string}</h3>
                <span className="text-sm text-gray-500">{exp.period as string}</span>
              </div>
              <p className="text-sm text-gray-600 m-0">{exp.company as string}</p>
              {(exp.bullets as string[] || []).length > 0 && (
                <ul className="mt-2 space-y-1">
                  {((exp.bullets as string[]) || []).map((bullet, j) => (
                    <li key={j} className="text-sm text-gray-700">
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {projects.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold border-b pb-1 mb-3">项目经历</h2>
          {projects.map((proj, i) => (
            <div key={i} className="mb-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-medium m-0">{proj.name as string}</h3>
                <span className="text-sm text-gray-500">{proj.period as string}</span>
              </div>
              <p className="text-sm text-gray-600 m-0">{proj.description as string}</p>
              {(proj.bullets as string[] || []).length > 0 && (
                <ul className="mt-2 space-y-1">
                  {((proj.bullets as string[]) || []).map((bullet, j) => (
                    <li key={j} className="text-sm text-gray-700">
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {education.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold border-b pb-1 mb-3">教育背景</h2>
          {education.map((edu, i) => (
            <div key={i} className="flex items-baseline justify-between">
              <div>
                <span className="font-medium">{edu.school as string}</span>
                <span className="text-gray-600 ml-2">
                  {edu.major as string} · {edu.degree as string}
                </span>
              </div>
              <span className="text-sm text-gray-500">{edu.period as string}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
