export function renderVerificationEmailHtml(input: {
  recipientName: string
  verificationUrl: string
}) {
  const name = escapeHtml(input.recipientName)
  const url = escapeAttribute(input.verificationUrl)

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f2f0eb;color:#263029;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding:40px 16px;background:#f2f0eb;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#fbfaf6;border:1px solid #d9d3ca;border-radius:18px;padding:40px 32px;">
            <tr><td align="center">
              <div style="color:#263029;font-size:15px;font-weight:600;">Garden</div>
              <h1 style="margin:28px 0 12px;font-size:30px;font-weight:600;">Verify your email</h1>
              <p style="margin:0;color:#756f66;font-size:15px;line-height:24px;">Hi ${name}, verify your email to finish setting up your Garden account.</p>
              <p style="margin:28px 0;"><a href="${url}" style="display:inline-block;border-radius:10px;background:#263029;color:#f2f0eb;padding:12px 18px;font-size:14px;font-weight:600;text-decoration:none;">Verify email</a></p>
              <p style="margin:0;color:#756f66;font-size:12px;line-height:19px;word-break:break-all;">If the button does not work, open this link:<br /><a href="${url}" style="color:#4d9864;">${url}</a></p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeAttribute(value: string) {
  return Array.from(escapeHtml(value))
    .filter((character) => {
      const code = character.charCodeAt(0)
      return code > 31 && code !== 127
    })
    .join('')
}
