export type WriteCandidate = {
  readonly claimHash: string
  readonly claim: string
  readonly kind: string
  readonly confidence: number
  readonly sensitive: boolean
  readonly duplicateOf?: string
}

export type WriteDecision =
  | {
      readonly action: 'link'
      readonly candidate: WriteCandidate
      readonly existingItemId: string
    }
  | { readonly action: 'write'; readonly candidate: WriteCandidate }
  | {
      readonly action: 'review'
      readonly candidate: WriteCandidate
      readonly reason: 'sensitive' | 'low_confidence'
    }
  | {
      readonly action: 'skip'
      readonly candidate: WriteCandidate
      readonly reason: 'blank_claim' | 'invalid_confidence'
    }

export type WriteBackPolicy = {
  readonly directWriteConfidence: number
}

export const decideWriteBack = (
  candidates: readonly WriteCandidate[],
  policy: WriteBackPolicy,
): readonly WriteDecision[] =>
  candidates.map((candidate): WriteDecision => {
    if (candidate.claim.trim() === '') {
      return { action: 'skip', candidate, reason: 'blank_claim' }
    }
    if (!Number.isFinite(candidate.confidence)) {
      return { action: 'skip', candidate, reason: 'invalid_confidence' }
    }
    if (candidate.confidence < 0 || candidate.confidence > 1) {
      return { action: 'skip', candidate, reason: 'invalid_confidence' }
    }
    const duplicateOf = candidate.duplicateOf?.trim()
    if (duplicateOf !== undefined && duplicateOf !== '') {
      return { action: 'link', candidate, existingItemId: duplicateOf }
    }
    if (candidate.sensitive) {
      return { action: 'review', candidate, reason: 'sensitive' }
    }
    if (candidate.confidence < policy.directWriteConfidence) {
      return { action: 'review', candidate, reason: 'low_confidence' }
    }
    return { action: 'write', candidate }
  })
