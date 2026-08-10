const DEFAULT_TZ = 'America/Los_Angeles'

// Current hour (0-23) in the given timezone. Returns -1 on failure.
export function getHourInTimezone(timezone = DEFAULT_TZ) {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    return parseInt(formatter.format(now), 10)
  } catch {
    return -1
  }
}

// Hours from right now until the next occurrence of morningHour (default 10am)
// in the given timezone, always at least a few hours out — never "later today".
// Used for Follow-Through expiry: generation always resolves by "tomorrow
// morning" at the earliest, never same-day-later-today.
export function hoursUntilNextLocalMorning(timezone = DEFAULT_TZ, morningHour = 10) {
  const hour = getHourInTimezone(timezone)
  if (hour < 0) return 16 // fallback if timezone lookup fails — a reasonable overnight default
  return (24 - hour) + morningHour
}

// "2026-03-20" in the user's timezone
export function getTodayString(timezone = DEFAULT_TZ) {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone })
}

// 0=Sun, 1=Mon, ... 6=Sat — in the user's timezone
export function getDayOfWeek(timezone = DEFAULT_TZ) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short'
  }).formatToParts(new Date())
  const weekday = parts.find(p => p.type === 'weekday').value
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday)
}

// Given a DB date_time string, return "MON", "TUE" etc. in the user's timezone
export function getDateDayLabel(dateTimeString, timezone = DEFAULT_TZ) {
  return new Date(dateTimeString).toLocaleDateString('en-US', { timeZone: timezone, weekday: 'short' }).toUpperCase()
}

// "2026-03-16" — most recent Monday in the user's timezone
export function getWeekStart(timezone = DEFAULT_TZ) {
  const todayStr = getTodayString(timezone)
  const d = new Date(todayStr + 'T12:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.toLocaleDateString('en-CA', { timeZone: timezone })
}

// Days from today until the next occurrence of a recurring annual date
// (birthday, anniversary) — ignores the stored year, just matches month+day.
// Returns 0 if it's today, null if dateStr is missing/unparseable. Shared by
// the birthday/anniversary cron reminders (app/api/cron/scheduled-tasks) and
// the dashboard hero pre-empt (app/api/dashboard/hero) so both sides of the
// lead-time design agree on the same math — see Sessions/PRODUCT_BACKLOG.md,
// Aug 10 2026: Matt's note that day-of surfacing gives no lead time to
// actually plan anything.
export function daysUntilNextOccurrence(dateStr, timezone = DEFAULT_TZ) {
  if (!dateStr) return null
  const todayStr = getTodayString(timezone)
  const parts = String(dateStr).split('-')
  if (parts.length !== 3) return null
  const [, month, day] = parts
  const [todayYear] = todayStr.split('-')

  const today = new Date(`${todayStr}T12:00:00`)
  let next = new Date(`${todayYear}-${month}-${day}T12:00:00`)
  if (isNaN(next.getTime()) || isNaN(today.getTime())) return null

  if (next < today) {
    next = new Date(`${Number(todayYear) + 1}-${month}-${day}T12:00:00`)
  }
  return Math.round((next - today) / 86400000)
}
