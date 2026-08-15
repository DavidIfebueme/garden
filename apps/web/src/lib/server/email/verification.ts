import { Resend } from 'resend'
import { createLogger } from '@garden/observability/console'
import type { AppEnv } from '@/lib/server/env'
import { renderVerificationEmailHtml } from './verification-email'

type VerificationEmailEnv = Pick<AppEnv, 'RESEND_API_KEY'>

const VERIFICATION_FROM_EMAIL = 'Garden <hello@garden.flowresearch.tech>'
const logger = createLogger('verification-email')

export async function sendVerificationEmail(input: {
  env: VerificationEmailEnv
  verificationUrl: string
  user: { email: string; name: string }
}) {
  const apiKey = input.env.RESEND_API_KEY?.trim()
  if (!apiKey) throw new Error('RESEND_API_KEY is required to verify email')

  const resend = new Resend(apiKey)
  const response = await resend.emails.send({
    from: VERIFICATION_FROM_EMAIL,
    to: input.user.email,
    subject: 'Verify your Garden email',
    html: renderVerificationEmailHtml({
      recipientName: input.user.name.trim() || 'there',
      verificationUrl: input.verificationUrl,
    }),
    text: [
      `Hi ${input.user.name.trim() || 'there'},`,
      '',
      'Verify your email to finish setting up your Garden account:',
      input.verificationUrl,
      '',
      'If you did not create this account, you can ignore this email.',
    ].join('\n'),
    tags: [{ name: 'kind', value: 'email_verification' }],
  })

  if (response.error) {
    logger.error('send_failed', {
      errorMessage: response.error.message,
      errorName: response.error.name,
      provider: 'resend',
      statusCode: response.error.statusCode ?? null,
      toDomain: input.user.email.split('@')[1]?.toLowerCase() ?? 'unknown',
    })
    throw new Error(
      `Resend verification email failed: ${response.error.name} ${response.error.statusCode ?? 'unknown'} ${response.error.message}`,
    )
  }
}
