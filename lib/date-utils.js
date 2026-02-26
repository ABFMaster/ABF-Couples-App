/**
 * Returns today's date string (YYYY-MM-DD) in PST timezone.
 * Prevents UTC offset issues where 11pm PST = next day UTC.
 */
export function todayPST() {
  const now = new Date()
  const pstOffset = -8 * 60
  const pst = new Date(now.getTime() + (pstOffset - now.getTimezoneOffset()) * 60000)
  return pst.toISOString().split('T')[0]
}

/**
 * Returns a Date object representing now in PST.
 */
export function nowPST() {
  const now = new Date()
  const pstOffset = -8 * 60
  return new Date(now.getTime() + (pstOffset - now.getTimezoneOffset()) * 60000)
}
