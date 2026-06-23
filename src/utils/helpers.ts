export function formatDate(date: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  }).format(new Date(date))
}

/** ISO date (YYYY-MM-DD) → DD/MM/YYYY for compact range labels */
export function formatIsoDateShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [year, month, day] = iso.split('-')
  if (!year || !month || !day) return '—'
  return `${day}/${month}/${year}`
}

/** Calendar date as YYYY-MM-DD in local timezone */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function toLocalDateKeyFromIso(iso: string): string {
  return toLocalDateKey(new Date(iso))
}

export function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function startOfMonth(date = new Date()): string {
  return toLocalDateKey(new Date(date.getFullYear(), date.getMonth(), 1))
}

export function endOfMonth(date = new Date()): string {
  return toLocalDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0))
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(date)
}

export function isToday(date: string): boolean {
  const d = new Date(date)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

export function isTomorrow(date: string): boolean {
  const d = new Date(date)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return d.toDateString() === tomorrow.toDateString()
}

export function isThisWeek(date: string): boolean {
  const d = new Date(date)
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - now.getDay())
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  return d >= start && d < end
}

export function isOverdue(date: string): boolean {
  const d = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function downloadFile(filename: string, content: string, mimeType = 'text/csv'): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function classNames(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
