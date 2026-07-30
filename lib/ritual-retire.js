// Shared two-person-confirm retire transition for ADOPTED rituals. First
// person to request it flags retire_requested_by; the second person (anyone
// other than whoever flagged it) confirms and the ritual actually retires.
// Tapping again as the same person who flagged it cancels the request.
//
// Adopting a ritual is a joint decision (see /api/ritual/adopt), so retiring
// one should be too — this is the one place that logic lives, called from
// both /api/ritual/retire (the "See all rituals" library page) and
// /api/ritual/revisit-respond (Nora's occasional "still going?" check-in on
// an adopted ritual, "We drifted from this one" response).
//
// extraUpdate lets a caller fold in its own column changes (e.g. clearing a
// pending_revisit_message) into the same update, regardless of which of the
// three branches actually runs.
export async function requestOrConfirmRetire({ supabase, userId, coupleId, ritualId, extraUpdate = {} }) {
  const now = new Date().toISOString()

  const { data: existing } = await supabase
    .from('rituals')
    .select('id, couple_id, retire_requested_by')
    .eq('id', ritualId)
    .maybeSingle()

  if (!existing) return { error: 'not_found' }
  if (existing.couple_id !== coupleId) return { error: 'forbidden' }

  // First person to request retire — flag it
  if (!existing.retire_requested_by) {
    const { data: ritual, error } = await supabase
      .from('rituals')
      .update({ retire_requested_by: userId, updated_at: now, ...extraUpdate })
      .eq('id', ritualId)
      .select('*')
      .maybeSingle()
    if (error) return { error: 'update_failed' }
    return { ritual, status: 'requested' }
  }

  // Second person confirms — retire it
  if (existing.retire_requested_by !== userId) {
    const { data: ritual, error } = await supabase
      .from('rituals')
      .update({ status: 'retired', retire_requested_by: null, updated_at: now, ...extraUpdate })
      .eq('id', ritualId)
      .select('*')
      .maybeSingle()
    if (error) return { error: 'update_failed' }
    return { ritual, status: 'retired' }
  }

  // Same person tapping again — cancel the request
  const { data: ritual, error } = await supabase
    .from('rituals')
    .update({ retire_requested_by: null, updated_at: now, ...extraUpdate })
    .eq('id', ritualId)
    .select('*')
    .maybeSingle()
  if (error) return { error: 'update_failed' }
  return { ritual, status: 'cancelled' }
}
