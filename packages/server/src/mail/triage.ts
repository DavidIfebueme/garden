import type { GardenDatabase } from '@garden/db'
import type { ConversationId, WorkspaceId } from '@garden/core/mail'
import { Effect, Option } from 'effect'
import { judgeMail, type JevAnswer, type JevConfig } from './jev.ts'
import { recordConversationTriage } from './repository/collaboration.ts'

export const PHISH_QUARANTINE_THRESHOLD = 0.85
export const TRIAGE_QUEUES = [
  'sales',
  'support',
  'billing',
  'general',
  'spam',
] as const
const MAX_TRIAGE_STATE_CHARS = 2_000

export type TriageJudgment = {
  readonly phish: number
  readonly queue: string
  readonly urgency: number
}

export type TriageOutcome = {
  readonly queue: string | null
  readonly urgency: number | null
  readonly quarantined: boolean
  readonly reason: string | null
}

const noulOf = (answer: JevAnswer | undefined): number =>
  answer !== undefined && answer.type === 'noul' ? answer.noul : 0

const choiceOf = (answer: JevAnswer | undefined, fallback: string): string => {
  if (answer !== undefined && answer.type === 'choice') return answer.choice
  return fallback
}

const scoreOf = (answer: JevAnswer | undefined): number => {
  if (answer !== undefined && answer.type === 'score') {
    return Math.round(answer.score)
  }
  return 3
}

export const decideTriageOutcome = (
  judgment: TriageJudgment,
): TriageOutcome => {
  if (judgment.phish >= PHISH_QUARANTINE_THRESHOLD) {
    return {
      queue: judgment.queue,
      urgency: 5,
      quarantined: true,
      reason: 'Suspected phishing.',
    }
  }
  return {
    queue: judgment.queue,
    urgency: judgment.urgency,
    quarantined: false,
    reason: null,
  }
}

export const triageInboundConversation = Effect.fn(
  'MailTriage.inboundConversation',
)(function* (
  db: GardenDatabase,
  jev: JevConfig | null,
  input: {
    workspaceId: WorkspaceId
    conversationId: ConversationId
    subject: string
    senderAddress: string
    textBody: string
  },
) {
  if (jev === null) return { triaged: false as const }
  const state = [
    `Subject: ${input.subject}`,
    `From: ${input.senderAddress}`,
    '',
    input.textBody.slice(0, MAX_TRIAGE_STATE_CHARS),
  ].join('\n')
  const judged = yield* Effect.option(
    judgeMail(jev, state, {
      isPhish: {
        type: 'noul',
        instructions: 'Is this a phishing or malicious email?',
      },
      queue: {
        type: 'choice',
        instructions: 'Which team queue owns this mail?',
        options: [...TRIAGE_QUEUES],
        criteria: {
          sales: 'new business, upsell, pricing questions',
          support: 'help with product issues, bugs, how to use',
          billing: 'money owed, invoices, refunds, payment failures',
          general: 'everything else legitimate',
          spam: 'bulk mail, newsletters, scams',
        },
      },
      urgency: {
        type: 'score',
        instructions: 'How urgent is this mail?',
        levels: 5,
        criteria: [
          'no rush',
          'whenever',
          'this week',
          'time sensitive',
          'act now',
        ],
      },
    }),
  )
  if (Option.isNone(judged)) return { triaged: false as const }
  const answers = judged.value
  const outcome = decideTriageOutcome({
    phish: noulOf(answers['isPhish']),
    queue: choiceOf(answers['queue'], 'general'),
    urgency: scoreOf(answers['urgency']),
  })
  yield* recordConversationTriage(db, {
    workspaceId: input.workspaceId,
    conversationId: input.conversationId,
    queue: outcome.queue,
    urgency: outcome.urgency,
    quarantined: outcome.quarantined,
    reason: outcome.reason,
  })
  return { triaged: true as const, ...outcome }
})
