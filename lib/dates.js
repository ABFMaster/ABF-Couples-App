const DEFAULT_TZ = 'America/Los_Angeles'

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

// "MON", "TUE", "WED" etc. — in the user's timezone
export function getDayLabel(timezone = DEFAULT_TZ) {
  return new Date().toLocaleDateString('en-US', { timeZone: timezone, weekday: 'short' }).toUpperCase()
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
