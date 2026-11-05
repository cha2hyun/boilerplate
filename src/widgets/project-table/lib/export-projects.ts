import { toast } from 'sonner'
import type { Project } from '@/entities/project'
import { product } from '@/shared/config/product'

interface ProjectExportLabels {
  headers: string[]
  statuses: Record<Project['status'], string>
}

function escapeCell(value: string | number) {
  const text = String(value)
  const safe = /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

export function createProjectsCsv(projects: Project[], labels: ProjectExportLabels) {
  const rows = projects.map((project) => [
    project.name,
    project.description,
    labels.statuses[project.status],
    project.owner.name,
    project.owner.email,
    project.progress,
    project.updatedAt,
  ])
  return [labels.headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n')
}

export function exportProjects(
  projects: Project[],
  labels: ProjectExportLabels & { success: string },
) {
  const csv = createProjectsCsv(projects, labels)
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${product.wordmark}-projects-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
  toast.success(labels.success)
}
