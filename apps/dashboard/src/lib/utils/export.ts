export function downloadJson(view: string, data: unknown): void {
  const exportedAt = new Date().toISOString()
  const blob = new Blob([JSON.stringify({ view, exported_at: exportedAt, data }, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `atflows-${view}-${exportedAt.replace(/[:.]/g, '-')}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
