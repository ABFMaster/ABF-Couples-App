import { NextResponse } from 'next/server'
import { noraSignal } from '@/lib/nora'

export async function POST(request) {
  try {
    const { partnerName, partnerLoveLanguage, userName } = await request.json()

    const prompt = `Write a flirt from ${userName} to ${partnerName}. Their love language is ${partnerLoveLanguage}. Make it feel tailored to that.`
    const response = await noraSignal(prompt, { route: 'flirt/generate', system: 'Generate a single warm, flirty message. Short, playful, specific to this couple. No more than 2 sentences.', maxTokens: 60 })

    return NextResponse.json({ flirt: response })
  } catch (err) {
    console.error('[FlirtGenerate] Error:', err)
    return NextResponse.json({ flirt: '' }, { status: 500 })
  }
}
