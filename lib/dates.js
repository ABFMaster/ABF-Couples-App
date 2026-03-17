export function getTodayString(timezone = 'America/Los_Angeles') {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone })
}
