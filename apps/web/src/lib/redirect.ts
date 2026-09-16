export function sanitizeRedirectTarget(target: unknown, fallback = '/home') {
  if (
    typeof target !== 'string' ||
    !target.startsWith('/') ||
    target.startsWith('//')
  ) {
    return fallback
  }

  return target
}
