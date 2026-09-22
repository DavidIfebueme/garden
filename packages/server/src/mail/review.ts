import type { GardenDatabase } from '@garden/db'
import type { DraftId, WorkspaceId } from '@garden/core/mail'
import { Effect, Option } from 'effect'
import { judgeMail, type JevAnswer, type JevConfig } from './jev.ts'
import { recordDraftReviewFlag } from './repository/drafts.ts'

const MAX_REVIEW_STATE_CHARS = 2_000
const COMPLETE_THRESHOLD = 0.6
export const RISKY_SEND_THRESHOLD = 0.7

export type DraftCompleteness = {
  readonly complete: number
  readonly progress: number
}

export type SendRisk = {
  readonly destructive: number
  readonly outOfScope: number
  readonly external: number
}

const noulOf = (answer: JevAnswer | undefined): number =>
  answer !== undefined && answer.type === 'noul' ? answer.noul : 0

export const decideDraftCompleteness = (input: {
  subject: string
  body: string
}): boolean => input.subject.trim().length > 0 && input.body.trim().length > 0

export const decideSendRisk = (risk: SendRisk): boolean =>
  risk.destructive >= RISKY_SEND_THRESHOLD ||
  risk.outOfScope >= RISKY_SEND_THRESHOLD ||
  risk.external >= RISKY_SEND_THRESHOLD

export const decideAutoSend = (input: {
  autoSendEnabled: boolean
  screened: boolean
  risky: boolean
}): boolean => input.autoSendEnabled && input.screened && !input.risky

const reviewStateOf = (subject: string, body: string): string =>
  [`Subject: ${subject}`, '', body.slice(0, MAX_REVIEW_STATE_CHARS)].join('\n')

export const reviewAgentDraft = Effect.fn('MailReview.agentDraft')(function* (
  db: GardenDatabase,
  jev: JevConfig | null,
  input: {
    workspaceId: WorkspaceId
    draftId: DraftId
    subject: string
    body: string
  },
) {
  if (jev === null) return { reviewed: false as const }
  if (!decideDraftCompleteness({ subject: input.subject, body: input.body })) {
    yield* recordDraftReviewFlag(db, {
      workspaceId: input.workspaceId,
      draftId: input.draftId,
    })
    return { reviewed: true as const, complete: false as const }
  }
  const judged = yield* Effect.option(
    judgeMail(jev, reviewStateOf(input.subject, input.body), {
      isComplete: {
        type: 'noul',
        instructions:
          'Is this draft complete and ready for human review, with clear intent and no placeholders?',
      },
    }),
  )
  if (Option.isNone(judged)) return { reviewed: false as const }
  const complete = noulOf(judged.value['isComplete'])
  if (complete < COMPLETE_THRESHOLD) {
    yield* recordDraftReviewFlag(db, {
      workspaceId: input.workspaceId,
      draftId: input.draftId,
    })
  }
  return { reviewed: true as const, complete: complete >= COMPLETE_THRESHOLD }
})

export const screenDraftSend = Effect.fn('MailReview.draftSend')(function* (
  db: GardenDatabase,
  jev: JevConfig | null,
  input: {
    workspaceId: WorkspaceId
    draftId: DraftId
    recipients: readonly string[]
    subject: string
    body: string
  },
) {
  if (jev === null) return { screened: false as const }
  const judged = yield* Effect.option(
    judgeMail(
      jev,
      [
        `To: ${input.recipients.join(', ')}`,
        `Subject: ${input.subject}`,
        '',
        input.body.slice(0, MAX_REVIEW_STATE_CHARS),
      ].join('\n'),
      {
        isDestructive: {
          type: 'noul',
          instructions:
            'Could sending this cause irreversible harm such as money movement, legal commitment, or access changes?',
        },
        isOutOfScope: {
          type: 'noul',
          instructions:
            'Does this go beyond routine correspondence into sensitive territory?',
        },
        isExternal: {
          type: 'noul',
          instructions:
            'Is any recipient outside the organization rather than a teammate?',
        },
      },
    ),
  )
  if (Option.isNone(judged)) return { screened: false as const }
  const risky = decideSendRisk({
    destructive: noulOf(judged.value['isDestructive']),
    outOfScope: noulOf(judged.value['isOutOfScope']),
    external: noulOf(judged.value['isExternal']),
  })
  if (risky) {
    yield* recordDraftReviewFlag(db, {
      workspaceId: input.workspaceId,
      draftId: input.draftId,
    })
  }
  return { screened: true as const, risky }
})
