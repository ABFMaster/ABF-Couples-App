export const dynamic = 'force-dynamic'
import { classifyClaimResponse } from '@/lib/nora-memory'
import { NextResponse } from 'next/server'

export async function GET() {
  const result = await classifyClaimResponse({
    coupleId: '8230e60f-44ca-4668-be28-06cb32b1b831',
    surfacedClaimIds: ['27aa36ea-6eb5-41ae-95ee-fd04063694db'],
    noraMessage: "I've been noticing something — it's still early, but I think you might be holding back from full honesty because you fear how it lands. Does that resonate?",
    userMessage: "No, actually that's not it. I think it's more that I just don't want to overcommit before I'm sure, that's all.",
  })
  return NextResponse.json({ result })
}
