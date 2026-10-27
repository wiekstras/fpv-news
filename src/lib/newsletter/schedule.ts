import { addDays, weekdayInZone, ymdInZone, zonedTime } from '../time'

export const TZ = 'Europe/Amsterdam'

// The most recent scheduled digest moment at or before `now` (day 0 = Sunday, time "HH:mm", Amsterdam time).
export function lastScheduledAt(now: Date, day: number, time: string): Date {
  const today = ymdInZone(now, TZ)
  const back = (weekdayInZone(now, TZ) - day + 7) % 7
  const candidate = zonedTime(addDays(today, -back), time, TZ)
  return candidate.getTime() > now.getTime() ? zonedTime(addDays(today, -back - 7), time, TZ) : candidate
}
