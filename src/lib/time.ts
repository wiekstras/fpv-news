// Small helpers for wall-clock times in a named time zone (DST-aware).
export function ymdInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

export function weekdayInZone(date: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date)
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name)
}

function offsetAt(date: Date, timeZone: string): string {
  const name = new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')?.value
  return name === 'GMT' ? '+00:00' : (name?.replace('GMT', '') ?? '+00:00')
}

// The instant when it is `hhmm` on `ymd` in `timeZone`.
export function zonedTime(ymd: string, hhmm: string, timeZone: string): Date {
  const guess = new Date(`${ymd}T${hhmm}:00Z`)
  const first = new Date(`${ymd}T${hhmm}:00${offsetAt(guess, timeZone)}`)
  // Re-check with the offset at the resulting instant (matters on DST change days).
  return new Date(`${ymd}T${hhmm}:00${offsetAt(first, timeZone)}`)
}

export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
