export async function notifyPartnerTodayResponse(supabase, partnerId, senderName, reaction) {
  const reactionText = {
    'this_is_us': 'said "This is us"',
    'made_me_think': 'said "Made me think"',
    'tell_nora': 'talked to Nora about it'
  }[reaction] || 'responded'

  await fetch('/api/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: partnerId,
      title: `${senderName} responded today`,
      body: `${senderName} ${reactionText} to Nora's question. See what they said.`,
      url: '/today'
    })
  })
}

export async function notifyPartnerCheckin(supabase, partnerId, senderName) {
  await fetch('/api/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: partnerId,
      title: `${senderName} just checked in`,
      body: 'Your daily check-in is waiting. It takes 2 minutes.',
      url: '/checkin'
    })
  })
}

export async function notifyPartnerFlirt(supabase, partnerId, senderName) {
  await fetch('/api/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: partnerId,
      title: `${senderName} sent you something`,
      body: 'You have a new flirt waiting.',
      url: '/flirts'
    })
  })
}
