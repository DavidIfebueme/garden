import { Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import { PHISH_QUARANTINE_THRESHOLD, decideTriageOutcome } from './triage.ts'
import { decideAutoSend, decideDraftCompleteness, decideSendRisk } from './review.ts'

const verdictResponse = {
  model: 'jev-1.13-free',
  answers: {
    queue: {
      type: 'choice',
      choice: 'billing',
      confidence: 1,
      probabilities: { billing: 1 },
    },
    urgency: {
      type: 'score',
      score: 3.24,
      confidence: 0.56,
      legend: { 3: 'time sensitive' },
      probabilities: { 3: 0.5 },
    },
    isPhish: { type: 'noul', noul: 0.21 },
  },
}

describe('decideTriageOutcome', () => {
  it('quarantines phishing above threshold with max urgency', () => {
    expect(
      decideTriageOutcome({
        phish: PHISH_QUARANTINE_THRESHOLD,
        queue: 'support',
        urgency: 2,
      }),
    ).toEqual({
      queue: 'support',
      urgency: 5,
      quarantined: true,
      reason: 'Suspected phishing.',
    })
  })

  it('passes legitimate mail through with its queue and urgency', () => {
    expect(
      decideTriageOutcome({ phish: 0.21, queue: 'billing', urgency: 3 }),
    ).toEqual({
      queue: 'billing',
      urgency: 3,
      quarantined: false,
      reason: null,
    })
  })

  it('keeps borderline scores out of quarantine', () => {
    expect(
      decideTriageOutcome({
        phish: PHISH_QUARANTINE_THRESHOLD - 0.01,
        queue: 'general',
        urgency: 4,
      }),
    ).toMatchObject({ quarantined: false, reason: null })
  })
})

describe('jev verdict shape', () => {  it('decodes the live three-question response', () => {
    const JevResponse = Schema.Struct({
      model: Schema.String,
      answers: Schema.Record(Schema.String, Schema.Unknown),
    })
    const parsed = Schema.decodeUnknownSync(JevResponse)(verdictResponse)
    expect(parsed.model).toBe('jev-1.13-free')
    expect(Object.keys(parsed.answers)).toEqual(['queue', 'urgency', 'isPhish'])
  })
})

describe('decideDraftCompleteness', () => {
  it('rejects empty subjects and bodies', () => {
    expect(decideDraftCompleteness({ subject: '', body: 'text' })).toBe(false)
    expect(decideDraftCompleteness({ subject: 'hi', body: '   ' })).toBe(false)
    expect(decideDraftCompleteness({ subject: 'hi', body: 'text' })).toBe(true)
  })
})

describe('decideSendRisk', () => {
  it('flags any risk at or above threshold', () => {
    expect(
      decideSendRisk({ destructive: 0.7, outOfScope: 0, external: 0 }),
    ).toBe(true)
    expect(
      decideSendRisk({ destructive: 0, outOfScope: 0.1, external: 0.2 }),
    ).toBe(false)
  })
})

describe('decideAutoSend', () => {
  it('allows auto only when policy on, screened, and clean', () => {
    expect(
      decideAutoSend({ autoSendEnabled: true, screened: true, risky: false }),
    ).toBe(true)
    expect(
      decideAutoSend({ autoSendEnabled: false, screened: true, risky: false }),
    ).toBe(false)
    expect(
      decideAutoSend({ autoSendEnabled: true, screened: false, risky: false }),
    ).toBe(false)
    expect(
      decideAutoSend({ autoSendEnabled: true, screened: true, risky: true }),
    ).toBe(false)
  })
})
