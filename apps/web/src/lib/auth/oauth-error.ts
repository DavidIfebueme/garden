const GOOGLE_ACCOUNT_NOT_LINKED_MESSAGE =
  'An account already exists for this email. Sign in with your password, then link Google in Settings.'

/**
 * Converts OAuth callback codes into safe user-facing copy. Better Auth returns
 * `account_not_linked` when implicit linking is disabled, so Garden must direct
 * existing password users to the explicit linking flow in Settings.
 */
export function oauthErrorMessage(error: unknown) {
  if (typeof error !== 'string') return undefined

  if (error === 'account_not_linked') {
    return GOOGLE_ACCOUNT_NOT_LINKED_MESSAGE
  }

  return 'Google sign-in failed. Try again.'
}
