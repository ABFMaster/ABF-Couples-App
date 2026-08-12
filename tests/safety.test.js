import { describe, it, expect, vi } from 'vitest'

// checkSensitiveContent goes through noraSignal -> noraCall -> the real
// Anthropic client (lib/nora.js). Mock the SDK so each test controls
// exactly what the classifier "said," including the failure/garbage-output
// cases that matter most for this gate's fail-closed-on-memory guarantee.
let mockResponse
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    constructor() {}
    messages = { create: async () => mockResponse() }
  },
}))

const { checkSensitiveContent } = await import('../lib/safety.js')

function textResult(text) {
  return () => ({ content: [{ text }], usage: { input_tokens: 1, output_tokens: 1 } })
}

describe('checkSensitiveContent', () => {
  it('flags an abuse disclosure', async () => {
    mockResponse = textResult('ABUSE')
    const result = await checkSensitiveContent("he grabbed me again last night and I'm scared")
    expect(result).toEqual({ flagged: true, category: 'ABUSE', ok: true })
  })

  it('flags self-harm', async () => {
    mockResponse = textResult('SELF_HARM')
    const result = await checkSensitiveContent('I keep thinking about hurting myself')
    expect(result.flagged).toBe(true)
    expect(result.category).toBe('SELF_HARM')
    expect(result.ok).toBe(true)
  })

  it('flags suicidal ideation', async () => {
    mockResponse = textResult('SUICIDAL_IDEATION')
    const result = await checkSensitiveContent('I don\'t want to be here anymore')
    expect(result.flagged).toBe(true)
    expect(result.category).toBe('SUICIDAL_IDEATION')
  })

  it('does not flag ordinary venting or hyperbole', async () => {
    mockResponse = textResult('NONE')
    const result = await checkSensitiveContent("he left dishes in the sink again, it's driving me crazy")
    expect(result).toEqual({ flagged: false, category: null, ok: true })
  })

  it('treats unrecognized classifier output as a failure, not as safe (ok: false)', async () => {
    mockResponse = textResult("I'm not sure how to categorize this, sorry")
    const result = await checkSensitiveContent('something ambiguous')
    expect(result.flagged).toBe(false)
    expect(result.ok).toBe(false)
  })

  it('treats a classifier throw/timeout as a failure, not as safe (ok: false)', async () => {
    mockResponse = () => { throw new Error('timeout') }
    const result = await checkSensitiveContent('anything')
    expect(result).toEqual({ flagged: false, category: null, ok: false })
  })

  it('short-circuits empty input as safe without calling the classifier', async () => {
    mockResponse = () => { throw new Error('should not be called') }
    const result = await checkSensitiveContent('   ')
    expect(result).toEqual({ flagged: false, category: null, ok: true })
  })
})
