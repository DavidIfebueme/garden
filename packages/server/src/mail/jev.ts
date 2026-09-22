import { Effect, Schema } from 'effect'

export const JevChoiceQuestion = Schema.Struct({
  type: Schema.Literal('choice'),
  instructions: Schema.String,
  options: Schema.Array(Schema.String),
  criteria: Schema.Record(Schema.String, Schema.String),
})
export const JevScoreQuestion = Schema.Struct({
  type: Schema.Literal('score'),
  instructions: Schema.String,
  levels: Schema.Number,
  criteria: Schema.Array(Schema.String),
})
export const JevNoulQuestion = Schema.Struct({
  type: Schema.Literal('noul'),
  instructions: Schema.String,
})
export const JevQuestion = Schema.Union([
  JevChoiceQuestion,
  JevScoreQuestion,
  JevNoulQuestion,
])
export type JevQuestion = typeof JevQuestion.Type

export const JevNoulAnswer = Schema.Struct({
  type: Schema.Literal('noul'),
  noul: Schema.Number,
})
export const JevChoiceAnswer = Schema.Struct({
  type: Schema.Literal('choice'),
  choice: Schema.String,
  confidence: Schema.Number,
  probabilities: Schema.Record(Schema.String, Schema.Number),
})
export const JevScoreAnswer = Schema.Struct({
  type: Schema.Literal('score'),
  score: Schema.Number,
  confidence: Schema.Number,
  legend: Schema.Record(Schema.String, Schema.String),
  probabilities: Schema.Record(Schema.String, Schema.Number),
})
export const JevAnswer = Schema.Union([
  JevNoulAnswer,
  JevChoiceAnswer,
  JevScoreAnswer,
])
export type JevAnswer = typeof JevAnswer.Type

const JevResponse = Schema.Struct({
  model: Schema.String,
  answers: Schema.Record(Schema.String, JevAnswer),
})

export class JevError extends Schema.TaggedError<JevError>()('JevError', {
  operation: Schema.String,
  message: Schema.String,
}) {}

export type JevConfig = {
  readonly baseUrl: string
  readonly apiKey: string
  readonly model: string
}

export const judgeMail = Effect.fn('MailJev.judge')(function* (
  config: JevConfig,
  state: string,
  questions: Record<string, JevQuestion>,
) {
  const response = yield* Effect.tryPromise({
    try: () =>
      fetch(`${config.baseUrl}/systemone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({ model: config.model, state, questions }),
      }),
    catch: (cause) =>
      new JevError({
        operation: 'judge',
        message: cause instanceof Error ? cause.message : 'Jev request failed.',
      }),
  })
  if (!response.ok) {
    return yield* new JevError({
      operation: 'judge',
      message: `Jev rejected the request with status ${response.status}.`,
    })
  }
  const payload: unknown = yield* Effect.tryPromise({
    try: () => response.json(),
    catch: () =>
      new JevError({
        operation: 'judge',
        message: 'Jev returned an unreadable response.',
      }),
  })
  const parsed = yield* Schema.decodeUnknownEffect(JevResponse)(payload).pipe(
    Effect.mapError(
      () =>
        new JevError({
          operation: 'judge',
          message: 'Jev returned an unexpected response shape.',
        }),
    ),
  )
  return parsed.answers as Record<string, JevAnswer>
})
