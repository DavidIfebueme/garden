import { describe, expect, it } from 'vitest'
import { oauthErrorMessage } from './oauth-error'

describe('oauthErrorMessage', () => {
  it('explains how an existing password user can link Google', () => {
    expect(oauthErrorMessage('account_not_linked')).toBe(
      'An account already exists for this email. Sign in with your password, then link Google in Settings.',
    )
  })

  it('does not expose unknown OAuth error details', () => {
    expect(oauthErrorMessage('invalid_code')).toBe(
      'Google sign-in failed. Try again.',
    )
    expect(oauthErrorMessage(undefined)).toBeUndefined()
  })
})
