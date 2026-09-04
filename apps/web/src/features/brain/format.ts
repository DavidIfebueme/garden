/**
 * Display formatting for the Files & Folders surface. The Penpot table shows
 * "07 July, 2024" / "13:42" style columns and cards show "1 hr ago" relative
 * times and "24 KB" sizes.
 */

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
})

export function formatUploadedDate(iso: string | undefined): string {
  if (iso === undefined) return '—'
  return dateFormatter.format(new Date(iso))
}

export function formatUploadedTime(iso: string | undefined): string {
  if (iso === undefined) return '—'
  return timeFormatter.format(new Date(iso))
}

export function formatFileSize(sizeBytes: number | undefined): string {
  if (sizeBytes === undefined) return '—'
  if (sizeBytes < 1024) return `${sizeBytes} B`
  const kb = sizeBytes / 1024
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} d ago`
  return dateFormatter.format(new Date(iso))
}
