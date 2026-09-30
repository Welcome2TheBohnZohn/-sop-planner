export function dateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, days: number) {
  const d = fromKey(key)
  d.setDate(d.getDate() + days)
  return dateKey(d)
}

export function startOfWeek(key: string) {
  const d = fromKey(key)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return dateKey(d)
}

export function endOfWeek(key: string) {
  return addDays(startOfWeek(key), 6)
}

export function monthKey(key: string) {
  return key.slice(0, 7)
}

export function quarterKey(key: string) {
  const d = fromKey(key)
  const q = Math.floor(d.getMonth() / 3) + 1
  return `${d.getFullYear()}-Q${q}`
}

export function quarterStart(key: string) {
  const d = fromKey(key)
  const month = Math.floor(d.getMonth() / 3) * 3
  return dateKey(new Date(d.getFullYear(), month, 1))
}

export function quarterWeeks(key: string) {
  const start = startOfWeek(quarterStart(key))
  return Array.from({ length: 13 }, (_, i) => addDays(start, i * 7))
}

export function isoWeek(key: string) {
  const date = fromKey(key)
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = temp.getUTCDay() || 7
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1))
  return Math.ceil((((temp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export function minutes(time: string) {
  if (!time) return 0
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function toTime(total: number) {
  const t = Math.max(0, Math.min(23 * 60 + 59, Math.round(total)))
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

export function formatDay(key: string, options: Intl.DateTimeFormatOptions = {}) {
  return fromKey(key).toLocaleDateString('en-US', options)
}

export function daysInMonth(key: string) {
  const d = fromKey(`${key}-01`)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return last
}

export function clampDate(date: string, min: string, max: string) {
  return date < min ? min : date > max ? max : date
}

export function todayKey() {
  return dateKey(new Date())
}
